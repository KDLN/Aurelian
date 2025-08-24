import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUserAndCheckAdmin, 
  createErrorResponse, 
  createSuccessResponse
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Only create supabase admin client if service role key is available
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null;

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUserAndCheckAdmin(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }

    const { user: adminUser } = authResult;

    const { userId } = await request.json();

    if (!userId) {
      return createErrorResponse('MISSING_FIELDS', 'userId is required');
    }

    // Prevent self-deletion
    if (userId === adminUser.id) {
      return createErrorResponse('VALIDATION_ERROR', 'Cannot delete your own admin account');
    }

    let userToDelete = await prisma.user.findUnique({ 
      where: { id: userId },
      include: { profile: true }
    });
    
    if (!userToDelete) {
      return createErrorResponse('NOT_FOUND', 'User not found');
    }

    const targetUserId = userToDelete.id;
    console.log(`Deleting user: ${targetUserId} (${userToDelete.email})`);

    // Start transaction to handle all deletions
    await prisma.$transaction(async (tx) => {
      // 1. Soft delete chat messages - convert to "Deleted User"
      await tx.chatMessage.updateMany({
        where: { senderId: userId },
        data: {
          senderDisplay: 'Deleted User',
        }
      });

      // 2. Remove from guilds (this will cascade to related records)
      await tx.guildMember.deleteMany({
        where: { userId: userId }
      });

      // 3. Delete personal data (cascading will handle related records)
      await tx.profile.deleteMany({
        where: { userId: userId }
      });

      await tx.wallet.deleteMany({
        where: { userId: userId }
      });

      await tx.character.deleteMany({
        where: { userId: userId }
      });

      await tx.inventory.deleteMany({
        where: { userId: userId }
      });

      await tx.mailFolder.deleteMany({
        where: { userId: userId }
      });

      await tx.mailBlock.deleteMany({
        where: { 
          OR: [
            { blockerId: userId },
            { blockedId: userId }
          ]
        }
      });

      // 4. Delete activity data
      await tx.craftJob.deleteMany({
        where: { userId: userId }
      });

      await tx.mission.deleteMany({
        where: { userId: userId }
      });

      await tx.missionInstance.deleteMany({
        where: { userId: userId }
      });

      await tx.listing.deleteMany({
        where: { sellerId: userId }
      });

      await tx.contract.deleteMany({
        where: { ownerId: userId }
      });

      // Keep mail for record keeping - they'll show "Deleted User"
      // Keep ledger transactions for audit purposes

      // 5. Finally, delete the user record
      await tx.user.delete({
        where: { id: userId }
      });
    });

    // 6. Delete from Supabase Auth (if service role key is available)
    try {
      if (supabaseAdmin) {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
          console.error('Failed to delete from Supabase Auth:', authError);
        } else {
          console.log('Successfully deleted user from Supabase Auth');
        }
      } else {
        console.warn('SUPABASE_SERVICE_ROLE_KEY not configured - skipping Supabase Auth deletion');
      }
    } catch (authError) {
      console.error('Error deleting from Supabase Auth:', authError);
    }

    console.log('User deleted successfully');

    return createSuccessResponse({
      deleted: true,
      userEmail: userToDelete.email,
      userDisplay: userToDelete.profile?.display
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to delete user');
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUserAndCheckAdmin(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }

    // List all users for admin reference
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true,
        profile: {
          select: {
            display: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      users: users,
      total: users.length
    });

  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json({
      error: 'Failed to list users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}