import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ProfileParams {
  params: {
    userId: string;
  };
}

export async function GET(request: NextRequest, { params }: ProfileParams) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const targetUserId = params.userId;

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        profile: true,
        guildMembership: {
          include: {
            guild: {
              select: {
                id: true,
                name: true,
                tag: true,
                emblem: true
              }
            }
          }
        },
        wallets: true
      }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch comprehensive stats
    const [
      missionStats,
      craftingStats,
      tradingStats,
      activityLogs,
      dailyStats
    ] = await Promise.all([
      // Mission statistics
      prisma.missionInstance.findMany({
        where: { userId: targetUserId },
        include: {
          mission: {
            select: {
              name: true,
              riskLevel: true,
              baseReward: true,
              fromHub: true,
              toHub: true
            }
          }
        }
      }),

      // Crafting statistics
      prisma.craftJob.findMany({
        where: { userId: targetUserId },
        include: {
          blueprint: {
            select: {
              key: true,
              output: {
                select: {
                  name: true,
                  key: true
                }
              }
            }
          }
        }
      }),

      // Trading statistics (listings + auction purchases)
      prisma.listing.findMany({
        where: { sellerId: targetUserId },
        include: {
          item: {
            select: {
              name: true,
              key: true
            }
          }
        }
      }),

      // Recent activity
      prisma.activityLog.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Aggregated daily stats
      prisma.dailyStats.findMany({
        where: { userId: targetUserId },
        orderBy: { date: 'desc' },
        take: 30
      })
    ]);

    // Calculate mission stats
    const missionOverview = {
      total: missionStats.length,
      completed: missionStats.filter(m => m.status === 'completed').length,
      failed: missionStats.filter(m => m.status === 'failed').length,
      active: missionStats.filter(m => m.status === 'active').length,
      successRate: 0,
      totalGoldEarned: missionStats.reduce((sum, m) => sum + (m.actualReward || 0), 0),
      longestStreak: calculateLongestStreak(missionStats),
      currentStreak: calculateCurrentStreak(missionStats),
      favoriteRiskLevel: getFavoriteRiskLevel(missionStats),
      mostPopularRoute: getMostPopularRoute(missionStats)
    };

    const totalAttempted = missionOverview.completed + missionOverview.failed;
    missionOverview.successRate = totalAttempted > 0 ? Math.round((missionOverview.completed / totalAttempted) * 100) : 0;

    // Calculate crafting stats
    const craftingOverview = {
      totalJobs: craftingStats.length,
      completed: craftingStats.filter(j => j.status === 'complete').length,
      currentLevel: targetUser.craftingLevel,
      currentXP: targetUser.craftingXP,
      nextLevelXP: targetUser.craftingXPNext,
      mostCraftedItem: getMostCraftedItem(craftingStats),
      totalItemsCrafted: craftingStats.filter(j => j.status === 'complete').reduce((sum, j) => sum + j.qty, 0)
    };

    // Calculate trading stats
    const tradingOverview = {
      totalListings: tradingStats.length,
      soldListings: tradingStats.filter(l => l.status === 'sold').length,
      activeListings: tradingStats.filter(l => l.status === 'active').length,
      totalGoldFromSales: tradingStats
        .filter(l => l.status === 'sold')
        .reduce((sum, l) => sum + (l.price * l.qty), 0),
      mostTradedItem: getMostTradedItem(tradingStats),
      averageListingPrice: getAverageListingPrice(tradingStats)
    };

    // Aggregate daily stats totals
    const allTimeStats = dailyStats.reduce((totals, day) => ({
      goldEarned: totals.goldEarned + day.goldEarned,
      goldSpent: totals.goldSpent + day.goldSpent,
      missionsCompleted: totals.missionsCompleted + day.missionsCompleted,
      missionsFailed: totals.missionsFailed + day.missionsFailed,
      itemsTraded: totals.itemsTraded + day.itemsTraded,
      itemsCrafted: totals.itemsCrafted + day.itemsCrafted,
      agentsHired: totals.agentsHired + day.agentsHired,
      activeTimeMinutes: totals.activeTimeMinutes + day.activeTimeMinutes,
      loginCount: totals.loginCount + day.loginCount
    }), {
      goldEarned: 0,
      goldSpent: 0,
      missionsCompleted: 0,
      missionsFailed: 0,
      itemsTraded: 0,
      itemsCrafted: 0,
      agentsHired: 0,
      activeTimeMinutes: 0,
      loginCount: 0
    });

    // Calculate achievements and titles
    const achievements = calculateAchievements({
      missionOverview,
      craftingOverview,
      tradingOverview,
      allTimeStats,
      user: targetUser
    });

    // Determine if viewer can perform actions
    const viewerPermissions = await getViewerPermissions(authUser.id, targetUserId);

    return NextResponse.json({
      success: true,
      profile: {
        user: {
          id: targetUser.id,
          display: targetUser.profile?.display || 'Trader',
          avatar: targetUser.profile?.avatar,
          createdAt: targetUser.createdAt,
          caravanSlotsUnlocked: targetUser.caravanSlotsUnlocked,
          caravanSlotsPremium: targetUser.caravanSlotsPremium
        },
        guild: targetUser.guildMembership ? {
          name: targetUser.guildMembership.guild.name,
          tag: targetUser.guildMembership.guild.tag,
          role: targetUser.guildMembership.role,
          contributionPoints: targetUser.guildMembership.contributionPoints,
          joinedAt: targetUser.guildMembership.joinedAt
        } : null,
        wallet: {
          gold: targetUser.wallets?.gold || 0
        },
        stats: {
          missions: missionOverview,
          crafting: craftingOverview,
          trading: tradingOverview,
          allTime: allTimeStats
        },
        achievements,
        recentActivity: activityLogs,
        permissions: viewerPermissions
      }
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateLongestStreak(missions: any[]): number {
  const sorted = missions
    .filter(m => m.status !== 'active')
    .sort((a, b) => new Date(a.completedAt || a.createdAt).getTime() - new Date(b.completedAt || b.createdAt).getTime());
  
  let longestStreak = 0;
  let currentStreak = 0;
  
  sorted.forEach(mission => {
    if (mission.status === 'completed') {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });
  
  return longestStreak;
}

function calculateCurrentStreak(missions: any[]): number {
  const sorted = missions
    .filter(m => m.status !== 'active')
    .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime());
  
  let streak = 0;
  
  for (const mission of sorted) {
    if (mission.status === 'completed') {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

function getFavoriteRiskLevel(missions: any[]): string {
  const riskCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  
  missions.forEach(mission => {
    const risk = mission.mission?.riskLevel;
    if (risk && riskCounts[risk as keyof typeof riskCounts] !== undefined) {
      riskCounts[risk as keyof typeof riskCounts]++;
    }
  });
  
  return Object.entries(riskCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'MEDIUM';
}

function getMostPopularRoute(missions: any[]): string {
  const routeCounts: { [key: string]: number } = {};
  
  missions.forEach(mission => {
    if (mission.mission) {
      const route = `${mission.mission.fromHub} → ${mission.mission.toHub}`;
      routeCounts[route] = (routeCounts[route] || 0) + 1;
    }
  });
  
  return Object.entries(routeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
}

function getMostCraftedItem(craftJobs: any[]): string {
  const itemCounts: { [key: string]: number } = {};
  
  craftJobs
    .filter(job => job.status === 'complete')
    .forEach(job => {
      const itemKey = job.blueprint?.output?.key || job.blueprint?.key;
      if (itemKey) {
        itemCounts[itemKey] = (itemCounts[itemKey] || 0) + job.qty;
      }
    });
  
  const topItem = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])[0];
  
  return topItem ? `${topItem[0]} (${topItem[1]}x)` : 'None';
}

function getMostTradedItem(listings: any[]): string {
  const itemCounts: { [key: string]: number } = {};
  
  listings
    .filter(l => l.status === 'sold')
    .forEach(listing => {
      const itemKey = listing.item?.key;
      if (itemKey) {
        itemCounts[itemKey] = (itemCounts[itemKey] || 0) + listing.qty;
      }
    });
  
  const topItem = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])[0];
  
  return topItem ? `${topItem[0]} (${topItem[1]}x)` : 'None';
}

function getAverageListingPrice(listings: any[]): number {
  const soldListings = listings.filter(l => l.status === 'sold');
  if (soldListings.length === 0) return 0;
  
  const totalValue = soldListings.reduce((sum, l) => sum + (l.price * l.qty), 0);
  return Math.round(totalValue / soldListings.length);
}

function calculateAchievements(data: any): string[] {
  const achievements: string[] = [];
  
  // Mission achievements
  if (data.missionOverview.completed >= 100) achievements.push('Century Runner');
  if (data.missionOverview.successRate >= 95) achievements.push('Near Perfect');
  if (data.missionOverview.longestStreak >= 10) achievements.push('Streak Master');
  if (data.missionOverview.totalGoldEarned >= 10000) achievements.push('Gold Hoarder');
  
  // Crafting achievements
  if (data.craftingOverview.currentLevel >= 10) achievements.push('Master Crafter');
  if (data.craftingOverview.totalItemsCrafted >= 500) achievements.push('Production Line');
  
  // Trading achievements
  if (data.tradingOverview.soldListings >= 50) achievements.push('Market Mogul');
  if (data.tradingOverview.totalGoldFromSales >= 5000) achievements.push('Sales Champion');
  
  // Time-based achievements
  if (data.allTimeStats.activeTimeMinutes >= 6000) achievements.push('Time Veteran'); // 100+ hours
  if (data.allTimeStats.loginCount >= 100) achievements.push('Dedicated Trader');
  
  // Social achievements
  if (data.user.caravanSlotsUnlocked >= 5) achievements.push('Caravan Master');
  
  return achievements;
}

async function getViewerPermissions(viewerId: string, targetUserId: string) {
  // Self-viewing always has full permissions
  if (viewerId === targetUserId) {
    return {
      canTrade: true,
      canMessage: true,
      canInviteToGuild: false, // Can't invite yourself
      canViewPrivateStats: true
    };
  }

  // Check if viewer has guild permissions for inviting
  const viewerGuildMembership = await prisma.guildMember.findUnique({
    where: { userId: viewerId },
    include: {
      guild: true
    }
  });

  const targetGuildMembership = await prisma.guildMember.findUnique({
    where: { userId: targetUserId }
  });

  const canInviteToGuild = viewerGuildMembership && 
    !targetGuildMembership && 
    ['LEADER', 'OFFICER'].includes(viewerGuildMembership.role);

  return {
    canTrade: true,
    canMessage: true,
    canInviteToGuild: !!canInviteToGuild,
    canViewPrivateStats: false // Could be enhanced with friend system
  };
}