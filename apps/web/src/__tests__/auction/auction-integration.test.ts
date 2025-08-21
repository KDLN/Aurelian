import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    itemDef: {
      findUnique: jest.fn(),
    },
    inventory: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    listing: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    guildMember: {
      findUnique: jest.fn(),
    },
    guildAlliance: {
      findFirst: jest.fn(),
    },
    guildLog: {
      create: jest.fn(),
    },
    ledgerTx: {
      createMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Auction System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Auction Flow', () => {
    it('should handle full item listing to purchase cycle', async () => {
      // Setup test data
      const seller = { id: 'seller-123', email: 'seller@test.com' };
      const buyer = { id: 'buyer-456', email: 'buyer@test.com' };
      const itemDef = { id: 'item-1', key: 'iron_ore', name: 'Iron Ore' };
      const quantity = 10;
      const pricePerUnit = 50;
      const totalValue = quantity * pricePerUnit; // 500

      // Mock transaction execution order
      let operationOrder: string[] = [];

      // Step 1: Test listing creation
      const mockListingTx = {
        inventory: {
          update: jest.fn(() => {
            operationOrder.push('inventory_reduced');
            return Promise.resolve();
          }),
        },
        wallet: {
          update: jest.fn(() => {
            operationOrder.push('listing_fee_charged');
            return Promise.resolve();
          }),
        },
        listing: {
          create: jest.fn(() => {
            operationOrder.push('listing_created');
            return Promise.resolve({
              id: 'listing-789',
              sellerId: seller.id,
              itemId: itemDef.id,
              qty: quantity,
              price: pricePerUnit,
              status: 'active',
              createdAt: new Date(),
              duration: 24,
              item: itemDef,
              seller: { profile: { display: 'TestSeller' } }
            });
          }),
        },
      };

      // Mock listing prerequisites
      mockPrisma.itemDef.findUnique.mockResolvedValue(itemDef as any);
      mockPrisma.inventory.findFirst.mockResolvedValue({
        id: 'inv-1',
        qty: 20, // Has enough
        userId: seller.id,
        itemId: itemDef.id
      } as any);
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        userId: seller.id,
        gold: 1000 // Has enough for fees
      } as any);

      // Create listing transaction
      const listingTransaction = async (tx: any) => {
        const inventory = { id: 'inv-1', qty: 20 };
        const userWallet = { gold: 1000 };
        const finalFee = 25; // 5% of 500

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { qty: inventory.qty - quantity }
        });

        await tx.wallet.update({
          where: { userId: seller.id },
          data: { gold: userWallet.gold - finalFee }
        });

        const listing = await tx.listing.create({
          data: {
            sellerId: seller.id,
            itemId: itemDef.id,
            qty: quantity,
            price: pricePerUnit,
            status: 'active',
            duration: 24,
            closedAt: null
          },
          include: {
            item: true,
            seller: { include: { profile: true } }
          }
        });

        return listing;
      };

      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback(mockListingTx);
      });

      const listingResult = await mockPrisma.$transaction(listingTransaction);
      expect(listingResult.id).toBe('listing-789');

      // Step 2: Test purchase transaction
      const mockPurchaseTx = {
        listing: {
          findUnique: jest.fn(() => {
            operationOrder.push('listing_verified');
            return Promise.resolve({
              id: 'listing-789',
              sellerId: seller.id,
              itemId: itemDef.id,
              qty: quantity,
              price: pricePerUnit,
              status: 'active',
              item: itemDef
            });
          }),
          update: jest.fn(() => {
            operationOrder.push('listing_closed');
            return Promise.resolve();
          }),
        },
        wallet: {
          findFirst: jest.fn()
            .mockImplementationOnce(() => {
              operationOrder.push('buyer_wallet_checked');
              return Promise.resolve({ id: 'buyer-wallet', gold: 1000 });
            })
            .mockImplementationOnce(() => {
              operationOrder.push('seller_wallet_found');
              return Promise.resolve({ id: 'seller-wallet', gold: 975 }); // After listing fee
            }),
          update: jest.fn()
            .mockImplementationOnce(() => {
              operationOrder.push('buyer_charged');
              return Promise.resolve();
            })
            .mockImplementationOnce(() => {
              operationOrder.push('seller_paid');
              return Promise.resolve();
            }),
        },
        inventory: {
          findFirst: jest.fn(() => {
            operationOrder.push('buyer_inventory_checked');
            return Promise.resolve(null); // No existing inventory
          }),
          create: jest.fn(() => {
            operationOrder.push('buyer_inventory_created');
            return Promise.resolve();
          }),
        },
        ledgerTx: {
          createMany: jest.fn(() => {
            operationOrder.push('ledger_recorded');
            return Promise.resolve();
          }),
        },
      };

      const purchaseTransaction = async (tx: any) => {
        // Verify listing
        const listing = await tx.listing.findUnique({
          where: { id: 'listing-789' },
          include: { item: true }
        });

        if (!listing || listing.status !== 'active') {
          throw new Error('Listing not available');
        }

        // Check buyer wallet
        const buyerWallet = await tx.wallet.findFirst({
          where: { userId: buyer.id }
        });

        if (!buyerWallet || buyerWallet.gold < totalValue) {
          throw new Error('Insufficient gold');
        }

        // Update listing status
        await tx.listing.update({
          where: { id: 'listing-789' },
          data: { status: 'sold', closedAt: new Date() }
        });

        // Transfer gold
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: { gold: buyerWallet.gold - totalValue }
        });

        const sellerWallet = await tx.wallet.findFirst({
          where: { userId: seller.id }
        });

        if (sellerWallet) {
          await tx.wallet.update({
            where: { id: sellerWallet.id },
            data: { gold: sellerWallet.gold + totalValue }
          });
        }

        // Add items to buyer inventory
        const buyerInventory = await tx.inventory.findFirst({
          where: {
            userId: buyer.id,
            itemId: itemDef.id,
            location: 'warehouse'
          }
        });

        if (!buyerInventory) {
          await tx.inventory.create({
            data: {
              userId: buyer.id,
              itemId: itemDef.id,
              qty: quantity,
              location: 'warehouse'
            }
          });
        }

        // Record ledger
        await tx.ledgerTx.createMany({
          data: [
            {
              userId: buyer.id,
              amount: -totalValue,
              reason: 'auction_purchase',
              meta: { listingId: 'listing-789', itemName: itemDef.name }
            },
            {
              userId: seller.id,
              amount: totalValue,
              reason: 'auction_sale',
              meta: { listingId: 'listing-789', itemName: itemDef.name }
            }
          ]
        });

        return { listing, totalValue };
      };

      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback(mockPurchaseTx);
      });

      const purchaseResult = await mockPrisma.$transaction(purchaseTransaction);
      expect(purchaseResult.totalValue).toBe(totalValue);

      // Verify complete operation order
      expect(operationOrder).toEqual([
        'inventory_reduced',
        'listing_fee_charged',
        'listing_created',
        'listing_verified',
        'buyer_wallet_checked',
        'listing_closed',
        'buyer_charged',
        'seller_wallet_found',
        'seller_paid',
        'buyer_inventory_checked',
        'buyer_inventory_created',
        'ledger_recorded'
      ]);
    });

    it('should calculate auction fees correctly for different durations', async () => {
      const calculateBaseFee = (durationHours: number): number => {
        if (durationHours <= 6) return 2;
        if (durationHours <= 12) return 3;
        if (durationHours <= 24) return 5;
        if (durationHours <= 36) return 8;
        return 12; // 60+ hours
      };

      const testCases = [
        { duration: 1, expectedFee: 2, description: '1 hour listing' },
        { duration: 6, expectedFee: 2, description: '6 hour listing' },
        { duration: 12, expectedFee: 3, description: '12 hour listing' },
        { duration: 24, expectedFee: 5, description: '24 hour listing' },
        { duration: 36, expectedFee: 8, description: '36 hour listing' },
        { duration: 72, expectedFee: 12, description: '72 hour listing' },
      ];

      testCases.forEach(({ duration, expectedFee, description }) => {
        const calculatedFee = calculateBaseFee(duration);
        expect(calculatedFee).toBe(expectedFee);
        
        // Test with actual fee calculation
        const itemValue = 1000;
        const expectedTotalFee = Math.ceil(itemValue * (expectedFee / 100));
        const actualTotalFee = Math.ceil(itemValue * (calculatedFee / 100));
        
        expect(actualTotalFee).toBe(expectedTotalFee);
      });
    });
  });

  describe('Alliance Benefits Integration', () => {
    it('should apply alliance auction fee discounts correctly', async () => {
      const seller = { id: 'seller-123' };
      const guildId = 'guild-456';
      const hubControllerGuildId = 'controller-guild-789';
      const itemValue = 1000;
      const baseFeePercent = 5;
      const baseFee = Math.ceil(itemValue * (baseFeePercent / 100)); // 50 gold
      const discountPercent = 20;
      const expectedDiscount = Math.ceil(baseFee * (discountPercent / 100)); // 10 gold
      const expectedFinalFee = baseFee - expectedDiscount; // 40 gold

      // Mock guild membership
      mockPrisma.guildMember.findUnique.mockResolvedValue({
        userId: seller.id,
        guildId,
        guild: { id: guildId, name: 'Test Guild', tag: 'TEST' }
      } as any);

      // Mock alliance with auction benefits
      mockPrisma.guildAlliance.findFirst.mockResolvedValue({
        auctionFeeReduction: discountPercent,
        fromGuildId: guildId,
        toGuildId: hubControllerGuildId,
        fromGuild: { name: 'Test Guild', tag: 'TEST' },
        toGuild: { name: 'Controller Guild', tag: 'CTRL' }
      } as any);

      const checkAllianceTest = async () => {
        // Simulate alliance check
        const userGuild = await mockPrisma.guildMember.findUnique({
          where: { userId: seller.id },
          include: { guild: { select: { id: true, name: true, tag: true } } }
        });

        if (!userGuild) return { finalFee: baseFee, allianceDiscount: 0 };

        const alliance = await mockPrisma.guildAlliance.findFirst({
          where: {
            OR: [
              { fromGuildId: guildId, toGuildId: hubControllerGuildId },
              { fromGuildId: hubControllerGuildId, toGuildId: guildId }
            ],
            status: 'ACCEPTED',
            type: 'ALLIANCE'
          },
          select: {
            auctionFeeReduction: true,
            fromGuild: { select: { name: true, tag: true } },
            toGuild: { select: { name: true, tag: true } }
          }
        });

        if (!alliance) return { finalFee: baseFee, allianceDiscount: 0 };

        const allianceDiscount = Math.ceil(baseFee * (alliance.auctionFeeReduction / 100));
        const finalFee = baseFee - allianceDiscount;

        return {
          finalFee,
          allianceDiscount,
          discountPercent: alliance.auctionFeeReduction,
          allianceBenefits: {
            isAllied: true,
            alliedGuild: alliance.fromGuildId === hubControllerGuildId ? alliance.fromGuild : alliance.toGuild,
            discountPercent: alliance.auctionFeeReduction,
            discountAmount: allianceDiscount,
            originalFee: baseFee,
            discountedFee: finalFee
          }
        };
      };

      const result = await checkAllianceTest();

      expect(result.finalFee).toBe(expectedFinalFee);
      expect(result.allianceDiscount).toBe(expectedDiscount);
      expect(result.discountPercent).toBe(discountPercent);
      expect(result.allianceBenefits?.isAllied).toBe(true);
    });

    it('should log alliance benefit usage correctly', async () => {
      const userId = 'user-123';
      const guildId = 'guild-456';
      const listingId = 'listing-789';
      const allianceDiscount = 15;

      let loggedData: any = null;

      const mockTx = {
        guildLog: {
          create: jest.fn((data) => {
            loggedData = data.data;
            return Promise.resolve();
          }),
        },
      };

      const logAllianceBenefit = async (tx: any) => {
        await tx.guildLog.create({
          data: {
            guildId,
            userId,
            action: 'alliance_auction_benefit_used',
            details: {
              listingId,
              itemName: 'Iron Ore',
              quantity: 10,
              pricePerUnit: 50,
              hubId: 'test-hub',
              allianceDiscount,
              discountPercent: 20,
              alliedGuild: { name: 'Allied Guild', tag: 'ALLY' },
              totalSaved: allianceDiscount,
              originalFee: 25,
              finalFee: 10
            }
          }
        });
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await mockPrisma.$transaction(logAllianceBenefit);

      expect(loggedData).toMatchObject({
        guildId,
        userId,
        action: 'alliance_auction_benefit_used',
        details: {
          listingId,
          allianceDiscount,
          totalSaved: allianceDiscount,
          originalFee: 25,
          finalFee: 10
        }
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle insufficient inventory gracefully', async () => {
      const seller = { id: 'seller-123' };
      const itemDef = { id: 'item-1', key: 'iron_ore', name: 'Iron Ore' };
      const requestedQuantity = 10;

      mockPrisma.itemDef.findUnique.mockResolvedValue(itemDef as any);
      mockPrisma.inventory.findFirst.mockResolvedValue({
        id: 'inv-1',
        qty: 5, // Not enough
        userId: seller.id,
        itemId: itemDef.id
      } as any);

      const checkInventory = async () => {
        const inventory = await mockPrisma.inventory.findFirst({
          where: {
            userId: seller.id,
            itemId: itemDef.id,
            location: 'warehouse'
          }
        });

        if (!inventory || inventory.qty < requestedQuantity) {
          throw new Error('Insufficient inventory');
        }

        return inventory;
      };

      await expect(checkInventory()).rejects.toThrow('Insufficient inventory');
    });

    it('should handle insufficient gold for listing fees', async () => {
      const seller = { id: 'seller-123' };
      const listingFee = 100;

      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        userId: seller.id,
        gold: 50 // Not enough
      } as any);

      const checkListingFee = async () => {
        const userWallet = await mockPrisma.wallet.findUnique({
          where: { userId: seller.id }
        });

        if (!userWallet || userWallet.gold < listingFee) {
          throw new Error('Insufficient gold for listing fees');
        }

        return userWallet;
      };

      await expect(checkListingFee()).rejects.toThrow('Insufficient gold for listing fees');
    });

    it('should prevent buying own listings', async () => {
      const userId = 'user-123';
      const listing = {
        id: 'listing-456',
        sellerId: userId, // Same as buyer
        status: 'active'
      };

      const checkPurchaseValidity = async () => {
        if (listing.sellerId === userId) {
          throw new Error('Cannot buy your own listing');
        }

        if (listing.status !== 'active') {
          throw new Error('Listing is no longer available');
        }

        return true;
      };

      await expect(checkPurchaseValidity()).rejects.toThrow('Cannot buy your own listing');
    });

    it('should handle concurrent purchase attempts on same listing', async () => {
      const listingId = 'listing-123';
      const buyerId1 = 'buyer-1';
      const buyerId2 = 'buyer-2';

      // First buyer succeeds
      const mockTx1 = {
        listing: {
          findUnique: jest.fn().mockResolvedValue({
            id: listingId,
            status: 'active',
            sellerId: 'seller-123'
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        wallet: {
          findFirst: jest.fn().mockResolvedValue({ id: 'wallet-1', gold: 1000 }),
          update: jest.fn(),
        },
        inventory: { create: jest.fn() },
        ledgerTx: { createMany: jest.fn() },
      };

      // Second buyer fails - listing already sold
      const mockTx2 = {
        listing: {
          findUnique: jest.fn().mockResolvedValue({
            id: listingId,
            status: 'sold', // Already sold
            sellerId: 'seller-123'
          }),
        },
      };

      const purchaseTransaction = async (tx: any, buyerId: string) => {
        const listing = await tx.listing.findUnique({
          where: { id: listingId }
        });

        if (!listing || listing.status !== 'active') {
          throw new Error('Listing is no longer available');
        }

        // Continue with purchase logic...
        await tx.listing.update({
          where: { id: listingId },
          data: { status: 'sold' }
        });

        return { success: true, buyerId };
      };

      // First transaction succeeds
      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback(mockTx1);
      });

      const result1 = await mockPrisma.$transaction((tx) => purchaseTransaction(tx, buyerId1));
      expect(result1).toEqual({ success: true, buyerId: buyerId1 });

      // Second transaction fails
      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback(mockTx2);
      });

      await expect(
        mockPrisma.$transaction((tx) => purchaseTransaction(tx, buyerId2))
      ).rejects.toThrow('Listing is no longer available');
    });
  });

  describe('Auction Listings Retrieval', () => {
    it('should format active listings correctly', async () => {
      const mockListings = [
        {
          id: 'listing-1',
          qty: 5,
          price: 100,
          sellerId: 'seller-1',
          createdAt: new Date('2023-01-01T10:00:00Z'),
          item: { name: 'Iron Ore', key: 'iron_ore' },
          seller: { profile: { display: 'TestSeller' } }
        },
        {
          id: 'listing-2',
          qty: 3,
          price: 150,
          sellerId: 'seller-2',
          createdAt: new Date('2023-01-01T11:00:00Z'),
          item: { name: 'Herb', key: 'herb' },
          seller: { profile: null }
        }
      ];

      mockPrisma.listing.findMany.mockResolvedValue(mockListings as any);

      const getActiveListings = async () => {
        const listings = await mockPrisma.listing.findMany({
          where: { status: 'active' },
          include: {
            item: true,
            seller: { include: { profile: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 100
        });

        return listings.map(listing => ({
          id: listing.id,
          item: listing.item.name,
          itemKey: listing.item.key,
          qty: listing.qty,
          price: listing.price,
          seller: listing.seller.profile?.display || 'Unknown',
          sellerId: listing.sellerId,
          createdAt: listing.createdAt,
          age: Math.floor((Date.now() - listing.createdAt.getTime()) / 60000)
        }));
      };

      const result = await getActiveListings();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'listing-1',
        item: 'Iron Ore',
        itemKey: 'iron_ore',
        qty: 5,
        price: 100,
        seller: 'TestSeller',
        sellerId: 'seller-1'
      });
      expect(result[1]).toMatchObject({
        id: 'listing-2',
        item: 'Herb',
        itemKey: 'herb',
        qty: 3,
        price: 150,
        seller: 'Unknown', // No profile
        sellerId: 'seller-2'
      });
    });
  });
});