'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import GameButton from '@/components/ui/GameButton';
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

export default function StoragePage() {
  const { world } = useGameWorld();
  const { user, authLoaded, inventory } = useUserData();
  const [inventoryData, setInventoryData] = useState<Record<string, LocationInventory>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<'all' | 'warehouse' | 'caravan'>('all');
  const [selectedItem, setSelectedItem] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [transferFrom, setTransferFrom] = useState<'warehouse' | 'caravan'>('warehouse');
  const [transferTo, setTransferTo] = useState<'warehouse' | 'caravan'>('caravan');

  // Auto-set transfer from location when view changes
  const handleLocationChange = (newLocation: 'all' | 'warehouse' | 'caravan') => {
    setSelectedLocation(newLocation);
    // If a specific location is selected, set it as the transfer from location
    if (newLocation !== 'all') {
      setTransferFrom(newLocation as 'warehouse' | 'caravan');
      // Auto-set transfer to location to something different
      if (newLocation === 'warehouse') setTransferTo('caravan');
      else if (newLocation === 'caravan') setTransferTo('warehouse');
    }
  };

  const locations = ['warehouse', 'caravan'];

  useEffect(() => {
    if (authLoaded && user) {
      fetchAllInventories();
    }
  }, [authLoaded, user]);

  const fetchAllInventories = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) {
        setError('Authentication failed');
        return;
      }

      const response = await fetch('/api/user/inventory', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Group inventory by location
        const groupedInventory: Record<string, LocationInventory> = {};
        
        locations.forEach(location => {
          const locationItems = data.inventory?.filter((item: InventoryItem) => item.location === location) || [];
          groupedInventory[location] = {
            inventory: locationItems,
            location,
            totalItems: locationItems.reduce((sum: number, item: InventoryItem) => sum + item.quantity, 0)
          };
        });
        
        setInventoryData(groupedInventory);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch inventory');
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to load inventory data');
    } finally {
      setIsLoading(false);
    }
  };

  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'warehouse': return '🏭';
      case 'caravan': return '🐎';
      default: return '📦';
    }
  };

  const getLocationColor = (location: string) => {
    switch (location) {
      case 'warehouse': return '#7bc081';
      case 'caravan': return '#b7b34d';
      default: return '#9ca3af';
    }
  };

  const getDisplayItems = () => {
    if (selectedLocation === 'all') {
      // Combine all locations
      return Object.values(inventoryData).flatMap(locationData => locationData.inventory);
    } else {
      return inventoryData[selectedLocation]?.inventory || [];
    }
  };

  const getTotalValue = (items: InventoryItem[]) => {
    return items.reduce((sum, item) => sum + (item.quantity * world.priceOf(item.itemName)), 0);
  };

  const getTotalItems = (items: InventoryItem[]) => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleTransfer = () => {
    if (!selectedItem) {
      alert('Please select an item to transfer');
      return;
    }

    if (transferQty <= 0) {
      alert('Transfer quantity must be greater than 0');
      return;
    }

    // For now, just simulate the transfer with an alert
    alert(`Transferred ${transferQty} ${selectedItem} from ${transferFrom} to ${transferTo}`);
    
    // Reset form
    setTransferQty(1);
    setSelectedItem('');
  };

  const displayItems = getDisplayItems();
  const totalValue = getTotalValue(displayItems);
  const totalItems = getTotalItems(displayItems);
  const warehouseTotal = inventoryData.warehouse?.totalItems || 0;
  const caravanTotal = inventoryData.caravan?.totalItems || 0;

  const sidebar = (
    <div>
      <h3>Storage Guide</h3>
      <p className="game-muted game-small">
        Manage all your items across different storage locations. Transfer items between 
        warehouse and caravan as needed.
      </p>
      
      <h3>Storage Locations</h3>
      <div className="game-flex-col">
        <div className="game-space-between">
          <span className="game-small">🏭 Warehouse:</span>
          <span className="game-good game-small">Main storage</span>
        </div>
        <div className="game-space-between">
          <span className="game-small">🐎 Caravan:</span>
          <span className="game-warn game-small">For missions</span>
        </div>
      </div>

      <h3>Storage Limits</h3>
      <div className="game-flex-col">
        <div className="game-space-between">
          <span className="game-small">Warehouse:</span>
          <span className="game-good game-small">1000 items</span>
        </div>
        <div className="game-space-between">
          <span className="game-small">Caravan:</span>
          <span className="game-warn game-small">100 items</span>
        </div>
      </div>

      <h3>Current Usage</h3>
      <div className="game-progress">
        <div 
          className="game-progress-fill" 
          style={{ 
            width: `${(warehouseTotal / 1000) * 100}%`,
            background: warehouseTotal > 800 ? '#d73a49' : '#b7b34d'
          }}
        >
          {warehouseTotal}/1000
        </div>
      </div>
    </div>
  );

  if (!authLoaded) {
    return (
      <GameLayout title="Storage" sidebar={sidebar}>
        <div className="game-card">
          <p>Loading authentication...</p>
        </div>
      </GameLayout>
    );
  }

  if (!user) {
    return (
      <GameLayout title="Storage" sidebar={sidebar}>
        <div className="game-card">
          <p className="game-warn">Please log in to view your storage</p>
        </div>
      </GameLayout>
    );
  }

  if (isLoading) {
    return (
      <GameLayout title="Storage" sidebar={sidebar}>
        <div className="game-card">
          <p>Loading storage data...</p>
        </div>
      </GameLayout>
    );
  }

  if (error) {
    return (
      <GameLayout title="Storage" sidebar={sidebar}>
        <div className="game-card">
          <p className="game-bad">Error loading storage: {error}</p>
          <GameButton onClick={fetchAllInventories} style={{ marginTop: '12px' }}>
            Retry
          </GameButton>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Storage Management" sidebar={sidebar}>
      <div className="game-flex-col">
        {/* Location Tabs */}
        <div className="game-card">
          <h3>View Location</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <GameButton
              variant={selectedLocation === 'all' ? 'primary' : 'default'}
              onClick={() => handleLocationChange('all')}
              size="small"
            >
              📦 All Items
            </GameButton>
            <GameButton
              variant={selectedLocation === 'warehouse' ? 'primary' : 'default'}
              onClick={() => handleLocationChange('warehouse')}
              size="small"
            >
              🏭 Warehouse ({warehouseTotal})
            </GameButton>
            <GameButton
              variant={selectedLocation === 'caravan' ? 'primary' : 'default'}
              onClick={() => handleLocationChange('caravan')}
              size="small"
            >
              🐎 Caravan ({caravanTotal})
            </GameButton>
          </div>

          {/* Summary Stats */}
          <div className="game-grid-3">
            <div className="game-space-between">
              <span>Total Items:</span>
              <span className="game-good">{totalItems.toLocaleString()}</span>
            </div>
            <div className="game-space-between">
              <span>Total Value:</span>
              <span className="game-good">{totalValue.toLocaleString()}g</span>
            </div>
            <div className="game-space-between">
              <span>Viewing:</span>
              <span className="game-pill">
                {selectedLocation === 'all' ? 'All Locations' : 
                 selectedLocation === 'warehouse' ? 'Warehouse' : 'Caravan'}
              </span>
            </div>
          </div>
        </div>

        {/* Transfer Section */}
        <div className="game-card">
          <h3>Transfer Items</h3>
          <div className="game-grid-3">
            <div>
              <label className="game-small">Item</label>
              <select 
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">Select item...</option>
                {displayItems.filter(item => item.quantity > 0).map((item) => (
                  <option key={item.id} value={item.itemName}>
                    {item.itemName} ({item.quantity} in {item.location})
                  </option>
                ))}
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
            
            <div>
              <label className="game-small">From → To</label>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <select 
                  value={transferFrom}
                  onChange={(e) => setTransferFrom(e.target.value as 'warehouse' | 'caravan')}
                  style={{ flex: 1 }}
                >
                  <option value="warehouse">🏭 Warehouse</option>
                  <option value="caravan">🐎 Caravan</option>
                </select>
                <span>→</span>
                <select 
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value as 'warehouse' | 'caravan')}
                  style={{ flex: 1 }}
                >
                  <option value="warehouse">🏭 Warehouse</option>
                  <option value="caravan">🐎 Caravan</option>
                </select>
              </div>
            </div>
          </div>
          
          <GameButton 
            variant="primary"
            onClick={handleTransfer}
            disabled={!selectedItem || transferQty <= 0 || transferFrom === transferTo}
            style={{ marginTop: '12px' }}
          >
            Transfer {transferQty} {selectedItem} 
          </GameButton>
        </div>

        {/* Items Table */}
        <div className="game-card">
          <h3>
            Items {selectedLocation !== 'all' && 
              <span className="game-muted">in {getLocationIcon(selectedLocation)} {selectedLocation}</span>
            }
          </h3>
          {displayItems.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Location</th>
                  <th>Rarity</th>
                  <th>Unit Value</th>
                  <th>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.filter(item => item.quantity > 0).map((item) => {
                  const unitPrice = world.priceOf(item.itemName);
                  const totalItemValue = item.quantity * unitPrice;
                  
                  return (
                    <tr key={item.id}>
                      <td>{item.itemName}</td>
                      <td>{item.quantity}</td>
                      <td>
                        <span style={{ color: getLocationColor(item.location) }}>
                          {getLocationIcon(item.location)} {item.location}
                        </span>
                      </td>
                      <td className={`game-${item.rarity.toLowerCase()}`}>{item.rarity}</td>
                      <td>{unitPrice}g</td>
                      <td>{totalItemValue.toLocaleString()}g</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="game-flex-col" style={{ gap: '12px' }}>
              <p className="game-muted">
                {selectedLocation === 'all' ? 'No items found' : 
                 `No items in ${selectedLocation}`}
              </p>
              <p className="game-small game-muted" style={{ textAlign: 'center' }}>
                Complete missions or purchase items to fill your storage
              </p>
            </div>
          )}
        </div>
      </div>
    </GameLayout>
  );
}