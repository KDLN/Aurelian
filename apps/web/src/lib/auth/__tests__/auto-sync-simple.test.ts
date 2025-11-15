import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    itemDef: {
      findUnique: jest.fn(),
    },
    inventory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Auto-sync User - Core Functions', () => {
  let userId: string;
  let mockAuthUser: any;

  // Helper to generate valid UUID v4
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Use a unique UUID for each test to avoid cache issues
    userId = generateUUID();
    mockAuthUser = {
      id: userId,
      sub: userId,
      email: 'test@example.com'
    };
  });

  describe('User existence check', () => {
    it('should correctly identify existing user', async () => {
      const { userExists } = await import('../auto-sync');
      
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: userId } as any);

      const result = await userExists(userId);

      expect(result).toBe(true);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { id: true }
      });
    });

    it('should correctly identify non-existing user', async () => {
      const { userExists } = await import('../auto-sync');
      
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await userExists(userId);

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const { userExists } = await import('../auto-sync');
      
      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB Connection failed'));

      const result = await userExists(userId);

      expect(result).toBe(false);
    });
  });

  describe('User sync with valid UUID', () => {
    beforeEach(() => {
      // Setup default successful mocks
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: userId } as any);
      (mockPrisma.user.upsert as jest.Mock).mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        caravanSlotsUnlocked: 3,
        caravanSlotsPremium: 0,
        craftingLevel: 1,
        craftingXP: 0,
        craftingXPNext: 100
      } as any);

      (mockPrisma.profile.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.profile.create as jest.Mock).mockResolvedValue({} as any);
      (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.wallet.create as jest.Mock).mockResolvedValue({} as any);

      // Mock item definitions - use mockImplementation to handle multiple calls
      (mockPrisma.itemDef.findUnique as jest.Mock).mockImplementation((args: any) => {
        if (args.where.key === 'herb') {
          return Promise.resolve({ id: 'herb-id', key: 'herb' });
        } else if (args.where.key === 'iron_ore') {
          return Promise.resolve({ id: 'iron-id', key: 'iron_ore' });
        }
        return Promise.resolve(null);
      });

      (mockPrisma.inventory.findMany as jest.Mock).mockResolvedValue([]);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });
    });

    it('should create user, profile, and wallet for new user', async () => {
      const { ensureUserSynced } = await import('../auto-sync');

      await ensureUserSynced(mockAuthUser);

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { id: userId },
        update: {
          email: 'test@example.com',
          updatedAt: expect.any(Date)
        },
        create: {
          id: userId,
          email: 'test@example.com',
          caravanSlotsUnlocked: 3,
          caravanSlotsPremium: 0,
          craftingLevel: 1,
          craftingXP: 0,
          craftingXPNext: 100,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        }
      });

      expect(mockPrisma.profile.create).toHaveBeenCalledWith({
        data: {
          userId: userId,
          display: 'test'
        }
      });

      // Note: Updated from 500 to 1000 to match actual implementation (auto-sync.ts:184)
      // This reflects the increased starter gold amount
      expect(mockPrisma.wallet.create).toHaveBeenCalledWith({
        data: {
          userId: userId,
          gold: 1000
        }
      });
    });

    it('should not create profile or wallet if they already exist', async () => {
      const { ensureUserSynced } = await import('../auto-sync');

      (mockPrisma.profile.findUnique as jest.Mock).mockResolvedValue({ userId } as any);
      (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({ userId } as any);

      await ensureUserSynced(mockAuthUser);

      expect(mockPrisma.profile.create).not.toHaveBeenCalled();
      expect(mockPrisma.wallet.create).not.toHaveBeenCalled();
    });

    it('should add starter items for new users', async () => {
      const { ensureUserSynced } = await import('../auto-sync');

      await ensureUserSynced(mockAuthUser);

      expect(mockPrisma.itemDef.findUnique).toHaveBeenCalledWith({ where: { key: 'herb' } });
      expect(mockPrisma.itemDef.findUnique).toHaveBeenCalledWith({ where: { key: 'iron_ore' } });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should skip starter items if user already has inventory', async () => {
      const { ensureUserSynced } = await import('../auto-sync');

      (mockPrisma.inventory.findMany as jest.Mock).mockResolvedValue([
        { userId, itemId: 'herb-id' }
      ] as any);

      await ensureUserSynced(mockAuthUser);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should handle email uniqueness constraint', async () => {
      const { ensureUserSynced } = await import('../auto-sync');

      const uniqueError = new Error('Unique constraint failed');
      (uniqueError as any).code = 'P2002';
      (uniqueError as any).meta = { target: ['email'] };

      (mockPrisma.user.upsert as jest.Mock)
        .mockRejectedValueOnce(uniqueError)
        .mockResolvedValueOnce({
          id: userId,
          email: `${userId}@oauth.local`
        } as any);

      await ensureUserSynced(mockAuthUser);

      expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.user.upsert).toHaveBeenLastCalledWith({
        where: { id: userId },
        update: {
          updatedAt: expect.any(Date)
        },
        create: {
          id: userId,
          email: `${userId}@oauth.local`,
          caravanSlotsUnlocked: 3,
          caravanSlotsPremium: 0,
          craftingLevel: 1,
          craftingXP: 0,
          craftingXPNext: 100,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should handle database errors appropriately', async () => {
      const { ensureUserSynced } = await import('../auto-sync');

      (mockPrisma.user.upsert as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      await expect(ensureUserSynced(mockAuthUser)).rejects.toThrow('Database sync failed');
    });
  });

  describe('JWT verification and sync', () => {
    it('should verify token and sync user', async () => {
      const { verifyAndSyncUser } = await import('../auto-sync');

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAuthUser },
            error: null
          })
        }
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: userId } as any);

      const result = await verifyAndSyncUser('valid-token', mockSupabase);

      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual({
        user: mockAuthUser,
        error: null
      });
    });

    it('should handle invalid token', async () => {
      const { verifyAndSyncUser } = await import('../auto-sync');

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid token' }
          })
        }
      };

      const result = await verifyAndSyncUser('invalid-token', mockSupabase);

      expect(result).toEqual({
        user: null,
        error: 'Invalid token'
      });
    });
  });
});