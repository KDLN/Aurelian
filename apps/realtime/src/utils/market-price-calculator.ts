export interface MarketData {
  activeListings: number;
  totalListingQuantity: number;
  recentSales24h: number;
  avgSalePrice24h: number;
  basePrice: number;
}

export interface PriceCalculationResult {
  newPrice: number;
  supplyDemandRatio: number;
  priceMultiplier: number;
  volatility: number;
  trend: 'up' | 'down' | 'stable';
}

export class MarketPriceCalculator {
  /**
   * Calculate supply/demand ratio based on active listings vs recent sales
   */
  calculateSupplyDemandRatio(activeListings: number, recentSales: number): number {
    if (recentSales === 0) {
      // No demand = high supply ratio
      return Math.max(10, activeListings);
    }
    return activeListings / recentSales;
  }

  /**
   * Calculate price multiplier based on supply/demand ratio
   * High ratio = oversupply = lower prices
   * Low ratio = high demand = higher prices
   */
  calculatePriceMultiplier(supplyDemandRatio: number): number {
    // Logarithmic scaling for more realistic price movements
    if (supplyDemandRatio > 5) {
      // Severe oversupply - prices crash
      return Math.max(0.3, 1 - (supplyDemandRatio - 5) * 0.1);
    } else if (supplyDemandRatio > 2) {
      // Oversupply - gradual price reduction
      return Math.max(0.7, 1 - (supplyDemandRatio - 2) * 0.1);
    } else if (supplyDemandRatio < 0.2) {
      // Extreme demand - prices spike
      return Math.min(2.5, 1 + (0.2 - supplyDemandRatio) * 3);
    } else if (supplyDemandRatio < 0.5) {
      // High demand - price increases
      return Math.min(1.5, 1 + (0.5 - supplyDemandRatio) * 1.5);
    }
    
    // Balanced market - small fluctuations around 1.0
    return 0.95 + (Math.random() * 0.1); // ±5% random fluctuation
  }

  /**
   * Calculate market volatility based on recent price movements and volume
   */
  calculateVolatility(priceHistory: number[], baseVolatility: number = 0.05): number {
    if (priceHistory.length < 2) return baseVolatility;

    // Calculate price changes over recent periods
    const changes = [];
    for (let i = 1; i < priceHistory.length; i++) {
      const change = Math.abs((priceHistory[i] - priceHistory[i-1]) / priceHistory[i-1]);
      changes.push(change);
    }

    // Average volatility with some dampening
    const avgVolatility = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    return Math.min(0.25, baseVolatility + avgVolatility * 0.5); // Max 25% volatility
  }

  /**
   * Apply market events that can affect prices
   */
  applyMarketEvents(baseMultiplier: number, events: Array<{
    type: 'shortage' | 'surplus' | 'discovery' | 'disruption';
    severity: 'low' | 'medium' | 'high';
    multiplier: number;
  }>): number {
    let eventMultiplier = 1.0;
    
    for (const event of events) {
      switch (event.type) {
        case 'shortage':
          // Increases prices
          eventMultiplier *= (1 + event.multiplier);
          break;
        case 'surplus':
          // Decreases prices
          eventMultiplier *= Math.max(0.1, 1 - event.multiplier);
          break;
        case 'discovery':
          // New supply source - reduces prices
          eventMultiplier *= Math.max(0.5, 1 - event.multiplier * 0.5);
          break;
        case 'disruption':
          // Supply chain issues - increases prices
          eventMultiplier *= (1 + event.multiplier * 1.5);
          break;
      }
    }

    return baseMultiplier * eventMultiplier;
  }

  /**
   * Main price calculation function
   */
  calculateNewPrice(marketData: MarketData, options: {
    priceHistory?: number[];
    marketEvents?: Array<{
      type: 'shortage' | 'surplus' | 'discovery' | 'disruption';
      severity: 'low' | 'medium' | 'high';
      multiplier: number;
    }>;
    maxPriceChange?: number; // Maximum price change per tick (default 10%)
  } = {}): PriceCalculationResult {
    const {
      priceHistory = [],
      marketEvents = [],
      maxPriceChange = 0.1
    } = options;

    // Calculate core supply/demand metrics
    const supplyDemandRatio = this.calculateSupplyDemandRatio(
      marketData.activeListings,
      marketData.recentSales24h
    );

    // Calculate base price multiplier
    let priceMultiplier = this.calculatePriceMultiplier(supplyDemandRatio);

    // Apply market events
    if (marketEvents.length > 0) {
      priceMultiplier = this.applyMarketEvents(priceMultiplier, marketEvents);
    }

    // Calculate volatility
    const volatility = this.calculateVolatility(priceHistory);
    
    // Apply random market noise
    const noise = (Math.random() - 0.5) * volatility * 2;
    const finalMultiplier = priceMultiplier * (1 + noise);

    // Calculate new price
    const newPrice = marketData.basePrice * finalMultiplier;

    // Apply maximum change limit to prevent extreme swings
    const currentPrice = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1] : marketData.basePrice;
    const maxChange = currentPrice * maxPriceChange;
    const priceDiff = newPrice - currentPrice;
    
    let finalPrice: number;
    if (Math.abs(priceDiff) > maxChange) {
      // Limit the price change
      finalPrice = currentPrice + (priceDiff > 0 ? maxChange : -maxChange);
    } else {
      finalPrice = newPrice;
    }

    // Ensure minimum price of 1
    finalPrice = Math.max(1, Math.round(finalPrice));

    // Determine trend
    let trend: 'up' | 'down' | 'stable';
    if (finalPrice > currentPrice * 1.02) {
      trend = 'up';
    } else if (finalPrice < currentPrice * 0.98) {
      trend = 'down';
    } else {
      trend = 'stable';
    }

    return {
      newPrice: finalPrice,
      supplyDemandRatio,
      priceMultiplier: finalMultiplier,
      volatility,
      trend
    };
  }

  /**
   * Calculate market depth (total value available at different price levels)
   */
  calculateMarketDepth(listings: Array<{ price: number; quantity: number }>, currentPrice: number) {
    const depth = {
      buyOrders: { total: 0, quantities: [] as number[] },
      sellOrders: { total: 0, quantities: [] as number[] }
    };

    for (const listing of listings) {
      if (listing.price <= currentPrice * 1.1) {
        // Consider as competitive sell orders
        depth.sellOrders.total += listing.price * listing.quantity;
        depth.sellOrders.quantities.push(listing.quantity);
      }
    }

    return depth;
  }
}