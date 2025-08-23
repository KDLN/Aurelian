'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import GameButton from '@/components/ui/GameButton';
import GamePanel from '@/components/ui/GamePanel';
import { GameTable, GameTableHeader, GameTableBody, GameTableRow, GameTableCell } from '@/components/ui/GameTable';
import { useGameWorld } from '@/lib/game/world';
import { useUserDataQuery } from '@/hooks/useUserDataQuery';
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
  duration: number;
  feePercent: number;
  createdAt: Date;
};

const DURATION_OPTIONS = [
  { minutes: 6, label: '6 min', feePercent: 2 },
  { minutes: 12, label: '12 min', feePercent: 3 },
  { minutes: 24, label: '24 min', feePercent: 5 },
  { minutes: 36, label: '36 min', feePercent: 8 },
  { minutes: 60, label: '60 min', feePercent: 12 }
];

export default function AuctionPage() {
  const { world } = useGameWorld();
  const { wallet, inventory } = useUserDataQuery();
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(10);
  const [duration, setDuration] = useState(24); // Default 24 minutes
  const [listings, setListings] = useState<Listing[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [room, setRoom] = useState<Room | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Fetch listings from database API
  const fetchListings = async () => {
    try {
      const response = await fetch('/api/auction/listings');
      if (response.ok) {
        const data = await response.json();
        setListings(data.listings || []);
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    }
  };

  // Available items from user's warehouse inventory
  const availableItems = inventory?.inventory
    ?.filter(item => item.location === 'warehouse' && item.quantity > 0)
    ?.map(item => ({
      key: item.itemKey,
      name: item.itemName || item.itemKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      quantity: item.quantity
    })) || [];

  // Set client-only flag to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
    // Fetch initial listings from database
    fetchListings();
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
          // Note: Item addition to inventory is handled on the server side
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
          setDuration(24);
          setSelectedItem('');
          // Refresh listings to show the new one
          fetchListings();
        });

        auctionRoom.onMessage('purchase_success', (data: any) => {
          alert(data.message);
          // Refresh listings after purchase
          fetchListings();
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

    // Check inventory for available quantity
    const selectedInventoryItem = availableItems.find(item => item.name === selectedItem);
    if (!selectedInventoryItem || selectedInventoryItem.quantity < quantity) {
      alert('Not enough stock in warehouse');
      return;
    }

    // Get the actual item key from inventory
    const itemKey = selectedInventoryItem.key;

    // Send to WebSocket room
    room.send('create_listing', {
      itemKey,
      quantity,
      pricePerUnit: price,
      duration,
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
    const currentGold = wallet?.gold || 0;
    if (currentGold < totalCost) {
      alert(`Not enough gold! Need ${totalCost}g, have ${currentGold}g`);
      return;
    }

    // Note: Real gold deduction happens on the server side

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
      
      <GameButton href="/market" size="small" className="w-full text-center mb-3">
        📊 Market Dashboard
      </GameButton>
      
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
        {(wallet?.gold || 0).toLocaleString()}g
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
      sidebar={sidebar}
    >
      <div className="game-flex-col">
        <div className="game-card">
          <h3>List New Item</h3>
          <div className="game-grid-2" style={{ marginBottom: '12px' }}>
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
                  <option key={item.key} value={item.name}>
                    {item.name} ({item.quantity} available)
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
                max={selectedItem ? availableItems.find(item => item.name === selectedItem)?.quantity || 0 : 0}
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
          
          <div className="game-grid-2">
            <div>
              <label className="game-small">Duration</label>
              <select 
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                style={{ width: '100%' }}
                disabled={!isConnected}
              >
                {DURATION_OPTIONS.map(option => (
                  <option key={option.minutes} value={option.minutes}>
                    {option.label} ({option.feePercent}% fee)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="game-small">You'll Receive</label>
              <div className="game-pill game-pill-good" style={{ padding: '6px', textAlign: 'center', fontSize: '13px' }}>
                {(() => {
                  const totalValue = quantity * price;
                  const feePercent = DURATION_OPTIONS.find(d => d.minutes === duration)?.feePercent || 5;
                  const fee = Math.floor(totalValue * feePercent / 100);
                  const netAmount = totalValue - fee;
                  return `${netAmount.toLocaleString()}g (${fee}g fee)`;
                })()}
              </div>
            </div>
          </div>
          
          <div className="game-flex" style={{ marginTop: '12px' }}>
            <GameButton 
              variant="primary"
              onClick={handleList}
              disabled={!isConnected || !selectedItem || quantity <= 0 || price <= 0}
            >
              List for {duration} minutes
            </GameButton>
            
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
            <GameTable variant="auction">
              <GameTableHeader>
                <GameTableRow>
                  <GameTableCell header>Item</GameTableCell>
                  <GameTableCell header>Qty</GameTableCell>
                  <GameTableCell header>Price/Unit</GameTableCell>
                  <GameTableCell header>Total</GameTableCell>
                  <GameTableCell header>Seller</GameTableCell>
                  <GameTableCell header>Age</GameTableCell>
                  <GameTableCell header>Duration</GameTableCell>
                  <GameTableCell header>Action</GameTableCell>
                </GameTableRow>
              </GameTableHeader>
              <GameTableBody>
                {listings.map(listing => {
                  const marketPrice = getMarketPrice(listing.item);
                  const priceStatus = getPriceStatus(listing.price, marketPrice);
                  const ageStatus = listing.age > 30 ? 'bad' : listing.age > 20 ? 'warn' : 'good';
                  const isOwn = user && listing.sellerId === user.id;
                  
                  return (
                    <GameTableRow key={listing.id}>
                      <GameTableCell>{listing.item}</GameTableCell>
                      <GameTableCell>{listing.qty}</GameTableCell>
                      <GameTableCell>{listing.price}g</GameTableCell>
                      <GameTableCell>{(listing.qty * listing.price).toLocaleString()}g</GameTableCell>
                      <GameTableCell className={isOwn ? 'game-good' : ''}>
                        {isOwn ? (
                          listing.seller
                        ) : (
                          <a 
                            href={`/profile/${listing.sellerId}`}
                            className="seller-link"
                          >
                            {listing.seller}
                          </a>
                        )}
                      </GameTableCell>
                      <GameTableCell className={`game-${ageStatus}`}>{listing.age}min</GameTableCell>
                      <GameTableCell className="game-small">{listing.duration}min</GameTableCell>
                      <GameTableCell>
                        {isOwn ? (
                          <GameButton 
                            size="small"
                            onClick={() => handleCancel(listing.id)}
                          >
                            Cancel
                          </GameButton>
                        ) : (
                          <GameButton 
                            variant="primary"
                            size="small"
                            onClick={() => handleBuy(listing)}
                            disabled={(wallet?.gold || 0) < listing.qty * listing.price}
                          >
                            Buy
                          </GameButton>
                        )}
                      </GameTableCell>
                    </GameTableRow>
                  );
                })}
              </GameTableBody>
            </GameTable>
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

      <style jsx>{`
        .seller-link {
          color: #f1e5c8;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.2s ease;
        }

        .seller-link:hover {
          color: #a36a43;
          border-bottom-color: #a36a43;
        }
      `}</style>
    </GameLayout>
  );
}