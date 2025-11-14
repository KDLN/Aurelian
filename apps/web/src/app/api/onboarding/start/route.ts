/**
 * POST /api/onboarding/start
 *
 * Initialize onboarding for a user. Creates OnboardingSession and all 9 OnboardingStep records.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { prisma } from '@/lib/prisma';
import { ONBOARDING_STEPS } from '@/lib/onboarding/steps';

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

    // Check if onboarding already started
    const existingSession = await prisma.onboardingSession.findUnique({
      where: { userId: user.id }
    });

    if (existingSession) {
      // Allow restart if session was dismissed before starting (0 steps completed)
      if (existingSession.dismissed && existingSession.stepsCompleted === 0) {
        // Delete old dismissed session and associated steps to start fresh
        await prisma.$transaction(async (tx) => {
          // Delete any step records (there shouldn't be any, but clean up just in case)
          await tx.onboardingStep.deleteMany({
            where: { userId: user.id }
          });

          // Delete the dismissed session
          await tx.onboardingSession.delete({
            where: { userId: user.id }
          });
        });
        // Continue to create new session below (fall through)
      } else {
        // Session exists and user has made progress - can't restart
        return NextResponse.json(
          { error: 'Onboarding already started', session: existingSession },
          { status: 400 }
        );
      }
    }

    // Create session and all step records in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create session
      const session = await tx.onboardingSession.create({
        data: {
          userId: user.id,
          currentStep: 1,
          stepsCompleted: 0,
          totalGoldEarned: 0,
          totalItemsEarned: 0
        }
      });

      // Create all 9 step records
      const stepRecords = await Promise.all(
        ONBOARDING_STEPS.map((step) =>
          tx.onboardingStep.create({
            data: {
              userId: user.id,
              stepKey: step.key,
              status: step.order === 1 ? 'IN_PROGRESS' : 'NOT_STARTED', // First step starts immediately
              startedAt: step.order === 1 ? new Date() : null,
              attempts: step.order === 1 ? 1 : 0,
              timeSpentSec: 0,
              metadata: {}
            }
          })
        )
      );

      // Update metrics for first step
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await tx.onboardingMetrics.upsert({
        where: {
          date_stepKey: {
            date: today,
            stepKey: ONBOARDING_STEPS[0].key
          }
        },
        create: {
          date: today,
          stepKey: ONBOARDING_STEPS[0].key,
          started: 1,
          completed: 0
        },
        update: {
          started: { increment: 1 }
        }
      });

      return { session, steps: stepRecords };
    });

    return NextResponse.json({
      success: true,
      message: 'Onboarding started successfully',
      session: result.session,
      totalSteps: ONBOARDING_STEPS.length
    });
  } catch (error) {
    console.error('Failed to start onboarding:', error);
    return NextResponse.json(
      { error: 'Failed to start onboarding' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/onboarding/start
 *
 * Get current onboarding status for user
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

    // Get session and steps
    const session = await prisma.onboardingSession.findUnique({
      where: { userId: user.id }
    });

    const steps = await prisma.onboardingStep.findMany({
      where: { userId: user.id }
    });

    // Sort steps by their defined order (not alphabetically by key)
    // Create order lookup map for O(1) access instead of O(n) find operations
    const orderMap = new Map(
      ONBOARDING_STEPS.map(s => [s.key, s.order])
    );

    // Filter out invalid steps (indicates database corruption)
    const validSteps = steps.filter(s => orderMap.has(s.stepKey));

    // Log if any steps were filtered out
    if (validSteps.length !== steps.length) {
      const invalidSteps = steps.filter(s => !orderMap.has(s.stepKey));
      console.error('[Onboarding] Invalid step keys found in database (data corruption):', {
        userId: user.id,
        invalidSteps: invalidSteps.map(s => ({
          stepKey: s.stepKey,
          stepId: s.id
        })),
        expectedSteps: ONBOARDING_STEPS.map(s => s.key)
      });
    }

    // Sort valid steps by their defined order
    const sortedSteps = validSteps.sort((a, b) => {
      const orderA = orderMap.get(a.stepKey)!;
      const orderB = orderMap.get(b.stepKey)!;
      return orderA - orderB;
    });

    return NextResponse.json({
      hasStarted: !!session,
      session,
      steps: sortedSteps,
      totalSteps: ONBOARDING_STEPS.length
    });
  } catch (error) {
    console.error('Failed to get onboarding status:', error);
    return NextResponse.json(
      { error: 'Failed to get onboarding status' },
      { status: 500 }
    );
  }
}
