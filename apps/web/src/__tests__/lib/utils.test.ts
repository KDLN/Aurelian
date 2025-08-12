// Example utility functions tests
describe('Market Utils', () => {
  describe('price calculations', () => {
    it('calculates percentage change correctly', () => {
      const calculatePercentageChange = (oldPrice: number, newPrice: number): number => {
        if (oldPrice === 0) return 0
        return ((newPrice - oldPrice) / oldPrice) * 100
      }
      
      expect(calculatePercentageChange(100, 110)).toBe(10)
      expect(calculatePercentageChange(100, 90)).toBe(-10)
      expect(calculatePercentageChange(0, 50)).toBe(0)
    })
    
    it('formats currency correctly', () => {
      const formatGold = (amount: number): string => {
        return `${amount.toLocaleString()}g`
      }
      
      expect(formatGold(1000)).toBe('1,000g')
      expect(formatGold(1500)).toBe('1,500g')
      expect(formatGold(10)).toBe('10g')
    })
  })
  
  describe('supply and demand calculations', () => {
    it('calculates market pressure correctly', () => {
      const calculateMarketPressure = (supply: number, demand: number): 'high' | 'medium' | 'low' => {
        const ratio = supply / demand
        if (ratio > 1.5) return 'low'  // oversupply = low price pressure
        if (ratio < 0.5) return 'high' // high demand = high price pressure
        return 'medium'
      }
      
      expect(calculateMarketPressure(100, 50)).toBe('low')   // 2.0 > 1.5 = oversupply
      expect(calculateMarketPressure(25, 100)).toBe('high') // 0.25 < 0.5 = high demand  
      expect(calculateMarketPressure(75, 75)).toBe('medium') // 1.0 = balanced
    })
  })
})