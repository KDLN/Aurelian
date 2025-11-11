/**
 * POST /api/onboarding/validate-step
 *
 * Validate if a user has completed a specific onboarding step.
 * If valid, mark step as completed and advance to next step.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { validateStep, markStepStarted } from '@/lib/onboarding/validators';
import { getStepByKey, getNextStep } from '@/lib/onboarding/steps';

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

    // Parse request body
    const body = await req.json();
    const { stepKey, metadata } = body;

    if (!stepKey) {
      return NextResponse.json({ error: 'stepKey is required' }, { status: 400 });
    }

    // Get step definition
    const stepDef = getStepByKey(stepKey);
    if (!stepDef) {
      return NextResponse.json({ error: 'Invalid step key' }, { status: 400 });
    }

    // Get current step record
    const step = await prisma.onboardingStep.findUnique({
      where: { userId_stepKey: { userId: user.id, stepKey } }
    });

    if (!step) {
      return NextResponse.json({ error: 'Onboarding not started' }, { status: 400 });
    }

    // If step already completed, return success
    if (step.status === 'COMPLETED') {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        message: 'Step already completed',
        step
      });
    }

    // Update metadata if provided (for client-side validations like "read tutorial")
    if (metadata) {
      await prisma.onboardingStep.update({
        where: { userId_stepKey: { userId: user.id, stepKey } },
        data: {
          metadata: {
            ...(step.metadata as any || {}),
            ...metadata
          }
        }
      });
    }

    // Validate step completion
    const validation = await validateStep(user.id, stepKey);

    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        valid: false,
        message: validation.message || 'Step not yet completed',
        metadata: validation.metadata
      });
    }

    // Mark step as completed
    const updatedStep = await prisma.$transaction(async (tx) => {
      const timeSpent = step.startedAt
        ? Math.floor((Date.now() - step.startedAt.getTime()) / 1000)
        : 0;

      const completed = await tx.onboardingStep.update({
        where: { userId_stepKey: { userId: user.id, stepKey } },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          timeSpentSec: timeSpent,
          metadata: {
            ...(step.metadata as any || {}),
            ...validation.metadata
          }
        }
      });

      // Update session
      const nextStep = getNextStep(stepKey);
      await tx.onboardingSession.update({
        where: { userId: user.id },
        data: {
          stepsCompleted: { increment: 1 },
          currentStep: nextStep ? nextStep.order : stepDef.order,
          completedAt: !nextStep ? new Date() : undefined // Mark session complete if last step
        }
      });

      // Start next step if exists
      if (nextStep) {
        await tx.onboardingStep.update({
          where: { userId_stepKey: { userId: user.id, stepKey: nextStep.key } },
          data: {
            status: 'IN_PROGRESS',
            startedAt: new Date(),
            attempts: { increment: 1 }
          }
        });

        // Update metrics for next step
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await tx.onboardingMetrics.upsert({
          where: {
            date_stepKey: {
              date: today,
              stepKey: nextStep.key
            }
          },
          create: {
            date: today,
            stepKey: nextStep.key,
            started: 1,
            completed: 0
          },
          update: {
            started: { increment: 1 }
          }
        });
      }

      // Update metrics for completed step
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await tx.onboardingMetrics.upsert({
        where: {
          date_stepKey: {
            date: today,
            stepKey
          }
        },
        create: {
          date: today,
          stepKey,
          started: 0,
          completed: 1,
          avgTimeToComplete: timeSpent,
          medianTime: timeSpent
        },
        update: {
          completed: { increment: 1 }
          // Note: avg/median updated by separate aggregation job
        }
      });

      return completed;
    });

    return NextResponse.json({
      success: true,
      valid: true,
      message: validation.message || 'Step completed!',
      step: updatedStep,
      nextStep: getNextStep(stepKey)?.key
    });
  } catch (error) {
    console.error('Failed to validate step:', error);
    return NextResponse.json(
      { error: 'Failed to validate step' },
      { status: 500 }
    );
  }
}
