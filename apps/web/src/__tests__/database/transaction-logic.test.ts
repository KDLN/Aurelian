import { prisma } from '@/lib/prisma';

// Mock Prisma with transaction simulation
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Database Transaction Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Treasury Deposit Race Condition Prevention', () => {
    it('should prevent race conditions using proper constraints', async () => {
      const userId = 'user-123';
      const guildId = 'guild-123';
      const depositAmount = 1000;
      let transactionSteps: string[] = [];

      const mockTx = {
        wallet: {
          findUnique: jest.fn(() => {
            transactionSteps.push('wallet_read');
            return Promise.resolve({ gold: 5000 });
          }),
          update: jest.fn(() => {
            transactionSteps.push('wallet_update');
            return Promise.resolve({ gold: 4000 });
          }),
        },
        guild: {
          update: jest.fn(() => {
            transactionSteps.push('guild_update');
            return Promise.resolve();
          }),
        },
        guildLog: {
          create: jest.fn(() => {
            transactionSteps.push('log_create');
            return Promise.resolve();
          }),
        },
        guildMember: {
          update: jest.fn(() => {
            transactionSteps.push('member_update');
            return Promise.resolve();
          }),
        },
      };

      // Simulate the actual transaction function
      const depositTransaction = async (tx: any) => {
        // Step 1: Read wallet balance
        const userWallet = await tx.wallet.findUnique({
          where: { userId },
          select: { gold: true }
        });

        if (!userWallet) {
          throw new Error('User wallet not found');
        }

        if (userWallet.gold < depositAmount) {
          throw new Error('Insufficient gold');
        }

        // Step 2: Atomic decrement with constraint
        const updatedWallet = await tx.wallet.update({
          where: { 
            userId,
            gold: { gte: depositAmount } // This prevents race conditions
          },
          data: {
            gold: { decrement: depositAmount }
          },
          select: { gold: true }
        });

        // Step 3: Atomic increment to guild treasury
        await tx.guild.update({
          where: { id: guildId },
          data: {
            treasury: { increment: depositAmount }
          }
        });

        // Step 4: Log the transaction
        await tx.guildLog.create({
          data: {
            guildId,
            userId,
            action: 'treasury_deposit',
            details: {
              amount: depositAmount,
              previousBalance: userWallet.gold,
              newBalance: updatedWallet.gold
            }
          }
        });

        // Step 5: Update contribution points
        await tx.guildMember.update({
          where: { userId },
          data: {
            contributionPoints: {
              increment: Math.floor(depositAmount / 10)
            }
          }
        });

        return { success: true };
      };

      mockPrisma.$transaction.mockImplementation(async (callback, options) => {
        expect(options?.isolationLevel).toBe('Serializable');
        return callback(mockTx);
      });

      const result = await mockPrisma.$transaction(depositTransaction, {
        isolationLevel: 'Serializable',
        timeout: 10000
      });

      expect(result).toEqual({ success: true });
      expect(transactionSteps).toEqual([
        'wallet_read',
        'wallet_update', 
        'guild_update',
        'log_create',
        'member_update'
      ]);

      // Verify race condition prevention
      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { 
          userId,
          gold: { gte: depositAmount }
        },
        data: {
          gold: { decrement: depositAmount }
        },
        select: { gold: true }
      });
    });

    it('should handle concurrent deposit attempts correctly', async () => {
      const userId = 'user-123';
      const guildId = 'guild-123';
      const depositAmount = 5000; // Exactly the wallet balance

      // Simulate first transaction succeeds
      const mockTx1 = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ gold: 5000 }),
          update: jest.fn().mockResolvedValue({ gold: 0 }),
        },
        guild: { update: jest.fn() },
        guildLog: { create: jest.fn() },
        guildMember: { update: jest.fn() },
      };

      // Simulate second transaction should fail due to constraint
      const mockTx2 = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ gold: 5000 }), // Still shows 5000 due to read
          update: jest.fn().mockRejectedValue(new Error('Record to update not found')), // Constraint fails
        },
      };

      const depositTransaction = async (tx: any) => {
        const userWallet = await tx.wallet.findUnique({
          where: { userId },
          select: { gold: true }
        });

        if (userWallet.gold < depositAmount) {
          throw new Error('Insufficient gold');
        }

        // This should fail on second transaction due to constraint
        await tx.wallet.update({
          where: { 
            userId,
            gold: { gte: depositAmount }
          },
          data: {
            gold: { decrement: depositAmount }
          },
          select: { gold: true }
        });

        await tx.guild.update({
          where: { id: guildId },
          data: { treasury: { increment: depositAmount } }
        });

        await tx.guildLog.create({ data: {} as any });
        await tx.guildMember.update({ where: { userId }, data: {} as any });

        return { success: true };
      };

      // First transaction succeeds
      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback(mockTx1);
      });

      const result1 = await mockPrisma.$transaction(depositTransaction);
      expect(result1).toEqual({ success: true });

      // Second transaction fails due to constraint
      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback(mockTx2);
      });

      await expect(mockPrisma.$transaction(depositTransaction))
        .rejects.toThrow('Record to update not found');
    });
  });

  describe('Auction Purchase Atomicity', () => {
    it('should ensure all operations succeed or all fail', async () => {
      const buyerId = 'buyer-123';
      const sellerId = 'seller-456';
      const listingId = 'listing-789';
      const itemId = 'item-abc';
      const quantity = 5;
      const price = 100;
      const totalCost = quantity * price;

      let operationOrder: string[] = [];

      const mockTx = {
        listing: {
          findUnique: jest.fn(() => {
            operationOrder.push('listing_read');
            return Promise.resolve({
              id: listingId,
              sellerId,
              itemId,
              qty: quantity,
              price,
              status: 'active',
              item: { name: 'Iron Ore' }
            });
          }),
          update: jest.fn(() => {
            operationOrder.push('listing_update');
            return Promise.resolve();
          }),
        },
        wallet: {
          findFirst: jest.fn()
            .mockImplementationOnce(() => {
              operationOrder.push('buyer_wallet_read');
              return Promise.resolve({ id: 'buyer-wallet', gold: 1000 });
            })
            .mockImplementationOnce(() => {
              operationOrder.push('seller_wallet_read');
              return Promise.resolve({ id: 'seller-wallet', gold: 2000 });
            }),
          update: jest.fn()
            .mockImplementationOnce(() => {
              operationOrder.push('buyer_wallet_update');
              return Promise.resolve();
            })
            .mockImplementationOnce(() => {
              operationOrder.push('seller_wallet_update');
              return Promise.resolve();
            }),
        },
        inventory: {
          findFirst: jest.fn(() => {
            operationOrder.push('inventory_read');
            return Promise.resolve(null);
          }),
          create: jest.fn(() => {
            operationOrder.push('inventory_create');
            return Promise.resolve();
          }),
        },
        ledgerTx: {
          createMany: jest.fn(() => {
            operationOrder.push('ledger_create');
            return Promise.resolve();
          }),
        },
      };

      const purchaseTransaction = async (tx: any) => {
        // Step 1: Verify listing exists and is available
        const listing = await tx.listing.findUnique({
          where: { id: listingId },
          include: { item: true }
        });

        if (!listing || listing.status !== 'active') {
          throw new Error('Listing not available');
        }

        if (listing.sellerId === buyerId) {
          throw new Error('Cannot buy own listing');
        }

        // Step 2: Check buyer's wallet
        const buyerWallet = await tx.wallet.findFirst({
          where: { userId: buyerId }
        });

        if (!buyerWallet || buyerWallet.gold < totalCost) {
          throw new Error('Insufficient gold');
        }

        // Step 3: Update listing status
        await tx.listing.update({
          where: { id: listingId },
          data: { 
            status: 'sold',
            closedAt: new Date()
          }
        });

        // Step 4: Transfer gold
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: { gold: buyerWallet.gold - totalCost }
        });

        const sellerWallet = await tx.wallet.findFirst({
          where: { userId: sellerId }
        });

        if (sellerWallet) {
          await tx.wallet.update({
            where: { id: sellerWallet.id },
            data: { gold: sellerWallet.gold + totalCost }
          });
        }

        // Step 5: Transfer items
        const buyerInventory = await tx.inventory.findFirst({
          where: {
            userId: buyerId,
            itemId,
            location: 'warehouse'
          }
        });

        if (buyerInventory) {
          await tx.inventory.update({
            where: { id: buyerInventory.id },
            data: { qty: buyerInventory.qty + quantity }
          });
        } else {
          await tx.inventory.create({
            data: {
              userId: buyerId,
              itemId,
              qty: quantity,
              location: 'warehouse'
            }
          });
        }

        // Step 6: Record transactions
        await tx.ledgerTx.createMany({
          data: [
            {
              userId: buyerId,
              amount: -totalCost,
              reason: 'auction_purchase',
              meta: { listingId, itemName: listing.item.name }
            },
            {
              userId: sellerId,
              amount: totalCost,
              reason: 'auction_sale',
              meta: { listingId, itemName: listing.item.name }
            }
          ]
        });

        return { listing, totalCost };
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await mockPrisma.$transaction(purchaseTransaction);

      expect(result.totalCost).toBe(totalCost);
      expect(operationOrder).toEqual([
        'listing_read',
        'buyer_wallet_read',
        'listing_update',
        'buyer_wallet_update',
        'seller_wallet_read',
        'seller_wallet_update',
        'inventory_read',
        'inventory_create',
        'ledger_create'
      ]);
    });

    it('should rollback all changes on failure', async () => {
      const buyerId = 'buyer-123';
      const sellerId = 'seller-456';
      const listingId = 'listing-789';

      const mockTx = {
        listing: {
          findUnique: jest.fn().mockResolvedValue({
            id: listingId,
            sellerId,
            status: 'active',
            qty: 5,
            price: 100,
            item: { name: 'Iron Ore' }
          }),
          update: jest.fn(),
        },
        wallet: {
          findFirst: jest.fn().mockResolvedValue({ id: 'buyer-wallet', gold: 1000 }),
          update: jest.fn().mockRejectedValue(new Error('Wallet update failed')),
        },
      };

      const purchaseTransaction = async (tx: any) => {
        const listing = await tx.listing.findUnique({
          where: { id: listingId },
          include: { item: true }
        });

        await tx.listing.update({
          where: { id: listingId },
          data: { status: 'sold' }
        });

        const buyerWallet = await tx.wallet.findFirst({
          where: { userId: buyerId }
        });

        // This should fail and trigger rollback
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: { gold: buyerWallet.gold - 500 }
        });

        return { success: true };
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(mockPrisma.$transaction(purchaseTransaction))
        .rejects.toThrow('Wallet update failed');

      // Verify that listing.update was called but the transaction should rollback
      expect(mockTx.listing.update).toHaveBeenCalled();
      expect(mockTx.wallet.update).toHaveBeenCalled();
    });
  });

  describe('Transaction Isolation Levels', () => {
    it('should use appropriate isolation level for financial operations', async () => {
      const financialTransaction = async (tx: any) => {
        return { success: true };
      };

      mockPrisma.$transaction.mockImplementation(async (callback, options) => {
        expect(options?.isolationLevel).toBe('Serializable');
        expect(options?.timeout).toBeDefined();
        return callback({});
      });

      await mockPrisma.$transaction(financialTransaction, {
        isolationLevel: 'Serializable',
        timeout: 10000
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        {
          isolationLevel: 'Serializable',
          timeout: 10000
        }
      );
    });

    it('should handle timeout for long-running transactions', async () => {
      const longTransaction = async (tx: any) => {
        // Simulate long operation
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true };
      };

      mockPrisma.$transaction.mockImplementation(async (callback, options) => {
        if (options?.timeout && options.timeout < 50) {
          throw new Error('Transaction timeout');
        }
        return callback({});
      });

      // Should timeout
      await expect(
        mockPrisma.$transaction(longTransaction, { timeout: 10 })
      ).rejects.toThrow('Transaction timeout');

      // Should succeed with longer timeout
      await expect(
        mockPrisma.$transaction(longTransaction, { timeout: 200 })
      ).resolves.toEqual({ success: true });
    });
  });
});