import { MissionRisk, Agent, MissionDef } from '@prisma/client';

// Base success rates by risk level
const BASE_SUCCESS_RATES: Record<MissionRisk, number> = {
  LOW: 85,    // 85% base success rate
  MEDIUM: 65, // 65% base success rate  
  HIGH: 40,   // 40% base success rate
};

// Risk level multipliers for different stats
const RISK_MULTIPLIERS = {
  [MissionRisk.LOW]: {
    successBonus: 0.8,   // Success bonuses less effective on easy missions
    speedBonus: 1.0,     // Speed bonuses full effect
    rewardBonus: 1.0,    // Reward bonuses full effect
  },
  [MissionRisk.MEDIUM]: {
    successBonus: 1.0,   // Success bonuses full effect
    speedBonus: 1.0,     // Speed bonuses full effect
    rewardBonus: 1.0,    // Reward bonuses full effect
  },
  [MissionRisk.HIGH]: {
    successBonus: 1.2,   // Success bonuses more effective on hard missions
    speedBonus: 0.8,     // Speed bonuses less effective (danger slows you down)
    rewardBonus: 1.3,    // Reward bonuses more effective (high risk, high reward)
  },
};

export interface MissionOutcome {
  success: boolean;
  finalSuccessRate: number;
  duration: number; // in seconds
  goldReward: number;
  itemRewards?: Array<{ itemKey: string; quantity: number }>;
  experienceGained: number;
}

export function calculateMissionSuccess(
  mission: MissionDef,
  agent: Agent
): { successRate: number; duration: number; estimatedReward: number } {
  const baseSuccessRate = BASE_SUCCESS_RATES[mission.riskLevel];
  const multipliers = RISK_MULTIPLIERS[mission.riskLevel];
  
  // Apply agent bonuses with risk multipliers
  const effectiveSuccessBonus = agent.successBonus * multipliers.successBonus;
  const effectiveSpeedBonus = agent.speedBonus * multipliers.speedBonus;
  const effectiveRewardBonus = agent.rewardBonus * multipliers.rewardBonus;
  
  // Calculate final success rate (max 95%)
  const finalSuccessRate = Math.min(95, baseSuccessRate + effectiveSuccessBonus);
  
  // Calculate duration with speed bonuses
  const baseDuration = mission.baseDuration;
  const speedMultiplier = 1 - (effectiveSpeedBonus / 100);
  const finalDuration = Math.max(60, Math.round(baseDuration * speedMultiplier)); // Min 1 minute
  
  // Calculate estimated reward with bonuses
  const baseReward = mission.baseReward;
  const rewardMultiplier = 1 + (effectiveRewardBonus / 100);
  const estimatedReward = Math.round(baseReward * rewardMultiplier);
  
  return {
    successRate: Math.round(finalSuccessRate),
    duration: finalDuration,
    estimatedReward,
  };
}

export function simulateMissionOutcome(
  mission: MissionDef,
  agent: Agent
): MissionOutcome {
  const calculations = calculateMissionSuccess(mission, agent);
  
  // Roll for success
  const roll = Math.random() * 100;
  const success = roll <= calculations.successRate;
  
  // Calculate rewards based on success
  let goldReward = 0;
  let itemRewards: Array<{ itemKey: string; quantity: number }> = [];
  let experienceGained = 0;
  
  if (success) {
    // Full reward on success
    goldReward = calculations.estimatedReward;
    
    // Parse item rewards if they exist
    if (mission.itemRewards) {
      const itemRewardData = mission.itemRewards as Array<{ itemKey: string; qty: number }>;
      itemRewards = itemRewardData.map(item => ({
        itemKey: item.itemKey,
        quantity: item.qty
      }));
    }
    
    // Experience based on mission difficulty
    const baseXP = {
      [MissionRisk.LOW]: 20,
      [MissionRisk.MEDIUM]: 35,
      [MissionRisk.HIGH]: 60,
    };
    experienceGained = baseXP[mission.riskLevel];
  } else {
    // Partial reward on failure (25% gold, no items, reduced XP)
    goldReward = Math.round(calculations.estimatedReward * 0.25);
    experienceGained = 5; // Small XP for attempting
  }
  
  return {
    success,
    finalSuccessRate: calculations.successRate,
    duration: calculations.duration,
    goldReward,
    itemRewards,
    experienceGained,
  };
}

// Calculate agent level up requirements
export function getAgentLevelProgress(agent: Agent): {
  currentLevel: number;
  currentXP: number;
  xpForNextLevel: number;
  xpProgress: number;
  canLevelUp: boolean;
} {
  const currentLevel = agent.level;
  const currentXP = agent.experience;
  const xpForNextLevel = currentLevel * 100; // 100, 200, 300, etc.
  
  // Calculate XP progress within current level
  let xpInCurrentLevel = currentXP;
  for (let i = 1; i < currentLevel; i++) {
    xpInCurrentLevel -= i * 100;
  }
  
  const xpProgress = Math.round((xpInCurrentLevel / xpForNextLevel) * 100);
  const canLevelUp = xpInCurrentLevel >= xpForNextLevel;
  
  return {
    currentLevel,
    currentXP,
    xpForNextLevel,
    xpProgress,
    canLevelUp,
  };
}

// Get mission difficulty description
export function getMissionDifficultyText(risk: MissionRisk): {
  text: string;
  color: string;
  description: string;
} {
  const difficulties = {
    [MissionRisk.LOW]: {
      text: 'Low Risk',
      color: 'game-good',
      description: 'Safe routes with reliable rewards',
    },
    [MissionRisk.MEDIUM]: {
      text: 'Medium Risk', 
      color: 'game-warn',
      description: 'Moderate danger with balanced rewards',
    },
    [MissionRisk.HIGH]: {
      text: 'High Risk',
      color: 'game-bad',
      description: 'Dangerous missions with high rewards',
    },
  };
  
  return difficulties[risk];
}