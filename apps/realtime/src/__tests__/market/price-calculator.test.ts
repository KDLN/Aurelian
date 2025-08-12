import { MarketPriceCalculator, MarketData } from '../../utils/market-price-calculator'

describe('MarketPriceCalculator', () => {
  let calculator: MarketPriceCalculator
  
  beforeEach(() => {
    calculator = new MarketPriceCalculator()
    // Mock Math.random for consistent testing
    jest.spyOn(Math, 'random').mockReturnValue(0.5) // Neutral random value
  })
  
  afterEach(() => {
    jest.restoreAllMocks()
  })
  
  describe('supply and demand calculations', () => {
    it('calculates high supply low demand correctly', () => {
      const ratio = calculator.calculateSupplyDemandRatio(100, 10)
      expect(ratio).toBe(10)
      
      const multiplier = calculator.calculatePriceMultiplier(ratio)
      expect(multiplier).toBe(0.5) // Specific price reduction due to oversupply
    })
    
    it('calculates high demand low supply correctly', () => {
      const ratio = calculator.calculateSupplyDemandRatio(10, 100)
      expect(ratio).toBe(0.1)
      
      const multiplier = calculator.calculatePriceMultiplier(ratio)
      expect(multiplier).toBe(1.3) // Specific price increase due to high demand
    })
    
    it('handles no recent sales', () => {
      const ratio = calculator.calculateSupplyDemandRatio(50, 0)
      expect(ratio).toBe(50) // Uses max of activeListings or 10
    })
    
    it('handles balanced market', () => {
      const ratio = calculator.calculateSupplyDemandRatio(50, 50)
      expect(ratio).toBe(1)
      
      const multiplier = calculator.calculatePriceMultiplier(ratio)
      expect(multiplier).toBeGreaterThan(0.9)
      expect(multiplier).toBeLessThan(1.1) // Small fluctuations around 1.0
    })
  })
  
  describe('price calculations', () => {
    it('calculates complete price with market data', () => {
      const marketData: MarketData = {
        activeListings: 25,
        totalListingQuantity: 100,
        recentSales24h: 50,
        avgSalePrice24h: 100,
        basePrice: 100
      }
      
      const result = calculator.calculateNewPrice(marketData)
      
      expect(result.newPrice).toBeGreaterThan(0)
      expect(result.supplyDemandRatio).toBe(0.5) // 25/50
      expect(result.trend).toMatch(/up|down|stable/)
      expect(result.volatility).toBeGreaterThan(0)
    })
    
    it('ensures minimum price of 1', () => {
      const marketData: MarketData = {
        activeListings: 1000,
        totalListingQuantity: 5000,
        recentSales24h: 1,
        avgSalePrice24h: 1,
        basePrice: 5
      }
      
      const result = calculator.calculateNewPrice(marketData)
      expect(result.newPrice).toBeGreaterThanOrEqual(1)
    })
    
    it('applies market events correctly', () => {
      const marketData: MarketData = {
        activeListings: 50,
        totalListingQuantity: 200,
        recentSales24h: 50,
        avgSalePrice24h: 100,
        basePrice: 100
      }
      
      const result = calculator.calculateNewPrice(marketData, {
        marketEvents: [{
          type: 'shortage',
          severity: 'high',
          multiplier: 0.5 // 50% price increase
        }]
      })
      
      expect(result.newPrice).toBeGreaterThan(100) // Should be higher due to shortage
    })
    
    it('limits maximum price changes', () => {
      const priceHistory = [100, 105, 110]
      const marketData: MarketData = {
        activeListings: 1,
        totalListingQuantity: 5,
        recentSales24h: 1000, // Extreme demand
        avgSalePrice24h: 110,
        basePrice: 100
      }
      
      const result = calculator.calculateNewPrice(marketData, {
        priceHistory,
        maxPriceChange: 0.05 // 5% max change
      })
      
      // Price should not increase by more than 5% from last price (110)
      expect(result.newPrice).toBeLessThanOrEqual(116) // 110 * 1.05 rounded up
    })
  })
  
  describe('volatility calculations', () => {
    it('calculates volatility from price history', () => {
      const priceHistory = [100, 105, 95, 110, 90] // Volatile prices
      const volatility = calculator.calculateVolatility(priceHistory, 0.05)
      
      expect(volatility).toBeGreaterThan(0.05) // Should be higher than base
      expect(volatility).toBeLessThanOrEqual(0.25) // But capped at 25%
    })
    
    it('returns base volatility for insufficient data', () => {
      const volatility = calculator.calculateVolatility([100], 0.1)
      expect(volatility).toBe(0.1)
    })
  })
  
  describe('market events', () => {
    it('applies shortage events correctly', () => {
      const baseMultiplier = 1.0
      const events = [{
        type: 'shortage' as const,
        severity: 'medium' as const,
        multiplier: 0.3
      }]
      
      const result = calculator.applyMarketEvents(baseMultiplier, events)
      expect(result).toBe(1.3) // 1.0 * (1 + 0.3)
    })
    
    it('applies multiple events cumulatively', () => {
      const baseMultiplier = 1.0
      const events = [
        { type: 'shortage' as const, severity: 'low' as const, multiplier: 0.2 },
        { type: 'disruption' as const, severity: 'medium' as const, multiplier: 0.1 }
      ]
      
      const result = calculator.applyMarketEvents(baseMultiplier, events)
      // Should be 1.0 * 1.2 * 1.15 = 1.38
      expect(result).toBeCloseTo(1.38, 2)
    })
  })
  
  describe('market depth calculations', () => {
    it('calculates sell order depth correctly', () => {
      const listings = [
        { price: 100, quantity: 10 },
        { price: 105, quantity: 5 },
        { price: 120, quantity: 15 } // Too expensive to be competitive
      ]
      
      const depth = calculator.calculateMarketDepth(listings, 100)
      
      // Only first two listings should count (within 10% of current price)
      expect(depth.sellOrders.total).toBe(1525) // 100*10 + 105*5
      expect(depth.sellOrders.quantities).toEqual([10, 5])
    })
  })
})