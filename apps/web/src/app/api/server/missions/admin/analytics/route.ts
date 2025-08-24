import { NextRequest, NextResponse } from 'next/server';
import { authenticateUserAndCheckAdmin, createErrorResponse, createSuccessResponse } from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

// GET /api/server/missions/admin/analytics - Get server mission overview analytics
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUserAndCheckAdmin(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }

    // Get mission counts by status
    const missionsByStatus = await prisma.serverMission.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    // Get mission counts by type
    const missionsByType = await prisma.serverMission.groupBy({
      by: ['type'],
      _count: { id: true }
    });

    // Get total participation stats
    const totalParticipants = await prisma.serverMissionParticipant.count();
    const uniqueParticipants = await prisma.serverMissionParticipant.groupBy({
      by: ['userId'],
      _count: { id: true }
    });

    // Get recent mission activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentActivity = await prisma.serverMission.findMany({
      where: {
        OR: [
          { createdAt: { gte: weekAgo } },
          { startedAt: { gte: weekAgo } },
          { completedAt: { gte: weekAgo } }
        ]
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        _count: {
          select: { participants: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Calculate success rate for completed missions
    const completedMissions = await prisma.serverMission.findMany({
      where: { status: { in: ['completed', 'failed'] } },
      select: { 
        status: true,
        globalRequirements: true,
        globalProgress: true
      }
    });

    const successfulMissions = completedMissions.filter(mission => mission.status === 'completed').length;
    const successRate = completedMissions.length > 0 ? (successfulMissions / completedMissions.length) * 100 : 0;

    // Get top participating guilds
    const guildParticipation = await prisma.serverMissionParticipant.groupBy({
      by: ['guildId'],
      where: { guildId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    });

    const topGuilds = await Promise.all(
      guildParticipation.map(async (stat) => {
        const guild = await prisma.guild.findUnique({
          where: { id: stat.guildId! },
          select: { name: true, tag: true, level: true }
        });
        return {
          guild,
          participationCount: stat._count.id
        };
      })
    );

    // Economic impact (rewards distributed)
    const rewardsDistributed = await prisma.ledgerTx.aggregate({
      where: {
        reason: { contains: 'Server Mission Reward' },
        createdAt: { gte: weekAgo }
      },
      _sum: { amount: true },
      _count: { id: true }
    });

    // Format status distribution
    const statusDistribution = missionsByStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Format type distribution
    const typeDistribution = missionsByType.reduce((acc, curr) => {
      acc[curr.type] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    return createSuccessResponse({
      overview: {
        totalMissions: missionsByStatus.reduce((sum, curr) => sum + curr._count.id, 0),
        activeMissions: statusDistribution.active || 0,
        scheduledMissions: statusDistribution.scheduled || 0,
        completedMissions: statusDistribution.completed || 0,
        failedMissions: statusDistribution.failed || 0,
        successRate: Math.round(successRate * 100) / 100
      },
      participation: {
        totalParticipations: totalParticipants,
        uniqueParticipants: uniqueParticipants.length,
        averageParticipationsPerUser: totalParticipants > 0 ? Math.round((totalParticipants / uniqueParticipants.length) * 100) / 100 : 0
      },
      distribution: {
        byStatus: statusDistribution,
        byType: typeDistribution
      },
      recentActivity: recentActivity.map(mission => ({
        id: mission.id,
        name: mission.name,
        type: mission.type,
        status: mission.status,
        participantCount: mission._count.participants,
        createdAt: mission.createdAt,
        startedAt: mission.startedAt,
        completedAt: mission.completedAt
      })),
      topGuilds: topGuilds.filter(item => item.guild !== null),
      economicImpact: {
        goldDistributed: rewardsDistributed._sum.amount || 0,
        rewardTransactions: rewardsDistributed._count.id || 0,
        timeframe: '7 days'
      }
    });

  } catch (error) {
    console.error('Error fetching server mission analytics:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch analytics');
  }
}