import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUser,
  createErrorResponse,
  createSuccessResponse,
  getUserGuildMembership,
  logGuildActivity,
  validateRequiredFields
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST - Deposit gold to guild treasury
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

    // Parse and validate request body
    const body = await request.json();
    const validationError = validateRequiredFields(body, ['amount']);
    if (validationError) {
      return createErrorResponse('MISSING_FIELDS', validationError);
    }

    const { amount } = body;
    if (amount <= 0) {
      return createErrorResponse('MISSING_FIELDS', 'Amount must be positive');
    }

    // Get user's guild membership
    const membershipResult = await getUserGuildMembership(user.id);
    if ('error' in membershipResult) {
      return createErrorResponse(membershipResult.error as string);
    }
    const { membership } = membershipResult;

    // Perform the deposit transaction with race condition protection
    const result = await prisma.$transaction(async (tx) => {
      // Get fresh wallet data with atomic operations
      const userWallet = await tx.wallet.findUnique({
        where: { userId: user.id },
        select: { gold: true }
      });

      if (!userWallet) {
        throw new Error('User wallet not found');
      }

      // Check if user has enough gold (inside transaction with fresh data)
      if (userWallet.gold < amount) {
        throw new Error('Insufficient gold');
      }

      // Use atomic decrement/increment operations to prevent race conditions
      const updatedWallet = await tx.wallet.update({
        where: { 
          userId: user.id,
          gold: { gte: amount } // Additional safety check
        },
        data: {
          gold: { decrement: amount }
        },
        select: { gold: true }
      });

      // Add gold to guild treasury atomically
      await tx.guild.update({
        where: { id: membership.guild.id },
        data: {
          treasury: { increment: amount }
        }
      });

      // Log the deposit activity
      await tx.guildLog.create({
        data: {
          guildId: membership.guild.id,
          userId: user.id,
          action: 'treasury_deposit',
          details: {
            amount: amount,
            previousBalance: userWallet.gold,
            newBalance: updatedWallet.gold
          }
        }
      });

      // Update member contribution points
      await tx.guildMember.update({
        where: { userId: user.id },
        data: {
          contributionPoints: {
            increment: Math.floor(amount / 10) // 1 point per 10 gold deposited
          }
        }
      });

      return { success: true };
    }, {
      isolationLevel: 'Serializable', // Strongest isolation level
      timeout: 10000 // 10 second timeout
    });

    if (!result.success) {
      return createErrorResponse('INTERNAL_ERROR', 'Transaction failed');
    }

    return createSuccessResponse(
      {},
      `Successfully deposited ${amount.toLocaleString()} gold to guild treasury`
    );

  } catch (error) {
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Insufficient gold')) {
        return createErrorResponse('MISSING_FIELDS', 'Insufficient gold');
      }
      if (error.message.includes('User wallet not found')) {
        return createErrorResponse('NOT_FOUND', 'User wallet not found');
      }
    }
    
    return createErrorResponse('INTERNAL_ERROR', 'Failed to deposit gold');
  }
}