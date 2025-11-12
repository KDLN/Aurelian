/**
 * Onboarding Step Definitions
 *
 * Defines all 9 tutorial steps with rewards, validation, and progression logic.
 * Steps are organized into 3 phases: Essential (1-3), Economic (4-6), Advanced (7-9)
 */

export type OnboardingPhase = 'essential' | 'economic' | 'advanced';

export interface ItemReward {
  itemKey: string;
  qty: number;
}

export interface StepRewards {
  gold: number;
  items: ItemReward[];
  bonuses?: string[]; // Special bonuses like "unlock_starter_blueprints", "2x_mission_reward", "instant_craft"
}

export interface OnboardingStepDefinition {
  key: string;
  order: number;
  phase: OnboardingPhase;
  title: string;
  description: string;
  icon: string;
  skippable: boolean;
  estimatedTime: string; // e.g., "2 min"
  rewards: StepRewards;
  validationQuery?: string; // SQL query or function name to validate completion
  helpText?: string;
  videoUrl?: string;
  actionUrl?: string; // URL to navigate user to complete the action
  actionLabel?: string; // Label for action button (e.g., "Go to Warehouse")
}

/**
 * All 9 Onboarding Steps
 *
 * Each step grants rewards that enable the next step(s).
 * Total rewards: ~1,050g + items worth ~2,000g equivalent
 */
export const ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  // ===== PHASE 1: ESSENTIAL (Required) =====
  {
    key: 'welcome',
    order: 1,
    phase: 'essential',
    title: 'Welcome to The Exchange',
    description: 'Learn the basics and claim your starter package with gold, materials, and equipment.',
    icon: '🎉',
    skippable: false,
    estimatedTime: '2 min',
    rewards: {
      gold: 500,
      items: [
        { itemKey: 'iron_ore', qty: 10 },
        { itemKey: 'herb', qty: 8 },
        { itemKey: 'hide', qty: 6 },
        { itemKey: 'healing_tonic', qty: 3 },
        { itemKey: 'leather_vest', qty: 1 },
        { itemKey: 'rusty_sword', qty: 1 },
        { itemKey: 'basic_compass', qty: 1 }
      ],
      bonuses: ['unlock_starter_blueprints']
    },
    helpText: 'Click "Start Tutorial" to begin your trading journey!',
  },

  {
    key: 'warehouse_tour',
    order: 2,
    phase: 'essential',
    title: 'Visit Your Warehouse',
    description: 'Navigate to your warehouse to see your starter items and learn about inventory management.',
    icon: '📦',
    skippable: false,
    estimatedTime: '1 min',
    rewards: {
      gold: 100,
      items: [
        { itemKey: 'iron_ore', qty: 5 }
      ]
    },
    validationQuery: 'hasVisitedWarehouse',
    helpText: 'Go to the Warehouse page to view your inventory. The step will complete automatically when you visit.',
    actionUrl: '/warehouse',
    actionLabel: 'Go to Warehouse',
  },

  {
    key: 'hire_agent',
    order: 3,
    phase: 'essential',
    title: 'Hire Your First Agent',
    description: 'Hire a trading agent to run missions and transport goods between hubs.',
    icon: '👤',
    skippable: false,
    estimatedTime: '2 min',
    rewards: {
      gold: 200,
      items: [
        { itemKey: 'rusty_sword', qty: 1 }
      ]
    },
    validationQuery: 'hasHiredAgent',
    helpText: 'Visit the Agents page and hire your first agent. You need at least 100g to hire an agent.',
    actionUrl: '/agents',
    actionLabel: 'Go to Agents',
  },

  // ===== PHASE 2: ECONOMIC LOOP (Core Gameplay) =====
  {
    key: 'first_mission',
    order: 4,
    phase: 'economic',
    title: 'Complete Your First Mission',
    description: 'Send your agent on a mission to gather resources. This mission will complete instantly and grant 2× rewards!',
    icon: '🗺️',
    skippable: false,
    estimatedTime: '3 min',
    rewards: {
      gold: 0, // Gold comes from mission itself
      items: [
        { itemKey: 'herb', qty: 5 }
      ],
      bonuses: ['2x_mission_reward'] // First mission grants double rewards
    },
    validationQuery: 'hasCompletedMission',
    helpText: 'Visit the Missions page, select a LOW risk mission, and send your agent.',
  },

  {
    key: 'economic_tutorial',
    order: 5,
    phase: 'economic',
    title: 'Learn the Economic Loop',
    description: 'Understand the core gameplay loop: Gather → Craft → Sell → Repeat. This is how you build wealth!',
    icon: '💰',
    skippable: true,
    estimatedTime: '4 min',
    rewards: {
      gold: 0,
      items: [
        { itemKey: 'healing_tonic', qty: 3 }
      ]
    },
    helpText: 'Read through the interactive economic tutorial to understand supply chains.',
  },

  {
    key: 'first_craft',
    order: 6,
    phase: 'economic',
    title: 'Craft Your First Item',
    description: 'Use your materials to craft an item. This craft will complete instantly and grant bonus XP!',
    icon: '🔨',
    skippable: false,
    estimatedTime: '2 min',
    rewards: {
      gold: 0,
      items: [
        { itemKey: 'pearl', qty: 2 }
      ],
      bonuses: ['instant_craft', '10xp_bonus']
    },
    validationQuery: 'hasCraftedItem',
    helpText: 'Go to Crafting page, select a blueprint, and start crafting using your iron ore.',
  },

  // ===== PHASE 3: ADVANCED (Trading & Social) =====
  {
    key: 'first_sale',
    order: 7,
    phase: 'advanced',
    title: 'List an Item for Sale',
    description: 'Create your first auction house listing. No listing fee for your first sale!',
    icon: '🏪',
    skippable: true,
    estimatedTime: '3 min',
    rewards: {
      gold: 0, // Gold comes from sale itself
      items: [
        { itemKey: 'pearl', qty: 5 }
      ],
      bonuses: ['free_listing'] // First listing has no fee
    },
    validationQuery: 'hasCreatedListing',
    helpText: 'Visit the Market, select an item from your warehouse, and create a listing.',
  },

  {
    key: 'strategy_guide',
    order: 8,
    phase: 'advanced',
    title: 'Read the Strategy Guide',
    description: 'Learn advanced tips about market timing, caravan routes, and crafting specialization.',
    icon: '📚',
    skippable: true,
    estimatedTime: '5 min',
    rewards: {
      gold: 100,
      items: [
        { itemKey: 'relic_fragment', qty: 2 }
      ]
    },
    helpText: 'Review the strategy guide to master advanced trading techniques.',
  },

  {
    key: 'join_guild',
    order: 9,
    phase: 'advanced',
    title: 'Join or Create a Guild',
    description: 'Guilds unlock cooperative missions, guild wars, and shared resources.',
    icon: '⚔️',
    skippable: true,
    estimatedTime: '3 min',
    rewards: {
      gold: 150,
      items: []
    },
    validationQuery: 'hasJoinedGuild',
    helpText: 'Visit the Guilds page to browse guilds or create your own.',
  }
];

/**
 * Get step by key
 */
export function getStepByKey(key: string): OnboardingStepDefinition | undefined {
  return ONBOARDING_STEPS.find(step => step.key === key);
}

/**
 * Get step by order number
 */
export function getStepByOrder(order: number): OnboardingStepDefinition | undefined {
  return ONBOARDING_STEPS.find(step => step.order === order);
}

/**
 * Get next step after current
 */
export function getNextStep(currentKey: string): OnboardingStepDefinition | undefined {
  const currentStep = getStepByKey(currentKey);
  if (!currentStep) return undefined;
  return getStepByOrder(currentStep.order + 1);
}

/**
 * Get previous step
 */
export function getPreviousStep(currentKey: string): OnboardingStepDefinition | undefined {
  const currentStep = getStepByKey(currentKey);
  if (!currentStep || currentStep.order === 1) return undefined;
  return getStepByOrder(currentStep.order - 1);
}

/**
 * Get all steps in a phase
 */
export function getStepsByPhase(phase: OnboardingPhase): OnboardingStepDefinition[] {
  return ONBOARDING_STEPS.filter(step => step.phase === phase);
}

/**
 * Calculate total rewards across all steps
 */
export function calculateTotalRewards(): { gold: number; itemCount: number } {
  let totalGold = 0;
  let totalItems = 0;

  for (const step of ONBOARDING_STEPS) {
    totalGold += step.rewards.gold;
    totalItems += step.rewards.items.reduce((sum, item) => sum + item.qty, 0);
  }

  return { gold: totalGold, itemCount: totalItems };
}

/**
 * Check if step is required (non-skippable)
 */
export function isStepRequired(key: string): boolean {
  const step = getStepByKey(key);
  return step ? !step.skippable : false;
}

/**
 * Get completion percentage (0-100)
 */
export function calculateCompletionPercentage(completedSteps: string[]): number {
  return Math.round((completedSteps.length / ONBOARDING_STEPS.length) * 100);
}

/**
 * Get phase display name
 */
export function getPhaseDisplayName(phase: OnboardingPhase): string {
  const names = {
    essential: 'Essential Basics',
    economic: 'Economic Loop',
    advanced: 'Advanced Trading'
  };
  return names[phase];
}

/**
 * Get phase icon
 */
export function getPhaseIcon(phase: OnboardingPhase): string {
  const icons = {
    essential: '🎯',
    economic: '💰',
    advanced: '🚀'
  };
  return icons[phase];
}
