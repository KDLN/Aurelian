import { AgentType } from '@/lib/types';

// Agent name generation
const firstNames = [
  'Aldric', 'Brom', 'Celia', 'Dara', 'Ewan', 'Fiona', 'Gareth', 'Hilda', 
  'Ivan', 'Jora', 'Kai', 'Luna', 'Marcus', 'Nira', 'Otto', 'Petra',
  'Quinn', 'Raven', 'Soren', 'Talia', 'Ulrich', 'Vera', 'Willem', 'Xara',
  'Yorick', 'Zara'
];

const lastNames = [
  'Ironfoot', 'Swiftarrow', 'Goldhand', 'Stormcaller', 'Brightblade', 'Shadowmere',
  'Flameborn', 'Frostguard', 'Windwalker', 'Earthshaker', 'Starweaver', 'Moonwhisper',
  'Thornkeeper', 'Riverstone', 'Wildmane', 'Steelshield', 'Ashborne', 'Silverstring',
  'Dawnbreaker', 'Nightfall', 'Lightbringer', 'Darkhunter', 'Truthseeker', 'Oathkeeper'
];

export function generateAgentName(): string {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
}

// Agent type specializations and descriptions
export const agentTypeInfo: Record<AgentType, {
  name: string;
  description: string;
  baseStats: {
    successBonus: number;
    speedBonus: number;
    rewardBonus: number;
  };
  levelUpBonuses: {
    successBonus: number;
    speedBonus: number;
    rewardBonus: number;
  };
}> = {
  [AgentType.SCOUT]: {
    name: 'Scout',
    description: 'Fast and nimble, excels at exploration and quick missions',
    baseStats: {
      successBonus: 5,
      speedBonus: 15,
      rewardBonus: 0,
    },
    levelUpBonuses: {
      successBonus: 1,
      speedBonus: 3,
      rewardBonus: 0,
    },
  },
  [AgentType.TRADER]: {
    name: 'Trader',
    description: 'Shrewd negotiator who maximizes mission rewards',
    baseStats: {
      successBonus: 5,
      speedBonus: 0,
      rewardBonus: 20,
    },
    levelUpBonuses: {
      successBonus: 1,
      speedBonus: 0,
      rewardBonus: 4,
    },
  },
  [AgentType.GUARD]: {
    name: 'Guard',
    description: 'Tough and reliable, ensures mission success through combat prowess',
    baseStats: {
      successBonus: 15,
      speedBonus: -5,
      rewardBonus: 0,
    },
    levelUpBonuses: {
      successBonus: 3,
      speedBonus: 0,
      rewardBonus: 0,
    },
  },
  [AgentType.SPECIALIST]: {
    name: 'Specialist',
    description: 'Balanced agent with unique bonuses from specialized equipment',
    baseStats: {
      successBonus: 8,
      speedBonus: 5,
      rewardBonus: 8,
    },
    levelUpBonuses: {
      successBonus: 2,
      speedBonus: 1,
      rewardBonus: 2,
    },
  },
};

// Calculate agent stats based on level and type
export function calculateAgentStats(agentType: AgentType, level: number): {
  successBonus: number;
  speedBonus: number;
  rewardBonus: number;
} {
  const typeInfo = agentTypeInfo[agentType];
  const levelBonuses = (level - 1); // Level 1 = base stats, each level adds bonuses

  return {
    successBonus: typeInfo.baseStats.successBonus + (levelBonuses * typeInfo.levelUpBonuses.successBonus),
    speedBonus: typeInfo.baseStats.speedBonus + (levelBonuses * typeInfo.levelUpBonuses.speedBonus),
    rewardBonus: typeInfo.baseStats.rewardBonus + (levelBonuses * typeInfo.levelUpBonuses.rewardBonus),
  };
}

// Calculate experience needed for next level
export function getExperienceForLevel(level: number): number {
  return level * 100; // Simple progression: 100, 200, 300, etc.
}

// Calculate level from experience
export function getLevelFromExperience(experience: number): number {
  let level = 1;
  let totalXpNeeded = 0;
  
  while (totalXpNeeded + getExperienceForLevel(level) <= experience) {
    totalXpNeeded += getExperienceForLevel(level);
    level++;
  }
  
  return level;
}

// Get hiring cost for an agent type
export function getHiringCost(agentType: AgentType): number {
  const baseCosts: Record<AgentType, number> = {
    [AgentType.SCOUT]: 150,
    [AgentType.TRADER]: 200,
    [AgentType.GUARD]: 250,
    [AgentType.SPECIALIST]: 300,
  };
  
  return baseCosts[agentType];
}

// Generate random agent for hiring
export function generateRandomAgent(agentType: AgentType) {
  const name = generateAgentName();
  const stats = calculateAgentStats(agentType, 1);
  
  return {
    name,
    specialty: agentType,
    level: 1,
    experience: 0,
    ...stats,
  };
}