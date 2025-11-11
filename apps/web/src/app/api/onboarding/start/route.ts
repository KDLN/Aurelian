/**
 * POST /api/onboarding/start
 *
 * Initialize onboarding for a user. Creates OnboardingSession and all 9 OnboardingStep records.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { ONBOARDING_STEPS } from '@/lib/onboarding/steps';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if onboarding already started
    const existingSession = await prisma.onboardingSession.findUnique({
      where: { userId: user.id }
    });

    if (existingSession) {
      return NextResponse.json(
        { error: 'Onboarding already started', session: existingSession },
        { status: 400 }
      );
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
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session and steps
    const session = await prisma.onboardingSession.findUnique({
      where: { userId: user.id }
    });

    const steps = await prisma.onboardingStep.findMany({
      where: { userId: user.id },
      orderBy: { stepKey: 'asc' }
    });

    return NextResponse.json({
      hasStarted: !!session,
      session,
      steps,
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
