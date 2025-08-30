import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUser, 
  createErrorResponse, 
  createSuccessResponse,
  getUserGuildMembership 
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

/**
 * Guild Root API
 * Returns basic guild information for the authenticated user
 * 
 * This endpoint serves as a lightweight version of /api/guild/info
 * Used by the hub page to check guild membership status
 */

export const dynamic = 'force-dynamic';

// GET - Get user's basic guild information
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

    console.log('Getting basic guild info for user:', user.id);

    // Get user's guild membership with basic information
    const membership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      include: {
        guild: {
          select: {
            id: true,
            name: true,
            tag: true,
            emblem: true,
            description: true,
            level: true,
            xp: true,
            xpNext: true,
            treasury: true,
            maxMembers: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: {
                members: true
              }
            }
          }
        }
      }
    }).catch(error => {
      console.error('Prisma error in basic guild info:', error);
      throw error;
    });

    if (!membership) {
      console.log('No guild membership found for user:', user.id);
      return createSuccessResponse({
        inGuild: false,
        guild: null
      });
    }

    console.log('Found guild membership:', {
      guildId: membership.guildId,
      guildName: membership.guild.name,
      userRole: membership.role
    });

    // Calculate level progress
    const currentLevel = membership.guild.level;
    const currentXP = membership.guild.xp;
    const xpForNext = membership.guild.xpNext;
    const xpProgress = (currentXP / xpForNext) * 100;

    const basicGuildInfo = {
      id: membership.guild.id,
      name: membership.guild.name,
      tag: membership.guild.tag,
      emblem: membership.guild.emblem ? JSON.parse(membership.guild.emblem as string) : null,
      description: membership.guild.description,
      level: currentLevel,
      xp: currentXP,
      xpNext: xpForNext,
      xpProgress: Math.round(xpProgress),
      treasury: membership.guild.treasury,
      maxMembers: membership.guild.maxMembers,
      isActive: membership.guild.isActive,
      createdAt: membership.guild.createdAt,
      
      // Counts
      memberCount: membership.guild._count.members,
      
      // User's membership info
      userRole: membership.role,
      userJoinedAt: membership.joinedAt,
      userContributionPoints: membership.contributionPoints,
      userPermissions: membership.permissions
    };

    return createSuccessResponse({
      inGuild: true,
      guild: basicGuildInfo
    });

  } catch (error) {
    console.error('Error fetching basic guild info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guild information' },
      { status: 500 }
    );
  }
}