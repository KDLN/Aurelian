import { NextRequest } from 'next/server';
import { withAuthLight } from '@/lib/auth/middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/apiUtils';
import { DailyStatsTracker } from '@/lib/services/dailyStatsTracker';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/stats
 * Get user's daily statistics and performance metrics
 */
export async function GET(request: NextRequest) {
  return withAuthLight(request, async (user) => {
    try {
      const url = new URL(request.url);
      const period = url.searchParams.get('period') || 'today';

      console.log(`[User Stats] Fetching ${period} stats for user: ${user.id}`);

      switch (period) {
        case 'today': {
          const todaysStats = await DailyStatsTracker.getTodaysStats(user.id);
          return createSuccessResponse({ 
            stats: todaysStats,
            period: 'today'
          });
        }

        case 'week': {
          const weeklyStats = await DailyStatsTracker.getWeeklyStats(user.id);
          return createSuccessResponse({ 
            stats: weeklyStats,
            period: 'week'
          });
        }

        case 'summary': {
          const performanceSummary = await DailyStatsTracker.getPerformanceSummary(user.id);
          return createSuccessResponse({ 
            summary: performanceSummary,
            period: 'summary'
          });
        }

        default:
          return createErrorResponse('MISSING_FIELDS', 'Invalid period. Use: today, week, or summary');
      }

    } catch (error: any) {
      console.error('[User Stats] Error fetching stats:', {
        error,
        message: error?.message,
        userId: user.id
      });
      
      return createErrorResponse('INTERNAL_ERROR', `Failed to fetch stats: ${error?.message || 'Unknown error'}`);
    }
  });
}

/**
 * POST /api/user/stats/track
 * Manually track a stat (for testing or special cases)
 */
export async function POST(request: NextRequest) {
  return withAuthLight(request, async (user) => {
    try {
      const body = await request.json();
      
      if (!body.type) {
        return createErrorResponse('MISSING_FIELDS', 'Stat type is required');
      }

      console.log(`[User Stats] Tracking stat for user: ${user.id}`, body);

      switch (body.type) {
        case 'gold_earned':
          await DailyStatsTracker.trackGoldEarned(user.id, body.amount || 0);
          break;
        case 'gold_spent':
          await DailyStatsTracker.trackGoldSpent(user.id, body.amount || 0);
          break;
        case 'mission_completed':
          await DailyStatsTracker.trackMissionCompleted(user.id, body.succeeded !== false);
          break;
        case 'items_traded':
          await DailyStatsTracker.trackItemsTraded(user.id, body.quantity || 1);
          break;
        case 'items_crafted':
          await DailyStatsTracker.trackItemsCrafted(user.id, body.quantity || 1);
          break;
        case 'agent_hired':
          await DailyStatsTracker.trackAgentHired(user.id);
          break;
        case 'login':
          await DailyStatsTracker.trackLogin(user.id);
          break;
        case 'active_time':
          await DailyStatsTracker.trackActiveTime(user.id, body.minutes || 1);
          break;
        default:
          return createErrorResponse('MISSING_FIELDS', 'Invalid stat type');
      }

      return createSuccessResponse({ 
        message: 'Stat tracked successfully',
        type: body.type
      });

    } catch (error: any) {
      console.error('[User Stats] Error tracking stat:', {
        error,
        message: error?.message,
        userId: user.id
      });
      
      return createErrorResponse('INTERNAL_ERROR', `Failed to track stat: ${error?.message || 'Unknown error'}`);
    }
  });
}