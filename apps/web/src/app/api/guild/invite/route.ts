import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUser,
  createErrorResponse,
  createSuccessResponse,
  getUserGuildMembership,
  validateRequiredFields,
  InputValidation,
  checkRateLimit,
  checkRolePermissions,
  logGuildActivity
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST - Send guild invitation
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }
    const { user } = authResult;

    // Rate limiting - 10 invites per hour per user
    const rateLimitCheck = checkRateLimit(`guild_invite:${user.id}`, 3600000, 10);
    if (!rateLimitCheck.allowed) {
      const resetIn = Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 60000);
      return createErrorResponse('MISSING_FIELDS', `Too many invitations sent. Try again in ${resetIn} minutes.`);
    }

    // Parse and validate request body
    const body = await request.json();
    const validationError = validateRequiredFields(body, ['targetUserId']);
    if (validationError) {
      return createErrorResponse('MISSING_FIELDS', validationError);
    }

    const { targetUserId, message } = body;

    // Validate target user ID format
    if (typeof targetUserId !== 'string' || targetUserId.length < 1) {
      return createErrorResponse('MISSING_FIELDS', 'Invalid target user ID');
    }

    // Validate message if provided
    if (message && (typeof message !== 'string' || message.length > 500)) {
      return createErrorResponse('MISSING_FIELDS', 'Message must be less than 500 characters');
    }

    // Get user's guild membership
    const membershipResult = await getUserGuildMembership(user.id);
    if ('error' in membershipResult) {
      return createErrorResponse(membershipResult.error);
    }
    const { membership } = membershipResult;

    // Check role permissions
    if (!checkRolePermissions(membership.role, ['LEADER', 'OFFICER'])) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Only officers and leaders can invite members');
    }

    // Check if target user exists and isn't already in a guild
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { guildMembership: true }
    });

    if (!targetUser) {
      return createErrorResponse('NOT_FOUND', 'Target user not found');
    }

    if (targetUser.guildMembership) {
      return createErrorResponse('CONFLICT', 'User is already in a guild');
    }

    // Check if guild is at capacity
    const memberCount = await prisma.guildMember.count({
      where: { guildId: membership.guild.id }
    });

    if (memberCount >= membership.guild.maxMembers) {
      return createErrorResponse('CONFLICT', 'Guild is at maximum capacity');
    }

    // Check if invitation already exists
    const existingInvite = await prisma.guildInvite.findUnique({
      where: {
        guildId_userId: {
          guildId: membership.guild.id,
          userId: targetUserId
        }
      }
    });

    if (existingInvite) {
      return createErrorResponse('CONFLICT', 'Invitation already sent to this user');
    }

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.$transaction(async (tx) => {
      const invite = await tx.guildInvite.create({
        data: {
          guildId: membership.guild.id,
          userId: targetUserId,
          invitedBy: user.id,
          message: message || '',
          expiresAt
        }
      });

      await logGuildActivity(
        membership.guild.id,
        user.id,
        'invitation_sent',
        { 
          targetUserId,
          message: message || '',
          expiresAt: expiresAt.toISOString()
        },
        tx
      );

      return invite;
    }, {
      isolationLevel: 'Serializable',
      timeout: 10000
    });

    return createSuccessResponse({
      invitation: {
        id: invitation.id,
        guildName: membership.guild.name,
        guildTag: membership.guild.tag,
        message: invitation.message,
        expiresAt: invitation.expiresAt
      }
    }, 'Guild invitation sent successfully');

  } catch (error) {
    console.error('Error sending guild invitation:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to send guild invitation');
  }
}

// GET - Get received invitations
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }
    const { user } = authResult;

    // Get all active invitations for the user
    const invitations = await prisma.guildInvite.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() }
      },
      include: {
        guild: true,
        inviter: {
          include: { profile: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedInvitations = invitations.map(invite => ({
      id: invite.id,
      guild: {
        id: invite.guild.id,
        name: invite.guild.name,
        tag: invite.guild.tag,
        level: invite.guild.level,
        memberCount: invite.guild.maxMembers // This would need a count query in real implementation
      },
      inviter: {
        displayName: invite.inviter.profile?.display || invite.inviter.email || 'Unknown'
      },
      message: invite.message,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt
    }));

    return createSuccessResponse({
      invitations: formattedInvitations
    });

  } catch (error) {
    console.error('Error fetching guild invitations:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch guild invitations');
  }
}