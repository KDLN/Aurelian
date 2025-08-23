import { NextRequest } from 'next/server';
import { 
  authenticateUser, 
  createErrorResponse, 
  createSuccessResponse
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST - Block a user from sending mail
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }

    const { user } = authResult;
    const body = await request.json();
    const { blockedUserId, reason } = body;

    if (!blockedUserId) {
      return createErrorResponse('MISSING_FIELDS', 'blockedUserId is required');
    }

    if (blockedUserId === user.id) {
      return createErrorResponse('VALIDATION_ERROR', 'Cannot block yourself');
    }

    // Check if user exists
    const blockedUser = await prisma.user.findUnique({
      where: { id: blockedUserId },
      include: { profile: true }
    });

    if (!blockedUser) {
      return createErrorResponse('NOT_FOUND', 'User not found');
    }

    // Check if already blocked
    const existingBlock = await prisma.mailBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: user.id,
          blockedId: blockedUserId
        }
      }
    });

    if (existingBlock) {
      return createErrorResponse('CONFLICT', 'User is already blocked');
    }

    // Create block
    const block = await prisma.mailBlock.create({
      data: {
        blockerId: user.id,
        blockedId: blockedUserId,
        reason: reason?.trim()
      }
    });

    return createSuccessResponse({
      blocked: true,
      blockedUser: blockedUser.profile?.display || 'Unknown',
      createdAt: block.createdAt.getTime()
    });

  } catch (error) {
    console.error('Error blocking user:', error);
    return createErrorResponse('INTERNAL_ERROR');
  }
}

// DELETE - Unblock a user
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }

    const { user } = authResult;
    const body = await request.json();
    const { blockedUserId } = body;

    if (!blockedUserId) {
      return createErrorResponse('MISSING_FIELDS', 'blockedUserId is required');
    }

    // Find and delete the block
    const deletedBlock = await prisma.mailBlock.deleteMany({
      where: {
        blockerId: user.id,
        blockedId: blockedUserId
      }
    });

    if (deletedBlock.count === 0) {
      return createErrorResponse('NOT_FOUND', 'Block not found');
    }

    return createSuccessResponse({ unblocked: true });

  } catch (error) {
    console.error('Error unblocking user:', error);
    return createErrorResponse('INTERNAL_ERROR');
  }
}

// GET - Get list of blocked users
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }

    const { user } = authResult;

    const blocks = await prisma.mailBlock.findMany({
      where: {
        blockerId: user.id
      },
      include: {
        blocked: {
          include: {
            profile: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedBlocks = blocks.map(block => ({
      id: block.id,
      blockedUserId: block.blockedId,
      blockedUserName: block.blocked.profile?.display || 'Unknown',
      reason: block.reason,
      createdAt: block.createdAt.getTime()
    }));

    return createSuccessResponse({ blocks: formattedBlocks });

  } catch (error) {
    console.error('Error fetching blocked users:', error);
    return createErrorResponse('INTERNAL_ERROR');
  }
}