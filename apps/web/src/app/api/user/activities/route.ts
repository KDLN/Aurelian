import { NextRequest } from 'next/server';
import { withAuthLight } from '@/lib/auth/middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/apiUtils';
import { ActivityLogger } from '@/lib/services/activityLogger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/activities
 * Fetch recent activities for the authenticated user
 */
export async function GET(request: NextRequest) {
  return withAuthLight(request, async (user) => {
    try {
      const url = new URL(request.url);
      const limitParam = url.searchParams.get('limit');
      const limit = limitParam ? parseInt(limitParam, 10) : 10;

      // Validate limit
      if (limit < 1 || limit > 50) {
        return createErrorResponse('MISSING_FIELDS', 'Limit must be between 1 and 50');
      }

      console.log(`[Activities] Fetching ${limit} activities for user: ${user.id}`);

      const activities = await ActivityLogger.getUserActivities(user.id, limit);

      // Transform activities to match the frontend interface
      const transformedActivities = activities.map(activity => ({
        id: activity.id,
        type: activity.type,
        message: activity.message,
        timestamp: activity.createdAt,
        reward: activity.metadata?.reward || undefined,
        metadata: activity.metadata
      }));

      console.log(`[Activities] Found ${activities.length} activities for user: ${user.id}`);

      return createSuccessResponse({ 
        activities: transformedActivities,
        count: activities.length 
      });

    } catch (error: any) {
      console.error('[Activities] Error fetching user activities:', {
        error,
        message: error?.message,
        userId: user.id
      });
      
      return createErrorResponse('INTERNAL_ERROR', `Failed to fetch activities: ${error?.message || 'Unknown error'}`);
    }
  });
}

/**
 * POST /api/user/activities
 * Manually log an activity (for testing or special cases)
 */
export async function POST(request: NextRequest) {
  return withAuthLight(request, async (user) => {
    try {
      const body = await request.json();
      
      if (!body.type || !body.message) {
        return createErrorResponse('MISSING_FIELDS', 'Type and message are required');
      }

      console.log(`[Activities] Logging activity for user: ${user.id}`, body);

      await ActivityLogger.logActivity(
        user.id,
        body.type,
        body.message,
        body.metadata || {}
      );

      return createSuccessResponse({ 
        message: 'Activity logged successfully'
      });

    } catch (error: any) {
      console.error('[Activities] Error logging activity:', {
        error,
        message: error?.message,
        userId: user.id
      });
      
      return createErrorResponse('INTERNAL_ERROR', `Failed to log activity: ${error?.message || 'Unknown error'}`);
    }
  });
}