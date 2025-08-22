import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUser,
  createErrorResponse,
  createSuccessResponse,
  getUserGuildMembership,
  checkRolePermissions
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Get guild health report
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
    const { membership } = membershipResult;

    // Only officers and leaders can view guild health
    if (!checkRolePermissions(membership.role, ['LEADER', 'OFFICER'])) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Only officers and leaders can view guild health reports');
    }

    const healthReport = await generateGuildHealthReport(membership.guild.id);

    return createSuccessResponse({
      guildId: membership.guild.id,
      guildName: membership.guild.name,
      generatedAt: new Date().toISOString(),
      ...healthReport
    });

  } catch (error) {
    console.error('Error generating guild health report:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to generate guild health report');
  }
}

async function generateGuildHealthReport(guildId: string) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get basic guild info
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    include: {
      members: {
        include: {
          user: {
            include: {
              profile: true
            }
          }
        }
      },
      channels: true,
      achievements: true,
      warehouse: {
        include: {
          item: {
            select: { name: true, key: true }
          }
        }
      }
    }
  });

  if (!guild) {
    throw new Error('Guild not found');
  }

  // Member activity analysis
  const memberStats = analyzeMemberActivity(guild.members, thirtyDaysAgo);

  // Recent activity analysis
  const recentActivity = await analyzeRecentActivity(guildId, sevenDaysAgo);

  // Financial health
  const financialHealth = analyzeFinancialHealth(guild);

  // Warehouse health
  const warehouseHealth = analyzeWarehouseHealth(guild.warehouse);

  // Leadership analysis
  const leadershipHealth = analyzeLeadership(guild.members);

  // Overall health score (0-100)
  const healthScore = calculateOverallHealthScore({
    memberStats,
    recentActivity,
    financialHealth,
    warehouseHealth,
    leadershipHealth
  });

  return {
    healthScore,
    status: getHealthStatus(healthScore),
    memberStats,
    recentActivity,
    financialHealth,
    warehouseHealth,
    leadershipHealth,
    recommendations: generateRecommendations({
      healthScore,
      memberStats,
      recentActivity,
      financialHealth,
      warehouseHealth,
      leadershipHealth
    })
  };
}

function analyzeMemberActivity(members: any[], thirtyDaysAgo: Date) {
  const total = members.length;
  const active = members.filter(m => m.lastActive > thirtyDaysAgo).length;
  const inactive = total - active;
  
  const roleDistribution = {
    LEADER: members.filter(m => m.role === 'LEADER').length,
    OFFICER: members.filter(m => m.role === 'OFFICER').length,
    TRADER: members.filter(m => m.role === 'TRADER').length,
    MEMBER: members.filter(m => m.role === 'MEMBER').length
  };

  const avgContribution = members.reduce((sum, m) => sum + m.contributionPoints, 0) / total;

  return {
    total,
    active,
    inactive,
    activityRate: total > 0 ? (active / total) * 100 : 0,
    roleDistribution,
    avgContributionPoints: Math.round(avgContribution),
    topContributors: members
      .sort((a, b) => b.contributionPoints - a.contributionPoints)
      .slice(0, 5)
      .map(m => ({
        name: m.user.profile?.display || 'Unknown',
        role: m.role,
        points: m.contributionPoints
      }))
  };
}

async function analyzeRecentActivity(guildId: string, sevenDaysAgo: Date) {
  const logs = await prisma.guildLog.findMany({
    where: {
      guildId,
      createdAt: { gt: sevenDaysAgo }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  const actionCounts: Record<string, number> = {};
  logs.forEach(log => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
  });

  const dailyActivity = calculateDailyActivity(logs, sevenDaysAgo);

  return {
    totalActivities: logs.length,
    dailyAverage: logs.length / 7,
    actionBreakdown: actionCounts,
    dailyActivity,
    mostActiveDay: Object.entries(dailyActivity).reduce((a, b) => 
      dailyActivity[a[0]] > dailyActivity[b[0]] ? a : b
    )[0]
  };
}

function calculateDailyActivity(logs: any[], sevenDaysAgo: Date) {
  const dailyActivity: Record<string, number> = {};
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    dailyActivity[dateStr] = 0;
  }

  logs.forEach(log => {
    const dateStr = log.createdAt.toISOString().split('T')[0];
    if (dailyActivity[dateStr] !== undefined) {
      dailyActivity[dateStr]++;
    }
  });

  return dailyActivity;
}

function analyzeFinancialHealth(guild: any) {
  const treasury = guild.treasury;
  const level = guild.level;
  
  // Calculate expected treasury based on guild level
  const expectedTreasury = level * 1000;
  const treasuryRatio = treasury / expectedTreasury;
  
  return {
    currentTreasury: treasury,
    expectedTreasury,
    treasuryRatio,
    status: getTreasuryStatus(treasuryRatio),
    guildLevel: level,
    xp: guild.xp,
    xpNext: guild.xpNext,
    xpProgress: (guild.xp / guild.xpNext) * 100
  };
}

function analyzeWarehouseHealth(warehouse: any[]) {
  const totalItems = warehouse.reduce((sum, item) => sum + item.quantity, 0);
  const itemTypes = [...new Set(warehouse.map(item => item.item.type))];
  const diversity = itemTypes.length;
  
  const itemBreakdown: Record<string, number> = {};
  warehouse.forEach(item => {
    itemBreakdown[item.item.name] = item.quantity;
  });

  return {
    totalItems,
    uniqueItemTypes: warehouse.length,
    diversity,
    itemTypes,
    topItems: Object.entries(itemBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, qty]) => ({ name, quantity: qty })),
    isEmpty: totalItems === 0,
    status: getWarehouseStatus(totalItems, diversity)
  };
}

function analyzeLeadership(members: any[]) {
  const leaders = members.filter(m => m.role === 'LEADER');
  const officers = members.filter(m => m.role === 'OFFICER');
  
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activeLeaders = leaders.filter(l => l.lastActive > thirtyDaysAgo);
  const activeOfficers = officers.filter(o => o.lastActive > thirtyDaysAgo);

  return {
    totalLeaders: leaders.length,
    totalOfficers: officers.length,
    activeLeaders: activeLeaders.length,
    activeOfficers: activeOfficers.length,
    leadershipHealth: (activeLeaders.length + activeOfficers.length) / (leaders.length + officers.length) * 100,
    hasActiveLeadership: activeLeaders.length > 0,
    needsMoreOfficers: officers.length < Math.ceil(members.length / 10), // 1 officer per 10 members
    leaderDetails: leaders.map(l => ({
      name: l.user.profile?.display || 'Unknown',
      lastActive: l.lastActive,
      isActive: l.lastActive > thirtyDaysAgo
    }))
  };
}

function calculateOverallHealthScore(data: any) {
  let score = 0;
  
  // Member activity (30 points)
  score += Math.min(data.memberStats.activityRate * 0.3, 30);
  
  // Recent activity (20 points)
  score += Math.min(data.recentActivity.dailyAverage * 2, 20);
  
  // Financial health (20 points)
  score += Math.min(data.financialHealth.treasuryRatio * 20, 20);
  
  // Leadership health (20 points)
  score += Math.min(data.leadershipHealth.leadershipHealth * 0.2, 20);
  
  // Warehouse diversity (10 points)
  score += Math.min(data.warehouseHealth.diversity * 2, 10);
  
  return Math.round(Math.max(0, Math.min(100, score)));
}

function getHealthStatus(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Poor';
  return 'Critical';
}

function getTreasuryStatus(ratio: number): string {
  if (ratio >= 2) return 'Excellent';
  if (ratio >= 1) return 'Good';
  if (ratio >= 0.5) return 'Fair';
  if (ratio >= 0.25) return 'Poor';
  return 'Critical';
}

function getWarehouseStatus(totalItems: number, diversity: number): string {
  if (totalItems === 0) return 'Empty';
  if (diversity >= 5 && totalItems >= 100) return 'Excellent';
  if (diversity >= 3 && totalItems >= 50) return 'Good';
  if (diversity >= 2 && totalItems >= 25) return 'Fair';
  return 'Poor';
}

function generateRecommendations(data: any): string[] {
  const recommendations: string[] = [];
  
  if (data.memberStats.activityRate < 50) {
    recommendations.push('Consider removing inactive members to improve guild activity');
  }
  
  if (data.recentActivity.dailyAverage < 2) {
    recommendations.push('Encourage more guild activities and communication');
  }
  
  if (data.financialHealth.treasuryRatio < 0.5) {
    recommendations.push('Focus on building up the guild treasury through member contributions');
  }
  
  if (!data.leadershipHealth.hasActiveLeadership) {
    recommendations.push('CRITICAL: No active leadership found - consider leadership transfer');
  }
  
  if (data.leadershipHealth.needsMoreOfficers) {
    recommendations.push('Consider promoting active members to officer roles');
  }
  
  if (data.warehouseHealth.isEmpty) {
    recommendations.push('Start building warehouse inventory through member contributions');
  }
  
  if (data.warehouseHealth.diversity < 3) {
    recommendations.push('Diversify warehouse inventory with different item types');
  }
  
  if (data.healthScore < 40) {
    recommendations.push('Guild health is concerning - consider major organizational changes');
  }
  
  return recommendations;
}