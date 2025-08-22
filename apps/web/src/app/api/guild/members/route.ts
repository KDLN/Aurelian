import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUser,
  createErrorResponse,
  createSuccessResponse,
  getUserGuildMembership,
  ROLE_HIERARCHY,
  canManageRole,
  logGuildActivity,
  validateRequiredFields,
  formatGuildMember
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - List guild members
export async function GET(request: NextRequest) {
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

    // Get user's guild membership
    const membershipResult = await getUserGuildMembership(user.id);
    if ('error' in membershipResult) {
      return createErrorResponse(membershipResult.error as string);
    }
    const { membership: userMembership } = membershipResult;

    // Get all guild members
    const members = await prisma.guildMember.findMany({
      where: { guildId: userMembership.guildId },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // LEADER first
        { joinedAt: 'asc' }
      ]
    });

    const formattedMembers = members.map(formatGuildMember);

    return createSuccessResponse({
      guild: {
        id: userMembership.guild.id,
        name: userMembership.guild.name,
        tag: userMembership.guild.tag
      },
      members: formattedMembers
    });

  } catch (error) {
    console.error('Error fetching guild members:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch guild members');
  }
}

// POST - Manage member (promote, demote, kick)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }
    const { user } = authResult;

    // Parse and validate request body
    const body = await request.json();
    const validationError = validateRequiredFields(body, ['action', 'targetUserId']);
    if (validationError) {
      return createErrorResponse('MISSING_FIELDS', validationError);
    }

    const { action, targetUserId, newRole } = body;

    // Get user's guild membership
    const membershipResult = await getUserGuildMembership(user.id);
    if ('error' in membershipResult) {
      return createErrorResponse(membershipResult.error as string);
    }
    const { membership: userMembership } = membershipResult;

    // Check if target is in the same guild
    const targetMembership = await prisma.guildMember.findFirst({
      where: { 
        userId: targetUserId,
        guildId: userMembership.guild.id
      }
    });

    if (!targetMembership) {
      return createErrorResponse('NOT_FOUND', 'Target user is not in your guild');
    }

    // Permission checks using utility functions
    const userRoleLevel = ROLE_HIERARCHY[userMembership.role];
    const targetRoleLevel = ROLE_HIERARCHY[targetMembership.role];

    switch (action) {
      case 'promote':
      case 'demote':
        // Only leaders and officers can promote/demote
        if (userRoleLevel < 3) {
          return createErrorResponse('INSUFFICIENT_PERMISSIONS');
        }
        
        // Can't promote/demote someone of equal or higher rank
        if (!canManageRole(userMembership.role, targetMembership.role)) {
          return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Cannot manage member of equal or higher rank');
        }

        if (!newRole || !ROLE_HIERARCHY[newRole as keyof typeof ROLE_HIERARCHY]) {
          return createErrorResponse('MISSING_FIELDS', 'Invalid role');
        }

        // Only leader can promote to officer or leader
        if (newRole === 'OFFICER' || newRole === 'LEADER') {
          if (userMembership.role !== 'LEADER') {
            return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Only guild leader can promote to officer or leader');
          }
        }

        await prisma.$transaction(async (tx) => {
          await tx.guildMember.update({
            where: { id: targetMembership.id },
            data: { role: newRole as any }
          });

          await logGuildActivity(
            userMembership.guild.id,
            user.id,
            action === 'promote' ? 'member_promoted' : 'member_demoted',
            { 
              targetUserId,
              oldRole: targetMembership.role,
              newRole
            },
            tx
          );
        });

        break;

      case 'kick':
        // Only leaders and officers can kick
        if (userRoleLevel < 3) {
          return createErrorResponse('INSUFFICIENT_PERMISSIONS');
        }
        
        // Can't kick someone of equal or higher rank
        if (!canManageRole(userMembership.role, targetMembership.role)) {
          return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Cannot kick member of equal or higher rank');
        }

        // Can't kick yourself
        if (targetUserId === user.id) {
          return createErrorResponse('MISSING_FIELDS', 'Cannot kick yourself');
        }

        await prisma.$transaction(async (tx) => {
          await tx.guildMember.delete({
            where: { id: targetMembership.id }
          });

          await logGuildActivity(
            userMembership.guild.id,
            user.id,
            'member_kicked',
            { 
              targetUserId,
              targetRole: targetMembership.role
            },
            tx
          );
        });

        break;

      default:
        return createErrorResponse('MISSING_FIELDS', 'Invalid action');
    }

    return createSuccessResponse({});

  } catch (error) {
    console.error('Error managing guild member:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to manage guild member');
  }
}