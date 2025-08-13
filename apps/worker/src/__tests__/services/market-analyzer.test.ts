// Market analysis service tests
describe('MarketAnalyzer', () => {
  class MockMarketAnalyzer {
    calculateTradeVolume(transactions: Array<{amount: number, timestamp: Date}>): number {
      return transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    }
    
    detectPriceManipulation(priceHistory: Array<{price: number, volume: number, timestamp: Date}>): boolean {
      // Simple manipulation detection: large price swings with low volume
      if (priceHistory.length < 2) return false
      
      for (let i = 1; i < priceHistory.length; i++) {
        const prev = priceHistory[i - 1]
        const curr = priceHistory[i]
        
        const priceChange = Math.abs((curr.price - prev.price) / prev.price)
        const avgVolume = (curr.volume + prev.volume) / 2
        
        // If price changed >20% but volume is <10, suspicious
        if (priceChange > 0.2 && avgVolume < 10) {
          return true
        }
      }
      return false
    }
    
    generateMarketReport(itemId: string, data: any): {
      itemId: string;
      avgPrice: number;
      volume24h: number;
      priceChange24h: number;
      trend: 'up' | 'down' | 'stable';
      generatedAt: Date;
    } {
      return {
        itemId,
        avgPrice: data.avgPrice || 0,
        volume24h: data.volume24h || 0,
        priceChange24h: data.priceChange24h || 0,
        trend: data.priceChange24h > 0 ? 'up' : data.priceChange24h < 0 ? 'down' : 'stable',
        generatedAt: new Date()
      }
    }
  }
  
  let analyzer: MockMarketAnalyzer
  
  beforeEach(() => {
    analyzer = new MockMarketAnalyzer()
  })
  
  describe('trade volume calculation', () => {
    it('calculates total volume correctly', () => {
      const transactions = [
        { amount: 100, timestamp: new Date() },
        { amount: -50, timestamp: new Date() },
        { amount: 200, timestamp: new Date() }
      ]
      
      const volume = analyzer.calculateTradeVolume(transactions)
      expect(volume).toBe(350) // |100| + |-50| + |200|
    })
    
    it('handles empty transactions', () => {
      const volume = analyzer.calculateTradeVolume([])
      expect(volume).toBe(0)
    })
  })
  
  describe('manipulation detection', () => {
    it('detects suspicious price movements', () => {
      const priceHistory = [
        { price: 100, volume: 5, timestamp: new Date() },
        { price: 130, volume: 3, timestamp: new Date() } // 30% increase, low volume
      ]
      
      const isManipulated = analyzer.detectPriceManipulation(priceHistory)
      expect(isManipulated).toBe(true)
    })
    
    it('does not flag normal price movements', () => {
      const priceHistory = [
        { price: 100, volume: 50, timestamp: new Date() },
        { price: 110, volume: 45, timestamp: new Date() } // 10% increase, normal volume
      ]
      
      const isManipulated = analyzer.detectPriceManipulation(priceHistory)
      expect(isManipulated).toBe(false)
    })
    
    it('handles insufficient data', () => {
      const priceHistory = [{ price: 100, volume: 10, timestamp: new Date() }]
      
      const isManipulated = analyzer.detectPriceManipulation(priceHistory)
      expect(isManipulated).toBe(false)
    })
  })
  
  describe('market report generation', () => {
    it('generates comprehensive market report', () => {
      const data = {
        avgPrice: 125,
        volume24h: 1500,
        priceChange24h: 12.5
      }
      
      const report = analyzer.generateMarketReport('iron_ore', data)
      
      expect(report).toMatchObject({
        itemId: 'iron_ore',
        avgPrice: 125,
        volume24h: 1500,
        priceChange24h: 12.5,
        trend: 'up'
      })
      expect((report as any).generatedAt).toBeInstanceOf(Date)
    })
    
    it('determines correct trend direction', () => {
      const upReport = analyzer.generateMarketReport('test', { priceChange24h: 5 })
      expect((upReport as any).trend).toBe('up')
      
      const downReport = analyzer.generateMarketReport('test', { priceChange24h: -3 })
      expect((downReport as any).trend).toBe('down')
      
      const stableReport = analyzer.generateMarketReport('test', { priceChange24h: 0 })
      expect((stableReport as any).trend).toBe('stable')
    })
  })
})