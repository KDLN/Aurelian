import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Fetch mission leaderboards
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    // Get JWT token from headers for user ranking context (optional)
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    let currentUser = null;
    
    if (token) {
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        currentUser = user;
      } catch (err) {
        // Continue without user context if token is invalid
      }
    }

    // Fetch leaderboard data with parallel queries
    const [
      totalGoldLeaders,
      successRateLeaders, 
      totalMissionsLeaders,
      currentStreakLeaders,
      longestStreakLeaders
    ] = await Promise.all([
      // Top total gold earners
      prisma.$queryRaw`
        SELECT 
          u.id,
          p.display as name,
          COALESCE(SUM(mi.actualReward), 0) as totalGold,
          COUNT(CASE WHEN mi.status = 'completed' THEN 1 END) as completedMissions,
          COUNT(CASE WHEN mi.status IN ('completed', 'failed') THEN 1 END) as totalAttempts
        FROM "User" u
        LEFT JOIN "Profile" p ON u.id = p."userId"
        LEFT JOIN "MissionInstance" mi ON u.id = mi."userId"
        WHERE p.display IS NOT NULL
        GROUP BY u.id, p.display
        HAVING COUNT(CASE WHEN mi.status IN ('completed', 'failed') THEN 1 END) >= 3
        ORDER BY totalGold DESC
        LIMIT 10
      `,

      // Top success rates (min 10 missions)
      prisma.$queryRaw`
        SELECT 
          u.id,
          p.display as name,
          COALESCE(SUM(mi.actualReward), 0) as totalGold,
          COUNT(CASE WHEN mi.status = 'completed' THEN 1 END) as completedMissions,
          COUNT(CASE WHEN mi.status IN ('completed', 'failed') THEN 1 END) as totalAttempts,
          CASE 
            WHEN COUNT(CASE WHEN mi.status IN ('completed', 'failed') THEN 1 END) > 0 
            THEN ROUND((COUNT(CASE WHEN mi.status = 'completed' THEN 1 END)::decimal / COUNT(CASE WHEN mi.status IN ('completed', 'failed') THEN 1 END)) * 100, 1)
            ELSE 0 
          END as successRate
        FROM "User" u
        LEFT JOIN "Profile" p ON u.id = p."userId"
        LEFT JOIN "MissionInstance" mi ON u.id = mi."userId"
        WHERE p.display IS NOT NULL
        GROUP BY u.id, p.display
        HAVING COUNT(CASE WHEN mi.status IN ('completed', 'failed') THEN 1 END) >= 10
        ORDER BY successRate DESC, completedMissions DESC
        LIMIT 10
      `,

      // Top total missions completed
      prisma.$queryRaw`
        SELECT 
          u.id,
          p.display as name,
          COALESCE(SUM(mi.actualReward), 0) as totalGold,
          COUNT(CASE WHEN mi.status = 'completed' THEN 1 END) as completedMissions,
          COUNT(CASE WHEN mi.status IN ('completed', 'failed') THEN 1 END) as totalAttempts
        FROM "User" u
        LEFT JOIN "Profile" p ON u.id = p."userId"
        LEFT JOIN "MissionInstance" mi ON u.id = mi."userId"
        WHERE p.display IS NOT NULL
        GROUP BY u.id, p.display
        HAVING COUNT(CASE WHEN mi.status = 'completed' THEN 1 END) >= 1
        ORDER BY completedMissions DESC
        LIMIT 10
      `,

      // Current success streaks
      prisma.user.findMany({
        include: {
          profile: true,
          missionInstances: {
            where: {
              status: { in: ['completed', 'failed'] }
            },
            orderBy: {
              completedAt: 'desc'
            }
          }
        }
      }),

      // For longest streaks (we'll calculate from the same data)
      prisma.user.findMany({
        include: {
          profile: true,
          missionInstances: {
            where: {
              status: { in: ['completed', 'failed'] }
            },
            orderBy: {
              completedAt: 'asc'
            }
          }
        }
      })
    ]);

    // Calculate streak leaderboards
    const currentStreaks = calculateCurrentStreaks(currentStreakLeaders);
    const longestStreaks = calculateLongestStreaks(longestStreakLeaders);

    // Find current user's rankings if authenticated
    let userRankings = null;
    if (currentUser) {
      userRankings = {
        totalGold: findUserRank(totalGoldLeaders as any[], currentUser.id, 'totalGold'),
        successRate: findUserRank(successRateLeaders as any[], currentUser.id, 'successRate'),
        totalMissions: findUserRank(totalMissionsLeaders as any[], currentUser.id, 'completedMissions'),
        currentStreak: findUserRank(currentStreaks, currentUser.id, 'currentStreak'),
        longestStreak: findUserRank(longestStreaks, currentUser.id, 'longestStreak')
      };
    }

    const endTime = performance.now();

    return NextResponse.json({
      leaderboards: {
        totalGold: (totalGoldLeaders as any[]).map((user, index) => ({
          rank: index + 1,
          userId: user.id,
          name: user.name || 'Anonymous Trader',
          value: Number(user.totalGold),
          completedMissions: Number(user.completedMissions),
          isCurrentUser: currentUser?.id === user.id
        })),
        
        successRate: (successRateLeaders as any[]).map((user, index) => ({
          rank: index + 1,
          userId: user.id,
          name: user.name || 'Anonymous Trader',
          value: Number(user.successRate),
          completedMissions: Number(user.completedMissions),
          totalAttempts: Number(user.totalAttempts),
          isCurrentUser: currentUser?.id === user.id
        })),
        
        totalMissions: (totalMissionsLeaders as any[]).map((user, index) => ({
          rank: index + 1,
          userId: user.id,
          name: user.name || 'Anonymous Trader',
          value: Number(user.completedMissions),
          totalGold: Number(user.totalGold),
          isCurrentUser: currentUser?.id === user.id
        })),
        
        currentStreak: currentStreaks.slice(0, 10).map((user, index) => ({
          rank: index + 1,
          userId: user.id,
          name: user.name || 'Anonymous Trader',
          value: user.currentStreak,
          completedMissions: user.completedMissions,
          isCurrentUser: currentUser?.id === user.id
        })),
        
        longestStreak: longestStreaks.slice(0, 10).map((user, index) => ({
          rank: index + 1,
          userId: user.id,
          name: user.name || 'Anonymous Trader',
          value: user.longestStreak,
          completedMissions: user.completedMissions,
          isCurrentUser: currentUser?.id === user.id
        }))
      },
      userRankings,
      performance: {
        queryTimeMs: Math.round(endTime - startTime)
      }
    });

  } catch (error) {
    console.error('Error fetching leaderboards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboards' },
      { status: 500 }
    );
  }
}

// Helper function to calculate current success streaks
function calculateCurrentStreaks(users: any[]): any[] {
  return users
    .map(user => {
      let streak = 0;
      const missions = user.missionInstances || [];
      
      // Count consecutive successes from most recent
      for (const mission of missions) {
        if (mission.status === 'completed') {
          streak++;
        } else {
          break;
        }
      }
      
      return {
        id: user.id,
        name: user.profile?.display,
        currentStreak: streak,
        completedMissions: missions.filter((m: any) => m.status === 'completed').length
      };
    })
    .filter(user => user.currentStreak > 0 && user.name)
    .sort((a, b) => b.currentStreak - a.currentStreak);
}

// Helper function to calculate longest success streaks
function calculateLongestStreaks(users: any[]): any[] {
  return users
    .map(user => {
      let longestStreak = 0;
      let currentStreak = 0;
      const missions = user.missionInstances || [];
      
      // Calculate longest streak ever
      missions.forEach((mission: any) => {
        if (mission.status === 'completed') {
          currentStreak++;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });
      
      return {
        id: user.id,
        name: user.profile?.display,
        longestStreak,
        completedMissions: missions.filter((m: any) => m.status === 'completed').length
      };
    })
    .filter(user => user.longestStreak > 0 && user.name)
    .sort((a, b) => b.longestStreak - a.longestStreak);
}

// Helper function to find user's rank in a leaderboard
function findUserRank(leaderboard: any[], userId: string, valueField: string): { rank: number; value: any } | null {
  const userIndex = leaderboard.findIndex(user => user.id === userId || user.userId === userId);
  if (userIndex === -1) return null;
  
  return {
    rank: userIndex + 1,
    value: leaderboard[userIndex][valueField]
  };
}