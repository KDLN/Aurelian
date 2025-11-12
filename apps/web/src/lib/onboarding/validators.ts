/**
 * Step Validation Functions
 *
 * Each validator checks if a user has completed the requirements for a specific onboarding step.
 */

import { prisma } from '@/lib/prisma';

export interface ValidationResult {
  valid: boolean;
  message?: string;
  metadata?: Record<string, any>;
}

/**
 * Validation functions mapped by step key
 */
export const stepValidators: Record<string, (userId: string) => Promise<ValidationResult>> = {
  welcome: validateWelcome,
  warehouse_tour: validateWarehouseTour,
  hire_agent: validateHireAgent,
  first_mission: validateFirstMission,
  economic_tutorial: validateEconomicTutorial,
  first_craft: validateFirstCraft,
  first_sale: validateFirstSale,
  strategy_guide: validateStrategyGuide,
  join_guild: validateJoinGuild
};

/**
 * Step 1: Welcome - Auto-complete (no validation needed)
 */
async function validateWelcome(userId: string): Promise<ValidationResult> {
  return {
    valid: true,
    message: 'Welcome step completed!'
  };
}

/**
 * Step 2: Warehouse Tour - User must have visited warehouse page
 * Note: Auto-completes when user clicks Complete button (assumes they're on the page)
 */
async function validateWarehouseTour(userId: string): Promise<ValidationResult> {
  // Since the user can only click Complete if they're viewing the tutorial panel,
  // and the tutorial directs them to the storage page, we can safely assume
  // they've visited it when they click Complete
  return {
    valid: true,
    message: 'Warehouse visited!',
    metadata: { hasVisitedWarehouse: true }
  };
}

/**
 * Step 3: Hire Agent - User must have at least one agent
 */
async function validateHireAgent(userId: string): Promise<ValidationResult> {
  const agentCount = await prisma.agent.count({
    where: { userId }
  });

  return {
    valid: agentCount > 0,
    message: agentCount > 0 ? 'Agent hired!' : 'Please hire at least one agent',
    metadata: { agentCount }
  };
}

/**
 * Step 4: First Mission - User must have completed at least one mission
 */
async function validateFirstMission(userId: string): Promise<ValidationResult> {
  const completedMission = await prisma.mission.findFirst({
    where: {
      userId,
      status: 'COMPLETED'
    }
  });

  return {
    valid: !!completedMission,
    message: completedMission ? 'Mission completed!' : 'Please complete a mission',
    metadata: completedMission ? { missionId: completedMission.id } : undefined
  };
}

/**
 * Step 5: Economic Tutorial - User must read through tutorial
 * Note: This requires client-side tracking via API call
 */
async function validateEconomicTutorial(userId: string): Promise<ValidationResult> {
  const step = await prisma.onboardingStep.findUnique({
    where: { userId_stepKey: { userId, stepKey: 'economic_tutorial' } }
  });

  const metadata = step?.metadata as any;
  const hasRead = metadata?.hasReadTutorial === true;

  return {
    valid: hasRead,
    message: hasRead ? 'Tutorial completed!' : 'Please read the economic tutorial'
  };
}

/**
 * Step 6: First Craft - User must have completed at least one craft job
 */
async function validateFirstCraft(userId: string): Promise<ValidationResult> {
  const completedCraft = await prisma.craftJob.findFirst({
    where: {
      userId,
      status: 'COMPLETED'
    }
  });

  return {
    valid: !!completedCraft,
    message: completedCraft ? 'Item crafted!' : 'Please craft an item',
    metadata: completedCraft ? { craftJobId: completedCraft.id } : undefined
  };
}

/**
 * Step 7: First Sale - User must have created at least one listing
 */
async function validateFirstSale(userId: string): Promise<ValidationResult> {
  const listing = await prisma.listing.findFirst({
    where: { userId }
  });

  return {
    valid: !!listing,
    message: listing ? 'Listing created!' : 'Please create a market listing',
    metadata: listing ? { listingId: listing.id } : undefined
  };
}

/**
 * Step 8: Strategy Guide - User must read through guide
 * Note: This requires client-side tracking via API call
 */
async function validateStrategyGuide(userId: string): Promise<ValidationResult> {
  const step = await prisma.onboardingStep.findUnique({
    where: { userId_stepKey: { userId, stepKey: 'strategy_guide' } }
  });

  const metadata = step?.metadata as any;
  const hasRead = metadata?.hasReadGuide === true;

  return {
    valid: hasRead,
    message: hasRead ? 'Strategy guide completed!' : 'Please read the strategy guide'
  };
}

/**
 * Step 9: Join Guild - User must be a member of a guild
 */
async function validateJoinGuild(userId: string): Promise<ValidationResult> {
  const guildMember = await prisma.guildMember.findUnique({
    where: { userId },
    include: { guild: true }
  });

  return {
    valid: !!guildMember,
    message: guildMember ? `Joined ${guildMember.guild.name}!` : 'Please join or create a guild',
    metadata: guildMember ? { guildId: guildMember.guildId } : undefined
  };
}

/**
 * Validate a specific step for a user
 */
export async function validateStep(userId: string, stepKey: string): Promise<ValidationResult> {
  const validator = stepValidators[stepKey];

  if (!validator) {
    return {
      valid: false,
      message: `Unknown step: ${stepKey}`
    };
  }

  try {
    return await validator(userId);
  } catch (error) {
    console.error(`Validation error for step ${stepKey}:`, error);
    return {
      valid: false,
      message: 'Validation failed due to an error'
    };
  }
}

/**
 * Check all required steps for user completion status
 */
export async function validateAllRequiredSteps(userId: string): Promise<{
  allComplete: boolean;
  results: Record<string, ValidationResult>;
}> {
  const requiredSteps = ['welcome', 'warehouse_tour', 'hire_agent', 'first_mission', 'first_craft'];
  const results: Record<string, ValidationResult> = {};

  for (const stepKey of requiredSteps) {
    results[stepKey] = await validateStep(userId, stepKey);
  }

  const allComplete = Object.values(results).every(r => r.valid);

  return { allComplete, results };
}

/**
 * Auto-validate and update step status if completed
 */
export async function autoValidateAndUpdate(userId: string, stepKey: string): Promise<boolean> {
  const validation = await validateStep(userId, stepKey);

  if (!validation.valid) {
    return false;
  }

  // Update step status to completed
  const step = await prisma.onboardingStep.findUnique({
    where: { userId_stepKey: { userId, stepKey } }
  });

  if (!step) {
    throw new Error(`Onboarding step not found: ${stepKey}`);
  }

  if (step.status === 'COMPLETED') {
    return true; // Already completed
  }

  await prisma.onboardingStep.update({
    where: { userId_stepKey: { userId, stepKey } },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      metadata: {
        ...(step.metadata as any || {}),
        ...validation.metadata
      }
    }
  });

  // Update session progress
  await prisma.onboardingSession.update({
    where: { userId },
    data: {
      stepsCompleted: { increment: 1 }
    }
  });

  // Update metrics
  await updateStepMetrics(stepKey, step);

  return true;
}

/**
 * Update aggregate metrics when step is completed
 */
async function updateStepMetrics(stepKey: string, step: any): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const timeToComplete = step.startedAt
    ? Math.floor((Date.now() - step.startedAt.getTime()) / 1000)
    : 0;

  await prisma.onboardingMetrics.upsert({
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
      avgTimeToComplete: timeToComplete,
      medianTime: timeToComplete
    },
    update: {
      completed: { increment: 1 }
      // Note: avg/median calculations done in separate aggregation job
    }
  });
}

/**
 * Mark step as started (for time tracking)
 */
export async function markStepStarted(userId: string, stepKey: string): Promise<void> {
  const step = await prisma.onboardingStep.findUnique({
    where: { userId_stepKey: { userId, stepKey } }
  });

  if (!step || step.status !== 'NOT_STARTED') {
    return;
  }

  await prisma.onboardingStep.update({
    where: { userId_stepKey: { userId, stepKey } },
    data: {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      attempts: { increment: 1 }
    }
  });

  // Update metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.onboardingMetrics.upsert({
    where: {
      date_stepKey: {
        date: today,
        stepKey
      }
    },
    create: {
      date: today,
      stepKey,
      started: 1,
      completed: 0
    },
    update: {
      started: { increment: 1 }
    }
  });
}
