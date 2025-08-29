import colyseus from 'colyseus';
import type { Client } from 'colyseus';
import { logger } from '../utils/logger';

const { Room } = colyseus;

type Listing = {
  id: string;
  item: string;
  itemKey: string;
  qty: number;
  price: number;
  seller: string;
  sellerId: string;
  age: number;
  createdAt: Date;
};

export class SimpleAuctionRoom extends Room {
  maxClients = 500;
  listings: Map<string, Listing> = new Map();
  marketPrices: Map<string, number> = new Map();
  
  async onCreate() {
    logger.room('SimpleAuctionRoom created (no database)');
    
    // Set up market price updates
    this.clock.setInterval(() => {
      this.updateMarketPrices();
      this.broadcast('prices', Object.fromEntries(this.marketPrices));
    }, 3000);
    
    // Handle listing creation
    this.onMessage('create_listing', (client, message) => {
      try {
        const { itemKey, quantity, pricePerUnit, userId } = message;
        
        // Create listing in memory only
        const newListing: Listing = {
          id: crypto.randomUUID(),
          item: itemKey.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          itemKey,
          qty: quantity,
          price: pricePerUnit,
          seller: `Player_${userId?.slice(-4) || Math.random().toString(36).slice(-4)}`,
          sellerId: userId || 'unknown',
          age: 0,
          createdAt: new Date()
        };
        
        this.listings.set(newListing.id, newListing);
        
        // Broadcast to all clients
        this.broadcast('new_listing', newListing);
        client.send('listing_created', newListing);
        
      } catch (error) {
        console.error('Create listing error:', error);
        client.send('error', { message: 'Failed to create listing' });
      }
    });
    
    // Handle purchase
    this.onMessage('buy_listing', (client, message) => {
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
          message: `Purchased ${listing.qty} ${listing.item} for ${listing.qty * listing.price} gold` 
        });
        
      } catch (error) {
        console.error('Buy listing error:', error);
        client.send('error', { message: 'Failed to buy listing' });
      }
    });
    
    // Handle cancel listing
    this.onMessage('cancel_listing', (client, message) => {
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
        
        // Remove from room state
        this.listings.delete(listingId);
        
        // Broadcast removal
        this.broadcast('listing_cancelled', { listingId });
        client.send('cancel_success', { message: 'Listing cancelled' });
        
      } catch (error) {
        console.error('Cancel listing error:', error);
        client.send('error', { message: 'Failed to cancel listing' });
      }
    });
  }
  
  async onJoin(client: Client, options: any) {
    logger.connection('Client joined SimpleAuctionRoom', { sessionId: client.sessionId });
    
    // Send current state to new client
    client.send('listings', Array.from(this.listings.values()));
    client.send('prices', Object.fromEntries(this.marketPrices));
  }
  
  onLeave(client: Client) {
    logger.connection('Client left SimpleAuctionRoom', { sessionId: client.sessionId });
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
}