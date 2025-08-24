import { NextRequest, NextResponse } from 'next/server';
import { authenticateUserAndCheckAdmin, createErrorResponse, createSuccessResponse } from '@/lib/apiUtils';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ missionId: string }>;
}

// GET /api/server/missions/admin/[missionId]/stats - Get detailed analytics
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    const { missionId } = await params;
    
    const authResult = await authenticateUserAndCheckAdmin(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }

    const mission = await prisma.serverMission.findUnique({
      where: { id: missionId },
      include: {
        participants: {
          include: {
            user: {
              include: {
                profile: { select: { display: true } },
                guildMembership: {
                  include: {
                    guild: { select: { name: true, tag: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!mission) {
      return createErrorResponse('NOT_FOUND', 'Mission not found');
    }

    // Calculate participation statistics
    const totalParticipants = mission.participants.length;
    const tierDistribution = {
      bronze: 0,
      silver: 0,
      gold: 0,
      legendary: 0,
      unranked: 0
    };

    const guildParticipation = new Map<string, {
      name: string;
      tag: string;
      count: number;
      members: string[];
    }>();

    const rewardsClaimed = mission.participants.filter(p => p.rewardClaimed).length;
    
    mission.participants.forEach(participant => {
      // Tier distribution
      if (participant.tier) {
        tierDistribution[participant.tier as keyof typeof tierDistribution]++;
      } else {
        tierDistribution.unranked++;
      }

      // Guild participation
      const guild = participant.user.guildMembership?.guild;
      if (guild) {
        if (!guildParticipation.has(guild.name)) {
          guildParticipation.set(guild.name, {
            name: guild.name,
            tag: guild.tag,
            count: 0,
            members: []
          });
        }
        const guildStats = guildParticipation.get(guild.name)!;
        guildStats.count++;
        guildStats.members.push(participant.user.profile?.display || 'Unknown');
      }
    });

    // Calculate progress percentage
    const requirements = mission.globalRequirements as any;
    const progress = mission.globalProgress as any;
    const progressPercentages: Record<string, number> = {};

    if (requirements.items) {
      for (const [itemKey, required] of Object.entries(requirements.items as Record<string, number>)) {
        const current = progress.items?.[itemKey] || 0;
        progressPercentages[`items_${itemKey}`] = Math.min((current / required) * 100, 100);
      }
    }

    if (requirements.gold) {
      const current = progress.gold || 0;
      progressPercentages.gold = Math.min((current / requirements.gold) * 100, 100);
    }

    if (requirements.trades) {
      const current = progress.trades || 0;
      progressPercentages.trades = Math.min((current / requirements.trades) * 100, 100);
    }

    // Overall completion percentage (average of all requirements)
    const overallProgress = Object.keys(progressPercentages).length > 0 
      ? Object.values(progressPercentages).reduce((sum, pct) => sum + pct, 0) / Object.keys(progressPercentages).length
      : 0;

    // Time-based statistics
    const now = new Date();
    const startTime = mission.startedAt ? new Date(mission.startedAt) : null;
    const endTime = new Date(mission.endsAt);
    const completedTime = mission.completedAt ? new Date(mission.completedAt) : null;

    const timeStats = {
      isActive: mission.status === 'active',
      timeRemaining: mission.status === 'active' && startTime ? Math.max(0, endTime.getTime() - now.getTime()) : 0,
      totalDuration: startTime ? endTime.getTime() - startTime.getTime() : endTime.getTime() - new Date(mission.createdAt).getTime(),
      actualDuration: completedTime && startTime ? completedTime.getTime() - startTime.getTime() : null,
      participationRate: startTime ? mission.participants.filter(p => 
        new Date(p.joinedAt) <= now
      ).length : 0
    };

    // Top contributors (by tier and join order)
    const topContributors = mission.participants
      .sort((a, b) => {
        const tierOrder = { legendary: 4, gold: 3, silver: 2, bronze: 1 };
        const tierA = tierOrder[a.tier as keyof typeof tierOrder] || 0;
        const tierB = tierOrder[b.tier as keyof typeof tierOrder] || 0;
        
        if (tierA !== tierB) return tierB - tierA;
        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      })
      .slice(0, 10)
      .map(participant => ({
        userId: participant.userId,
        displayName: participant.user.profile?.display || 'Anonymous',
        guild: participant.user.guildMembership?.guild || null,
        tier: participant.tier,
        rank: participant.rank,
        contribution: participant.contribution,
        rewardClaimed: participant.rewardClaimed,
        joinedAt: participant.joinedAt
      }));

    return createSuccessResponse({
      overview: {
        id: mission.id,
        name: mission.name,
        type: mission.type,
        status: mission.status,
        overallProgress: Math.round(overallProgress * 100) / 100,
        totalParticipants,
        rewardsClaimed,
        createdAt: mission.createdAt,
        startedAt: mission.startedAt,
        endsAt: mission.endsAt,
        completedAt: mission.completedAt
      },
      participation: {
        total: totalParticipants,
        tierDistribution,
        rewardsClaimedPercentage: totalParticipants > 0 ? Math.round((rewardsClaimed / totalParticipants) * 100) : 0,
        guildParticipation: Array.from(guildParticipation.values()).sort((a, b) => b.count - a.count)
      },
      progress: {
        requirements: mission.globalRequirements,
        current: mission.globalProgress,
        percentages: progressPercentages,
        overall: overallProgress
      },
      timing: timeStats,
      topContributors
    });

  } catch (error) {
    console.error('Error fetching mission stats:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch mission statistics');
  }
}