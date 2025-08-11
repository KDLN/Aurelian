'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { useGameWorld } from '@/lib/game/world';
import { getRTClient } from '@/lib/rtClient';
import { supabase } from '@/lib/supabaseClient';
import type { Room } from 'colyseus.js';

// Prevent hydration mismatch by ensuring client-only rendering of dynamic content

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

export default function AuctionPage() {
  const { world } = useGameWorld();
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(10);
  const [listings, setListings] = useState<Listing[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [room, setRoom] = useState<Room | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Available items from local warehouse
  const availableItems = Object.entries(world.warehouse)
    .filter(([, qty]) => qty > 0)
    .map(([item]) => item);

  // Set client-only flag to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Connect to WebSocket room
  useEffect(() => {
    if (!isClient) return;
    
    let auctionRoom: Room | null = null;

    const connect = async () => {
      try {
        // Get user session
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUser(authUser);
        }

        // Connect to auction room
        const client = getRTClient();
        auctionRoom = await client.joinOrCreate('auction', { 
          userId: authUser?.id 
        });
        
        setRoom(auctionRoom);
        setIsConnected(true);

        // Handle room messages
        auctionRoom.onMessage('listings', (data: Listing[]) => {
          setListings(data);
        });

        auctionRoom.onMessage('prices', (data: Record<string, number>) => {
          setMarketPrices(data);
        });

        auctionRoom.onMessage('new_listing', (listing: Listing) => {
          setListings(prev => [listing, ...prev]);
        });

        auctionRoom.onMessage('listing_sold', (data: any) => {
          setListings(prev => prev.filter(l => l.id !== data.listingId));
          if (data.buyerId === authUser?.id) {
            world.add(data.item, data.qty);
          }
        });

        auctionRoom.onMessage('listing_cancelled', (data: any) => {
          setListings(prev => prev.filter(l => l.id !== data.listingId));
        });

        auctionRoom.onMessage('listing_expired', (data: any) => {
          setListings(prev => prev.filter(l => l.id !== data.listingId));
        });

        auctionRoom.onMessage('error', (data: any) => {
          alert(data.message);
        });

        auctionRoom.onMessage('listing_created', (listing: Listing) => {
          // Reset form on successful creation
          setQuantity(1);
          setPrice(10);
          setSelectedItem('');
        });

        auctionRoom.onMessage('purchase_success', (data: any) => {
          alert(data.message);
        });

      } catch (error) {
        console.error('Failed to connect to auction room:', error);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (auctionRoom) {
        auctionRoom.leave();
      }
    };
  }, [isClient]);

  const handleList = async () => {
    if (!room || !user) {
      alert('Not connected to server');
      return;
    }

    if (!selectedItem) {
      alert('Please select an item to list');
      return;
    }
    
    if (quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    if (price <= 0) {
      alert('Price must be greater than 0');
      return;
    }

    // Check local warehouse first
    if (!world.take(selectedItem, quantity)) {
      alert('Not enough stock in warehouse');
      return;
    }

    // Convert display name to item key
    const itemKey = selectedItem.toLowerCase().replace(/ /g, '_');

    // Send to WebSocket room
    room.send('create_listing', {
      itemKey,
      quantity,
      pricePerUnit: price,
      userId: user.id
    });
  };

  const handleBuy = async (listing: Listing) => {
    if (!room || !user) {
      alert('Not connected to server');
      return;
    }

    if (listing.sellerId === user.id) {
      alert('Cannot buy your own listing');
      return;
    }

    const totalCost = listing.qty * listing.price;
    if (world.gold < totalCost) {
      alert(`Not enough gold! Need ${totalCost}g, have ${world.gold}g`);
      return;
    }

    // Optimistically update local state
    world.gold -= totalCost;

    room.send('buy_listing', {
      listingId: listing.id,
      userId: user.id
    });
  };

  const handleCancel = async (listingId: string) => {
    if (!room || !user) {
      alert('Not connected to server');
      return;
    }

    room.send('cancel_listing', {
      listingId,
      userId: user.id
    });
  };



  const getMarketPrice = (item: string) => marketPrices[item] || world.priceOf(item);
  
  const getPriceStatus = (listingPrice: number, marketPrice: number) => {
    const ratio = listingPrice / marketPrice;
    if (ratio <= 1.05) return 'good';
    if (ratio <= 1.2) return 'warn';
    return 'bad';
  };

  const sidebar = (
    <div>
      <h3>Market Guide</h3>
      <p className="game-muted game-small">
        Real-time auction house. All players see the same listings.
        {isConnected ? ' ✅ Connected' : ' ⚠️ Connecting...'}
      </p>
      
      <h3>Current Prices</h3>
      <div className="game-flex-col">
        {Object.keys(world.commodities).map(item => (
          <div key={item} className="game-space-between">
            <span className="game-small">{item}</span>
            <span className="game-pill-good game-small">{getMarketPrice(item)}g</span>
          </div>
        ))}
      </div>

      <h3>Your Gold</h3>
      <div className="game-pill game-pill-good" style={{ fontSize: '18px', textAlign: 'center' }}>
        {world.gold.toLocaleString()}g
      </div>

    </div>
  );

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return (
      <GameLayout title="Auction House" sidebar={<div>Loading...</div>}>
        <div>Loading auction house...</div>
      </GameLayout>
    );
  }

  return (
    <GameLayout 
      title="Auction House" 
      characterActivity="trading" 
      characterLocation="Auction House"
      sidebar={sidebar}
    >
      <div className="game-flex-col">
        <div className="game-card">
          <h3>List New Item</h3>
          <div className="game-grid-3">
            <div>
              <label className="game-small">Item</label>
              <select 
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                style={{ width: '100%' }}
                disabled={!isConnected}
              >
                <option value="">Select item...</option>
                {availableItems.map(item => (
                  <option key={item} value={item}>
                    {item} ({world.warehouse[item]} available)
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="game-small">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min="1"
                max={selectedItem ? world.warehouse[selectedItem] || 0 : 0}
                style={{ width: '100%' }}
                disabled={!isConnected}
              />
            </div>
            
            <div>
              <label className="game-small">Price (per unit)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                min="1"
                style={{ width: '100%' }}
                disabled={!isConnected}
              />
            </div>
          </div>
          
          <div className="game-flex" style={{ marginTop: '12px' }}>
            <button 
              className="game-btn game-btn-primary"
              onClick={handleList}
              disabled={!isConnected || !selectedItem || quantity <= 0 || price <= 0}
            >
              List for {(quantity * price).toLocaleString()}g total
            </button>
            
            {selectedItem && (
              <div className="game-small game-muted">
                Market price: {getMarketPrice(selectedItem)}g each
                {price !== getMarketPrice(selectedItem) && (
                  <span className={`game-${getPriceStatus(price, getMarketPrice(selectedItem))}`}>
                    {price > getMarketPrice(selectedItem) * 1.05 ? ' (overpriced)' : ' (good price)'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="game-card">
          <h3>Active Listings ({listings.length}) - Live</h3>
          {listings.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price/Unit</th>
                  <th>Total</th>
                  <th>Seller</th>
                  <th>Age</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {listings.map(listing => {
                  const marketPrice = getMarketPrice(listing.item);
                  const priceStatus = getPriceStatus(listing.price, marketPrice);
                  const ageStatus = listing.age > 30 ? 'bad' : listing.age > 20 ? 'warn' : 'good';
                  const isOwn = user && listing.sellerId === user.id;
                  
                  return (
                    <tr key={listing.id}>
                      <td>{listing.item}</td>
                      <td>{listing.qty}</td>
                      <td>{listing.price}g</td>
                      <td>{(listing.qty * listing.price).toLocaleString()}g</td>
                      <td className={isOwn ? 'game-good' : ''}>{listing.seller}</td>
                      <td className={`game-${ageStatus}`}>{listing.age}min</td>
                      <td>
                        {isOwn ? (
                          <button 
                            className="game-btn game-btn-small"
                            onClick={() => handleCancel(listing.id)}
                          >
                            Cancel
                          </button>
                        ) : (
                          <button 
                            className="game-btn game-btn-small game-btn-primary"
                            onClick={() => handleBuy(listing)}
                            disabled={world.gold < listing.qty * listing.price}
                          >
                            Buy
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="game-muted">
              {isConnected ? 'No active listings' : 'Connecting to auction house...'}
            </p>
          )}
        </div>

        <div className="game-card">
          <h3>Statistics</h3>
          <div className="game-grid-2">
            <div className="game-space-between">
              <span>Total Listed Value:</span>
              <span className="game-good">
                {listings.reduce((sum, l) => sum + (l.qty * l.price), 0).toLocaleString()}g
              </span>
            </div>
            <div className="game-space-between">
              <span>Your Listings:</span>
              <span>
                {user ? listings.filter(l => l.sellerId === user.id).length : 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}