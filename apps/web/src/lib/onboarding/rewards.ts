/**
 * Reward Distribution System
 *
 * Handles granting rewards to users upon onboarding step completion.
 * Includes special bonus handling (2x mission rewards, instant craft, free listing)
 */

import { prisma } from '@/lib/prisma';
import type { ItemReward, StepRewards } from './steps';

export interface RewardResult {
  success: boolean;
  goldGranted: number;
  itemsGranted: Array<{ itemKey: string; qty: number }>;
  bonusesApplied: string[];
  errors?: string[];
}

/**
 * Grant rewards for completing an onboarding step
 */
export async function grantStepRewards(
  userId: string,
  stepKey: string,
  rewards: StepRewards
): Promise<RewardResult> {
  const result: RewardResult = {
    success: false,
    goldGranted: 0,
    itemsGranted: [],
    bonusesApplied: []
  };

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Grant gold to wallet
      if (rewards.gold > 0) {
        const wallet = await tx.wallet.findUnique({
          where: { userId }
        });

        if (!wallet) {
          throw new Error('User wallet not found');
        }

        await tx.wallet.update({
          where: { userId },
          data: { gold: { increment: rewards.gold } }
        });

        // Log transaction
        await tx.ledgerTx.create({
          data: {
            userId,
            amount: rewards.gold,
            description: `Onboarding reward: ${stepKey}`,
            meta: { source: 'onboarding', stepKey }
          }
        });

        result.goldGranted = rewards.gold;
      }

      // 2. Grant items to warehouse
      if (rewards.items.length > 0) {
        for (const itemReward of rewards.items) {
          await grantItemToWarehouse(tx, userId, itemReward);
          result.itemsGranted.push(itemReward);
        }
      }

      // 3. Apply special bonuses
      if (rewards.bonuses) {
        for (const bonus of rewards.bonuses) {
          await applyBonus(tx, userId, stepKey, bonus);
          result.bonusesApplied.push(bonus);
        }
      }

      // 4. Update onboarding session stats
      await tx.onboardingSession.update({
        where: { userId },
        data: {
          totalGoldEarned: { increment: rewards.gold },
          totalItemsEarned: { increment: rewards.items.reduce((sum, i) => sum + i.qty, 0) }
        }
      });

      // 5. Update metrics
      await updateMetrics(tx, stepKey, rewards);
    });

    result.success = true;
  } catch (error) {
    console.error('Failed to grant onboarding rewards:', error);
    result.errors = [error instanceof Error ? error.message : 'Unknown error'];
  }

  return result;
}

/**
 * Grant item to user's warehouse
 */
async function grantItemToWarehouse(
  tx: any,
  userId: string,
  itemReward: ItemReward
): Promise<void> {
  // Find item definition
  const itemDef = await tx.itemDef.findFirst({
    where: { key: itemReward.itemKey }
  });

  if (!itemDef) {
    throw new Error(`Item not found: ${itemReward.itemKey}`);
  }

  // Check if user already has this item in warehouse
  const existingInventory = await tx.inventory.findFirst({
    where: {
      userId,
      itemDefId: itemDef.id,
      location: 'WAREHOUSE'
    }
  });

  if (existingInventory) {
    // Increment existing stack
    await tx.inventory.update({
      where: { id: existingInventory.id },
      data: { qty: { increment: itemReward.qty } }
    });
  } else {
    // Create new inventory entry
    await tx.inventory.create({
      data: {
        userId,
        itemDefId: itemDef.id,
        qty: itemReward.qty,
        location: 'WAREHOUSE'
      }
    });
  }
}

/**
 * Apply special bonus effects
 */
async function applyBonus(
  tx: any,
  userId: string,
  stepKey: string,
  bonus: string
): Promise<void> {
  switch (bonus) {
    case 'unlock_starter_blueprints':
      await unlockStarterBlueprints(tx, userId);
      break;

    case '2x_mission_reward':
      // Store flag in onboarding step metadata
      await tx.onboardingStep.update({
        where: { userId_stepKey: { userId, stepKey } },
        data: {
          metadata: {
            bonusActive: '2x_mission_reward',
            appliesTo: 'next_mission'
          }
        }
      });
      break;

    case 'instant_craft':
      // Store flag for instant craft completion
      await tx.onboardingStep.update({
        where: { userId_stepKey: { userId, stepKey } },
        data: {
          metadata: {
            bonusActive: 'instant_craft',
            appliesTo: 'next_craft'
          }
        }
      });
      break;

    case '10xp_bonus':
      // Grant bonus crafting XP
      await tx.user.update({
        where: { id: userId },
        data: { craftingXP: { increment: 10 } }
      });
      break;

    case 'free_listing':
      // Store flag for free listing fee
      await tx.onboardingStep.update({
        where: { userId_stepKey: { userId, stepKey } },
        data: {
          metadata: {
            bonusActive: 'free_listing',
            appliesTo: 'next_listing'
          }
        }
      });
      break;

    default:
      console.warn(`Unknown bonus type: ${bonus}`);
  }
}

/**
 * Unlock starter blueprints for user
 */
async function unlockStarterBlueprints(tx: any, userId: string): Promise<void> {
  // Get all blueprints with tier 1
  const starterBlueprints = await tx.blueprint.findMany({
    where: { tier: 1 }
  });

  // Unlock each blueprint for user (if not already unlocked)
  for (const blueprint of starterBlueprints) {
    const existing = await tx.blueprintUnlock.findUnique({
      where: {
        userId_blueprintId: {
          userId,
          blueprintId: blueprint.id
        }
      }
    });

    if (!existing) {
      await tx.blueprintUnlock.create({
        data: {
          userId,
          blueprintId: blueprint.id,
          source: 'ONBOARDING'
        }
      });
    }
  }
}

/**
 * Update aggregate metrics for admin dashboard
 */
async function updateMetrics(
  tx: any,
  stepKey: string,
  rewards: StepRewards
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingMetrics = await tx.onboardingMetrics.findUnique({
    where: {
      date_stepKey: {
        date: today,
        stepKey
      }
    }
  });

  const totalItems = rewards.items.reduce((sum, i) => sum + i.qty, 0);

  if (existingMetrics) {
    await tx.onboardingMetrics.update({
      where: { id: existingMetrics.id },
      data: {
        rewardsClaimed: { increment: 1 },
        totalGoldGranted: { increment: rewards.gold },
        totalItemsGranted: { increment: totalItems }
      }
    });
  } else {
    // Metrics row created when step is started/completed
    // Just update rewards claimed if exists
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
        completed: 0,
        rewardsClaimed: 1,
        totalGoldGranted: rewards.gold,
        totalItemsGranted: totalItems
      },
      update: {
        rewardsClaimed: { increment: 1 },
        totalGoldGranted: { increment: rewards.gold },
        totalItemsGranted: { increment: totalItems }
      }
    });
  }
}

/**
 * Check if user has unclaimed rewards
 */
export async function hasUnclaimedRewards(userId: string): Promise<boolean> {
  const unclaimedSteps = await prisma.onboardingStep.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      rewardsClaimed: false
    }
  });

  return unclaimedSteps.length > 0;
}

/**
 * Get all unclaimed rewards for user
 */
export async function getUnclaimedRewards(userId: string) {
  const unclaimedSteps = await prisma.onboardingStep.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      rewardsClaimed: false
    },
    select: {
      stepKey: true,
      completedAt: true
    }
  });

  return unclaimedSteps;
}

/**
 * Check if user has active bonus for specific action
 */
export async function getActiveBonus(
  userId: string,
  bonusType: '2x_mission_reward' | 'instant_craft' | 'free_listing'
): Promise<{ active: boolean; stepKey?: string }> {
  const steps = await prisma.onboardingStep.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      rewardsClaimed: true
    }
  });

  for (const step of steps) {
    const metadata = step.metadata as any;
    if (metadata?.bonusActive === bonusType) {
      return { active: true, stepKey: step.stepKey };
    }
  }

  return { active: false };
}

/**
 * Consume/remove active bonus after use
 */
export async function consumeBonus(
  userId: string,
  stepKey: string
): Promise<void> {
  await prisma.onboardingStep.update({
    where: {
      userId_stepKey: { userId, stepKey }
    },
    data: {
      metadata: {}
    }
  });
}
