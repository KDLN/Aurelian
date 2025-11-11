/**
 * GET /api/admin/onboarding-metrics
 *
 * Admin-only endpoint to get onboarding funnel metrics.
 * Returns completion rates, drop-off points, time stats, and reward distribution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
import { prisma } from '@/lib/prisma';
import { ONBOARDING_STEPS } from '@/lib/onboarding/steps';

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user }
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isAdmin: true }
    });

    if (!dbUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse query params
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '30', 10);

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get funnel metrics
    const funnelMetrics = await getFunnelMetrics(startDate);

    // Get time stats
    const timeStats = await getTimeStats(startDate);

    // Get reward distribution
    const rewardStats = await getRewardStats(startDate);

    // Get drop-off analysis
    const dropOffAnalysis = await getDropOffAnalysis();

    return NextResponse.json({
      success: true,
      dateRange: {
        start: startDate,
        end: new Date(),
        days
      },
      funnel: funnelMetrics,
      timeStats,
      rewards: rewardStats,
      dropOff: dropOffAnalysis
    });
  } catch (error) {
    console.error('Failed to get onboarding metrics:', error);
    return NextResponse.json(
      {
        error: 'Failed to get onboarding metrics',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Get funnel conversion metrics per step
 */
async function getFunnelMetrics(startDate: Date) {
  const metrics = await prisma.onboardingMetrics.groupBy({
    by: ['stepKey'],
    where: {
      date: { gte: startDate }
    },
    _sum: {
      started: true,
      completed: true,
      skipped: true,
      rewardsClaimed: true
    }
  });

  // Map to step order
  const funnelData = ONBOARDING_STEPS.map((step) => {
    const stepMetrics = metrics.find((m) => m.stepKey === step.key);
    const started = stepMetrics?._sum.started || 0;
    const completed = stepMetrics?._sum.completed || 0;
    const skipped = stepMetrics?._sum.skipped || 0;
    const rewardsClaimed = stepMetrics?._sum.rewardsClaimed || 0;

    return {
      order: step.order,
      stepKey: step.key,
      stepTitle: step.title,
      phase: step.phase,
      started,
      completed,
      skipped,
      rewardsClaimed,
      completionRate: started > 0 ? (completed / started) * 100 : 0,
      rewardClaimRate: completed > 0 ? (rewardsClaimed / completed) * 100 : 0
    };
  });

  // Calculate overall funnel conversion
  const firstStepStarted = funnelData[0]?.started || 0;
  const lastStepCompleted = funnelData[funnelData.length - 1]?.completed || 0;
  const overallConversion = firstStepStarted > 0 ? (lastStepCompleted / firstStepStarted) * 100 : 0;

  return {
    steps: funnelData,
    overall: {
      started: firstStepStarted,
      fullyCompleted: lastStepCompleted,
      conversionRate: overallConversion
    }
  };
}

/**
 * Get time-to-complete statistics
 */
async function getTimeStats(startDate: Date) {
  const metrics = await prisma.onboardingMetrics.groupBy({
    by: ['stepKey'],
    where: {
      date: { gte: startDate }
    },
    _avg: {
      avgTimeToComplete: true
    },
    _sum: {
      medianTime: true,
      completed: true
    }
  });

  const timeData = ONBOARDING_STEPS.map((step) => {
    const stepMetrics = metrics.find((m) => m.stepKey === step.key);
    const avgTime = stepMetrics?._avg.avgTimeToComplete || 0;
    const medianTime = stepMetrics?._sum.medianTime || 0;
    const completed = stepMetrics?._sum.completed || 1;

    return {
      stepKey: step.key,
      stepTitle: step.title,
      avgTimeSeconds: Math.round(avgTime),
      medianTimeSeconds: Math.round(medianTime / Math.max(completed, 1)),
      estimatedTime: step.estimatedTime
    };
  });

  // Calculate total onboarding time
  const totalAvgTime = timeData.reduce((sum, s) => sum + s.avgTimeSeconds, 0);

  return {
    steps: timeData,
    totalAvgTimeSeconds: totalAvgTime,
    totalAvgTimeMinutes: Math.round(totalAvgTime / 60)
  };
}

/**
 * Get reward distribution stats
 */
async function getRewardStats(startDate: Date) {
  const metrics = await prisma.onboardingMetrics.groupBy({
    by: ['stepKey'],
    where: {
      date: { gte: startDate }
    },
    _sum: {
      totalGoldGranted: true,
      totalItemsGranted: true,
      rewardsClaimed: true
    }
  });

  const rewardData = ONBOARDING_STEPS.map((step) => {
    const stepMetrics = metrics.find((m) => m.stepKey === step.key);
    return {
      stepKey: step.key,
      stepTitle: step.title,
      goldGranted: stepMetrics?._sum.totalGoldGranted || 0,
      itemsGranted: stepMetrics?._sum.totalItemsGranted || 0,
      rewardsClaimed: stepMetrics?._sum.rewardsClaimed || 0
    };
  });

  const totalGold = rewardData.reduce((sum, r) => sum + r.goldGranted, 0);
  const totalItems = rewardData.reduce((sum, r) => sum + r.itemsGranted, 0);
  const totalClaims = rewardData.reduce((sum, r) => sum + r.rewardsClaimed, 0);

  return {
    steps: rewardData,
    total: {
      goldGranted: totalGold,
      itemsGranted: totalItems,
      rewardsClaimed: totalClaims
    }
  };
}

/**
 * Get drop-off analysis (where users quit)
 */
async function getDropOffAnalysis() {
  // Get all onboarding sessions
  const sessions = await prisma.onboardingSession.findMany({
    select: {
      userId: true,
      currentStep: true,
      stepsCompleted: true,
      completedAt: true,
      dismissed: true
    }
  });

  const total = sessions.length;
  const completed = sessions.filter((s) => s.completedAt !== null).length;
  const dismissed = sessions.filter((s) => s.dismissed).length;
  const inProgress = total - completed - dismissed;

  // Count users stuck at each step
  const stuckAtStep: Record<number, number> = {};
  for (const session of sessions) {
    if (!session.completedAt && !session.dismissed) {
      stuckAtStep[session.currentStep] = (stuckAtStep[session.currentStep] || 0) + 1;
    }
  }

  const dropOffPoints = ONBOARDING_STEPS.map((step) => ({
    order: step.order,
    stepKey: step.key,
    stepTitle: step.title,
    usersStuck: stuckAtStep[step.order] || 0,
    dropOffRate: total > 0 ? ((stuckAtStep[step.order] || 0) / total) * 100 : 0
  }));

  return {
    total,
    completed,
    dismissed,
    inProgress,
    completionRate: total > 0 ? (completed / total) * 100 : 0,
    dismissalRate: total > 0 ? (dismissed / total) * 100 : 0,
    dropOffPoints
  };
}
