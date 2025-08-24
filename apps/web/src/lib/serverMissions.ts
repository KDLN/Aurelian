import prisma from '@/lib/prisma';

export interface ContributionData {
  items?: Record<string, number>;
  gold?: number;
  trades?: number;
  [key: string]: any;
}

export interface MissionRequirements {
  items?: Record<string, number>;
  gold?: number;
  trades?: number;
  [key: string]: any;
}

export interface TierThresholds {
  bronze: number;
  silver: number;
  gold: number;
  legendary?: number;
}

export interface MissionRewards {
  tiers: {
    bronze?: { gold?: number; items?: Array<{ itemKey: string; quantity: number }> };
    silver?: { gold?: number; items?: Array<{ itemKey: string; quantity: number }> };
    gold?: { gold?: number; items?: Array<{ itemKey: string; quantity: number }> };
    legendary?: { gold?: number; items?: Array<{ itemKey: string; quantity: number }> };
  };
  serverWide?: {
    tradeBonus?: number;
    xpBonus?: number;
    duration?: number; // hours
    rareSpawns?: boolean;
  };
}

// Calculate contribution score as percentage of personal goal
export function calculateContributionScore(
  contribution: ContributionData,
  requirements: MissionRequirements,
  personalMultiplier: number = 0.01 // 1% of total requirements per person
): number {
  if (!contribution || !requirements) return 0;
  
  let totalScore = 0;
  let totalPossible = 0;

  // Personal goal is a fraction of total server requirements
  const personalRequirements = {
    ...requirements,
    items: requirements.items ? 
      Object.fromEntries(
        Object.entries(requirements.items).map(([key, value]) => [key, Math.max(1, Math.floor(value * personalMultiplier))])
      ) : undefined,
    gold: requirements.gold ? Math.max(1, Math.floor(requirements.gold * personalMultiplier)) : undefined,
    trades: requirements.trades ? Math.max(1, Math.floor(requirements.trades * personalMultiplier)) : undefined
  };

  // Calculate score for items
  if (personalRequirements.items && contribution.items) {
    for (const [itemKey, required] of Object.entries(personalRequirements.items)) {
      const contributed = contribution.items[itemKey] || 0;
      totalScore += Math.min(contributed / required, 2.0); // Allow up to 200% for legendary tier
      totalPossible += 1;
    }
  }

  // Calculate score for gold
  if (personalRequirements.gold && contribution.gold) {
    totalScore += Math.min(contribution.gold / personalRequirements.gold, 2.0);
    totalPossible += 1;
  }

  // Calculate score for trades
  if (personalRequirements.trades && contribution.trades) {
    totalScore += Math.min(contribution.trades / personalRequirements.trades, 2.0);
    totalPossible += 1;
  }

  return totalPossible > 0 ? totalScore / totalPossible : 0;
}

// Determine tier based on contribution score
export function calculateTier(score: number, tiers: TierThresholds): string {
  if (score >= (tiers.legendary || 1.5)) return 'legendary';
  if (score >= tiers.gold) return 'gold';
  if (score >= tiers.silver) return 'silver';
  if (score >= tiers.bronze) return 'bronze';
  return 'none';
}

// Update mission progress with new contribution
export async function updateMissionProgress(
  missionId: string,
  contribution: ContributionData,
  previousContribution?: ContributionData
) {
  const mission = await prisma.serverMission.findUnique({
    where: { id: missionId },
    select: { globalProgress: true, globalRequirements: true }
  });

  if (!mission) {
    throw new Error('Mission not found');
  }

  const currentProgress = mission.globalProgress as ContributionData;
  const requirements = mission.globalRequirements as MissionRequirements;

  // Calculate the net change (new contribution - old contribution)
  const netChange: ContributionData = {};

  // Calculate net change for items
  if (contribution.items || previousContribution?.items) {
    netChange.items = {};
    const allItemKeys = new Set([
      ...Object.keys(contribution.items || {}),
      ...Object.keys(previousContribution?.items || {})
    ]);

    for (const itemKey of allItemKeys) {
      const newAmount = contribution.items?.[itemKey] || 0;
      const oldAmount = previousContribution?.items?.[itemKey] || 0;
      const change = newAmount - oldAmount;
      
      if (change !== 0) {
        netChange.items[itemKey] = change;
      }
    }
  }

  // Calculate net change for gold
  if (contribution.gold !== undefined || previousContribution?.gold !== undefined) {
    const newGold = contribution.gold || 0;
    const oldGold = previousContribution?.gold || 0;
    netChange.gold = newGold - oldGold;
  }

  // Calculate net change for trades
  if (contribution.trades !== undefined || previousContribution?.trades !== undefined) {
    const newTrades = contribution.trades || 0;
    const oldTrades = previousContribution?.trades || 0;
    netChange.trades = newTrades - oldTrades;
  }

  // Apply net changes to current progress
  const newProgress = { ...currentProgress };

  if (netChange.items) {
    newProgress.items = { ...(newProgress.items || {}) };
    for (const [itemKey, change] of Object.entries(netChange.items)) {
      newProgress.items[itemKey] = Math.max(0, (newProgress.items[itemKey] || 0) + change);
    }
  }

  if (netChange.gold !== undefined) {
    newProgress.gold = Math.max(0, (newProgress.gold || 0) + netChange.gold);
  }

  if (netChange.trades !== undefined) {
    newProgress.trades = Math.max(0, (newProgress.trades || 0) + netChange.trades);
  }

  // Update the mission progress
  await prisma.serverMission.update({
    where: { id: missionId },
    data: { globalProgress: newProgress }
  });

  return newProgress;
}

// Check if mission is completed based on current progress
export function isMissionCompleted(progress: ContributionData, requirements: MissionRequirements): boolean {
  // Check items
  if (requirements.items) {
    for (const [itemKey, required] of Object.entries(requirements.items)) {
      const current = progress.items?.[itemKey] || 0;
      if (current < required) return false;
    }
  }

  // Check gold
  if (requirements.gold) {
    const current = progress.gold || 0;
    if (current < requirements.gold) return false;
  }

  // Check trades
  if (requirements.trades) {
    const current = progress.trades || 0;
    if (current < requirements.trades) return false;
  }

  return true;
}

// Validate contribution data
export async function validateContribution(
  contribution: ContributionData,
  userId: string,
  missionId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Validate items - check if user has them in inventory
  if (contribution.items) {
    for (const [itemKey, quantity] of Object.entries(contribution.items)) {
      if (quantity <= 0) {
        errors.push(`Invalid quantity for ${itemKey}: must be positive`);
        continue;
      }

      // Get item definition
      const itemDef = await prisma.itemDef.findUnique({
        where: { key: itemKey }
      });

      if (!itemDef) {
        errors.push(`Unknown item: ${itemKey}`);
        continue;
      }

      // Check user inventory
      const inventory = await prisma.inventory.findUnique({
        where: {
          userId_itemId_location: {
            userId,
            itemId: itemDef.id,
            location: 'warehouse'
          }
        }
      });

      if (!inventory || inventory.qty < quantity) {
        errors.push(`Insufficient ${itemDef.name}: have ${inventory?.qty || 0}, need ${quantity}`);
      }
    }
  }

  // Validate gold - check if user has enough
  if (contribution.gold) {
    if (contribution.gold <= 0) {
      errors.push('Gold contribution must be positive');
    } else {
      const wallet = await prisma.wallet.findUnique({
        where: { userId }
      });

      if (!wallet || wallet.gold < contribution.gold) {
        errors.push(`Insufficient gold: have ${wallet?.gold || 0}, need ${contribution.gold}`);
      }
    }
  }

  // Validate trades - this would depend on your specific trade tracking
  if (contribution.trades) {
    if (contribution.trades <= 0) {
      errors.push('Trade count must be positive');
    }
    // Additional trade validation could be added here
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Consume resources from user inventory/wallet for contribution
export async function consumeResources(
  contribution: ContributionData,
  userId: string,
  missionId: string
) {
  await prisma.$transaction(async (tx) => {
    // Consume items from inventory
    if (contribution.items) {
      for (const [itemKey, quantity] of Object.entries(contribution.items)) {
        const itemDef = await tx.itemDef.findUnique({
          where: { key: itemKey }
        });

        if (!itemDef) continue;

        await tx.inventory.update({
          where: {
            userId_itemId_location: {
              userId,
              itemId: itemDef.id,
              location: 'warehouse'
            }
          },
          data: {
            qty: { decrement: quantity }
          }
        });

        // Log transaction
        await tx.ledgerTx.create({
          data: {
            userId,
            amount: -quantity,
            reason: `Server Mission Contribution: ${itemDef.name}`,
            meta: {
              missionId,
              itemKey,
              quantity,
              type: 'server_mission_contribution'
            }
          }
        });
      }
    }

    // Consume gold from wallet
    if (contribution.gold) {
      await tx.wallet.update({
        where: { userId },
        data: {
          gold: { decrement: contribution.gold }
        }
      });

      // Log transaction
      await tx.ledgerTx.create({
        data: {
          userId,
          amount: -contribution.gold,
          reason: 'Server Mission Gold Contribution',
          meta: {
            missionId,
            type: 'server_mission_contribution'
          }
        }
      });
    }
  });
}

// Calculate and update all participant rankings for a mission
export async function updateMissionRankings(missionId: string) {
  const participants = await prisma.serverMissionParticipant.findMany({
    where: { missionId },
    include: {
      mission: {
        select: {
          globalRequirements: true,
          tiers: true
        }
      }
    },
    orderBy: {
      joinedAt: 'asc' // Fallback for ties
    }
  });

  if (participants.length === 0) return;

  const requirements = participants[0].mission.globalRequirements as MissionRequirements;
  const tiers = participants[0].mission.tiers as TierThresholds;

  // Calculate scores for all participants
  const participantsWithScores = participants.map(participant => {
    const contribution = participant.contribution as ContributionData;
    const score = calculateContributionScore(contribution, requirements);
    const tier = calculateTier(score, tiers);
    
    return {
      ...participant,
      calculatedScore: score,
      calculatedTier: tier
    };
  });

  // Sort by score (descending), then by join time (ascending) for ties
  participantsWithScores.sort((a, b) => {
    if (a.calculatedScore !== b.calculatedScore) {
      return b.calculatedScore - a.calculatedScore;
    }
    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
  });

  // Update ranks and tiers in database
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < participantsWithScores.length; i++) {
      const participant = participantsWithScores[i];
      await tx.serverMissionParticipant.update({
        where: { id: participant.id },
        data: {
          rank: i + 1,
          tier: participant.calculatedTier !== 'none' ? participant.calculatedTier : null
        }
      });
    }
  });

  return participantsWithScores.map((p, index) => ({
    participantId: p.id,
    userId: p.userId,
    rank: index + 1,
    tier: p.calculatedTier,
    score: p.calculatedScore
  }));
}

// Get leaderboard data with filters and pagination
export async function getMissionLeaderboard(
  missionId: string,
  options: {
    page?: number;
    limit?: number;
    guildFilter?: string;
    tierFilter?: string;
    userContext?: string; // userId to include user's position even if not in current page
  } = {}
) {
  const { page = 1, limit = 50, guildFilter, tierFilter, userContext } = options;
  const offset = (page - 1) * limit;

  // Build where conditions
  const whereConditions: any = { missionId };
  
  if (guildFilter) {
    whereConditions.guildId = guildFilter;
  }
  
  if (tierFilter) {
    whereConditions.tier = tierFilter;
  }

  // Get total count for pagination
  const totalCount = await prisma.serverMissionParticipant.count({
    where: whereConditions
  });

  // Get leaderboard data
  const participants = await prisma.serverMissionParticipant.findMany({
    where: whereConditions,
    include: {
      user: {
        include: {
          profile: {
            select: { display: true }
          },
          guildMembership: {
            include: {
              guild: {
                select: { id: true, name: true, tag: true }
              }
            }
          }
        }
      }
    },
    orderBy: [
      { rank: 'asc' },
      { joinedAt: 'asc' }
    ],
    skip: offset,
    take: limit
  });

  // Get user's position if specified and not in current page
  let userPosition = null;
  if (userContext) {
    const userParticipation = await prisma.serverMissionParticipant.findUnique({
      where: {
        missionId_userId: {
          missionId,
          userId: userContext
        }
      },
      include: {
        user: {
          include: {
            profile: { select: { display: true } },
            guildMembership: {
              include: {
                guild: { select: { id: true, name: true, tag: true } }
              }
            }
          }
        }
      }
    });

    if (userParticipation && !participants.find(p => p.userId === userContext)) {
      userPosition = {
        rank: userParticipation.rank,
        userId: userParticipation.userId,
        displayName: userParticipation.user.profile?.display || 'Anonymous Trader',
        guild: userParticipation.user.guildMembership?.guild || null,
        tier: userParticipation.tier,
        contribution: userParticipation.contribution,
        joinedAt: userParticipation.joinedAt
      };
    }
  }

  const leaderboard = participants.map(participant => ({
    rank: participant.rank,
    userId: participant.userId,
    displayName: participant.user.profile?.display || 'Anonymous Trader',
    guild: participant.user.guildMembership?.guild || null,
    tier: participant.tier,
    contribution: participant.contribution,
    joinedAt: participant.joinedAt
  }));

  return {
    leaderboard,
    userPosition,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPrevPage: page > 1
    }
  };
}

// Get tier statistics for a mission
export async function getMissionTierStats(missionId: string) {
  const tierCounts = await prisma.serverMissionParticipant.groupBy({
    by: ['tier'],
    where: { missionId },
    _count: { id: true }
  });

  const stats = {
    bronze: 0,
    silver: 0,
    gold: 0,
    legendary: 0,
    unranked: 0,
    total: 0
  };

  tierCounts.forEach(({ tier, _count }) => {
    if (tier) {
      stats[tier as keyof typeof stats] = _count.id;
    } else {
      stats.unranked = _count.id;
    }
    stats.total += _count.id;
  });

  return stats;
}

// Get mission template examples
export const MISSION_TEMPLATES = {
  tradeBoost: {
    name: "Grand Trade Festival",
    description: "Boost the server economy through increased trading activity. Complete trades to earn rewards and unlock server-wide bonuses.",
    type: "trade_festival",
    globalRequirements: {
      trades: 1000,
      gold: 500000 // Gold volume traded
    },
    rewards: {
      tiers: {
        bronze: { gold: 500, items: [{ itemKey: "merchant_badge", quantity: 1 }] },
        silver: { gold: 1500, items: [{ itemKey: "trade_certificate", quantity: 1 }] },
        gold: { gold: 5000, items: [{ itemKey: "master_trader_seal", quantity: 1 }] },
        legendary: { gold: 15000, items: [{ itemKey: "legendary_merchant_crown", quantity: 1 }] }
      },
      serverWide: {
        tradeBonus: 0.25, // +25% trade rewards
        duration: 48 // 48 hours
      }
    },
    tiers: {
      bronze: 0.1, // Complete 10% of personal goal
      silver: 0.25, // Complete 25% of personal goal
      gold: 0.5, // Complete 50% of personal goal
      legendary: 1.5 // Complete 150% of personal goal
    }
  },

  resourceDrive: {
    name: "Great Resource Gathering",
    description: "Collect vital resources to build new server infrastructure. Contribute items to unlock new areas and features.",
    type: "resource_drive",
    globalRequirements: {
      items: {
        "iron_ore": 10000,
        "herb": 5000,
        "hide": 3000
      }
    },
    rewards: {
      tiers: {
        bronze: { gold: 300, items: [{ itemKey: "gatherer_badge", quantity: 1 }] },
        silver: { gold: 800, items: [{ itemKey: "resource_specialist", quantity: 1 }] },
        gold: { gold: 2000, items: [{ itemKey: "master_gatherer", quantity: 1 }] },
        legendary: { gold: 8000, items: [{ itemKey: "resource_lord", quantity: 1 }] }
      }
    },
    tiers: {
      bronze: 0.05,
      silver: 0.15,
      gold: 0.3,
      legendary: 1.0
    }
  }
};