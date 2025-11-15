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
      updateMany: jest.fn(),
      upsert: jest.fn(),
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

  afterEach(() => {
    jest.clearAllMocks(); // Prevent mock pollution between tests
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
      const { getRequestBody, withAuth } = require('@/lib/auth/middleware');
      getRequestBody.mockResolvedValue({ listingId: 'listing-123' });
      withAuth.mockImplementation((request: any, handler: any) => handler({ id: 'buyer-123' }, request));
    });

    it('should handle successful auction purchase with all updates', async () => {
      const totalCost = mockListing.qty * mockListing.price; // 500 gold

      const mockTx = {
        listing: {
          findUnique: jest.fn().mockResolvedValue(mockListing),
          update: jest.fn(),
        },
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ gold: 1000 }), // Buyer has 1000 gold
          updateMany: jest.fn().mockResolvedValue({ count: 1 }), // Atomic buyer wallet update
          upsert: jest.fn().mockResolvedValue({ id: 'seller-wallet', gold: 2500 }),
        },
        inventory: {
          upsert: jest.fn().mockResolvedValue({ id: 'inv-1', userId: 'buyer-123', itemId: 'item-789', qty: 5 }),
        },
        ledgerTx: {
          createMany: jest.fn(),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback, options) => {
        // Verify Serializable isolation level is used
        expect(options?.isolationLevel).toBe('Serializable');
        expect(options?.timeout).toBe(5000); // 5 seconds for simple transactions
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

      // Verify atomic buyer gold deduction with insufficient funds check
      expect(mockTx.wallet.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'buyer-123',
          gold: { gte: 500 }  // Atomic check
        },
        data: {
          gold: { decrement: 500 }  // Atomic decrement
        }
      });

      // Verify seller wallet upsert (race condition safe)
      expect(mockTx.wallet.upsert).toHaveBeenCalledWith({
        where: { userId: 'seller-456' },
        update: { gold: { increment: 500 } },
        create: { userId: 'seller-456', gold: 500 }
      });

      // Verify inventory upsert (race condition safe)
      expect(mockTx.inventory.upsert).toHaveBeenCalledWith({
        where: {
          userId_itemId_location: {
            userId: 'buyer-123',
            itemId: 'item-789',
            location: 'warehouse'
          }
        },
        update: { qty: { increment: 5 } },
        create: {
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
      const mockTx = {
        listing: {
          findUnique: jest.fn().mockResolvedValue(mockListing),
          update: jest.fn(),
        },
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ gold: 1000 }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          upsert: jest.fn().mockResolvedValue({ id: 'seller-wallet', gold: 2500 }),
        },
        inventory: {
          upsert: jest.fn().mockResolvedValue({ id: 'inventory-123', userId: 'buyer-123', itemId: 'item-789', qty: 15 }),
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

      // Should use upsert which handles both create and update atomically
      expect(mockTx.inventory.upsert).toHaveBeenCalledWith({
        where: {
          userId_itemId_location: {
            userId: 'buyer-123',
            itemId: 'item-789',
            location: 'warehouse'
          }
        },
        update: { qty: { increment: 5 } },
        create: {
          userId: 'buyer-123',
          itemId: 'item-789',
          qty: 5,
          location: 'warehouse'
        }
      });
    });

    it('should handle seller without wallet using upsert', async () => {
      const mockTx = {
        listing: {
          findUnique: jest.fn().mockResolvedValue(mockListing),
          update: jest.fn(),
        },
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ gold: 1000 }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          upsert: jest.fn().mockResolvedValue({ id: 'seller-wallet', userId: 'seller-456', gold: 500 }),
        },
        inventory: {
          upsert: jest.fn().mockResolvedValue({ id: 'inv-1', userId: 'buyer-123', itemId: 'item-789', qty: 5 }),
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

      // Should upsert wallet for seller (handles race conditions)
      expect(mockTx.wallet.upsert).toHaveBeenCalledWith({
        where: { userId: 'seller-456' },
        update: { gold: { increment: 500 } },
        create: { userId: 'seller-456', gold: 500 }
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

      const response = await POST(request);
      const data = await response.json();

      expect(data.error).toBe('NOT_FOUND');
      expect(data.message).toBe('Listing not found');
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

      const response = await POST(request);
      const data = await response.json();

      expect(data.error).toBe('INVALID_OPERATION');
      expect(data.message).toBe('You cannot purchase your own listing');
      expect(mockTx.listing.findUnique).toHaveBeenCalled();
    });

    it('should handle missing buyer wallet', async () => {
      const mockTx = {
        listing: {
          findUnique: jest.fn().mockResolvedValue(mockListing),
        },
        wallet: {
          findUnique: jest.fn().mockResolvedValue(null), // Wallet doesn't exist
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

      const response = await POST(request);
      const data = await response.json();

      expect(data.error).toBe('WALLET_NOT_FOUND');
      expect(data.message).toBe('Your wallet was not found. Please contact support.');
      expect(mockTx.listing.findUnique).toHaveBeenCalled();
      expect(mockTx.wallet.findUnique).toHaveBeenCalledWith({
        where: { userId: 'buyer-123' },
        select: { gold: true }
      });
    });

    it('should handle insufficient funds', async () => {
      const mockTx = {
        listing: {
          findUnique: jest.fn().mockResolvedValue(mockListing),
          update: jest.fn(),
        },
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ gold: 100 }), // Not enough gold
          updateMany: jest.fn().mockResolvedValue({ count: 0 }), // Atomic check failed - insufficient gold
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

      const response = await POST(request);
      const data = await response.json();

      expect(data.error).toBe('INSUFFICIENT_FUNDS');
      expect(data.message).toBe('You do not have enough gold for this purchase');
      expect(mockTx.listing.findUnique).toHaveBeenCalled();

      // Verify wallet check happens first
      expect(mockTx.wallet.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'buyer-123',
          gold: { gte: 500 }  // Atomic check that fails
        },
        data: {
          gold: { decrement: 500 }
        }
      });

      // Listing should NOT be updated since payment failed
      expect(mockTx.listing.update).not.toHaveBeenCalled();
    });

    it('should rollback transaction if ledger creation fails', async () => {
      const mockTx = {
        listing: {
          findUnique: jest.fn().mockResolvedValue(mockListing),
          update: jest.fn(),
        },
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ gold: 1000 }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          upsert: jest.fn(),
        },
        inventory: {
          upsert: jest.fn(),
        },
        ledgerTx: {
          createMany: jest.fn().mockRejectedValue(new Error('Ledger write failed')),
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

      const response = await POST(request);
      const data = await response.json();

      expect(data.error).toBe('INTERNAL_ERROR');
      expect(data.message).toBe('An error occurred while processing your purchase');

      // Verify ledger was attempted
      expect(mockTx.ledgerTx.createMany).toHaveBeenCalled();

      // In a real scenario, the transaction would rollback all previous operations
    });

    it('should handle concurrent purchases of the same listing', async () => {
      // Simulate two buyers trying to purchase the same listing simultaneously
      // First buyer should succeed, second should fail with "Listing is no longer available"

      let callCount = 0;
      const mockTx = {
        listing: {
          findUnique: jest.fn().mockImplementation(() => {
            callCount++;
            // First call: listing is active
            // Second call: listing already sold
            return callCount === 1
              ? { ...mockListing, status: 'active' }
              : { ...mockListing, status: 'sold' };
          }),
          update: jest.fn(),
        },
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ gold: 1000 }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          upsert: jest.fn(),
        },
        inventory: {
          upsert: jest.fn(),
        },
        ledgerTx: {
          createMany: jest.fn(),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const { POST } = await import('@/app/api/auction/buy/route');

      // First buyer's request
      const request1 = new NextRequest('http://localhost/api/auction/buy', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ listingId: 'listing-123' }),
      });

      // Second buyer's request (simulated)
      const request2 = new NextRequest('http://localhost/api/auction/buy', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ listingId: 'listing-123' }),
      });

      // First purchase succeeds
      const response1 = await POST(request1);
      const data1 = await response1.json();
      expect(data1.message).toContain('Purchased');

      // Second purchase fails - listing already sold
      const response2 = await POST(request2);
      const data2 = await response2.json();
      expect(data2.error).toBe('LISTING_UNAVAILABLE');
      expect(data2.message).toBe('This listing is no longer available');
    });
  });
});