/**
 * POST /api/onboarding/claim-reward
 *
 * Claim rewards for a completed onboarding step.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { prisma } from '@/lib/prisma';
import { grantStepRewards } from '@/lib/onboarding/rewards';
import { getStepByKey } from '@/lib/onboarding/steps';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user }
    } = await supabaseServer.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { stepKey } = body;

    if (!stepKey) {
      return NextResponse.json({ error: 'stepKey is required' }, { status: 400 });
    }

    // Get step definition
    const stepDef = getStepByKey(stepKey);
    if (!stepDef) {
      return NextResponse.json({ error: 'Invalid step key' }, { status: 400 });
    }

    // Get step record
    const step = await prisma.onboardingStep.findUnique({
      where: { userId_stepKey: { userId: user.id, stepKey } }
    });

    if (!step) {
      return NextResponse.json({ error: 'Onboarding not started' }, { status: 400 });
    }

    // Check if step is completed
    if (step.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Step not completed yet' },
        { status: 400 }
      );
    }

    // Check if rewards already claimed
    if (step.rewardsClaimed) {
      return NextResponse.json(
        { error: 'Rewards already claimed', claimedAt: step.claimedAt },
        { status: 400 }
      );
    }

    // Grant rewards
    const result = await grantStepRewards(user.id, stepKey, stepDef.rewards);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to grant rewards', details: result.errors },
        { status: 500 }
      );
    }

    // Mark rewards as claimed
    await prisma.onboardingStep.update({
      where: { userId_stepKey: { userId: user.id, stepKey } },
      data: {
        rewardsClaimed: true,
        claimedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Rewards claimed successfully',
      rewards: {
        gold: result.goldGranted,
        items: result.itemsGranted,
        bonuses: result.bonusesApplied
      }
    });
  } catch (error) {
    console.error('Failed to claim rewards:', error);
    return NextResponse.json(
      { error: 'Failed to claim rewards' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/onboarding/claim-reward
 *
 * Get unclaimed rewards for user
 */
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
    } = await supabaseServer.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get unclaimed steps
    const unclaimedSteps = await prisma.onboardingStep.findMany({
      where: {
        userId: user.id,
        status: 'COMPLETED',
        rewardsClaimed: false
      },
      orderBy: { completedAt: 'asc' }
    });

    // Map to step definitions
    const unclaimedRewards = unclaimedSteps.map((step) => {
      const stepDef = getStepByKey(step.stepKey);
      return {
        stepKey: step.stepKey,
        stepTitle: stepDef?.title,
        completedAt: step.completedAt,
        rewards: stepDef?.rewards
      };
    });

    return NextResponse.json({
      hasUnclaimed: unclaimedSteps.length > 0,
      count: unclaimedSteps.length,
      rewards: unclaimedRewards
    });
  } catch (error) {
    console.error('Failed to get unclaimed rewards:', error);
    return NextResponse.json(
      { error: 'Failed to get unclaimed rewards' },
      { status: 500 }
    );
  }
}
