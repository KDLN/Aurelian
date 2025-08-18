import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUser,
  createErrorResponse,
  createSuccessResponse,
  getUserGuildMembership,
  validateRequiredFields,
  checkRolePermissions,
  logGuildActivity
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Get pending requests for user's guild
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }
    const { user } = authResult;

    // Get user's guild membership
    const membershipResult = await getUserGuildMembership(user.id);
    if ('error' in membershipResult) {
      return createErrorResponse(membershipResult.error);
    }
    const { membership } = membershipResult;

    // Check role permissions - only leaders and officers can view requests
    if (!checkRolePermissions(membership.role, ['LEADER', 'OFFICER'])) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Only leaders and officers can view guild requests');
    }

    // Get all pending requests for the guild
    const requests = await prisma.guildRequest.findMany({
      where: {
        guildId: membership.guild.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      include: {
        user: {
          include: {
            profile: {
              select: {
                display: true,
                avatar: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' } // Oldest first
    });

    const formattedRequests = requests.map(req => ({
      id: req.id,
      user: {
        id: req.user.id,
        displayName: req.user.profile?.display || req.user.email || 'Unknown',
        avatar: req.user.profile?.avatar,
        email: req.user.email
      },
      message: req.message,
      status: req.status,
      createdAt: req.createdAt,
      expiresAt: req.expiresAt
    }));

    return createSuccessResponse({
      requests: formattedRequests,
      guild: {
        id: membership.guild.id,
        name: membership.guild.name,
        tag: membership.guild.tag
      }
    });

  } catch (error) {
    console.error('Error fetching guild requests:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch guild requests');
  }
}

// POST - Approve or reject a guild request
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
    const validationError = validateRequiredFields(body, ['requestId', 'action']);
    if (validationError) {
      return createErrorResponse('MISSING_FIELDS', validationError);
    }

    const { requestId, action, reason } = body;

    if (!['approve', 'reject'].includes(action)) {
      return createErrorResponse('MISSING_FIELDS', 'Action must be approve or reject');
    }

    // Get user's guild membership
    const membershipResult = await getUserGuildMembership(user.id);
    if ('error' in membershipResult) {
      return createErrorResponse(membershipResult.error);
    }
    const { membership } = membershipResult;

    // Check role permissions
    if (!checkRolePermissions(membership.role, ['LEADER', 'OFFICER'])) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Only leaders and officers can manage guild requests');
    }

    // Find the request
    const guildRequest = await prisma.guildRequest.findFirst({
      where: {
        id: requestId,
        guildId: membership.guild.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      include: {
        user: {
          include: {
            profile: {
              select: {
                display: true
              }
            }
          }
        }
      }
    });

    if (!guildRequest) {
      return createErrorResponse('NOT_FOUND', 'Request not found or already processed');
    }

    // Check if user is already in a guild (race condition protection)
    const existingMembership = await prisma.guildMember.findUnique({
      where: { userId: guildRequest.userId }
    });

    if (existingMembership) {
      // Update request status to expired since user joined another guild
      await prisma.guildRequest.update({
        where: { id: requestId },
        data: { 
          status: 'EXPIRED',
          updatedAt: new Date()
        }
      });
      
      return createErrorResponse('CONFLICT', 'User has already joined another guild');
    }

    if (action === 'approve') {
      // Check if guild is at capacity
      const memberCount = await prisma.guildMember.count({
        where: { guildId: membership.guild.id }
      });

      if (memberCount >= membership.guild.maxMembers) {
        return createErrorResponse('CONFLICT', 'Guild is at maximum capacity');
      }

      // Approve request - add user to guild
      await prisma.$transaction(async (tx) => {
        // Add user to guild
        await tx.guildMember.create({
          data: {
            guildId: membership.guild.id,
            userId: guildRequest.userId,
            role: 'MEMBER'
          }
        });

        // Update request status
        await tx.guildRequest.update({
          where: { id: requestId },
          data: { 
            status: 'APPROVED',
            updatedAt: new Date()
          }
        });

        // Delete any other pending requests for this user
        await tx.guildRequest.deleteMany({
          where: { 
            userId: guildRequest.userId,
            id: { not: requestId },
            status: 'PENDING'
          }
        });

        // Delete any pending invitations for this user
        await tx.guildInvite.deleteMany({
          where: { userId: guildRequest.userId }
        });

        // Log the join
        await tx.guildLog.create({
          data: {
            guildId: membership.guild.id,
            userId: user.id,
            action: 'member_joined_via_request',
            details: { 
              newMemberId: guildRequest.userId,
              requestId: requestId,
              approvedBy: user.id
            }
          }
        });
      });

      return createSuccessResponse({
        message: `${guildRequest.user.profile?.display || 'User'} has been accepted into the guild`,
        newMember: {
          id: guildRequest.user.id,
          displayName: guildRequest.user.profile?.display || guildRequest.user.email
        }
      });

    } else {
      // Reject request
      await prisma.$transaction(async (tx) => {
        await tx.guildRequest.update({
          where: { id: requestId },
          data: { 
            status: 'REJECTED',
            updatedAt: new Date()
          }
        });

        await tx.guildLog.create({
          data: {
            guildId: membership.guild.id,
            userId: user.id,
            action: 'join_request_rejected',
            details: { 
              rejectedUserId: guildRequest.userId,
              requestId: requestId,
              reason: reason || 'No reason provided',
              rejectedBy: user.id
            }
          }
        });
      });

      return createSuccessResponse({
        message: `Request from ${guildRequest.user.profile?.display || 'user'} has been rejected`
      });
    }

  } catch (error) {
    console.error('Error managing guild request:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to manage guild request');
  }
}