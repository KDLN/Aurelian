'use client';

import { useState } from 'react';
import GameLayout from '@/components/GameLayout';
import { useGameWorld } from '@/lib/game/world';

export default function AuctionPage() {
  const { world } = useGameWorld();
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(10);

  const availableItems = Object.entries(world.warehouse)
    .filter(([, qty]) => qty > 0)
    .map(([item]) => item);

  const handleList = () => {
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

    if (!world.list(selectedItem, quantity, price)) {
      alert('Not enough stock in warehouse');
      return;
    }

    // Reset form
    setQuantity(1);
    setPrice(10);
  };

  const getMarketPrice = (item: string) => world.priceOf(item);
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
        Items priced within 5% of market value have a 35% chance to sell each tick.
        Higher prices have only 5% chance. Items expire after 36 minutes.
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
    </div>
  );

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
              />
            </div>
          </div>
          
          <div className="game-flex" style={{ marginTop: '12px' }}>
            <button 
              className="game-btn game-btn-primary"
              onClick={handleList}
              disabled={!selectedItem || quantity <= 0 || price <= 0}
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
          <h3>Active Listings ({world.listings.length})</h3>
          {world.listings.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price/Unit</th>
                  <th>Total</th>
                  <th>Age</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {world.listings.map(listing => {
                  const marketPrice = getMarketPrice(listing.item);
                  const priceStatus = getPriceStatus(listing.price, marketPrice);
                  const ageStatus = listing.age > 30 ? 'bad' : listing.age > 20 ? 'warn' : 'good';
                  
                  return (
                    <tr key={listing.id}>
                      <td>{listing.item}</td>
                      <td>{listing.qty}</td>
                      <td>{listing.price}g</td>
                      <td>{(listing.qty * listing.price).toLocaleString()}g</td>
                      <td className={`game-${ageStatus}`}>{listing.age}min</td>
                      <td>
                        <span className={`game-status game-status-${
                          priceStatus === 'good' ? 'success' : 
                          priceStatus === 'warn' ? 'warning' : 'danger'
                        }`}>
                          {priceStatus === 'good' ? 'Competitive' :
                           priceStatus === 'warn' ? 'High' : 'Overpriced'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="game-muted">No active listings</p>
          )}
        </div>

        <div className="game-card">
          <h3>Statistics</h3>
          <div className="game-grid-2">
            <div className="game-space-between">
              <span>Total Listed Value:</span>
              <span className="game-good">
                {world.listings.reduce((sum, l) => sum + (l.qty * l.price), 0).toLocaleString()}g
              </span>
            </div>
            <div className="game-space-between">
              <span>Average Age:</span>
              <span>
                {world.listings.length > 0 
                  ? Math.round(world.listings.reduce((sum, l) => sum + l.age, 0) / world.listings.length)
                  : 0
                }min
              </span>
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}