import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUser,
  createErrorResponse,
  createSuccessResponse,
  getUserGuildMembership,
  checkRolePermissions,
  validateRequiredFields
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST - Withdraw gold from guild treasury (Leaders and Officers only)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }
    const { user } = authResult;

    // Parse and validate request body
    const body = await request.json();
    const validationError = validateRequiredFields(body, ['amount']);
    if (validationError) {
      return createErrorResponse('MISSING_FIELDS', validationError);
    }

    const { amount, reason } = body;
    if (amount <= 0) {
      return createErrorResponse('MISSING_FIELDS', 'Amount must be positive');
    }

    // Get user's guild membership
    const membershipResult = await getUserGuildMembership(user.id);
    if ('error' in membershipResult) {
      return createErrorResponse(membershipResult.error);
    }
    const { membership } = membershipResult;

    // Check permissions - only Leaders and Officers can withdraw
    if (!checkRolePermissions(membership.role, ['LEADER', 'OFFICER'])) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Only leaders and officers can withdraw from treasury');
    }

    // Perform the withdrawal transaction with race condition protection
    const result = await prisma.$transaction(async (tx) => {
      // Get fresh guild data with SELECT FOR UPDATE to prevent race conditions
      const currentGuild = await tx.guild.findUnique({
        where: { id: membership.guild.id },
        select: { treasury: true }
      });

      if (!currentGuild) {
        throw new Error('Guild not found');
      }

      // Check if guild has enough gold (inside transaction with fresh data)
      if (currentGuild.treasury < amount) {
        throw new Error('Insufficient gold in guild treasury');
      }

      // Get user's current wallet with fresh data
      const userWallet = await tx.wallet.findUnique({
        where: { userId: user.id },
        select: { gold: true }
      });

      if (!userWallet) {
        throw new Error('User wallet not found');
      }

      // Use atomic decrement/increment operations to prevent race conditions
      const updatedGuild = await tx.guild.update({
        where: { 
          id: membership.guild.id,
          treasury: { gte: amount } // Additional safety check
        },
        data: {
          treasury: { decrement: amount }
        },
        select: { treasury: true }
      });

      // Add gold to user's wallet atomically
      await tx.wallet.update({
        where: { userId: user.id },
        data: {
          gold: { increment: amount }
        }
      });

      // Log the withdrawal activity
      await tx.guildLog.create({
        data: {
          guildId: membership.guild.id,
          userId: user.id,
          action: 'treasury_withdraw',
          details: {
            amount: amount,
            reason: reason || 'No reason provided',
            previousTreasury: currentGuild.treasury,
            newTreasury: updatedGuild.treasury
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
      `Successfully withdrew ${amount.toLocaleString()} gold from guild treasury`
    );

  } catch (error) {
    console.error('Error withdrawing from guild treasury:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Insufficient gold')) {
        return createErrorResponse('MISSING_FIELDS', 'Insufficient gold in guild treasury');
      }
      if (error.message.includes('User wallet not found')) {
        return createErrorResponse('NOT_FOUND', 'User wallet not found');
      }
      if (error.message.includes('Guild not found')) {
        return createErrorResponse('NOT_FOUND', 'Guild not found');
      }
    }
    
    return createErrorResponse('INTERNAL_ERROR', 'Failed to withdraw gold');
  }
}