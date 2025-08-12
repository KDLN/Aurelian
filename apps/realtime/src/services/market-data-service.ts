import { PrismaClient } from '@prisma/client';
import { MarketData } from '../utils/market-price-calculator';

export interface MarketDataServiceOptions {
  priceHistoryLength?: number; // How many recent prices to consider
  salesPeriodHours?: number;   // Hours to look back for recent sales
}

export class MarketDataService {
  private prisma: PrismaClient;
  private options: Required<MarketDataServiceOptions>;

  constructor(prisma: PrismaClient, options: MarketDataServiceOptions = {}) {
    this.prisma = prisma;
    this.options = {
      priceHistoryLength: options.priceHistoryLength ?? 20,
      salesPeriodHours: options.salesPeriodHours ?? 24
    };
  }

  /**
   * Get comprehensive market data for an item
   */
  async getMarketData(itemId: string, hubId?: string): Promise<MarketData> {
    const now = new Date();
    const salesCutoff = new Date(now.getTime() - this.options.salesPeriodHours * 60 * 60 * 1000);

    // Get active listings for supply data
    const activeListings = await this.prisma.listing.aggregate({
      where: {
        itemId,
        status: 'active',
        createdAt: { gte: salesCutoff }
      },
      _count: { id: true },
      _sum: { qty: true }
    });

    // Get recent sales for demand data
    const recentSales = await this.prisma.ledgerTx.count({
      where: {
        reason: 'auction_purchase',
        createdAt: { gte: salesCutoff },
        meta: {
          path: ['itemId'],
          equals: itemId
        }
      }
    });

    // Get average sale price from recent transactions
    const avgPriceData = await this.prisma.ledgerTx.aggregate({
      where: {
        reason: 'auction_purchase',
        createdAt: { gte: salesCutoff },
        meta: {
          path: ['itemId'],
          equals: itemId
        }
      },
      _avg: { amount: true }
    });

    // Get base price from item definition or recent average
    const item = await this.prisma.itemDef.findUnique({
      where: { id: itemId },
      select: { key: true, name: true }
    });

    // Set base prices for known items
    const basePrices: Record<string, number> = {
      'iron_ore': 8,
      'herb': 6,
      'hide': 7,
      'pearl': 60,
      'relic_fragment': 120
    };

    const basePrice = item ? (basePrices[item.key] || 10) : 10;
    const avgSalePrice = avgPriceData._avg.amount ? Math.abs(avgPriceData._avg.amount) : basePrice;

    return {
      activeListings: activeListings._count.id || 0,
      totalListingQuantity: activeListings._sum.qty || 0,
      recentSales24h: recentSales,
      avgSalePrice24h: avgSalePrice,
      basePrice
    };
  }

  /**
   * Get price history for an item
   */
  async getPriceHistory(itemId: string, hubId?: string): Promise<number[]> {
    const priceHistory = await this.prisma.priceTick.findMany({
      where: {
        itemId,
        hubId: hubId || null
      },
      select: { price: true },
      orderBy: { at: 'desc' },
      take: this.options.priceHistoryLength
    });

    return priceHistory.map(tick => tick.price).reverse(); // Oldest first
  }

  /**
   * Get active market events affecting an item
   */
  async getActiveMarketEvents(itemId?: string, hubId?: string) {
    return await this.prisma.marketEvent.findMany({
      where: {
        isActive: true,
        OR: [
          { itemId: itemId || null, hubId: hubId || null }, // Specific item/hub
          { itemId: null, hubId: null }, // Global events
          { itemId: itemId || null, hubId: null }, // Item-wide events
          { itemId: null, hubId: hubId || null } // Hub-wide events
        ],
        AND: [
          {
            OR: [
              { endsAt: null }, // No end date
              { endsAt: { gte: new Date() } } // Not yet expired
            ]
          }
        ]
      },
      orderBy: { startedAt: 'desc' }
    });
  }

  /**
   * Get all tradeable items with their base data
   */
  async getAllTradeableItems() {
    return await this.prisma.itemDef.findMany({
      where: {
        key: { in: ['iron_ore', 'herb', 'hide', 'pearl', 'relic_fragment'] }
      },
      select: {
        id: true,
        key: true,
        name: true
      }
    });
  }

  /**
   * Store a calculated price tick in the database
   */
  async storePriceTick(data: {
    itemId: string;
    hubId?: string;
    price: number;
    volume?: number;
    high?: number;
    low?: number;
    supplyDemandRatio?: number;
    priceMultiplier?: number;
    trend?: 'up' | 'down' | 'stable';
    volatility?: number;
  }) {
    return await this.prisma.priceTick.create({
      data: {
        itemId: data.itemId,
        hubId: data.hubId || null,
        price: data.price,
        volume: data.volume || 0,
        high: data.high,
        low: data.low,
        supplyDemandRatio: data.supplyDemandRatio,
        priceMultiplier: data.priceMultiplier,
        trend: data.trend,
        volatility: data.volatility
      }
    });
  }

  /**
   * Get market summary for all items
   */
  async getMarketSummary() {
    const items = await this.getAllTradeableItems();
    const summary = [];

    for (const item of items) {
      const marketData = await this.getMarketData(item.id);
      const priceHistory = await this.getPriceHistory(item.id);
      const currentPrice = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1] : marketData.basePrice;
      
      summary.push({
        itemId: item.id,
        itemKey: item.key,
        itemName: item.name,
        currentPrice,
        basePrice: marketData.basePrice,
        activeListings: marketData.activeListings,
        recentSales: marketData.recentSales24h,
        change24h: priceHistory.length >= 2 ? 
          ((currentPrice - priceHistory[0]) / priceHistory[0]) * 100 : 0
      });
    }

    return summary;
  }
}