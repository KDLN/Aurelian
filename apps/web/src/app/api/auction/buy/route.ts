import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getRequestBody } from '@/lib/auth/middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/apiUtils';
import { ActivityLogger } from '@/lib/services/activityLogger';
import { DailyStatsTracker } from '@/lib/services/dailyStatsTracker';

export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    const body = await getRequestBody<{ listingId: string }>(request);

    if (!body?.listingId) {
      return createErrorResponse('MISSING_FIELDS', 'Missing listing ID');
    }

    const { listingId } = body;

    try {
      // Process the purchase in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Get the listing with lock
        const listing = await tx.listing.findUnique({
          where: { id: listingId },
          include: { item: true }
        });

        if (!listing) {
          throw new Error('Listing not found');
        }

        if (listing.status !== 'active') {
          throw new Error('Listing is no longer available');
        }

        if (listing.sellerId === user.id) {
          throw new Error('Cannot buy your own listing');
        }

        const totalCost = listing.qty * listing.price;

        // Update listing status
        await tx.listing.update({
          where: { id: listingId },
          data: {
            status: 'sold',
            closedAt: new Date()
          }
        });

        // Atomically deduct gold from buyer's wallet with insufficient funds check
        // This prevents race conditions and ensures the gold check + update happen atomically
        const buyerWalletUpdate = await tx.wallet.updateMany({
          where: {
            userId: user.id,
            gold: { gte: totalCost }  // Atomic check: only update if sufficient gold
          },
          data: {
            gold: { decrement: totalCost }  // Atomic decrement
          }
        });

        // If no rows were updated, either wallet doesn't exist or insufficient gold
        if (buyerWalletUpdate.count === 0) {
          throw new Error('Insufficient gold');
        }

        // Use upsert for seller wallet to handle race conditions
        // If multiple purchases happen simultaneously for a new seller,
        // upsert ensures only one wallet is created
        await tx.wallet.upsert({
          where: { userId: listing.sellerId },
          update: {
            gold: { increment: totalCost }
          },
          create: {
            userId: listing.sellerId,
            gold: totalCost
          }
        });

        // Use upsert for buyer inventory to handle race conditions
        // If buyer purchases same item from multiple listings simultaneously,
        // upsert ensures qty is correctly incremented
        await tx.inventory.upsert({
          where: {
            userId_itemId_location: {
              userId: user.id,
              itemId: listing.itemId,
              location: 'warehouse'
            }
          },
          update: {
            qty: { increment: listing.qty }
          },
          create: {
            userId: user.id,
            itemId: listing.itemId,
            qty: listing.qty,
            location: 'warehouse'
          }
        });

        // Record transaction in ledger
        await tx.ledgerTx.createMany({
          data: [
            {
              userId: user.id,
              amount: -totalCost,
              reason: 'auction_purchase',
              meta: { listingId, itemName: listing.item.name }
            },
            {
              userId: listing.sellerId,
              amount: totalCost,
              reason: 'auction_sale',
              meta: { listingId, itemName: listing.item.name }
            }
          ]
        });

        return {
          listing,
          totalCost
        };
      });

      // Log activities and track stats for both buyer and seller
      await ActivityLogger.logTradeCompleted(
        user.id,
        result.listing.item.name,
        result.listing.qty,
        result.totalCost,
        true // isBuy = true
      );

      await ActivityLogger.logAuctionSold(
        result.listing.sellerId,
        result.listing.item.name,
        result.listing.qty,
        result.totalCost
      );

      // Track daily stats
      await DailyStatsTracker.trackGoldSpent(user.id, result.totalCost);
      await DailyStatsTracker.trackItemsTraded(user.id, result.listing.qty);
      await DailyStatsTracker.trackGoldEarned(result.listing.sellerId, result.totalCost);
      await DailyStatsTracker.trackItemsTraded(result.listing.sellerId, result.listing.qty);

      return createSuccessResponse({
        message: `Purchased ${result.listing.qty} ${result.listing.item.name} for ${result.totalCost} gold`,
        listing: result.listing,
        totalCost: result.totalCost
      });
    } catch (error: any) {
      // Convert transaction errors to proper HTTP responses
      const errorMessage = error.message || 'Unknown error';

      if (errorMessage === 'Listing not found') {
        return createErrorResponse('NOT_FOUND', 'Listing not found');
      }

      if (errorMessage === 'Listing is no longer available') {
        return createErrorResponse('LISTING_UNAVAILABLE', 'This listing is no longer available');
      }

      if (errorMessage === 'Cannot buy your own listing') {
        return createErrorResponse('INVALID_OPERATION', 'You cannot purchase your own listing');
      }

      if (errorMessage === 'Insufficient gold') {
        return createErrorResponse('INSUFFICIENT_FUNDS', 'You do not have enough gold for this purchase');
      }

      // Log unexpected errors
      console.error('Auction purchase error:', error);
      return createErrorResponse('INTERNAL_ERROR', 'An error occurred while processing your purchase');
    }
  });
}