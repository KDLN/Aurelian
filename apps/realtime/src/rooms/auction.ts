import { Room } from 'colyseus';
import type { Client } from 'colyseus';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
let prisma: PrismaClient | null = null;

// Lazy initialization function for Prisma
function initPrisma(): PrismaClient | null {
  if (prisma) return prisma;
  
  try {
    if (process.env.DATABASE_URL) {
      logger.debug('Initializing Prisma client for auction room');
      prisma = new PrismaClient();
      return prisma;
    } else {
      console.warn('No DATABASE_URL found, running without database');
      return null;
    }
  } catch (error) {
    console.warn('Database connection failed, running without persistence:', error);
    return null;
  }
}

type Listing = {
  id: string;
  item: string;
  itemKey: string;
  qty: number;
  price: number;
  seller: string;
  sellerId: string;
  age: number;
  duration: number;
  feePercent: number;
  createdAt: Date;
};

type MarketPrice = {
  item: string;
  price: number;
};

const DURATION_OPTIONS = [
  { minutes: 6, feePercent: 2 },
  { minutes: 12, feePercent: 3 },
  { minutes: 24, feePercent: 5 },
  { minutes: 36, feePercent: 8 },
  { minutes: 60, feePercent: 12 }
];

function getDurationFee(duration: number): number {
  const option = DURATION_OPTIONS.find(d => d.minutes === duration);
  return option ? option.feePercent : 5; // Default to 5% if duration not found
}

export class AuctionRoom extends Room {
  maxClients = 500;
  listings: Map<string, Listing> = new Map();
  marketPrices: Map<string, number> = new Map();
  
  async onCreate() {
    logger.room('AuctionRoom created');
    
    // Initialize Prisma client lazily
    prisma = initPrisma();
    
    // Load initial listings from database
    await this.loadListings();
    
    // Set up periodic sync with database
    this.clock.setInterval(async () => {
      await this.loadListings();
      this.broadcast('listings', Array.from(this.listings.values()));
    }, 5000);
    
    // Set up market price updates
    this.clock.setInterval(() => {
      this.updateMarketPrices();
      this.broadcast('prices', Object.fromEntries(this.marketPrices));
    }, 3000);
    
    // Handle listing creation
    this.onMessage('create_listing', async (client, message) => {
      if (!prisma) {
        client.send('error', { message: 'Database not available' });
        return;
      }
      
      try {
        const { itemKey, quantity, pricePerUnit, duration = 24, userId } = message;
        
        // Validate user has the item
        const itemDef = await prisma.itemDef.findUnique({
          where: { key: itemKey }
        });
        
        if (!itemDef) {
          client.send('error', { message: 'Item not found' });
          return;
        }
        
        const inventory = await prisma.inventory.findFirst({
          where: {
            userId,
            itemId: itemDef.id,
            location: 'warehouse'
          }
        });
        
        if (!inventory || inventory.qty < quantity) {
          client.send('error', { message: 'Insufficient inventory' });
          return;
        }
        
        // Create listing in database
        const listing = await prisma.$transaction(async (tx) => {
          // Reduce inventory
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { qty: inventory.qty - quantity }
          });
          
          // Create listing
          return await tx.listing.create({
            data: {
              sellerId: userId,
              itemId: itemDef.id,
              qty: quantity,
              price: pricePerUnit,
              duration: duration,
              status: 'active'
            },
            include: {
              item: true,
              seller: {
                include: {
                  profile: true
                }
              }
            }
          });
        });
        
        // Add to room state
        const newListing: Listing = {
          id: listing.id,
          item: listing.item.name,
          itemKey: listing.item.key,
          qty: listing.qty,
          price: listing.price,
          seller: listing.seller.profile?.display || 'Unknown',
          sellerId: listing.sellerId,
          age: 0,
          duration: listing.duration || 24,
          feePercent: getDurationFee(listing.duration || 24),
          createdAt: listing.createdAt
        };
        
        this.listings.set(listing.id, newListing);
        
        // Broadcast to all clients
        this.broadcast('new_listing', newListing);
        client.send('listing_created', newListing);
        
      } catch (error) {
        console.error('Create listing error:', error);
        client.send('error', { message: 'Failed to create listing' });
      }
    });
    
    // Handle purchase
    this.onMessage('buy_listing', async (client, message) => {
      if (!prisma) {
        client.send('error', { message: 'Database not available' });
        return;
      }
      
      try {
        const { listingId, userId } = message;
        
        const listing = this.listings.get(listingId);
        if (!listing) {
          client.send('error', { message: 'Listing not found' });
          return;
        }
        
        if (listing.sellerId === userId) {
          client.send('error', { message: 'Cannot buy your own listing' });
          return;
        }
        
        // Validate UUIDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
          console.error('Invalid buyer userId:', userId);
          client.send('error', { message: `Invalid user ID format: ${userId}` });
          return;
        }
        
        if (!uuidRegex.test(listingId)) {
          console.error('Invalid listingId:', listingId);
          client.send('error', { message: `Invalid listing ID format: ${listingId}` });
          return;
        }
        
        // Process purchase in database
        const result = await prisma.$transaction(async (tx) => {
          // Get the listing with lock
          const dbListing = await tx.listing.findUnique({
            where: { id: listingId },
            include: { item: true }
          });
          
          if (!dbListing || dbListing.status !== 'active') {
            throw new Error('Listing no longer available');
          }
          
          // Validate seller UUID
          if (!uuidRegex.test(dbListing.sellerId)) {
            console.error('Invalid sellerId in listing:', dbListing.sellerId);
            throw new Error(`Invalid seller ID in listing: ${dbListing.sellerId}`);
          }
          
          // Check buyer's wallet
          const buyerWallet = await tx.wallet.findFirst({
            where: { userId }
          });
          
          const totalCost = dbListing.qty * dbListing.price;
          const feePercent = getDurationFee(dbListing.duration || 24);
          const fee = Math.floor(totalCost * feePercent / 100);
          const sellerReceives = totalCost - fee;
          
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
          
          // Transfer gold
          await tx.wallet.update({
            where: { id: buyerWallet.id },
            data: { gold: buyerWallet.gold - totalCost }
          });
          
          const sellerWallet = await tx.wallet.findFirst({
            where: { userId: dbListing.sellerId }
          });
          
          if (sellerWallet) {
            await tx.wallet.update({
              where: { id: sellerWallet.id },
              data: { gold: sellerWallet.gold + sellerReceives }
            });
          } else {
            await tx.wallet.create({
              data: {
                userId: dbListing.sellerId,
                gold: sellerReceives
              }
            });
          }
          
          // Add item to buyer's inventory
          const buyerInventory = await tx.inventory.findFirst({
            where: {
              userId,
              itemId: dbListing.itemId,
              location: 'warehouse'
            }
          });
          
          if (buyerInventory) {
            await tx.inventory.update({
              where: { id: buyerInventory.id },
              data: { qty: buyerInventory.qty + dbListing.qty }
            });
          } else {
            await tx.inventory.create({
              data: {
                userId,
                itemId: dbListing.itemId,
                qty: dbListing.qty,
                location: 'warehouse'
              }
            });
          }
          
          // Record in ledger
          await tx.ledgerTx.createMany({
            data: [
              {
                userId,
                amount: -totalCost,
                reason: 'auction_purchase',
                meta: { listingId, itemName: dbListing.item.name }
              },
              {
                userId: dbListing.sellerId,
                amount: sellerReceives,
                reason: 'auction_sale',
                meta: { listingId, itemName: dbListing.item.name, fee: fee, feePercent: feePercent }
              },
              {
                userId: null,
                amount: fee,
                reason: 'auction_fee',
                meta: { listingId, itemName: dbListing.item.name, feePercent: feePercent, note: 'AUCTION_HOUSE' }
              }
            ]
          });
          
          return { success: true, totalCost };
        });
        
        // Remove from room state
        this.listings.delete(listingId);
        
        // Broadcast removal to all clients
        this.broadcast('listing_sold', { 
          listingId, 
          buyerId: userId,
          item: listing.item,
          qty: listing.qty,
          totalPrice: listing.qty * listing.price
        });
        
        client.send('purchase_success', { 
          message: `Purchased ${listing.qty} ${listing.item} for ${result.totalCost} gold` 
        });
        
      } catch (error: any) {
        console.error('Buy listing error:', error);
        client.send('error', { message: error.message || 'Failed to buy listing' });
      }
    });
    
    // Handle cancel listing
    this.onMessage('cancel_listing', async (client, message) => {
      if (!prisma) {
        client.send('error', { message: 'Database not available' });
        return;
      }
      
      try {
        const { listingId, userId } = message;
        
        const listing = this.listings.get(listingId);
        if (!listing) {
          client.send('error', { message: 'Listing not found' });
          return;
        }
        
        if (listing.sellerId !== userId) {
          client.send('error', { message: 'Not your listing' });
          return;
        }
        
        // Cancel in database and return items
        await prisma.$transaction(async (tx) => {
          const dbListing = await tx.listing.findUnique({
            where: { id: listingId }
          });
          
          if (!dbListing || dbListing.status !== 'active') {
            throw new Error('Listing cannot be cancelled');
          }
          
          // Update listing status
          await tx.listing.update({
            where: { id: listingId },
            data: { 
              status: 'cancelled',
              closedAt: new Date()
            }
          });
          
          // Return items to seller's inventory
          const inventory = await tx.inventory.findFirst({
            where: {
              userId: dbListing.sellerId,
              itemId: dbListing.itemId,
              location: 'warehouse'
            }
          });
          
          if (inventory) {
            await tx.inventory.update({
              where: { id: inventory.id },
              data: { qty: inventory.qty + dbListing.qty }
            });
          } else {
            await tx.inventory.create({
              data: {
                userId: dbListing.sellerId,
                itemId: dbListing.itemId,
                qty: dbListing.qty,
                location: 'warehouse'
              }
            });
          }
        });
        
        // Remove from room state
        this.listings.delete(listingId);
        
        // Broadcast removal
        this.broadcast('listing_cancelled', { listingId });
        client.send('cancel_success', { message: 'Listing cancelled' });
        
      } catch (error: any) {
        console.error('Cancel listing error:', error);
        client.send('error', { message: error.message || 'Failed to cancel listing' });
      }
    });
  }
  
  async onJoin(client: Client, options: any) {
    logger.connection('Client joined AuctionRoom', { sessionId: client.sessionId });
    
    // Send current state to new client
    client.send('listings', Array.from(this.listings.values()));
    client.send('prices', Object.fromEntries(this.marketPrices));
  }
  
  onLeave(client: Client) {
    logger.connection('Client left AuctionRoom', { sessionId: client.sessionId });
  }
  
  async loadListings() {
    if (!prisma) {
      logger.debug('No database connection, skipping listing load');
      return;
    }
    
    try {
      const listings = await prisma.listing.findMany({
        where: { status: 'active' },
        include: {
          item: true,
          seller: {
            include: {
              profile: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      
      // Clear and reload listings
      this.listings.clear();
      
      for (const listing of listings) {
        this.listings.set(listing.id, {
          id: listing.id,
          item: listing.item.name,
          itemKey: listing.item.key,
          qty: listing.qty,
          price: listing.price,
          seller: listing.seller.profile?.display || 'Unknown',
          sellerId: listing.sellerId,
          age: Math.floor((Date.now() - listing.createdAt.getTime()) / 60000),
          duration: listing.duration || 24,
          feePercent: getDurationFee(listing.duration || 24),
          createdAt: listing.createdAt
        });
      }
      
      // Auto-expire old listings based on their duration
      const expiredListings: string[] = [];
      for (const [id, listing] of this.listings) {
        if (listing.age > listing.duration) {
          expiredListings.push(id);
        }
      }
      
      if (expiredListings.length > 0) {
        await this.expireListings(expiredListings);
      }
      
    } catch (error) {
      console.error('Load listings error:', error);
    }
  }
  
  async expireListings(listingIds: string[]) {
    if (!prisma) return;
    
    try {
      for (const listingId of listingIds) {
        await prisma.$transaction(async (tx) => {
          const listing = await tx.listing.findUnique({
            where: { id: listingId }
          });
          
          if (listing && listing.status === 'active') {
            // Update status
            await tx.listing.update({
              where: { id: listingId },
              data: { 
                status: 'expired',
                closedAt: new Date()
              }
            });
            
            // Return items to seller
            const inventory = await tx.inventory.findFirst({
              where: {
                userId: listing.sellerId,
                itemId: listing.itemId,
                location: 'warehouse'
              }
            });
            
            if (inventory) {
              await tx.inventory.update({
                where: { id: inventory.id },
                data: { qty: inventory.qty + listing.qty }
              });
            } else {
              await tx.inventory.create({
                data: {
                  userId: listing.sellerId,
                  itemId: listing.itemId,
                  qty: listing.qty,
                  location: 'warehouse'
                }
              });
            }
          }
        });
        
        this.listings.delete(listingId);
        this.broadcast('listing_expired', { listingId });
      }
    } catch (error) {
      console.error('Expire listings error:', error);
    }
  }
  
  updateMarketPrices() {
    const items = ['Iron Ore', 'Herb', 'Hide', 'Pearl', 'Relic Fragment'];
    const basePrices: Record<string, number> = {
      'Iron Ore': 8,
      'Herb': 6,
      'Hide': 7,
      'Pearl': 60,
      'Relic Fragment': 120
    };
    
    for (const item of items) {
      const base = basePrices[item];
      const volatility = 0.3;
      const noise = (Math.random() - 0.5) * volatility;
      const price = Math.max(1, Math.round(base * (1 + noise)));
      this.marketPrices.set(item, price);
    }
  }
  
  async onDispose() {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}