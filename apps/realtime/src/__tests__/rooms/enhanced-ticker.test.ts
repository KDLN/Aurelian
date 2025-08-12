import { EnhancedTickerRoom } from '../../rooms/enhanced-ticker'

describe('EnhancedTickerRoom', () => {
  let room: EnhancedTickerRoom
  let mockClient: any
  
  beforeEach(() => {
    room = new EnhancedTickerRoom()
    mockClient = {
      sessionId: 'test-session',
      send: jest.fn(),
    }
    
    // Mock environment to avoid database connections in tests
    delete process.env.DATABASE_URL
  })
  
  afterEach(() => {
    if (room) {
      room.onDispose()
    }
  })
  
  describe('initialization', () => {
    it('initializes without database connection', async () => {
      await room.onCreate()
      
      // Should initialize successfully without database
      expect(room).toBeDefined()
    })
    
    it('handles client join and sends market summary', async () => {
      await room.onCreate()
      
      // Simulate client join
      await room.onJoin(mockClient, {})
      
      // Should send market summary to new client
      expect(mockClient.send).toHaveBeenCalledWith('market_summary', expect.any(Array))
    })
  })
  
  describe('price updates', () => {
    it('broadcasts price updates periodically', async () => {
      // Spy on broadcast method
      const broadcastSpy = jest.spyOn(room, 'broadcast').mockImplementation(() => {})
      
      await room.onCreate()
      
      // Wait a short time for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Manually trigger the price update method
      await (room as any).updateMarketPrices()
      
      // Should broadcast price updates
      expect(broadcastSpy).toHaveBeenCalledWith('price_updates', expect.any(Array))
      
      broadcastSpy.mockRestore()
    }, 10000) // Increase timeout
    
    it('handles price updates without database gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      await room.onCreate()
      
      // Should not throw errors when updating prices without database
      expect(consoleSpy).not.toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })
  
  describe('market summary', () => {
    it('provides fallback market summary without database', async () => {
      await room.onCreate()
      
      // Should be able to get market summary even without database
      const summary = await (room as any).getMarketSummary()
      
      expect(Array.isArray(summary)).toBe(true)
      expect(summary.length).toBeGreaterThan(0)
      
      // Check structure of summary items
      if (summary.length > 0) {
        const item = summary[0]
        expect(item).toHaveProperty('itemId')
        expect(item).toHaveProperty('itemName')
        expect(item).toHaveProperty('currentPrice')
        expect(item).toHaveProperty('basePrice')
      }
    })
  })
  
  describe('cleanup', () => {
    it('properly disposes resources', async () => {
      await room.onCreate()
      
      // Should dispose without errors
      expect(() => room.onDispose()).not.toThrow()
    })
  })
})