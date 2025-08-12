import { Room, Client } from 'colyseus';
import { PrismaClient } from '@prisma/client';
import { MarketPriceCalculator } from '../utils/market-price-calculator';
import { MarketDataService } from '../services/market-data-service';

interface PriceUpdate {
  itemId: string;
  itemKey: string;
  itemName: string;
  price: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  volume: number;
  high: number;
  low: number;
  volatility: number;
  timestamp: string;
}

export class EnhancedTickerRoom extends Room {
  maxClients = 1000;
  private prisma: PrismaClient | null = null;
  private calculator!: MarketPriceCalculator;
  private marketService: MarketDataService | null = null;
  private priceCache = new Map<string, number>(); // itemId -> current price
  private tickerInterval: any;

  async onCreate() {
    console.log('Enhanced ticker room created');
    
    // Initialize Prisma client
    try {
      if (process.env.DATABASE_URL) {
        this.prisma = new PrismaClient();
        this.marketService = new MarketDataService(this.prisma);
        console.log('✅ Market data service initialized');
      } else {
        console.warn('⚠️  No DATABASE_URL found, running without database');
      }
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
    }

    // Initialize calculator
    this.calculator = new MarketPriceCalculator();

    // Load initial prices
    await this.loadInitialPrices();

    // Start the advanced ticker (update every 3 seconds for more realistic market)
    this.tickerInterval = this.clock.setInterval(async () => {
      await this.updateMarketPrices();
    }, 3000);

    // Send market summary every 10 seconds
    this.clock.setInterval(async () => {
      await this.broadcastMarketSummary();
    }, 10000);
  }

  async onJoin(client: Client, options: any) {
    console.log(`Client ${client.sessionId} joined enhanced ticker`);
    
    // Send current market state to new client
    const marketSummary = await this.getMarketSummary();
    client.send('market_summary', marketSummary);
  }

  onLeave(client: Client) {
    console.log(`Client ${client.sessionId} left enhanced ticker`);
  }

  private async loadInitialPrices() {
    if (!this.marketService) {
      // Fallback to base prices without database
      const baseItems = [
        { id: 'iron_ore', key: 'iron_ore', name: 'Iron Ore', basePrice: 8 },
        { id: 'herb', key: 'herb', name: 'Herb', basePrice: 6 },
        { id: 'hide', key: 'hide', name: 'Hide', basePrice: 7 },
        { id: 'pearl', key: 'pearl', name: 'Pearl', basePrice: 60 },
        { id: 'relic_fragment', key: 'relic_fragment', name: 'Relic Fragment', basePrice: 120 }
      ];
      
      baseItems.forEach(item => {
        this.priceCache.set(item.id, item.basePrice);
      });
      return;
    }

    try {
      const items = await this.marketService.getAllTradeableItems();
      
      for (const item of items) {
        const marketData = await this.marketService.getMarketData(item.id);
        const priceHistory = await this.marketService.getPriceHistory(item.id);
        
        // Use last known price or base price
        const currentPrice = priceHistory.length > 0 ? 
          priceHistory[priceHistory.length - 1] : 
          marketData.basePrice;
          
        this.priceCache.set(item.id, currentPrice);
      }
      
      console.log(`📊 Loaded initial prices for ${items.length} items`);
    } catch (error) {
      console.error('Failed to load initial prices:', error);
    }
  }

  private async updateMarketPrices() {
    if (!this.marketService) {
      // Fallback to simple price updates without database
      this.updatePricesWithoutDatabase();
      return;
    }

    try {
      const items = await this.marketService.getAllTradeableItems();
      const updates: PriceUpdate[] = [];

      for (const item of items) {
        try {
          // Get real market data
          const marketData = await this.marketService.getMarketData(item.id);
          const priceHistory = await this.marketService.getPriceHistory(item.id);
          const activeEvents = await this.marketService.getActiveMarketEvents(item.id);
          
          // Convert events to calculator format
          const marketEvents = activeEvents.map(event => ({
            type: event.type as 'shortage' | 'surplus' | 'discovery' | 'disruption',
            severity: event.severity as 'low' | 'medium' | 'high',
            multiplier: event.priceMultiplier - 1 // Convert to multiplier offset
          }));

          // Calculate new price
          const result = this.calculator.calculateNewPrice(marketData, {
            priceHistory,
            marketEvents,
            maxPriceChange: 0.15 // 15% max change per tick
          });

          const previousPrice = this.priceCache.get(item.id) || marketData.basePrice;
          const change = result.newPrice - previousPrice;
          const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;

          // Update cache
          this.priceCache.set(item.id, result.newPrice);

          // Store in database
          await this.marketService.storePriceTick({
            itemId: item.id,
            price: result.newPrice,
            volume: marketData.totalListingQuantity,
            high: Math.max(result.newPrice, previousPrice),
            low: Math.min(result.newPrice, previousPrice),
            supplyDemandRatio: result.supplyDemandRatio,
            priceMultiplier: result.priceMultiplier,
            trend: result.trend,
            volatility: result.volatility
          });

          // Create update message
          updates.push({
            itemId: item.id,
            itemKey: item.key,
            itemName: item.name,
            price: result.newPrice,
            previousPrice,
            change,
            changePercent,
            trend: result.trend,
            volume: marketData.totalListingQuantity,
            high: Math.max(result.newPrice, previousPrice),
            low: Math.min(result.newPrice, previousPrice),
            volatility: result.volatility,
            timestamp: new Date().toISOString()
          });

        } catch (itemError) {
          console.error(`Error updating price for ${item.name}:`, itemError);
        }
      }

      // Broadcast price updates
      if (updates.length > 0) {
        this.broadcast('price_updates', updates);
        console.log(`📈 Broadcasted ${updates.length} price updates`);
      }

    } catch (error) {
      console.error('Error in updateMarketPrices:', error);
    }
  }

  private updatePricesWithoutDatabase() {
    const items = [
      { id: 'iron_ore', key: 'iron_ore', name: 'Iron Ore' },
      { id: 'herb', key: 'herb', name: 'Herb' },
      { id: 'hide', key: 'hide', name: 'Hide' },
      { id: 'pearl', key: 'pearl', name: 'Pearl' },
      { id: 'relic_fragment', key: 'relic_fragment', name: 'Relic Fragment' }
    ];

    const updates: PriceUpdate[] = [];

    items.forEach(item => {
      const previousPrice = this.priceCache.get(item.id) || 10;
      
      // Simple price movement with some volatility
      const volatility = 0.1;
      const change = (Math.random() - 0.5) * volatility * previousPrice;
      const newPrice = Math.max(1, Math.round(previousPrice + change));
      
      this.priceCache.set(item.id, newPrice);

      const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (changePercent > 2) trend = 'up';
      else if (changePercent < -2) trend = 'down';

      updates.push({
        itemId: item.id,
        itemKey: item.key,
        itemName: item.name,
        price: newPrice,
        previousPrice,
        change,
        changePercent,
        trend,
        volume: Math.floor(Math.random() * 50 + 10),
        high: Math.max(newPrice, previousPrice),
        low: Math.min(newPrice, previousPrice),
        volatility: volatility,
        timestamp: new Date().toISOString()
      });
    });

    this.broadcast('price_updates', updates);
  }

  private async broadcastMarketSummary() {
    const summary = await this.getMarketSummary();
    this.broadcast('market_summary', summary);
  }

  private async getMarketSummary() {
    if (this.marketService) {
      try {
        return await this.marketService.getMarketSummary();
      } catch (error) {
        console.error('Error getting market summary:', error);
      }
    }

    // Fallback summary
    return Array.from(this.priceCache.entries()).map(([itemId, price]) => ({
      itemId,
      itemKey: itemId,
      itemName: itemId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      currentPrice: price,
      basePrice: price,
      activeListings: Math.floor(Math.random() * 20 + 5),
      recentSales: Math.floor(Math.random() * 15 + 2),
      change24h: (Math.random() - 0.5) * 20
    }));
  }

  async onDispose() {
    if (this.tickerInterval) {
      this.tickerInterval.clear();
    }
    
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
    
    console.log('Enhanced ticker room disposed');
  }
}