import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getRequestBody } from '@/lib/auth/middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/apiUtils';

export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    const body = await getRequestBody<{ listingId: string }>(request);
    
    if (!body?.listingId) {
      return createErrorResponse('MISSING_FIELDS', 'Missing listing ID');
    }
    
    const { listingId } = body;

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

    return createSuccessResponse({
      message: `Purchased ${result.listing.qty} ${result.listing.item.name} for ${result.totalCost} gold`,
      listing: result.listing,
      totalCost: result.totalCost
    });
  });
}