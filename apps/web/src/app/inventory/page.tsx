'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { useGameWorld } from '@/lib/game/world';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';

interface InventoryItem {
  id: string;
  itemId: string;
  itemKey: string;
  itemName: string;
  rarity: string;
  quantity: number;
  location: string;
}

interface LocationInventory {
  inventory: InventoryItem[];
  location: string;
  totalItems: number;
}

export default function InventoryPage() {
  const { world } = useGameWorld();
  const { user, authLoaded } = useUserData();
  const [inventoryData, setInventoryData] = useState<Record<string, LocationInventory>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<'all' | 'warehouse' | 'caravan' | 'escrow'>('all');
  const [selectedItem, setSelectedItem] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [transferFrom, setTransferFrom] = useState<'warehouse' | 'caravan' | 'escrow'>('warehouse');
  const [transferTo, setTransferTo] = useState<'warehouse' | 'caravan' | 'escrow'>('caravan');

  const locations = ['warehouse', 'caravan', 'escrow'];

  useEffect(() => {
    if (authLoaded && user) {
      fetchAllInventories();
    }
  }, [user, authLoaded]);

  const fetchAllInventories = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) {
        throw new Error('No access token available');
      }

      // Fetch inventory for all locations in parallel
      const inventoryPromises = locations.map(async (location) => {
        const response = await fetch(`/api/user/inventory?location=${location}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to fetch ${location} inventory: ${errorData.error}`);
        }

        return response.json();
      });

      const inventoryResults = await Promise.all(inventoryPromises);
      
      const inventoryByLocation: Record<string, LocationInventory> = {};
      inventoryResults.forEach((data, index) => {
        inventoryByLocation[locations[index]] = data;
      });

      setInventoryData(inventoryByLocation);
      
    } catch (err) {
      console.error('Failed to fetch inventory data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const getAllItems = () => {
    const allItems: InventoryItem[] = [];
    Object.values(inventoryData).forEach(locationData => {
      allItems.push(...locationData.inventory);
    });
    return allItems;
  };

  const getLocationItems = (location: string) => {
    return inventoryData[location]?.inventory || [];
  };

  const getDisplayItems = () => {
    if (selectedLocation === 'all') {
      return getAllItems();
    }
    return getLocationItems(selectedLocation);
  };

  const getTotalValue = (items: InventoryItem[]) => {
    return items.reduce((sum, item) => sum + (item.quantity * world.priceOf(item.itemName)), 0);
  };

  const getTotalItems = (items: InventoryItem[]) => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleTransfer = async () => {
    if (!selectedItem || !user) {
      alert('Please select an item to transfer');
      return;
    }

    if (transferQty <= 0) {
      alert('Transfer quantity must be greater than 0');
      return;
    }

    if (transferFrom === transferTo) {
      alert('Cannot transfer to the same location');
      return;
    }

    const fromItems = getLocationItems(transferFrom);
    const itemToTransfer = fromItems.find(item => item.itemName === selectedItem);
    
    if (!itemToTransfer || itemToTransfer.quantity < transferQty) {
      alert('Not enough items in source location');
      return;
    }

    // For now, just simulate the transfer with an alert
    // In a real implementation, this would call an API to update the database
    alert(`Would transfer ${transferQty} ${selectedItem} from ${transferFrom} to ${transferTo}`);
    
    // Reset form
    setTransferQty(1);
    setSelectedItem('');
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common': return '#9ca3af';
      case 'uncommon': return '#10b981';
      case 'rare': return '#3b82f6';
      case 'epic': return '#8b5cf6';
      case 'legendary': return '#f59e0b';
      default: return '#9ca3af';
    }
  };

  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'warehouse': return '🏭';
      case 'caravan': return '🐎';
      case 'escrow': return '🔒';
      default: return '📦';
    }
  };

  const displayItems = getDisplayItems();
  const totalValue = getTotalValue(displayItems);
  const totalItems = getTotalItems(displayItems);

  const sidebar = (
    <div>
      <h3>Inventory Guide</h3>
      <p className="game-muted game-small">
        View and manage all your items across different locations. Transfer items between 
        warehouse, caravan, and escrow as needed.
      </p>
      
      <h3>Storage Locations</h3>
      <div className="game-flex-col">
        <div className="game-space-between">
          <span className="game-small">🏭 Warehouse:</span>
          <span className="game-good game-small">Safe storage</span>
        </div>
        <div className="game-space-between">
          <span className="game-small">🐎 Caravan:</span>
          <span className="game-warn game-small">For missions</span>
        </div>
        <div className="game-space-between">
          <span className="game-small">🔒 Escrow:</span>
          <span className="game-good game-small">For trading</span>
        </div>
      </div>

      <h3>Location Summary</h3>
      <div className="game-flex-col">
        {locations.map(location => {
          const locationData = inventoryData[location];
          const items = locationData?.totalItems || 0;
          const value = getTotalValue(locationData?.inventory || []);
          
          return (
            <div key={location} className="game-space-between">
              <span className="game-small">
                {getLocationIcon(location)} {location}:
              </span>
              <span className="game-small">
                {items} items ({value.toLocaleString()}g)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <GameLayout 
      title="Item Inventory" 
      characterActivity="idle" 
      characterLocation="Storage"
      sidebar={sidebar}
    >
      {!authLoaded ? (
        <div className="game-card">
          <p>Loading authentication...</p>
        </div>
      ) : !user ? (
        <div className="game-card">
          <p className="game-warn">Please log in to view your inventory</p>
        </div>
      ) : (
        <div className="game-flex-col">
          <div className="game-card">
            <h3>Inventory Overview</h3>
            <div className="game-grid-2">
              <div>
                <label className="game-small">View Location</label>
                <select 
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value as any)}
                  style={{ width: '100%' }}
                >
                  <option value="all">All Locations</option>
                  <option value="warehouse">🏭 Warehouse</option>
                  <option value="caravan">🐎 Caravan</option>
                  <option value="escrow">🔒 Escrow</option>
                </select>
              </div>
              <div className="game-grid-3">
                <div className="game-space-between">
                  <span>Total Items:</span>
                  <span className="game-good">{totalItems.toLocaleString()}</span>
                </div>
                <div className="game-space-between">
                  <span>Total Value:</span>
                  <span className="game-good">{totalValue.toLocaleString()}g</span>
                </div>
                <button 
                  onClick={fetchAllInventories}
                  disabled={isLoading}
                  className="game-btn game-btn-small"
                >
                  {isLoading ? '🔄' : '🔄 Refresh'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="game-card">
              <p className="game-bad">Error: {error}</p>
            </div>
          )}

          <div className="game-card">
            <h3>Item Transfer</h3>
            <div className="game-grid-4">
              <div>
                <label className="game-small">Item</label>
                <select 
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Select item...</option>
                  {getAllItems()
                    .filter(item => item.quantity > 0)
                    .map((item) => (
                      <option key={`${item.location}-${item.itemKey}`} value={item.itemName}>
                        {item.itemName} ({item.quantity} in {item.location})
                      </option>
                    ))}
                </select>
              </div>
              
              <div>
                <label className="game-small">From</label>
                <select 
                  value={transferFrom}
                  onChange={(e) => setTransferFrom(e.target.value as any)}
                  style={{ width: '100%' }}
                >
                  <option value="warehouse">🏭 Warehouse</option>
                  <option value="caravan">🐎 Caravan</option>
                  <option value="escrow">🔒 Escrow</option>
                </select>
              </div>
              
              <div>
                <label className="game-small">To</label>
                <select 
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value as any)}
                  style={{ width: '100%' }}
                >
                  <option value="warehouse">🏭 Warehouse</option>
                  <option value="caravan">🐎 Caravan</option>
                  <option value="escrow">🔒 Escrow</option>
                </select>
              </div>
              
              <div>
                <label className="game-small">Quantity</label>
                <input
                  type="number"
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  min="1"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            
            <button 
              className="game-btn game-btn-primary"
              onClick={handleTransfer}
              disabled={!selectedItem || transferQty <= 0 || transferFrom === transferTo}
              style={{ marginTop: '12px' }}
            >
              Transfer {transferQty} {selectedItem} from {transferFrom} to {transferTo}
            </button>
          </div>

          <div className="game-card">
            <h3>
              {selectedLocation === 'all' ? 'All Items' : `${getLocationIcon(selectedLocation)} ${selectedLocation} Items`}
              {isLoading && <span className="game-muted"> (Loading...)</span>}
            </h3>
            {displayItems.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Location</th>
                    <th>Quantity</th>
                    <th>Rarity</th>
                    <th>Unit Value</th>
                    <th>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems
                    .filter(item => item.quantity > 0)
                    .sort((a, b) => a.itemName.localeCompare(b.itemName))
                    .map((item) => {
                      const unitPrice = world.priceOf(item.itemName);
                      const totalValue = item.quantity * unitPrice;
                      
                      return (
                        <tr key={`${item.location}-${item.itemKey}`}>
                          <td>{item.itemName}</td>
                          <td>
                            <span className="game-pill game-pill-small">
                              {getLocationIcon(item.location)} {item.location}
                            </span>
                          </td>
                          <td>{item.quantity.toLocaleString()}</td>
                          <td>
                            <span 
                              className={`game-${item.rarity.toLowerCase()}`}
                              style={{ color: getRarityColor(item.rarity) }}
                            >
                              {item.rarity}
                            </span>
                          </td>
                          <td>{unitPrice.toLocaleString()}g</td>
                          <td className="game-good">{totalValue.toLocaleString()}g</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            ) : (
              <p className="game-muted">
                {selectedLocation === 'all' 
                  ? 'No items found in any location' 
                  : `No items in ${selectedLocation}`}
              </p>
            )}
          </div>

          <div className="game-card">
            <h3>Quick Actions</h3>
            <div className="game-grid-3">
              <a href="/warehouse" className="game-btn">Manage Warehouse</a>
              <a href="/missions" className="game-btn">Send Mission</a>
              <a href="/auction" className="game-btn">List Items</a>
            </div>
          </div>
        </div>
      )}
    </GameLayout>
  );
}