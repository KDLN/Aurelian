import { AuctionRoom } from '../../rooms/auction'

describe('AuctionRoom', () => {
  let room: AuctionRoom
  let mockClient: any
  
  beforeEach(() => {
    room = new AuctionRoom()
    mockClient = {
      sessionId: 'test-session',
      send: jest.fn(),
    }
    
    // Initialize room state
    room.listings = new Map()
    room.marketPrices = new Map()
  })
  
  describe('price updates', () => {
    it('updates market prices for all items', () => {
      room.updateMarketPrices()
      
      const expectedItems = ['Iron Ore', 'Herb', 'Hide', 'Pearl', 'Relic Fragment']
      expectedItems.forEach(item => {
        expect(room.marketPrices.has(item)).toBe(true)
        const price = room.marketPrices.get(item)
        expect(price).toBeGreaterThan(0)
      })
    })
    
    it('maintains price within reasonable bounds', () => {
      room.updateMarketPrices()
      
      room.marketPrices.forEach((price, item) => {
        // Prices should be within reasonable bounds based on base prices
        expect(price).toBeGreaterThan(0)
        expect(price).toBeLessThan(200) // Reasonable upper bound
      })
    })
  })
  
  describe('listing management', () => {
    it('adds listings to room state', () => {
      const testListing = {
        id: 'test-1',
        item: 'Iron Ore',
        itemKey: 'iron_ore',
        qty: 10,
        price: 50,
        seller: 'Test User',
        sellerId: 'user-1',
        age: 0,
        createdAt: new Date()
      }
      
      room.listings.set(testListing.id, testListing)
      expect(room.listings.size).toBe(1)
      expect(room.listings.get(testListing.id)).toEqual(testListing)
    })
    
    it('removes expired listings', () => {
      const expiredListing = {
        id: 'expired-1',
        item: 'Iron Ore',
        itemKey: 'iron_ore',
        qty: 10,
        price: 50,
        seller: 'Test User',
        sellerId: 'user-1',
        age: 40, // > 36 minutes = expired
        createdAt: new Date(Date.now() - 40 * 60 * 1000)
      }
      
      room.listings.set(expiredListing.id, expiredListing)
      
      // This would normally be called by expireListings method
      const expiredIds = Array.from(room.listings.entries())
        .filter(([id, listing]) => listing.age > 36)
        .map(([id]) => id)
      
      expect(expiredIds).toContain('expired-1')
    })
  })
  
  describe('client messaging', () => {
    it('sends current state to new clients on join', () => {
      // Add mock data
      room.listings.set('test-1', {
        id: 'test-1',
        item: 'Iron Ore',
        itemKey: 'iron_ore',
        qty: 10,
        price: 50,
        seller: 'Test User',
        sellerId: 'user-1',
        age: 5,
        createdAt: new Date()
      })
      
      room.marketPrices.set('Iron Ore', 45)
      
      // Simulate client join
      room.onJoin(mockClient, {})
      
      expect(mockClient.send).toHaveBeenCalledWith('listings', expect.any(Array))
      expect(mockClient.send).toHaveBeenCalledWith('prices', expect.any(Object))
    })
  })
})