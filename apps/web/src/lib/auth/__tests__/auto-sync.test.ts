import { 
  ensureUserSynced, 
  ensureUserExistsOptimized, 
  userExists, 
  verifyAndSyncUser 
} from '../auto-sync';
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
    },
    $transaction: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Auto-sync User', () => {
  const mockAuthUser = {
    id: '12345678-1234-1234-1234-123456789abc',
    sub: '12345678-1234-1234-1234-123456789abc',
    email: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Clear the internal cache by requiring fresh module
    jest.resetModules();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('userExists', () => {
    it('should return true for existing user', async () => {
      const userId = '12345678-1234-1234-1234-123456789abc';
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: userId } as any);

      const result = await userExists(userId);

      expect(result).toBe(true);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { id: true }
      });
    });

    it('should return false for non-existing user', async () => {
      const userId = '12345678-1234-1234-1234-123456789abc';
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await userExists(userId);

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const userId = '12345678-1234-1234-1234-123456789abc';
      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const result = await userExists(userId);

      expect(result).toBe(false);
    });
  });

  describe('ensureUserSynced', () => {
    const mockUser = {
      id: 'auth-123',
      email: 'test@example.com',
      caravanSlotsUnlocked: 3,
      caravanSlotsPremium: 0,
      craftingLevel: 1,
      craftingXP: 0,
      craftingXPNext: 100
    };

    beforeEach(() => {
      // Setup default mocks for new user creation
      (mockPrisma.user.upsert as jest.Mock).mockResolvedValue(mockUser as any);
      (mockPrisma.profile.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.profile.create as jest.Mock).mockResolvedValue({} as any);
      (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.wallet.create as jest.Mock).mockResolvedValue({} as any);
      
      // Mock item definitions for starter items
      (mockPrisma.itemDef.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'herb-id', key: 'herb' } as any)
        .mockResolvedValueOnce({ id: 'iron-id', key: 'iron_ore' } as any);
      
      // Mock no existing inventory
      (mockPrisma.inventory.findMany as jest.Mock).mockResolvedValue([]);
      
      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });
    });

    it('should create new user with all required records', async () => {
      await ensureUserSynced(mockAuthUser);

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { id: 'auth-123' },
        update: {
          email: 'test@example.com',
          updatedAt: expect.any(Date)
        },
        create: {
          id: 'auth-123',
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
          userId: 'auth-123',
          display: 'test'
        }
      });

      expect(mockPrisma.wallet.create).toHaveBeenCalledWith({
        data: {
          userId: 'auth-123',
          gold: 500
        }
      });
    });

    it('should not override existing profile or wallet', async () => {
      (mockPrisma.profile.findUnique as jest.Mock).mockResolvedValue({ userId: 'auth-123' } as any);
      (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({ userId: 'auth-123' } as any);

      await ensureUserSynced(mockAuthUser);

      expect(mockPrisma.profile.create).not.toHaveBeenCalled();
      expect(mockPrisma.wallet.create).not.toHaveBeenCalled();
    });

    it('should handle email uniqueness constraint', async () => {
      const error = new Error('Unique constraint failed');
      (error as any).code = 'P2002';
      (error as any).meta = { target: ['email'] };

      (mockPrisma.user.upsert as jest.Mock).mockRejectedValueOnce(error);
      (mockPrisma.user.upsert as jest.Mock).mockResolvedValueOnce(mockUser as any);

      await ensureUserSynced(mockAuthUser);

      expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.user.upsert).toHaveBeenLastCalledWith({
        where: { id: 'auth-123' },
        update: {
          updatedAt: expect.any(Date)
        },
        create: {
          id: 'auth-123',
          email: 'auth-123@oauth.local',
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

    it('should add starter items for new users', async () => {
      await ensureUserSynced(mockAuthUser);

      expect(mockPrisma.itemDef.findUnique).toHaveBeenCalledWith({ where: { key: 'herb' } });
      expect(mockPrisma.itemDef.findUnique).toHaveBeenCalledWith({ where: { key: 'iron_ore' } });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should skip starter items if user already has them', async () => {
      (mockPrisma.inventory.findMany as jest.Mock).mockResolvedValue([
        { userId: 'auth-123', itemId: 'herb-id' }
      ] as any);

      await ensureUserSynced(mockAuthUser);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should handle missing item definitions gracefully', async () => {
      (mockPrisma.itemDef.findUnique as jest.Mock).mockResolvedValue(null);

      // Should not throw error
      await expect(ensureUserSynced(mockAuthUser)).resolves.not.toThrow();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should cache synced users', async () => {
      await ensureUserSynced(mockAuthUser);
      
      // Clear mocks and call again
      jest.clearAllMocks();
      await ensureUserSynced(mockAuthUser);

      // Should not call database again
      expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    });

    it('should clear cache after TTL', async () => {
      await ensureUserSynced(mockAuthUser);
      
      // Advance timers past TTL (5 minutes)
      jest.advanceTimersByTime(300001);
      
      // Clear mocks and call again
      jest.clearAllMocks();
      await ensureUserSynced(mockAuthUser);

      // Should call database again
      expect(mockPrisma.user.upsert).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      (mockPrisma.user.upsert as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      await expect(ensureUserSynced(mockAuthUser)).rejects.toThrow('Database sync failed');
    });
  });

  describe('ensureUserExistsOptimized', () => {
    it('should skip sync if user already exists', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'auth-123' } as any);

      await ensureUserExistsOptimized(mockAuthUser);

      expect(mockPrisma.user.findUnique).toHaveBeenCalled();
      expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    });

    it('should perform full sync if user does not exist', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.upsert as jest.Mock).mockResolvedValue({} as any);
      (mockPrisma.profile.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.profile.create as jest.Mock).mockResolvedValue({} as any);
      (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.wallet.create as jest.Mock).mockResolvedValue({} as any);

      await ensureUserExistsOptimized(mockAuthUser);

      expect(mockPrisma.user.findUnique).toHaveBeenCalled();
      expect(mockPrisma.user.upsert).toHaveBeenCalled();
    });

    it('should respect cache for recent checks', async () => {
      await ensureUserExistsOptimized(mockAuthUser);
      
      // Clear mocks and call again immediately
      jest.clearAllMocks();
      await ensureUserExistsOptimized(mockAuthUser);

      // Should not check database again
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('verifyAndSyncUser', () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn()
      }
    };

    it('should verify token and sync user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'auth-123' } as any);

      const result = await verifyAndSyncUser('valid-token', mockSupabase);

      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual({
        user: mockAuthUser,
        error: null
      });
    });

    it('should handle invalid token', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      });

      const result = await verifyAndSyncUser('invalid-token', mockSupabase);

      expect(result).toEqual({
        user: null,
        error: 'Invalid token'
      });
    });

    it('should handle auth errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' }
      });

      const result = await verifyAndSyncUser('expired-token', mockSupabase);

      expect(result).toEqual({
        user: null,
        error: 'Invalid token'
      });
    });
  });
});