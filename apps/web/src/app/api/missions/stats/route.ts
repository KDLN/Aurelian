import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Fetch mission statistics for a user
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    // Get JWT token from headers
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch all mission instances for the user
    const [allMissions, recentMissions, bestRewards] = await Promise.all([
      // Overall stats
      prisma.missionInstance.findMany({
        where: { userId: user.id },
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
        },
        orderBy: {
          completedAt: 'desc'
        }
      }),
      
      // Recent missions (last 10)
      prisma.missionInstance.findMany({
        where: { 
          userId: user.id,
          status: { in: ['completed', 'failed'] }
        },
        include: {
          mission: {
            select: {
              name: true,
              riskLevel: true,
              baseReward: true
            }
          }
        },
        orderBy: {
          completedAt: 'desc'
        },
        take: 10
      }),
      
      // Best rewards (top 5)
      prisma.missionInstance.findMany({
        where: { 
          userId: user.id,
          status: 'completed',
          actualReward: { not: null }
        },
        include: {
          mission: {
            select: {
              name: true,
              riskLevel: true
            }
          }
        },
        orderBy: {
          actualReward: 'desc'
        },
        take: 5
      })
    ]);

    // Calculate statistics
    const totalMissions = allMissions.length;
    const completedMissions = allMissions.filter(m => m.status === 'completed').length;
    const failedMissions = allMissions.filter(m => m.status === 'failed').length;
    const activeMissions = allMissions.filter(m => m.status === 'active').length;
    
    // Success rate
    const totalAttempted = completedMissions + failedMissions;
    const successRate = totalAttempted > 0 ? (completedMissions / totalAttempted) * 100 : 0;
    
    // Risk level breakdown
    const riskStats = {
      LOW: { attempted: 0, succeeded: 0, failed: 0, totalGold: 0, avgGold: 0 },
      MEDIUM: { attempted: 0, succeeded: 0, failed: 0, totalGold: 0, avgGold: 0 },
      HIGH: { attempted: 0, succeeded: 0, failed: 0, totalGold: 0, avgGold: 0 }
    };
    
    allMissions.forEach(mission => {
      const risk = mission.mission?.riskLevel;
      if (risk && riskStats[risk]) {
        if (mission.status === 'completed') {
          riskStats[risk].succeeded++;
          riskStats[risk].totalGold += mission.actualReward || 0;
        } else if (mission.status === 'failed') {
          riskStats[risk].failed++;
          riskStats[risk].totalGold += mission.actualReward || 0;
        }
        if (mission.status !== 'active') {
          riskStats[risk].attempted++;
        }
      }
    });
    
    // Calculate averages
    Object.keys(riskStats).forEach(risk => {
      const stats = riskStats[risk as keyof typeof riskStats];
      if (stats.attempted > 0) {
        stats.avgGold = Math.round(stats.totalGold / stats.attempted);
      }
    });
    
    // Total earnings
    const totalGoldEarned = allMissions.reduce((sum, m) => sum + (m.actualReward || 0), 0);
    
    // Calculate total items received
    let totalItemsReceived: { [key: string]: number } = {};
    allMissions.forEach(mission => {
      if (mission.itemsReceived && typeof mission.itemsReceived === 'object') {
        const items = mission.itemsReceived as any[];
        if (Array.isArray(items)) {
          items.forEach(item => {
            if (item.itemKey && item.qty) {
              totalItemsReceived[item.itemKey] = (totalItemsReceived[item.itemKey] || 0) + item.qty;
            }
          });
        }
      }
    });
    
    // Route popularity
    const routeStats: { [key: string]: { count: number, successRate: number, avgReward: number } } = {};
    allMissions.forEach(mission => {
      if (mission.mission && mission.status !== 'active') {
        const route = `${mission.mission.fromHub} → ${mission.mission.toHub}`;
        if (!routeStats[route]) {
          routeStats[route] = { count: 0, successRate: 0, avgReward: 0 };
        }
        routeStats[route].count++;
        if (mission.status === 'completed') {
          routeStats[route].avgReward += mission.actualReward || 0;
        }
      }
    });
    
    // Calculate route success rates
    Object.keys(routeStats).forEach(route => {
      const stats = routeStats[route];
      const routeMissions = allMissions.filter(m => 
        m.mission && `${m.mission.fromHub} → ${m.mission.toHub}` === route && m.status !== 'active'
      );
      const succeeded = routeMissions.filter(m => m.status === 'completed').length;
      stats.successRate = stats.count > 0 ? (succeeded / stats.count) * 100 : 0;
      stats.avgReward = succeeded > 0 ? Math.round(stats.avgReward / succeeded) : 0;
    });
    
    // Sort routes by popularity
    const popularRoutes = Object.entries(routeStats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([route, stats]) => ({ route, ...stats }));
    
    // Personal records
    const records = {
      highestSingleReward: bestRewards[0]?.actualReward || 0,
      highestRewardMission: bestRewards[0]?.mission?.name || 'None',
      longestStreak: calculateLongestStreak(allMissions),
      currentStreak: calculateCurrentStreak(allMissions),
      favoriteRiskLevel: getFavoriteRiskLevel(riskStats),
      totalMissionsCompleted: completedMissions
    };
    
    const endTime = performance.now();
    
    return NextResponse.json({
      overview: {
        totalMissions,
        completedMissions,
        failedMissions,
        activeMissions,
        successRate: Math.round(successRate * 10) / 10,
        totalGoldEarned,
        totalItemsReceived
      },
      riskBreakdown: riskStats,
      recentMissions: recentMissions.map(m => ({
        id: m.id,
        name: m.mission?.name,
        riskLevel: m.mission?.riskLevel,
        status: m.status,
        reward: m.actualReward,
        completedAt: m.completedAt,
        itemsReceived: m.itemsReceived
      })),
      bestRewards: bestRewards.map(m => ({
        id: m.id,
        name: m.mission?.name,
        riskLevel: m.mission?.riskLevel,
        reward: m.actualReward,
        completedAt: m.completedAt
      })),
      popularRoutes,
      personalRecords: records,
      performance: {
        queryTimeMs: Math.round(endTime - startTime)
      }
    });

  } catch (error) {
    console.error('Error fetching mission stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
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

function getFavoriteRiskLevel(riskStats: any): string {
  let favorite = 'MEDIUM';
  let maxAttempts = 0;
  
  Object.entries(riskStats).forEach(([risk, stats]: [string, any]) => {
    if (stats.attempted > maxAttempts) {
      maxAttempts = stats.attempted;
      favorite = risk;
    }
  });
  
  return favorite;
}