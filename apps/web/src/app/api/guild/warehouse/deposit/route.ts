import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUser,
  createErrorResponse,
  createSuccessResponse,
  getUserGuildMembership,
  validateRequiredFields,
  InputValidation,
  checkRateLimit,
  logGuildActivity
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST - Deposit items to guild warehouse
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }
    const { user } = authResult;

    if (!user.id) {
      return createErrorResponse('INVALID_TOKEN', 'User ID missing');
    }

    // Rate limiting - 20 warehouse operations per minute
    const rateLimitCheck = checkRateLimit(`warehouse:${user.id}`, 60000, 20);
    if (!rateLimitCheck.allowed) {
      return createErrorResponse('MISSING_FIELDS', 'Too many warehouse operations. Please wait a moment.');
    }

    // Parse and validate request body
    const body = await request.json();
    const validationError = validateRequiredFields(body, ['itemId', 'amount']);
    if (validationError) {
      return createErrorResponse('MISSING_FIELDS', validationError);
    }

    const { itemId, amount } = body;

    // Enhanced validation
    const itemError = InputValidation.itemId(itemId);
    if (itemError) {
      return createErrorResponse('MISSING_FIELDS', itemError);
    }

    const amountError = InputValidation.amount(amount, 1, 10000);
    if (amountError) {
      return createErrorResponse('MISSING_FIELDS', amountError);
    }

    // Get user's guild membership
    const membershipResult = await getUserGuildMembership(user.id);
    if ('error' in membershipResult) {
      return createErrorResponse(membershipResult.error as string);
    }
    const { membership } = membershipResult;

    // Perform the deposit transaction with race condition protection
    const result = await prisma.$transaction(async (tx) => {
      // Get fresh user inventory data inside transaction
      const userInventory = await tx.inventory.findUnique({
        where: {
          userId_itemId_location: {
            userId: user.id,
            itemId: itemId,
            location: 'warehouse'
          }
        }
      });

      if (!userInventory || userInventory.qty < amount) {
        throw new Error('Insufficient items in your warehouse');
      }

      // Use atomic operations for safe quantity updates
      if (userInventory.qty === amount) {
        // Remove the inventory record entirely if depositing all items
        await tx.inventory.delete({
          where: {
            userId_itemId_location: {
              userId: user.id,
              itemId: itemId,
              location: 'warehouse'
            }
          }
        });
      } else {
        // Atomic decrement with safety check
        await tx.inventory.update({
          where: {
            userId_itemId_location: {
              userId: user.id,
              itemId: itemId,
              location: 'warehouse'
            },
            qty: { gte: amount }
          },
          data: {
            qty: { decrement: amount }
          }
        });
      }

      // Add items to guild warehouse atomically
      await tx.guildWarehouse.upsert({
        where: {
          guildId_itemId: {
            guildId: membership.guild.id,
            itemId: itemId
          }
        },
        update: {
          quantity: { increment: amount }
        },
        create: {
          guildId: membership.guild.id,
          itemId: itemId,
          quantity: amount
        }
      });

      // Log the deposit activity
      await logGuildActivity(
        membership.guild.id,
        user.id,
        'warehouse_deposit',
        {
          itemId: itemId,
          amount: amount,
          previousQuantity: userInventory.qty,
          newQuantity: userInventory.qty - amount
        },
        tx
      );

      // Update member contribution points
      await tx.guildMember.update({
        where: { userId: user.id },
        data: {
          contributionPoints: { increment: amount * 10 } // 10 points per item deposited
        }
      });

      return { success: true };
    }, {
      isolationLevel: 'Serializable',
      timeout: 10000
    });

    if (!result.success) {
      return createErrorResponse('INTERNAL_ERROR', 'Transaction failed');
    }

    // Get item name for response
    const item = await prisma.itemDef.findUnique({
      where: { id: itemId },
      select: { name: true }
    });

    return createSuccessResponse(
      {},
      `Successfully deposited ${amount.toLocaleString()} ${item?.name || 'items'} to guild warehouse`
    );

  } catch (error) {
    console.error('Error depositing to guild warehouse:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Insufficient items')) {
        return createErrorResponse('MISSING_FIELDS', 'Insufficient items in your warehouse');
      }
    }
    
    return createErrorResponse('INTERNAL_ERROR', 'Failed to deposit items');
  }
}