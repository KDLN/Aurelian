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

        // Check buyer's wallet
        const buyerWallet = await tx.wallet.findFirst({
          where: { userId: user.id }
        });

        const totalCost = listing.qty * listing.price;

        if (!buyerWallet || buyerWallet.gold < totalCost) {
          throw new Error('Insufficient gold');
        }

        // Update listing status
        await tx.listing.update({
          where: { id: listingId },
          data: {
            status: 'sold',
            closedAt: new Date()
          }
        });

        // Transfer gold from buyer to seller
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: { gold: buyerWallet.gold - totalCost }
        });

        const sellerWallet = await tx.wallet.findFirst({
          where: { userId: listing.sellerId }
        });

        if (sellerWallet) {
          await tx.wallet.update({
            where: { id: sellerWallet.id },
            data: { gold: sellerWallet.gold + totalCost }
          });
        } else {
          // Create wallet for seller if doesn't exist
          await tx.wallet.create({
            data: {
              userId: listing.sellerId,
              gold: totalCost
            }
          });
        }

        // Add item to buyer's inventory
        const buyerInventory = await tx.inventory.findFirst({
          where: {
            userId: user.id,
            itemId: listing.itemId,
            location: 'warehouse'
          }
        });

        if (buyerInventory) {
          await tx.inventory.update({
            where: { id: buyerInventory.id },
            data: { qty: buyerInventory.qty + listing.qty }
          });
        } else {
          await tx.inventory.create({
            data: {
              userId: user.id,
              itemId: listing.itemId,
              qty: listing.qty,
              location: 'warehouse'
            }
          });
        }

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