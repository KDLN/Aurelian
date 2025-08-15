import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUser, 
  createErrorResponse, 
  createSuccessResponse,
  getUserGuildMembership 
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Get user's guild information
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }
    const { user } = authResult;

    console.log('Getting guild info for user:', user.id);

    // Get user's guild membership with detailed information
    const membership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      include: {
        guild: {
          include: {
            _count: {
              select: {
                members: true,
                warehouse: true,
                achievements: true,
                channels: true
              }
            },
            members: {
              select: {
                role: true,
                userId: true,
                user: {
                  select: {
                    profile: {
                      select: { display: true }
                    }
                  }
                }
              },
              orderBy: { joinedAt: 'asc' },
              take: 5 // Show recent members
            },
            achievements: {
              orderBy: { unlockedAt: 'desc' },
              take: 5 // Show recent achievements
            },
            channels: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
                description: true,
                roleRequired: true
              }
            }
          }
        }
      }
    }).catch(error => {
      console.error('Prisma error in guild info:', error);
      throw error;
    });

    if (!membership) {
      return NextResponse.json({
        success: true,
        inGuild: false,
        guild: null
      });
    }

    // Get recent guild activity
    const recentLogs = await prisma.guildLog.findMany({
      where: { guildId: membership.guildId },
      include: {
        user: {
          select: {
            profile: {
              select: { display: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Calculate level progress
    const currentLevel = membership.guild.level;
    const currentXP = membership.guild.xp;
    const xpForNext = membership.guild.xpNext;
    const xpProgress = (currentXP / xpForNext) * 100;

    // Format member roles distribution
    const roleDistribution = membership.guild.members.reduce((acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const guildInfo = {
      id: membership.guild.id,
      name: membership.guild.name,
      tag: membership.guild.tag,
      emblem: membership.guild.emblem ? JSON.parse(membership.guild.emblem) : null,
      description: membership.guild.description,
      level: currentLevel,
      xp: currentXP,
      xpNext: xpForNext,
      xpProgress: Math.round(xpProgress),
      treasury: membership.guild.treasury,
      maxMembers: membership.guild.maxMembers,
      isActive: membership.guild.isActive,
      createdAt: membership.guild.createdAt,
      updatedAt: membership.guild.updatedAt,
      
      // Counts
      memberCount: membership.guild._count.members,
      warehouseItemCount: membership.guild._count.warehouse,
      achievementCount: membership.guild._count.achievements,
      channelCount: membership.guild._count.channels,
      
      // User's membership info
      userRole: membership.role,
      userJoinedAt: membership.joinedAt,
      userContributionPoints: membership.contributionPoints,
      userPermissions: membership.permissions,
      
      // Recent data
      recentMembers: membership.guild.members.map(member => ({
        role: member.role,
        displayName: member.user.profile?.display || 'Unknown'
      })),
      
      recentAchievements: membership.guild.achievements.map(achievement => ({
        key: achievement.key,
        name: achievement.name,
        description: achievement.description,
        unlockedAt: achievement.unlockedAt,
        reward: achievement.reward
      })),
      
      channels: membership.guild.channels.filter(channel => {
        // Filter channels based on user's role
        if (!channel.roleRequired) return true;
        
        const roleHierarchy = { LEADER: 4, OFFICER: 3, TRADER: 2, MEMBER: 1 };
        const userLevel = roleHierarchy[membership.role];
        const requiredLevel = roleHierarchy[channel.roleRequired];
        
        return userLevel >= requiredLevel;
      }),
      
      recentActivity: recentLogs.map(log => ({
        action: log.action,
        details: log.details,
        createdAt: log.createdAt,
        user: log.user?.profile?.display || 'System'
      })),
      
      roleDistribution
    };

    return NextResponse.json({
      success: true,
      inGuild: true,
      guild: guildInfo
    });

  } catch (error) {
    console.error('Error fetching guild info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guild information' },
      { status: 500 }
    );
  }
}