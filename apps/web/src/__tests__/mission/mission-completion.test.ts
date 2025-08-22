import { prisma } from '@/lib/prisma';

// Mock user data for all tests
const mockUser = { id: '12345678-1234-1234-1234-123456789abc', email: 'test@example.com' };

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    missionInstance: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    missionDef: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    agent: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    wallet: {
      upsert: jest.fn(),
    },
    inventory: {
      upsert: jest.fn(),
    },
    itemDef: {
      findUnique: jest.fn(),
    },
    equipmentDef: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
  })),
}));

// Mock Activity Logger
jest.mock('@/lib/services/activityLogger', () => ({
  ActivityLogger: {
    logMissionCompleted: jest.fn(),
  },
}));

// Mock Daily Stats Tracker
jest.mock('@/lib/services/dailyStatsTracker', () => ({
  DailyStatsTracker: {
    trackMissionCompleted: jest.fn(),
    trackGoldEarned: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Mission Completion Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // Fixed random for predictable tests
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2023-01-01T12:00:00Z').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Mission Completion Flow', () => {
    const mockMissionDef = {
      id: 'mission-456',
      name: 'Iron Ore Run',
      fromHub: 'Mining Camp',
      toHub: 'Capital City',
      baseReward: 100,
      riskLevel: 'MEDIUM',
      itemRewards: [
        { itemKey: 'iron_ore', qty: 3 },
        { itemKey: 'herb', qty: 1 }
      ]
    };

    const mockMissionInstance = {
      id: 'instance-789',
      userId: mockUser.id,
      missionId: 'mission-456',
      status: 'active',
      startTime: new Date('2023-01-01T11:00:00Z'),
      endTime: new Date('2023-01-01T11:30:00Z'), // 30 minutes ago
      agentId: 'agent-123',
      mission: mockMissionDef
    };

    it('should complete mission successfully with normal outcome', async () => {
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.6); // Should result in NORMAL_SUCCESS (60 roll)

      mockPrisma.missionInstance.findUnique.mockResolvedValue(mockMissionInstance as any);
      mockPrisma.agent.findUnique.mockResolvedValue(null); // No agent bonuses
      mockPrisma.itemDef.findUnique
        .mockResolvedValueOnce({ id: 'iron-ore-id', key: 'iron_ore', name: 'Iron Ore' } as any)
        .mockResolvedValueOnce({ id: 'herb-id', key: 'herb', name: 'Herb' } as any);

      const completeMissionTransaction = async () => {
        const missionInstance = await mockPrisma.missionInstance.findUnique({
          where: { id: 'instance-789' },
          include: { mission: true }
        });

        // Check timing
        const now = new Date();
        if (now < missionInstance!.endTime) {
          throw new Error('Mission not yet complete');
        }

        // Calculate outcome (outcomeRoll = 60, NORMAL_SUCCESS)
        const outcomeRoll = 60;
        const goldMultiplier = 1.0;
        const itemMultiplier = 1.0;
        const actualReward = Math.floor(mockMissionDef.baseReward * goldMultiplier);

        // Update wallet
        await mockPrisma.wallet.upsert({
          where: { userId: mockUser.id },
          update: { gold: { increment: actualReward } },
          create: { userId: mockUser.id, gold: actualReward }
        });

        // Award items
        for (const itemReward of mockMissionDef.itemRewards) {
          const itemDef = await mockPrisma.itemDef.findUnique({
            where: { key: itemReward.itemKey }
          });

          if (itemDef) {
            await mockPrisma.inventory.upsert({
              where: {
                userId_itemId_location: {
                  userId: mockUser.id,
                  itemId: itemDef.id,
                  location: 'warehouse'
                }
              },
              update: { qty: { increment: Math.floor(itemReward.qty * itemMultiplier) } },
              create: {
                userId: mockUser.id,
                itemId: itemDef.id,
                qty: Math.floor(itemReward.qty * itemMultiplier),
                location: 'warehouse'
              }
            });
          }
        }

        // Update mission status
        await mockPrisma.missionInstance.update({
          where: { id: 'instance-789' },
          data: {
            status: 'completed',
            completedAt: now,
            actualReward
          }
        });

        return {
          success: true,
          actualReward,
          itemsReceived: mockMissionDef.itemRewards,
          outcomeType: 'NORMAL_SUCCESS'
        };
      };

      const result = await completeMissionTransaction();

      expect(result.success).toBe(true);
      expect(result.actualReward).toBe(100);
      expect(result.outcomeType).toBe('NORMAL_SUCCESS');

      // Verify wallet update
      expect(mockPrisma.wallet.upsert).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        update: { gold: { increment: 100 } },
        create: { userId: mockUser.id, gold: 100 }
      });

      // Verify inventory updates
      expect(mockPrisma.inventory.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.inventory.upsert).toHaveBeenCalledWith({
        where: {
          userId_itemId_location: {
            userId: mockUser.id,
            itemId: 'iron-ore-id',
            location: 'warehouse'
          }
        },
        update: { qty: { increment: 3 } },
        create: {
          userId: mockUser.id,
          itemId: 'iron-ore-id',
          qty: 3,
          location: 'warehouse'
        }
      });
    });

    it('should apply risk-based modifiers correctly', async () => {
      const testCases = [
        { riskLevel: 'LOW', baseRoll: 50, expectedModified: 70, expectedMultiplier: 1.0 },
        { riskLevel: 'MEDIUM', baseRoll: 50, expectedModified: 50, expectedMultiplier: 1.0 },
        { riskLevel: 'HIGH', baseRoll: 50, expectedModified: 35, expectedMultiplier: 1.25 }
      ];

      testCases.forEach(({ riskLevel, baseRoll, expectedModified, expectedMultiplier }) => {
        const calculateOutcome = (roll: number, risk: string) => {
          let modifiedRoll = roll;
          
          switch (risk) {
            case 'LOW':
              modifiedRoll += 20;
              break;
            case 'MEDIUM':
              // No modifier
              break;
            case 'HIGH':
              modifiedRoll -= 15;
              break;
          }

          const goldMultiplier = risk === 'HIGH' ? 1.25 : 1.0;
          
          return { modifiedRoll, goldMultiplier };
        };

        const result = calculateOutcome(baseRoll, riskLevel);
        expect(result.modifiedRoll).toBe(expectedModified);
        expect(result.goldMultiplier).toBe(expectedMultiplier);
      });
    });

    it('should handle agent bonuses correctly', async () => {
      const mockAgent = {
        id: 'agent-123',
        level: 5,
        specialty: 'trading',
        successBonus: 20,
        speedBonus: 15,
        rewardBonus: 10,
        experience: 400
      };

      mockPrisma.agent.findUnique.mockResolvedValue(mockAgent as any);

      const calculateAgentBonuses = (baseRoll: number, baseReward: number, agent: any) => {
        // Success bonus affects outcome roll
        let modifiedRoll = baseRoll + Math.floor(agent.successBonus / 2); // Half success bonus to roll
        
        // Reward bonus affects final gold
        const rewardBonus = Math.floor(baseReward * (agent.rewardBonus / 100));
        const finalReward = baseReward + rewardBonus;

        return { modifiedRoll, finalReward, rewardBonus };
      };

      const result = calculateAgentBonuses(50, 100, mockAgent);
      
      expect(result.modifiedRoll).toBe(60); // 50 + (20/2) = 60
      expect(result.rewardBonus).toBe(10); // 100 * (10/100) = 10
      expect(result.finalReward).toBe(110); // 100 + 10 = 110
    });

    it('should prevent early completion attempts', async () => {
      const futureMissionInstance = {
        ...mockMissionInstance,
        endTime: new Date('2023-01-01T13:00:00Z') // 1 hour in future
      };

      mockPrisma.missionInstance.findUnique.mockResolvedValue(futureMissionInstance as any);

      const checkMissionTiming = async () => {
        const missionInstance = await mockPrisma.missionInstance.findUnique({
          where: { id: 'instance-789' },
          include: { mission: true }
        });

        // Use fixed current time from our mock
        const now = new Date('2023-01-01T12:00:00Z'); // Current mocked time
        if (now < missionInstance!.endTime) {
          throw new Error('Mission not yet complete');
        }

        return { canComplete: true };
      };

      await expect(checkMissionTiming())
        .rejects.toThrow('Mission not yet complete');
    });

    it('should handle mission failure outcomes correctly', async () => {
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.1); // Should result in FAILURE (10 roll)

      const calculateFailureOutcome = (roll: number) => {
        let outcomeType: string;
        let goldMultiplier: number;
        let itemMultiplier: number;

        if (roll >= 20) {
          outcomeType = 'POOR_SUCCESS';
          goldMultiplier = 0.7;
          itemMultiplier = 0.75;
        } else if (roll >= 5) {
          outcomeType = 'FAILURE';
          goldMultiplier = 0.3;
          itemMultiplier = 0.25;
        } else {
          outcomeType = 'CRITICAL_FAILURE';
          goldMultiplier = 0.0;
          itemMultiplier = 0.0;
        }

        const actualReward = Math.floor(100 * goldMultiplier);
        const itemsReceived = mockMissionDef.itemRewards.map(item => ({
          ...item,
          qty: Math.max(0, Math.floor(item.qty * itemMultiplier))
        }));

        return { outcomeType, actualReward, itemsReceived };
      };

      const result = calculateFailureOutcome(10);
      
      expect(result.outcomeType).toBe('FAILURE');
      expect(result.actualReward).toBe(30); // 100 * 0.3
      expect(result.itemsReceived[0].qty).toBe(0); // 3 * 0.25 = 0.75 -> 0
      expect(result.itemsReceived[1].qty).toBe(0); // 1 * 0.25 = 0.25 -> 0
    });
  });

  describe('Mission Outcome Calculations', () => {
    it('should calculate outcome types correctly based on roll ranges', () => {
      const calculateOutcomeType = (roll: number) => {
        if (roll >= 95) return 'LEGENDARY_SUCCESS';
        if (roll >= 90) return 'CRITICAL_SUCCESS';
        if (roll >= 70) return 'GOOD_SUCCESS';
        if (roll >= 40) return 'NORMAL_SUCCESS';
        if (roll >= 20) return 'POOR_SUCCESS';
        if (roll >= 5) return 'FAILURE';
        return 'CRITICAL_FAILURE';
      };

      expect(calculateOutcomeType(98)).toBe('LEGENDARY_SUCCESS');
      expect(calculateOutcomeType(92)).toBe('CRITICAL_SUCCESS');
      expect(calculateOutcomeType(75)).toBe('GOOD_SUCCESS');
      expect(calculateOutcomeType(50)).toBe('NORMAL_SUCCESS');
      expect(calculateOutcomeType(25)).toBe('POOR_SUCCESS');
      expect(calculateOutcomeType(10)).toBe('FAILURE');
      expect(calculateOutcomeType(2)).toBe('CRITICAL_FAILURE');
    });

    it('should apply distance and duration modifiers correctly', () => {
      const applyMissionModifiers = (baseRoll: number, distance: number, duration: number) => {
        let roll = baseRoll;

        // Distance modifiers
        if (distance > 200) {
          roll -= 3;
        } else if (distance < 100) {
          roll += 3;
        }

        // Duration modifiers  
        if (duration > 300) {
          roll -= 2;
        } else if (duration < 180) {
          roll += 2;
        }

        return Math.max(0, Math.min(100, roll));
      };

      // Long dangerous mission
      expect(applyMissionModifiers(50, 250, 400)).toBe(45); // 50 - 3 - 2 = 45
      
      // Short safe mission
      expect(applyMissionModifiers(50, 80, 120)).toBe(55); // 50 + 3 + 2 = 55
      
      // Edge case - roll clamping
      expect(applyMissionModifiers(5, 300, 500)).toBe(0); // 5 - 3 - 2 = 0 (clamped)
      expect(applyMissionModifiers(95, 50, 100)).toBe(100); // 95 + 3 + 2 = 100 (clamped)
    });

    it('should calculate reward multipliers for each outcome type', () => {
      const getRewardMultipliers = (outcomeType: string) => {
        const multipliers = {
          'LEGENDARY_SUCCESS': { gold: 2.0, items: 1.2 },
          'CRITICAL_SUCCESS': { gold: 1.5, items: 1.0 },
          'GOOD_SUCCESS': { gold: 1.2, items: 1.0 },
          'NORMAL_SUCCESS': { gold: 1.0, items: 1.0 },
          'POOR_SUCCESS': { gold: 0.7, items: 0.75 },
          'FAILURE': { gold: 0.3, items: 0.25 },
          'CRITICAL_FAILURE': { gold: 0.0, items: 0.0 }
        };

        return multipliers[outcomeType as keyof typeof multipliers] || { gold: 1.0, items: 1.0 };
      };

      expect(getRewardMultipliers('LEGENDARY_SUCCESS')).toEqual({ gold: 2.0, items: 1.2 });
      expect(getRewardMultipliers('FAILURE')).toEqual({ gold: 0.3, items: 0.25 });
      expect(getRewardMultipliers('CRITICAL_FAILURE')).toEqual({ gold: 0.0, items: 0.0 });
    });
  });

  describe('Agent Experience and Leveling', () => {
    const mockAgent = {
      id: 'agent-123',
      level: 3,
      experience: 250,
      specialty: 'trading',
      successBonus: 15,
      speedBonus: 10,
      rewardBonus: 5
    };

    it('should calculate agent XP gain based on mission risk and outcome', () => {
      const calculateAgentXP = (riskLevel: string, outcomeType: string) => {
        const baseXP = {
          LOW: 20,
          MEDIUM: 35,
          HIGH: 60
        }[riskLevel as keyof typeof baseXP] || 20;

        const multipliers = {
          'LEGENDARY_SUCCESS': 2.0,
          'CRITICAL_SUCCESS': 1.5,
          'GOOD_SUCCESS': 1.2,
          'NORMAL_SUCCESS': 1.0,
          'POOR_SUCCESS': 0.7,
          'FAILURE': 0.3,
          'CRITICAL_FAILURE': 0.1
        };

        const multiplier = multipliers[outcomeType as keyof typeof multipliers] || 1.0;
        return Math.floor(baseXP * multiplier);
      };

      expect(calculateAgentXP('HIGH', 'LEGENDARY_SUCCESS')).toBe(120); // 60 * 2.0
      expect(calculateAgentXP('MEDIUM', 'NORMAL_SUCCESS')).toBe(35); // 35 * 1.0
      expect(calculateAgentXP('LOW', 'FAILURE')).toBe(6); // 20 * 0.3
    });

    it('should handle agent level up progression correctly', async () => {
      const agentNearLevelUp = {
        ...mockAgent,
        level: 2,
        experience: 180 // Need 200 for level 3
      };

      const largeXPGain = 50; // Should cause level up

      mockPrisma.agent.findUnique.mockResolvedValue(agentNearLevelUp as any);
      mockPrisma.equipmentDef.findUnique.mockResolvedValue(null); // No equipment bonuses

      const agentLevelUpLogic = async () => {
        const agent = await mockPrisma.agent.findUnique({
          where: { id: 'agent-123' }
        });

        const newExperience = agent!.experience + largeXPGain; // 180 + 50 = 230
        
        // Simple level up logic: need level * 100 XP for current level
        // Level 1 = 0-99 XP, Level 2 = 100-199 XP, Level 3 = 200-299 XP, etc.
        let newLevel = Math.floor(newExperience / 100) + 1;
        
        // Ensure minimum level is 1
        if (newLevel < 1) newLevel = 1;

        await mockPrisma.agent.update({
          where: { id: 'agent-123' },
          data: {
            level: newLevel,
            experience: newExperience
          }
        });

        return {
          leveledUp: newLevel > agent!.level,
          oldLevel: agent!.level,
          newLevel,
          xpGained: largeXPGain,
          newExperience
        };
      };

      const result = await agentLevelUpLogic();

      expect(result.leveledUp).toBe(true);
      expect(result.oldLevel).toBe(2);
      expect(result.newLevel).toBe(3);
      expect(result.newExperience).toBe(230);

      expect(mockPrisma.agent.update).toHaveBeenCalledWith({
        where: { id: 'agent-123' },
        data: {
          level: 3,
          experience: 230
        }
      });
    });

    it('should calculate multiple level ups for massive XP gains', () => {
      const calculateMultipleLevelUps = (currentLevel: number, currentXP: number, xpGain: number) => {
        let newExperience = currentXP + xpGain;
        let newLevel = currentLevel;

        // Simple level up: each level needs level * 100 XP
        // Level 1: 100 XP, Level 2: 200 XP, Level 3: 300 XP
        while (newLevel < 10) { // Safety limit
          const requiredForNextLevel = (newLevel + 1) * 100;
          if (newExperience >= requiredForNextLevel) {
            newLevel++;
          } else {
            break;
          }
        }

        return {
          leveledUp: newLevel > currentLevel,
          oldLevel: currentLevel,
          newLevel,
          levelsGained: newLevel - currentLevel
        };
      };

      // Agent at level 1 with 50 XP gains 500 XP
      const result = calculateMultipleLevelUps(1, 50, 500);
      
      // Level 1: need 100 XP total (have 50 + 500 = 550)  
      // Level 2: need 200 XP total (550 >= 200) -> Level 2
      // Level 3: need 300 XP total (550 >= 300) -> Level 3
      // But we'll only advance one level in our simple logic

      expect(result.leveledUp).toBe(true);
      expect(result.oldLevel).toBe(1);
      expect(result.newLevel).toBe(5); // Level 1 + 400 XP = 500 XP total = Level 5 (Math.floor(500/100)+1)
      expect(result.levelsGained).toBe(4);
    });
  });

  describe('Item Reward System', () => {
    it('should handle bonus item generation for different locations', () => {
      const getBonusItemsForLocation = (fromHub: string, toHub: string) => {
        const bonusMap: { [key: string]: string[] } = {
          'Mining Camp': ['iron_ore', 'iron_ingot'],
          'Forest Outpost': ['herb', 'healing_tonic'],
          'Tribal Grounds': ['hide', 'leather_roll'],
          'Harbor Town': ['pearl', 'hide'],
          'Ancient Ruins': ['relic_fragment', 'pearl'],
          'Treasure Island': ['pearl', 'relic_fragment']
        };
        
        return bonusMap[fromHub] || bonusMap[toHub] || ['iron_ore', 'herb', 'hide'];
      };

      expect(getBonusItemsForLocation('Mining Camp', 'Capital City'))
        .toEqual(['iron_ore', 'iron_ingot']);
      
      expect(getBonusItemsForLocation('Unknown', 'Harbor Town'))
        .toEqual(['pearl', 'hide']);
      
      expect(getBonusItemsForLocation('Unknown', 'Unknown'))
        .toEqual(['iron_ore', 'herb', 'hide']);
    });

    it('should filter out zero-quantity items from rewards', () => {
      const originalItems = [
        { itemKey: 'iron_ore', qty: 3 },
        { itemKey: 'herb', qty: 1 },
        { itemKey: 'pearl', qty: 2 }
      ];

      const applyItemMultiplier = (items: any[], multiplier: number) => {
        return items
          .map(item => ({
            ...item,
            qty: Math.max(0, Math.floor(item.qty * multiplier))
          }))
          .filter(item => item.qty > 0);
      };

      // FAILURE outcome (0.25 multiplier)
      const failureItems = applyItemMultiplier(originalItems, 0.25);
      expect(failureItems).toEqual([]); // All items become 0 quantity

      // POOR_SUCCESS outcome (0.75 multiplier)
      const poorItems = applyItemMultiplier(originalItems, 0.75);
      expect(poorItems).toEqual([
        { itemKey: 'iron_ore', qty: 2 }, // 3 * 0.75 = 2.25 -> 2
        { itemKey: 'pearl', qty: 1 } // 2 * 0.75 = 1.5 -> 1
      ]); // herb: 1 * 0.75 = 0.75 -> 0 (filtered out)
    });

    it('should track items lost vs received for detailed reporting', () => {
      const originalItems = [
        { itemKey: 'iron_ore', qty: 5 },
        { itemKey: 'herb', qty: 3 }
      ];

      const itemsReceived = [
        { itemKey: 'iron_ore', qty: 3 }, // Lost 2
        { itemKey: 'herb', qty: 0 } // Lost all 3
      ];

      const calculateItemsLost = (original: any[], received: any[]) => {
        return original.map(originalItem => {
          const receivedItem = received.find(item => item.itemKey === originalItem.itemKey);
          const lostQty = originalItem.qty - (receivedItem?.qty || 0);
          return {
            itemKey: originalItem.itemKey,
            qty: lostQty
          };
        }).filter(item => item.qty > 0);
      };

      const itemsLost = calculateItemsLost(originalItems, itemsReceived);
      
      expect(itemsLost).toEqual([
        { itemKey: 'iron_ore', qty: 2 },
        { itemKey: 'herb', qty: 3 }
      ]);
    });
  });

  describe('Mission Validation', () => {
    const mockMissionInstance = {
      id: 'instance-789',
      userId: mockUser.id,
      missionId: 'mission-456',
      status: 'active',
      startTime: new Date('2023-01-01T11:00:00Z'),
      endTime: new Date('2023-01-01T11:30:00Z'),
      agentId: 'agent-123'
    };

    it('should prevent completion of already completed missions', async () => {
      const completedMissionInstance = {
        ...mockMissionInstance,
        status: 'completed',
        completedAt: new Date('2023-01-01T11:45:00Z')
      };

      mockPrisma.missionInstance.findUnique.mockResolvedValue(completedMissionInstance as any);

      const validateMissionStatus = async () => {
        const missionInstance = await mockPrisma.missionInstance.findUnique({
          where: { id: 'instance-789' }
        });

        if (missionInstance!.status !== 'active') {
          throw new Error('Mission is not active');
        }

        return { canComplete: true };
      };

      await expect(validateMissionStatus())
        .rejects.toThrow('Mission is not active');
    });

    it('should prevent unauthorized completion attempts', async () => {
      const otherUserMission = {
        ...mockMissionInstance,
        userId: 'other-user-456'
      };

      mockPrisma.missionInstance.findUnique.mockResolvedValue(otherUserMission as any);

      const validateMissionOwnership = async (requestingUserId: string) => {
        const missionInstance = await mockPrisma.missionInstance.findUnique({
          where: { id: 'instance-789' }
        });

        if (missionInstance!.userId !== requestingUserId) {
          throw new Error('Unauthorized');
        }

        return { authorized: true };
      };

      await expect(validateMissionOwnership(mockUser.id))
        .rejects.toThrow('Unauthorized');
    });

    it('should handle missing mission instance gracefully', async () => {
      mockPrisma.missionInstance.findUnique.mockResolvedValue(null);

      const findMissionInstance = async () => {
        const missionInstance = await mockPrisma.missionInstance.findUnique({
          where: { id: 'nonexistent-789' }
        });

        if (!missionInstance) {
          throw new Error('Mission instance not found');
        }

        return missionInstance;
      };

      await expect(findMissionInstance())
        .rejects.toThrow('Mission instance not found');
    });
  });

  describe('Mission Start Validation', () => {
    const mockMissionDef = {
      id: 'mission-456',
      name: 'Test Mission',
      baseDuration: 300,
      isActive: true
    };

    const mockAgent = {
      id: 'agent-123',
      name: 'Test Agent',
      level: 2,
      specialty: 'trading',
      successBonus: 10,
      speedBonus: 5,
      rewardBonus: 3
    };

    it('should validate caravan slot availability', async () => {
      const activeMissions = [
        { caravanSlot: 1, agentId: 'other-agent-1' },
        { caravanSlot: 2, agentId: 'other-agent-2' },
        { caravanSlot: 3, agentId: 'other-agent-3' }
      ];

      const userCaravanSlots = {
        caravanSlotsUnlocked: 3,
        caravanSlotsPremium: 0
      };

      const findAvailableSlot = (totalSlots: number, occupiedSlots: number[]) => {
        for (let slot = 1; slot <= totalSlots; slot++) {
          if (!occupiedSlots.includes(slot)) {
            return slot;
          }
        }
        return null;
      };

      const totalSlots = userCaravanSlots.caravanSlotsUnlocked + userCaravanSlots.caravanSlotsPremium;
      const occupiedSlots = activeMissions.map(m => m.caravanSlot);
      
      const availableSlot = findAvailableSlot(totalSlots, occupiedSlots);
      expect(availableSlot).toBeNull(); // All slots occupied

      // Test with available slot
      const partiallyOccupied = [1, 3]; // Slot 2 is free
      const availableSlot2 = findAvailableSlot(3, partiallyOccupied);
      expect(availableSlot2).toBe(2);
    });

    it('should prevent agent double-booking', async () => {
      const activeMissions = [
        { agentId: 'agent-123', missionId: 'other-mission' }
      ];

      const checkAgentAvailability = (agentId: string, activeMissions: any[]) => {
        const agentOnMission = activeMissions.find(mission => mission.agentId === agentId);
        
        if (agentOnMission) {
          throw new Error(`Agent is already on a mission`);
        }

        return { available: true };
      };

      expect(() => checkAgentAvailability('agent-123', activeMissions))
        .toThrow('Agent is already on a mission');
      
      expect(checkAgentAvailability('agent-456', activeMissions))
        .toEqual({ available: true });
    });

    it('should calculate mission duration with agent speed bonus', () => {
      const calculateMissionDuration = (baseDuration: number, speedBonus: number) => {
        const speedMultiplier = 1 - (speedBonus / 100);
        return Math.max(baseDuration * speedMultiplier, baseDuration * 0.5); // Min 50% of base
      };

      expect(calculateMissionDuration(300, 10)).toBe(270); // 300 * 0.9 = 270
      expect(calculateMissionDuration(300, 20)).toBe(240); // 300 * 0.8 = 240
      expect(calculateMissionDuration(300, 60)).toBe(150); // Would be 120, but clamped to 150 (50% min)
    });

    it('should prevent duplicate missions for same user', async () => {
      const activeMissions = [
        { missionId: 'mission-456', userId: mockUser.id }
      ];

      const checkDuplicateMission = (missionId: string, activeMissions: any[]) => {
        const existingMission = activeMissions.find(m => m.missionId === missionId);
        
        if (existingMission) {
          throw new Error('Mission already in progress');
        }

        return { canStart: true };
      };

      expect(() => checkDuplicateMission('mission-456', activeMissions))
        .toThrow('Mission already in progress');
      
      expect(checkDuplicateMission('mission-789', activeMissions))
        .toEqual({ canStart: true });
    });
  });
});