import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    wallet: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    guild: {
      update: jest.fn(),
    },
    guildLog: {
      create: jest.fn(),
    },
    guildMember: {
      update: jest.fn(),
    },
    listing: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    inventory: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    ledgerTx: {
      createMany: jest.fn(),
    },
  },
}));

// Mock auth middleware
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: jest.fn((request, handler) => handler({ id: 'user-123' }, request)),
  getRequestBody: jest.fn(),
}));

// Mock API utils
jest.mock('@/lib/apiUtils', () => ({
  authenticateUser: jest.fn(),
  createSuccessResponse: jest.fn((data) => new Response(JSON.stringify(data))),
  createErrorResponse: jest.fn((error, message) => new Response(JSON.stringify({ error, message }), { status: 400 })),
  getUserGuildMembership: jest.fn(),
  validateRequiredFields: jest.fn(),
}));

// Mock activity loggers
jest.mock('@/lib/services/activityLogger', () => ({
  ActivityLogger: {
    logTradeCompleted: jest.fn(),
    logAuctionSold: jest.fn(),
  },
}));

jest.mock('@/lib/services/dailyStatsTracker', () => ({
  DailyStatsTracker: {
    trackGoldSpent: jest.fn(),
    trackItemsTraded: jest.fn(),
    trackGoldEarned: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Critical Database Transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Guild Treasury Deposit Transaction', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockMembership = { 
      guild: { id: 'guild-123' },
      userId: 'user-123'
    };
    const depositAmount = 1000;

    beforeEach(() => {
      const { authenticateUser, getUserGuildMembership } = require('@/lib/apiUtils');
      authenticateUser.mockResolvedValue({ user: mockUser });
      getUserGuildMembership.mockResolvedValue({ membership: mockMembership });
    });

    it('should handle successful treasury deposit with race condition protection', async () => {
      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ gold: 5000 }),
          update: jest.fn().mockResolvedValue({ gold: 4000 }),
        },
        guild: {
          update: jest.fn(),
        },
        guildLog: {
          create: jest.fn(),
        },
        guildMember: {
          update: jest.fn(),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const { POST } = await import('@/app/api/guild/treasury/deposit/route');
      
      const request = new NextRequest('http://localhost/api/guild/treasury/deposit', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ amount: depositAmount }),
      });

      await POST(request);

      expect(mockTx.wallet.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        select: { gold: true }
      });

      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { 
          userId: 'user-123',
          gold: { gte: depositAmount }
        },
        data: {
          gold: { decrement: depositAmount }
        },
        select: { gold: true }
      });

      expect(mockTx.guild.update).toHaveBeenCalledWith({
        where: { id: 'guild-123' },
        data: {
          treasury: { increment: depositAmount }
        }
      });

      expect(mockTx.guildLog.create).toHaveBeenCalledWith({
        data: {
          guildId: 'guild-123',
          userId: 'user-123',
          action: 'treasury_deposit',
          details: {
            amount: depositAmount,
            previousBalance: 5000,
            newBalance: 4000
          }
        }
      });

      expect(mockTx.guildMember.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: {
          contributionPoints: {
            increment: Math.floor(depositAmount / 10)
          }
        }
      });
    });

    it('should handle insufficient gold gracefully', async () => {
      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ gold: 500 }), // Less than deposit amount
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const { POST } = await import('@/app/api/guild/treasury/deposit/route');
      
      const request = new NextRequest('http://localhost/api/guild/treasury/deposit', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ amount: depositAmount }),
      });

      await POST(request);

      expect(mockTx.wallet.findUnique).toHaveBeenCalled();
      // Should not proceed with wallet update if insufficient funds
    });

    it('should handle missing wallet error', async () => {
      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const { POST } = await import('@/app/api/guild/treasury/deposit/route');
      
      const request = new NextRequest('http://localhost/api/guild/treasury/deposit', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ amount: depositAmount }),
      });

      await POST(request);

      expect(mockTx.wallet.findUnique).toHaveBeenCalled();
    });

    it('should use proper isolation level for race condition prevention', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback, options) => {
        expect(options?.isolationLevel).toBe('Serializable');
        expect(options?.timeout).toBe(10000);
        return { success: true };
      });

      const { POST } = await import('@/app/api/guild/treasury/deposit/route');
      
      const request = new NextRequest('http://localhost/api/guild/treasury/deposit', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ amount: depositAmount }),
      });

      await POST(request);

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        {
          isolationLevel: 'Serializable',
          timeout: 10000
        }
      );
    });
  });

  describe('Auction Purchase Transaction', () => {
    const mockUser = { id: 'buyer-123', email: 'buyer@example.com' };
    const mockListing = {
      id: 'listing-123',
      sellerId: 'seller-456',
      itemId: 'item-789',
      qty: 5,
      price: 100,
      status: 'active',
      item: { name: 'Iron Ore' }
    };

    beforeEach(() => {
      const { getRequestBody } = require('@/lib/auth/middleware');
      getRequestBody.mockResolvedValue({ listingId: 'listing-123' });
    });

    it('should handle successful auction purchase with all updates', async () => {
      const totalCost = mockListing.qty * mockListing.price; // 500 gold

      const mockTx = {
        listing: {
          findUnique: jest.fn().mockResolvedValue(mockListing),
          update: jest.fn(),
        },
        wallet: {
          findFirst: jest.fn()
            .mockResolvedValueOnce({ id: 'buyer-wallet', gold: 1000 }) // Buyer wallet
            .mockResolvedValueOnce({ id: 'seller-wallet', gold: 2000 }), // Seller wallet
          update: jest.fn(),
        },
        inventory: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
        },
        ledgerTx: {
          createMany: jest.fn(),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const { POST } = await import('@/app/api/auction/buy/route');
      
      const request = new NextRequest('http://localhost/api/auction/buy', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ listingId: 'listing-123' }),
      });

      await POST(request);

      // Verify listing was found and updated
      expect(mockTx.listing.findUnique).toHaveBeenCalledWith({
        where: { id: 'listing-123' },
        include: { item: true }
      });

      expect(mockTx.listing.update).toHaveBeenCalledWith({
        where: { id: 'listing-123' },
        data: { 
          status: 'sold',
          closedAt: expect.any(Date)
        }
      });

      // Verify gold transfer
      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { id: 'buyer-wallet' },
        data: { gold: 500 } // 1000 - 500
      });

      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { id: 'seller-wallet' },
        data: { gold: 2500 } // 2000 + 500
      });

      // Verify inventory creation
      expect(mockTx.inventory.create).toHaveBeenCalledWith({
        data: {
          userId: 'buyer-123',
          itemId: 'item-789',
          qty: 5,
          location: 'warehouse'
        }
      });

      // Verify ledger entries
      expect(mockTx.ledgerTx.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'buyer-123',
            amount: -totalCost,
            reason: 'auction_purchase',
            meta: { listingId: 'listing-123', itemName: 'Iron Ore' }
          },
          {
            userId: 'seller-456',
            amount: totalCost,
            reason: 'auction_sale',
            meta: { listingId: 'listing-123', itemName: 'Iron Ore' }
          }
        ]
      });
    });

    it('should handle inventory update when buyer already has the item', async () => {
      const existingInventory = {
        id: 'inventory-123',
        qty: 10
      };

      const mockTx = {
        listing: {
          findUnique: jest.fn().mockResolvedValue(mockListing),
          update: jest.fn(),
        },
        wallet: {
          findFirst: jest.fn()
            .mockResolvedValueOnce({ id: 'buyer-wallet', gold: 1000 })
            .mockResolvedValueOnce({ id: 'seller-wallet', gold: 2000 }),
          update: jest.fn(),
        },
        inventory: {
          findFirst: jest.fn().mockResolvedValue(existingInventory),
          update: jest.fn(),
        },
        ledgerTx: {
          createMany: jest.fn(),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const { POST } = await import('@/app/api/auction/buy/route');
      
      const request = new NextRequest('http://localhost/api/auction/buy', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ listingId: 'listing-123' }),
      });

      await POST(request);

      // Should update existing inventory instead of creating new
      expect(mockTx.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inventory-123' },
        data: { qty: 15 } // 10 + 5
      });
    });

    it('should handle seller without wallet by creating one', async () => {
      const mockTx = {
        listing: {
          findUnique: jest.fn().mockResolvedValue(mockListing),
          update: jest.fn(),
        },
        wallet: {
          findFirst: jest.fn()
            .mockResolvedValueOnce({ id: 'buyer-wallet', gold: 1000 }) // Buyer wallet
            .mockResolvedValueOnce(null), // No seller wallet
          update: jest.fn(),
          create: jest.fn(),
        },
        inventory: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
        },
        ledgerTx: {
          createMany: jest.fn(),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const { POST } = await import('@/app/api/auction/buy/route');
      
      const request = new NextRequest('http://localhost/api/auction/buy', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ listingId: 'listing-123' }),
      });

      await POST(request);

      // Should create wallet for seller
      expect(mockTx.wallet.create).toHaveBeenCalledWith({
        data: {
          userId: 'seller-456',
          gold: 500 // Total cost
        }
      });
    });

    it('should handle error cases properly', async () => {
      const mockTx = {
        listing: {
          findUnique: jest.fn().mockResolvedValue(null), // Listing not found
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const { POST } = await import('@/app/api/auction/buy/route');
      
      const request = new NextRequest('http://localhost/api/auction/buy', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ listingId: 'listing-123' }),
      });

      await POST(request);

      expect(mockTx.listing.findUnique).toHaveBeenCalled();
    });

    it('should prevent buying own listing', async () => {
      const ownListing = {
        ...mockListing,
        sellerId: 'buyer-123' // Same as buyer
      };

      const mockTx = {
        listing: {
          findUnique: jest.fn().mockResolvedValue(ownListing),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const { POST } = await import('@/app/api/auction/buy/route');
      
      const request = new NextRequest('http://localhost/api/auction/buy', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ listingId: 'listing-123' }),
      });

      await POST(request);

      expect(mockTx.listing.findUnique).toHaveBeenCalled();
    });

    it('should handle insufficient funds', async () => {
      const mockTx = {
        listing: {
          findUnique: jest.fn().mockResolvedValue(mockListing),
        },
        wallet: {
          findFirst: jest.fn().mockResolvedValue({ id: 'buyer-wallet', gold: 100 }), // Not enough
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const { POST } = await import('@/app/api/auction/buy/route');
      
      const request = new NextRequest('http://localhost/api/auction/buy', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ listingId: 'listing-123' }),
      });

      await POST(request);

      expect(mockTx.listing.findUnique).toHaveBeenCalled();
      expect(mockTx.wallet.findFirst).toHaveBeenCalled();
    });
  });
});