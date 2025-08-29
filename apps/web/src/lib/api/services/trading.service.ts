import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiSuccess, apiError, validateRequestBody, getQueryParam } from '@/lib/api/server-utils';
import { handleApiError } from '@/lib/api/error-handler';
import { z } from 'zod';
import type { AuthUser } from '@/types/api';

/**
 * Consolidated Trading Service
 * Combines auction, market, and contract operations
 */

// Validation schemas
const CreateListingSchema = z.object({
  itemIds: z.array(z.string()).min(1),
  pricePerUnit: z.number().min(1),
  duration: z.enum(['1h', '6h', '24h', '72h']).default('24h')
});

const BuyItemSchema = z.object({
  listingId: z.string().min(1),
  quantity: z.number().min(1)
});

const CreateContractSchema = z.object({
  type: z.enum(['PURCHASE', 'SALE']),
  itemDefId: z.string().min(1),
  quantity: z.number().min(1),
  pricePerUnit: z.number().min(1),
  expiresAt: z.string().datetime()
});

/**
 * Trading Service Class - Consolidates all trading operations
 */
export class TradingService {
  
  /**
   * Get auction house listings with filters
   */
  static async getListings(request: NextRequest, user: AuthUser): Promise<NextResponse> {
    try {
      const page = parseInt(getQueryParam(request, 'page', '1') || '1');
      const limit = parseInt(getQueryParam(request, 'limit', '20') || '20');
      const itemType = getQueryParam(request, 'itemType');
      const sortBy = getQueryParam(request, 'sortBy', 'createdAt');
      const sortOrder = getQueryParam(request, 'sortOrder', 'desc') as 'asc' | 'desc';
      
      const skip = (page - 1) * limit;

      // Build where clause
      const whereClause: any = {
        status: 'ACTIVE',
        expiresAt: {
          gt: new Date()
        }
      };

      if (itemType) {
        whereClause.itemDef = {
          category: itemType
        };
      }

      // Get listings
      const [listings, total] = await Promise.all([
        prisma.listing.findMany({
          where: whereClause,
          include: {
            itemDef: true,
            seller: {
              include: {
                profile: true
              }
            }
          },
          orderBy: {
            [sortBy]: sortOrder
          },
          skip,
          take: limit
        }),
        prisma.listing.count({ where: whereClause })
      ]);

      return apiSuccess({
        listings: listings.map(listing => ({
          id: listing.id,
          itemDef: listing.itemDef,
          quantity: listing.quantity,
          pricePerUnit: listing.pricePerUnit,
          totalPrice: listing.quantity * listing.pricePerUnit,
          seller: {
            id: listing.seller.id,
            name: listing.seller.profile?.name || 'Anonymous'
          },
          expiresAt: listing.expiresAt,
          createdAt: listing.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        filters: {
          itemType,
          sortBy,
          sortOrder
        }
      });

    } catch (error) {
      return handleApiError(error, 'Failed to fetch listings');
    }
  }

  /**
   * Create auction listing
   */
  static async createListing(request: NextRequest, user: AuthUser): Promise<NextResponse> {
    try {
      const validation = await validateRequestBody(request, CreateListingSchema);
      if ('error' in validation) {
        return validation.error;
      }

      const { itemIds, pricePerUnit, duration } = validation.data;

      // Calculate expiration time
      const durationHours = {
        '1h': 1,
        '6h': 6,
        '24h': 24,
        '72h': 72
      }[duration];

      const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

      // Calculate fees (2% for 1h, up to 12% for 72h)
      const feeRate = {
        '1h': 0.02,
        '6h': 0.05,
        '24h': 0.08,
        '72h': 0.12
      }[duration];

      // Process each item
      const listings = [];
      
      for (const itemId of itemIds) {
        // Verify user owns the item
        const inventoryItem = await prisma.inventory.findFirst({
          where: {
            id: itemId,
            userId: user.id,
            location: 'warehouse'
          },
          include: {
            itemDef: true
          }
        });

        if (!inventoryItem) {
          return apiError(`Item ${itemId} not found in warehouse`, 404);
        }

        if (inventoryItem.quantity <= 0) {
          return apiError(`Item ${itemId} has no available quantity`, 400);
        }

        // Calculate listing fee
        const totalValue = inventoryItem.quantity * pricePerUnit;
        const listingFee = Math.round(totalValue * feeRate);

        // Check user has enough gold for fee
        const wallet = await prisma.wallet.findUnique({
          where: { userId: user.id }
        });

        if (!wallet || wallet.gold < listingFee) {
          return apiError(`Insufficient gold for listing fee (${listingFee} gold required)`, 400);
        }

        // Create listing and move item to escrow
        const [listing] = await prisma.$transaction([
          // Create listing
          prisma.listing.create({
            data: {
              sellerId: user.id,
              itemDefId: inventoryItem.itemDefId,
              quantity: inventoryItem.quantity,
              pricePerUnit,
              listingFee,
              expiresAt,
              status: 'ACTIVE'
            }
          }),
          // Move item to escrow
          prisma.inventory.update({
            where: { id: itemId },
            data: { location: 'escrow' }
          }),
          // Deduct listing fee
          prisma.wallet.update({
            where: { userId: user.id },
            data: { gold: { decrement: listingFee } }
          })
        ]);

        listings.push({
          ...listing,
          itemDef: inventoryItem.itemDef,
          listingFee
        });
      }

      return apiSuccess({
        message: 'Listings created successfully',
        listings,
        totalFees: listings.reduce((sum, l) => sum + l.listingFee, 0)
      });

    } catch (error) {
      return handleApiError(error, 'Failed to create listing');
    }
  }

  /**
   * Buy item from auction
   */
  static async buyItem(request: NextRequest, user: AuthUser): Promise<NextResponse> {
    try {
      const validation = await validateRequestBody(request, BuyItemSchema);
      if ('error' in validation) {
        return validation.error;
      }

      const { listingId, quantity } = validation.data;

      // Get listing
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: {
          itemDef: true,
          seller: true
        }
      });

      if (!listing) {
        return apiError('Listing not found', 404);
      }

      if (listing.status !== 'ACTIVE') {
        return apiError('Listing is no longer active', 400);
      }

      if (listing.expiresAt < new Date()) {
        return apiError('Listing has expired', 400);
      }

      if (listing.sellerId === user.id) {
        return apiError('Cannot buy your own listing', 400);
      }

      if (quantity > listing.quantity) {
        return apiError('Not enough quantity available', 400);
      }

      const totalCost = quantity * listing.pricePerUnit;

      // Check buyer has enough gold
      const buyerWallet = await prisma.wallet.findUnique({
        where: { userId: user.id }
      });

      if (!buyerWallet || buyerWallet.gold < totalCost) {
        return apiError('Insufficient gold', 400);
      }

      // Execute purchase
      const result = await prisma.$transaction(async (tx) => {
        // Transfer gold
        await tx.wallet.update({
          where: { userId: user.id },
          data: { gold: { decrement: totalCost } }
        });

        await tx.wallet.update({
          where: { userId: listing.sellerId },
          data: { gold: { increment: totalCost } }
        });

        // Find the escrowed item
        const escrowedItem = await tx.inventory.findFirst({
          where: {
            userId: listing.sellerId,
            itemDefId: listing.itemDefId,
            location: 'escrow'
          }
        });

        if (!escrowedItem) {
          throw new Error('Escrowed item not found');
        }

        // Transfer items to buyer
        await tx.inventory.create({
          data: {
            userId: user.id,
            itemDefId: listing.itemDefId,
            quantity,
            location: 'warehouse'
          }
        });

        // Update escrowed item quantity
        if (quantity >= escrowedItem.quantity) {
          // Delete if fully purchased
          await tx.inventory.delete({
            where: { id: escrowedItem.id }
          });
        } else {
          // Reduce quantity
          await tx.inventory.update({
            where: { id: escrowedItem.id },
            data: { quantity: { decrement: quantity } }
          });
        }

        // Update or complete listing
        if (quantity >= listing.quantity) {
          await tx.listing.update({
            where: { id: listingId },
            data: { status: 'SOLD' }
          });
        } else {
          await tx.listing.update({
            where: { id: listingId },
            data: { quantity: { decrement: quantity } }
          });
        }

        return {
          itemDef: listing.itemDef,
          quantity,
          totalCost,
          seller: listing.seller.email
        };
      });

      return apiSuccess({
        message: 'Purchase completed successfully',
        purchase: result
      });

    } catch (error) {
      return handleApiError(error, 'Failed to complete purchase');
    }
  }

  /**
   * Get market summary and trends
   */
  static async getMarketSummary(request: NextRequest, user: AuthUser): Promise<NextResponse> {
    try {
      // Get market statistics
      const [
        activeListings,
        recentSales,
        priceData,
        topItems
      ] = await Promise.all([
        // Active listings count
        prisma.listing.count({
          where: {
            status: 'ACTIVE',
            expiresAt: { gt: new Date() }
          }
        }),
        // Recent sales (last 24 hours)
        prisma.listing.count({
          where: {
            status: 'SOLD',
            updatedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        // Average prices by item
        prisma.listing.groupBy({
          by: ['itemDefId'],
          where: {
            status: 'ACTIVE',
            expiresAt: { gt: new Date() }
          },
          _avg: {
            pricePerUnit: true
          },
          _count: {
            id: true
          }
        }),
        // Most listed items
        prisma.listing.groupBy({
          by: ['itemDefId'],
          where: {
            status: 'ACTIVE',
            expiresAt: { gt: new Date() }
          },
          _sum: {
            quantity: true
          },
          orderBy: {
            _sum: {
              quantity: 'desc'
            }
          },
          take: 5
        })
      ]);

      // Get item details for top items
      const topItemIds = topItems.map(item => item.itemDefId);
      const itemDetails = await prisma.itemDef.findMany({
        where: { id: { in: topItemIds } }
      });

      const summary = {
        activeListings,
        recentSales,
        marketData: {
          totalItems: priceData.length,
          averagePrice: priceData.reduce((sum, item) => sum + (item._avg.pricePerUnit || 0), 0) / priceData.length || 0,
          priceRanges: priceData.map(item => ({
            itemDefId: item.itemDefId,
            averagePrice: item._avg.pricePerUnit,
            listings: item._count.id
          }))
        },
        topItems: topItems.map(item => {
          const itemDef = itemDetails.find(def => def.id === item.itemDefId);
          return {
            itemDef,
            totalQuantity: item._sum.quantity
          };
        })
      };

      return apiSuccess(summary);

    } catch (error) {
      return handleApiError(error, 'Failed to fetch market summary');
    }
  }

  /**
   * Get contracts (purchase/sale requests)
   */
  static async getContracts(request: NextRequest, user: AuthUser): Promise<NextResponse> {
    try {
      const type = getQueryParam(request, 'type'); // 'PURCHASE' or 'SALE'
      const status = getQueryParam(request, 'status', 'ACTIVE');
      
      const whereClause: any = {
        ...(type && { type }),
        status,
        expiresAt: { gt: new Date() }
      };

      const contracts = await prisma.contract.findMany({
        where: whereClause,
        include: {
          itemDef: true,
          user: {
            include: {
              profile: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      return apiSuccess({
        contracts: contracts.map(contract => ({
          id: contract.id,
          type: contract.type,
          itemDef: contract.itemDef,
          quantity: contract.quantity,
          pricePerUnit: contract.pricePerUnit,
          totalValue: contract.quantity * contract.pricePerUnit,
          user: {
            id: contract.user.id,
            name: contract.user.profile?.name || 'Anonymous'
          },
          expiresAt: contract.expiresAt,
          createdAt: contract.createdAt
        })),
        filters: { type, status }
      });

    } catch (error) {
      return handleApiError(error, 'Failed to fetch contracts');
    }
  }

  /**
   * Create contract (purchase/sale request)
   */
  static async createContract(request: NextRequest, user: AuthUser): Promise<NextResponse> {
    try {
      const validation = await validateRequestBody(request, CreateContractSchema);
      if ('error' in validation) {
        return validation.error;
      }

      const { type, itemDefId, quantity, pricePerUnit, expiresAt } = validation.data;

      // Verify item exists
      const itemDef = await prisma.itemDef.findUnique({
        where: { id: itemDefId }
      });

      if (!itemDef) {
        return apiError('Item not found', 404);
      }

      // Validate expiration date
      const expirationDate = new Date(expiresAt);
      if (expirationDate <= new Date()) {
        return apiError('Expiration date must be in the future', 400);
      }

      // For SALE contracts, verify user has the items
      if (type === 'SALE') {
        const userInventory = await prisma.inventory.findFirst({
          where: {
            userId: user.id,
            itemDefId,
            location: 'warehouse',
            quantity: { gte: quantity }
          }
        });

        if (!userInventory) {
          return apiError('Insufficient items in warehouse', 400);
        }
      }

      // For PURCHASE contracts, calculate required deposit
      if (type === 'PURCHASE') {
        const totalValue = quantity * pricePerUnit;
        const wallet = await prisma.wallet.findUnique({
          where: { userId: user.id }
        });

        if (!wallet || wallet.gold < totalValue) {
          return apiError('Insufficient gold for purchase contract', 400);
        }
      }

      const contract = await prisma.contract.create({
        data: {
          userId: user.id,
          itemDefId,
          type,
          quantity,
          pricePerUnit,
          expiresAt: expirationDate,
          status: 'ACTIVE'
        },
        include: {
          itemDef: true
        }
      });

      return apiSuccess({
        message: 'Contract created successfully',
        contract: {
          id: contract.id,
          type: contract.type,
          itemDef: contract.itemDef,
          quantity: contract.quantity,
          pricePerUnit: contract.pricePerUnit,
          totalValue: contract.quantity * contract.pricePerUnit,
          expiresAt: contract.expiresAt,
          status: contract.status
        }
      });

    } catch (error) {
      return handleApiError(error, 'Failed to create contract');
    }
  }
}

// Export wrapped methods for use in API routes
export const tradingGetListings = withAuth(TradingService.getListings);
export const tradingCreateListing = withAuth(TradingService.createListing);
export const tradingBuyItem = withAuth(TradingService.buyItem);
export const tradingGetMarketSummary = withAuth(TradingService.getMarketSummary);
export const tradingGetContracts = withAuth(TradingService.getContracts);
export const tradingCreateContract = withAuth(TradingService.createContract);