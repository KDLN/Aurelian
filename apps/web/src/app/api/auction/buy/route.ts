import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    // Get auth token from headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { listingId } = body;

    if (!listingId) {
      return NextResponse.json({ error: 'Missing listing ID' }, { status: 400 });
    }

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

    return NextResponse.json({ 
      success: true,
      message: `Purchased ${result.listing.qty} ${result.listing.item.name} for ${result.totalCost} gold`
    });

  } catch (error: any) {
    console.error('Buy item error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { 
      status: error.message?.includes('not found') ? 404 : 
              error.message?.includes('Insufficient') ? 400 : 500 
    });
  }
}