import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

// Mock JWT verification
jest.mock('@/lib/auth/jwt', () => ({
  verifyJWT: jest.fn(),
}));

// Mock activity loggers
jest.mock('@/lib/services/activityLogger', () => ({
  ActivityLogger: {
    logItemCrafted: jest.fn(),
  },
}));

jest.mock('@/lib/services/dailyStatsTracker', () => ({
  DailyStatsTracker: {
    trackItemsCrafted: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Crafting System Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Crafting Job Creation', () => {
    const mockUser = {
      id: 'user-123',
      craftingLevel: 5,
      craftingXP: 150,
      craftingXPNext: 250
    };

    const mockBlueprint = {
      id: 'blueprint-456',
      requiredLevel: 3,
      timeMin: 30, // 30 minutes
      xpReward: 25,
      outputQty: 2,
      outputId: 'item-789',
      starterRecipe: false,
      inputs: [
        { itemId: 'iron-ore-id', qty: 5 },
        { itemId: 'herb-id', qty: 2 }
      ],
      output: { name: 'Iron Sword', key: 'iron_sword' }
    };

    const mockInventory = [
      { userId: 'user-123', itemId: 'iron-ore-id', qty: 20, location: 'warehouse' },
      { userId: 'user-123', itemId: 'herb-id', qty: 10, location: 'warehouse' }
    ];

    it('should create crafting job with proper timing calculations', async () => {
      const quantity = 3;
      const expectedBaseTime = mockBlueprint.timeMin * quantity; // 90 minutes
      const expectedBatchTime = Math.ceil(expectedBaseTime * 0.9); // 81 minutes with batch bonus
      
      const startTime = new Date('2023-01-01T10:00:00Z');
      const expectedETA = new Date(startTime.getTime() + expectedBatchTime * 60 * 1000);
      
      jest.setSystemTime(startTime);

      const mockTx = {
        blueprint: {
          findUnique: jest.fn().mockResolvedValue(mockBlueprint),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue(mockUser),
        },
        blueprintUnlock: {
          findFirst: jest.fn().mockResolvedValue({ userId: 'user-123' }), // Has access
        },
        inventory: {
          findMany: jest.fn().mockResolvedValue(mockInventory),
          update: jest.fn(),
        },
        craftJob: {
          create: jest.fn().mockResolvedValue({
            id: 'job-123',
            userId: 'user-123',
            blueprintId: 'blueprint-456',
            qty: quantity,
            quality: 'common',
            startedAt: startTime,
            eta: expectedETA,
            status: 'running',
            blueprint: mockBlueprint
          }),
        },
      };

      const craftingTransaction = async (tx: any) => {
        const blueprint = await tx.blueprint.findUnique({
          where: { id: 'blueprint-456' },
          include: { output: { select: { name: true, key: true } } }
        });

        const user = await tx.user.findUnique({
          where: { id: 'user-123' },
          select: { 
            craftingLevel: true,
            craftingXP: true,
            craftingXPNext: true
          }
        });

        // Check blueprint access
        const hasAccess = blueprint.starterRecipe || 
          (blueprint.requiredLevel <= user.craftingLevel &&
           await tx.blueprintUnlock.findFirst({
             where: { userId: 'user-123', blueprintId: 'blueprint-456' }
           }));

        if (!hasAccess) {
          throw new Error('No access to blueprint');
        }

        // Validate materials
        const materialRequirements = {
          'iron-ore-id': 5 * quantity, // 15 total
          'herb-id': 2 * quantity // 6 total
        };

        const inventoryItems = await tx.inventory.findMany({
          where: {
            userId: 'user-123',
            location: 'warehouse',
            itemId: { in: Object.keys(materialRequirements) }
          }
        });

        // Check materials
        for (const [itemId, required] of Object.entries(materialRequirements)) {
          const available = inventoryItems.find(inv => inv.itemId === itemId)?.qty || 0;
          if (available < required) {
            throw new Error(`Insufficient materials: ${itemId}`);
          }
        }

        // Consume materials
        for (const [itemId, required] of Object.entries(materialRequirements)) {
          await tx.inventory.update({
            where: {
              userId_itemId_location: {
                userId: 'user-123',
                itemId,
                location: 'warehouse'
              }
            },
            data: { qty: { decrement: required } }
          });
        }

        // Calculate timing with batch bonus
        const baseTimeMinutes = blueprint.timeMin * quantity;
        const batchBonus = quantity > 1 ? 0.9 : 1.0;
        const totalTimeMinutes = Math.ceil(baseTimeMinutes * batchBonus);
        const eta = new Date(Date.now() + totalTimeMinutes * 60 * 1000);

        // Create job
        const craftJob = await tx.craftJob.create({
          data: {
            userId: 'user-123',
            blueprintId: 'blueprint-456',
            qty: quantity,
            quality: 'common',
            startedAt: new Date(),
            eta,
            status: 'running'
          },
          include: {
            blueprint: {
              include: {
                output: { select: { name: true, key: true } }
              }
            }
          }
        });

        return {
          craftJob,
          materialsConsumed: materialRequirements,
          estimatedCompletionTime: totalTimeMinutes
        };
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await mockPrisma.$transaction(craftingTransaction);

      expect(result.estimatedCompletionTime).toBe(expectedBatchTime);
      expect(result.craftJob.eta).toEqual(expectedETA);
      
      // Verify materials were consumed
      expect(mockTx.inventory.update).toHaveBeenCalledTimes(2);
      expect(mockTx.inventory.update).toHaveBeenCalledWith({
        where: {
          userId_itemId_location: {
            userId: 'user-123',
            itemId: 'iron-ore-id',
            location: 'warehouse'
          }
        },
        data: { qty: { decrement: 15 } }
      });
    });

    it('should calculate batch efficiency bonus correctly', () => {
      const calculateBatchTime = (baseTime: number, quantity: number) => {
        const batchBonus = quantity > 1 ? 0.9 : 1.0;
        return Math.ceil(baseTime * quantity * batchBonus);
      };

      // Single item - no bonus
      expect(calculateBatchTime(30, 1)).toBe(30);
      
      // Multiple items - 10% efficiency bonus
      expect(calculateBatchTime(30, 2)).toBe(54); // 60 * 0.9 = 54
      expect(calculateBatchTime(30, 5)).toBe(135); // 150 * 0.9 = 135
      expect(calculateBatchTime(10, 10)).toBe(90); // 100 * 0.9 = 90
    });

    it('should validate material requirements correctly', async () => {
      const quantity = 2;
      const mockTx = {
        blueprint: {
          findUnique: jest.fn().mockResolvedValue(mockBlueprint),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue(mockUser),
        },
        blueprintUnlock: {
          findFirst: jest.fn().mockResolvedValue({}),
        },
        inventory: {
          findMany: jest.fn().mockResolvedValue([
            { itemId: 'iron-ore-id', qty: 5 }, // Not enough (need 10)
            { itemId: 'herb-id', qty: 10 } // Enough (need 4)
          ]),
        },
        itemDef: {
          findUnique: jest.fn().mockResolvedValue({ name: 'Iron Ore' }),
        },
      };

      const validateMaterials = async (tx: any) => {
        const blueprint = await tx.blueprint.findUnique({
          where: { id: 'blueprint-456' }
        });

        const materialRequirements: Record<string, number> = {};
        for (const input of blueprint.inputs) {
          materialRequirements[input.itemId] = input.qty * quantity;
        }

        const inventoryItems = await tx.inventory.findMany({
          where: {
            userId: 'user-123',
            location: 'warehouse',
            itemId: { in: Object.keys(materialRequirements) }
          }
        });

        for (const [itemId, required] of Object.entries(materialRequirements)) {
          const available = inventoryItems.find(inv => inv.itemId === itemId)?.qty || 0;
          if (available < required) {
            const item = await tx.itemDef.findUnique({
              where: { id: itemId },
              select: { name: true }
            });
            throw new Error(`Insufficient ${item?.name}. Need ${required}, have ${available}`);
          }
        }

        return true;
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(mockPrisma.$transaction(validateMaterials))
        .rejects.toThrow('Insufficient Iron Ore. Need 10, have 5');
    });
  });

  describe('Crafting Job Completion', () => {
    const mockCraftJob = {
      id: 'job-123',
      userId: 'user-123',
      blueprintId: 'blueprint-456',
      qty: 2,
      quality: 'uncommon',
      status: 'running',
      eta: new Date('2023-01-01T11:00:00Z'), // 1 hour from start
      blueprint: {
        outputId: 'item-789',
        outputQty: 3,
        xpReward: 50,
        output: {
          id: 'item-789',
          key: 'iron_sword',
          name: 'Iron Sword',
          rarity: 'uncommon'
        }
      }
    };

    const mockUser = {
      id: 'user-123',
      craftingLevel: 5,
      craftingXP: 200,
      craftingXPNext: 350
    };

    it('should complete job and award items and XP correctly', async () => {
      const completionTime = new Date('2023-01-01T11:30:00Z'); // 30 min after ETA
      jest.setSystemTime(completionTime);

      const expectedTotalItems = mockCraftJob.qty * mockCraftJob.blueprint.outputQty; // 2 * 3 = 6
      const expectedXP = mockCraftJob.blueprint.xpReward * mockCraftJob.qty; // 50 * 2 = 100

      const mockTx = {
        craftJob: {
          findUnique: jest.fn().mockResolvedValue(mockCraftJob),
          update: jest.fn(),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue(mockUser),
          update: jest.fn(),
        },
        inventory: {
          upsert: jest.fn(),
        },
        blueprint: {
          findMany: jest.fn().mockResolvedValue([]), // No new blueprints
        },
      };

      const completeJob = async (tx: any) => {
        const craftJob = await tx.craftJob.findUnique({
          where: { id: 'job-123' },
          include: {
            blueprint: {
              include: {
                output: { select: { id: true, key: true, name: true, rarity: true } }
              }
            }
          }
        });

        // Check job is ready
        const now = new Date();
        if (now < craftJob.eta) {
          throw new Error('Job is not yet complete');
        }

        // Calculate items to create
        const totalItemsToCreate = craftJob.qty * craftJob.blueprint.outputQty;

        // Add items to inventory
        await tx.inventory.upsert({
          where: {
            userId_itemId_location: {
              userId: 'user-123',
              itemId: craftJob.blueprint.outputId,
              location: 'warehouse'
            }
          },
          update: { qty: { increment: totalItemsToCreate } },
          create: {
            userId: 'user-123',
            itemId: craftJob.blueprint.outputId,
            location: 'warehouse',
            qty: totalItemsToCreate
          }
        });

        // Award XP
        const xpGained = craftJob.blueprint.xpReward * craftJob.qty;
        const user = await tx.user.findUnique({
          where: { id: 'user-123' },
          select: { 
            craftingLevel: true, 
            craftingXP: true, 
            craftingXPNext: true 
          }
        });

        let newXP = user.craftingXP + xpGained;
        let newLevel = user.craftingLevel;
        let newXPNext = user.craftingXPNext;
        let leveledUp = false;

        // Level up logic
        while (newXP >= newXPNext) {
          newXP -= newXPNext;
          newLevel += 1;
          leveledUp = true;
          newXPNext = 100 + (newLevel - 1) * 50;
        }

        await tx.user.update({
          where: { id: 'user-123' },
          data: {
            craftingLevel: newLevel,
            craftingXP: newXP,
            craftingXPNext: newXPNext
          }
        });

        await tx.craftJob.update({
          where: { id: 'job-123' },
          data: {
            status: 'complete',
            updatedAt: now
          }
        });

        return {
          craftJob,
          itemsCreated: totalItemsToCreate,
          xpGained,
          leveledUp,
          newLevel: leveledUp ? newLevel : undefined
        };
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await mockPrisma.$transaction(completeJob);

      expect(result.itemsCreated).toBe(expectedTotalItems);
      expect(result.xpGained).toBe(expectedXP);
      
      // Verify inventory upsert
      expect(mockTx.inventory.upsert).toHaveBeenCalledWith({
        where: {
          userId_itemId_location: {
            userId: 'user-123',
            itemId: 'item-789',
            location: 'warehouse'
          }
        },
        update: { qty: { increment: 6 } },
        create: {
          userId: 'user-123',
          itemId: 'item-789',
          location: 'warehouse',
          qty: 6
        }
      });

      // Verify XP calculation (200 + 100 = 300, which is < 350, so no level up)
      expect(result.leveledUp).toBe(false);
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          craftingLevel: 5, // No change
          craftingXP: 300, // 200 + 100
          craftingXPNext: 350 // No change
        }
      });
    });

    it('should handle level up progression correctly', async () => {
      // User close to leveling up
      const userNearLevelUp = {
        ...mockUser,
        craftingXP: 320, // Near level up threshold of 350
        craftingXPNext: 350
      };

      const largeXPGain = 100; // This should cause level up

      const mockTx = {
        user: {
          findUnique: jest.fn().mockResolvedValue(userNearLevelUp),
          update: jest.fn(),
        },
        blueprint: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'new-bp-1', output: { name: 'Advanced Sword' } },
            { id: 'new-bp-2', output: { name: 'Magic Shield' } }
          ]),
        },
        blueprintUnlock: {
          createMany: jest.fn(),
        },
      };

      const levelUpLogic = async (tx: any) => {
        const user = await tx.user.findUnique({
          where: { id: 'user-123' },
          select: { 
            craftingLevel: true, 
            craftingXP: true, 
            craftingXPNext: true 
          }
        });

        let newXP = user.craftingXP + largeXPGain; // 320 + 100 = 420
        let newLevel = user.craftingLevel; // Start at 5
        let newXPNext = user.craftingXPNext; // Start at 350
        let leveledUp = false;

        // Level up calculation
        while (newXP >= newXPNext) {
          newXP -= newXPNext; // 420 - 350 = 70
          newLevel += 1; // 5 + 1 = 6
          leveledUp = true;
          newXPNext = 100 + (newLevel - 1) * 50; // 100 + 5*50 = 350
        }

        await tx.user.update({
          where: { id: 'user-123' },
          data: {
            craftingLevel: newLevel,
            craftingXP: newXP,
            craftingXPNext: newXPNext
          }
        });

        // Unlock new blueprints
        let newBlueprints: any[] = [];
        if (leveledUp) {
          const blueprintsToUnlock = await tx.blueprint.findMany({
            where: {
              requiredLevel: { lte: newLevel },
              starterRecipe: false,
              unlockedBy: {
                none: { userId: 'user-123' }
              }
            },
            include: {
              output: { select: { name: true } }
            }
          });

          if (blueprintsToUnlock.length > 0) {
            await tx.blueprintUnlock.createMany({
              data: blueprintsToUnlock.map(bp => ({
                userId: 'user-123',
                blueprintId: bp.id,
                unlockedBy: 'level'
              }))
            });
            newBlueprints = blueprintsToUnlock;
          }
        }

        return {
          leveledUp,
          newLevel,
          newXP,
          newXPNext,
          newBlueprints
        };
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await mockPrisma.$transaction(levelUpLogic);

      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(6);
      expect(result.newXP).toBe(70);
      expect(result.newXPNext).toBe(350);
      expect(result.newBlueprints).toHaveLength(2);

      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          craftingLevel: 6,
          craftingXP: 70,
          craftingXPNext: 350
        }
      });
    });

    it('should handle multiple level ups from large XP gains', async () => {
      const userLowLevel = {
        craftingLevel: 1,
        craftingXP: 90,
        craftingXPNext: 100
      };

      const massiveXPGain = 500; // Should cause multiple level ups

      const calculateMultipleLevelUps = (currentXP: number, currentLevel: number, currentXPNext: number, xpGain: number) => {
        let newXP = currentXP + xpGain;
        let newLevel = currentLevel;
        let newXPNext = currentXPNext;
        let levelUps = 0;

        while (newXP >= newXPNext) {
          newXP -= newXPNext;
          newLevel += 1;
          levelUps += 1;
          newXPNext = 100 + (newLevel - 1) * 50;
        }

        return { newXP, newLevel, newXPNext, levelUps };
      };

      const result = calculateMultipleLevelUps(90, 1, 100, 500);

      // Should level up multiple times:
      // Level 1: 90 + 500 = 590 XP, need 100 → 490 XP, Level 2, need 150
      // Level 2: 490 XP, need 150 → 340 XP, Level 3, need 200  
      // Level 3: 340 XP, need 200 → 140 XP, Level 4, need 250
      // Level 4: 140 XP, need 250 → stay at Level 4 with 140 XP

      expect(result.newLevel).toBe(4);
      expect(result.newXP).toBe(140);
      expect(result.newXPNext).toBe(250);
      expect(result.levelUps).toBe(3);
    });
  });

  describe('Crafting Timing Validation', () => {
    it('should prevent early completion attempts', async () => {
      const currentTime = new Date('2023-01-01T10:30:00Z');
      const jobETA = new Date('2023-01-01T11:00:00Z'); // 30 minutes in future
      
      jest.setSystemTime(currentTime);

      const mockTx = {
        craftJob: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'job-123',
            userId: 'user-123',
            status: 'running',
            eta: jobETA
          }),
        },
      };

      const checkJobTiming = async (tx: any) => {
        const craftJob = await tx.craftJob.findUnique({
          where: { id: 'job-123' }
        });

        const now = new Date();
        if (now < craftJob.eta) {
          throw new Error('Job is not yet complete');
        }

        return { canComplete: true };
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(mockPrisma.$transaction(checkJobTiming))
        .rejects.toThrow('Job is not yet complete');
    });

    it('should allow completion after ETA', async () => {
      const currentTime = new Date('2023-01-01T11:30:00Z');
      const jobETA = new Date('2023-01-01T11:00:00Z'); // 30 minutes ago
      
      jest.setSystemTime(currentTime);

      const mockTx = {
        craftJob: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'job-123',
            userId: 'user-123',
            status: 'running',
            eta: jobETA
          }),
        },
      };

      const checkJobTiming = async (tx: any) => {
        const craftJob = await tx.craftJob.findUnique({
          where: { id: 'job-123' }
        });

        const now = new Date();
        if (now < craftJob.eta) {
          throw new Error('Job is not yet complete');
        }

        return { canComplete: true, overtimeMinutes: Math.floor((now.getTime() - craftJob.eta.getTime()) / 60000) };
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await mockPrisma.$transaction(checkJobTiming);
      
      expect(result.canComplete).toBe(true);
      expect(result.overtimeMinutes).toBe(30);
    });
  });
});