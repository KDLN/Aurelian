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

// POST - Withdraw items from guild warehouse
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

    // Perform the withdrawal transaction with race condition protection
    const result = await prisma.$transaction(async (tx) => {
      // Get fresh warehouse data inside transaction
      const guildWarehouse = await tx.guildWarehouse.findUnique({
        where: {
          guildId_itemId: {
            guildId: membership.guild.id,
            itemId: itemId
          }
        }
      });

      if (!guildWarehouse || guildWarehouse.quantity < amount) {
        throw new Error('Insufficient items in guild warehouse');
      }

      // Use atomic operations for safe quantity updates
      if (guildWarehouse.quantity === amount) {
        // Remove the warehouse record entirely if withdrawing all items
        await tx.guildWarehouse.delete({
          where: {
            guildId_itemId: {
              guildId: membership.guild.id,
              itemId: itemId
            }
          }
        });
      } else {
        // Atomic decrement with safety check
        await tx.guildWarehouse.update({
          where: {
            guildId_itemId: {
              guildId: membership.guild.id,
              itemId: itemId
            },
            quantity: { gte: amount }
          },
          data: {
            quantity: { decrement: amount }
          }
        });
      }

      // Add items to user's warehouse atomically
      await tx.inventory.upsert({
        where: {
          userId_itemId_location: {
            userId: user.id,
            itemId: itemId,
            location: 'warehouse'
          }
        },
        update: {
          qty: { increment: amount }
        },
        create: {
          userId: user.id,
          itemId: itemId,
          qty: amount,
          location: 'warehouse'
        }
      });

      // Log the withdrawal activity
      await logGuildActivity(
        membership.guild.id,
        user.id,
        'warehouse_withdraw',
        {
          itemId: itemId,
          amount: amount,
          previousQuantity: guildWarehouse.quantity,
          newQuantity: guildWarehouse.quantity - amount
        },
        tx
      );

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
      `Successfully withdrew ${amount.toLocaleString()} ${item?.name || 'items'} from guild warehouse`
    );

  } catch (error) {
    console.error('Error withdrawing from guild warehouse:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Insufficient items')) {
        return createErrorResponse('MISSING_FIELDS', 'Insufficient items in guild warehouse');
      }
    }
    
    return createErrorResponse('INTERNAL_ERROR', 'Failed to withdraw items');
  }
}