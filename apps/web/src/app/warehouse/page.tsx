'use client';

import { useState } from 'react';
import GameLayout from '@/components/GameLayout';
import GameButton from '@/components/ui/GameButton';
import { useGameWorld } from '@/lib/game/world';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';

export default function WarehousePage() {
  const { world } = useGameWorld();
  const { user, authLoaded, inventory, isLoading, error } = useUserData();
  const [selectedItem, setSelectedItem] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [transferTo, setTransferTo] = useState<'caravan' | 'escrow'>('caravan');
  const [populatingStarter, setPopulatingStarter] = useState(false);

  // Debug logging
  console.log('Warehouse: inventory data:', inventory);
  console.log('Warehouse: inventory.inventory array:', inventory?.inventory);
  console.log('Warehouse: inventory.inventory length:', inventory?.inventory?.length);
  console.log('Warehouse: user authenticated:', !!user);
  console.log('Warehouse: authLoaded:', authLoaded);

  // Use real inventory data when available, fallback to mock data
  const warehouseItems = inventory?.inventory || [];
  const warehouseMap = warehouseItems.reduce((acc, item) => {
    acc[item.itemName] = item.quantity;
    return acc;
  }, {} as Record<string, number>);

  const getTotalValue = () => {
    if (inventory?.inventory) {
      return warehouseItems.reduce((sum, item) => sum + (item.quantity * world.priceOf(item.itemName)), 0);
    }
    return Object.entries(world.warehouse)
      .reduce((sum, [item, qty]) => sum + (qty * world.priceOf(item)), 0);
  };

  const getStorageUsed = () => {
    if (inventory?.totalItems) {
      return inventory.totalItems;
    }
    return Object.values(world.warehouse).reduce((sum, qty) => sum + qty, 0);
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

    if ((warehouseMap[selectedItem] || 0) < transferQty) {
      alert('Not enough items in warehouse');
      return;
    }

    // For now, just simulate the transfer with an alert
    // In a real implementation, this would update caravan/escrow inventories
    alert(`Transferred ${transferQty} ${selectedItem} to ${transferTo}`);
    
    // Reset form
    setTransferQty(1);
    setSelectedItem('');
  };

  const handlePopulateStarter = async () => {
    if (!user) return;
    
    setPopulatingStarter(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) {
        alert('Authentication failed');
        return;
      }

      const response = await fetch('/api/user/inventory/populate-starter', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`✅ ${result.message}`);
        // Refresh inventory data
        window.location.reload();
      } else {
        alert(`❌ ${result.error || result.message}`);
      }
    } catch (err) {
      console.error('Failed to populate starter inventory:', err);
      alert('❌ Failed to populate starter inventory');
    } finally {
      setPopulatingStarter(false);
    }
  };

  const sidebar = (
    <div>
      <h3>Storage Guide</h3>
      <p className="game-muted game-small">
        Your warehouse stores all items safely. Transfer items to caravans for missions 
        or to escrow for secure trading.
      </p>
      
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
        <div className="game-space-between">
          <span className="game-small">Escrow:</span>
          <span className="game-good game-small">Unlimited</span>
        </div>
      </div>

      <h3>Current Usage</h3>
      <div className="game-progress">
        <div 
          className="game-progress-fill" 
          style={{ 
            width: `${(getStorageUsed() / 1000) * 100}%`,
            background: getStorageUsed() > 800 ? '#d73a49' : '#b7b34d'
          }}
        >
          {getStorageUsed()}/1000
        </div>
      </div>
    </div>
  );

  return (
    <GameLayout 
      title="Warehouse Management" 
      characterActivity="idle" 
      characterLocation="Warehouse"
      sidebar={sidebar}
    >
      {!authLoaded ? (
        <div className="game-card">
          <p>Loading authentication...</p>
        </div>
      ) : !user ? (
        <div className="game-card">
          <p className="game-warn">Please log in to view your warehouse</p>
        </div>
      ) : isLoading ? (
        <div className="game-card">
          <p>Loading warehouse data...</p>
        </div>
      ) : error ? (
        <div className="game-card">
          <p className="game-bad">Error loading warehouse: {error}</p>
        </div>
      ) : (
        <div className="game-flex-col">
          <div className="game-card">
            <h3>Storage Summary</h3>
            <div className="game-grid-3">
              <div className="game-space-between">
                <span>Total Items:</span>
                <span className="game-good">{getStorageUsed().toLocaleString()}</span>
              </div>
              <div className="game-space-between">
                <span>Estimated Value:</span>
                <span className="game-good">{getTotalValue().toLocaleString()}g</span>
              </div>
              <div className="game-space-between">
                <span>Capacity Used:</span>
                <span className={getStorageUsed() > 800 ? 'game-bad' : 'game-good'}>
                  {Math.round((getStorageUsed() / 1000) * 100)}%
                </span>
              </div>
            </div>
          </div>

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
                {warehouseItems.filter(item => item.quantity > 0).map((item) => (
                  <option key={item.itemKey} value={item.itemName}>
                    {item.itemName} ({item.quantity} available)
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
                max={selectedItem ? warehouseMap[selectedItem] || 0 : 0}
                style={{ width: '100%' }}
              />
            </div>
            
            <div>
              <label className="game-small">Transfer To</label>
              <select 
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value as 'caravan' | 'escrow')}
                style={{ width: '100%' }}
              >
                <option value="caravan">Caravan (for missions)</option>
                <option value="escrow">Escrow (for trading)</option>
              </select>
            </div>
          </div>
          
          <GameButton 
            variant="primary"
            onClick={handleTransfer}
            disabled={!selectedItem || transferQty <= 0}
            style={{ marginTop: '12px' }}
          >
            Transfer {transferQty} {selectedItem} to {transferTo}
          </GameButton>
        </div>

          <div className="game-card">
            <h3>Current Inventory</h3>
            {warehouseItems.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Rarity</th>
                    <th>Market Value</th>
                    <th>Total Value</th>
                    <th>% of Storage</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouseItems.filter(item => item.quantity > 0).map((item) => {
                    const marketPrice = world.priceOf(item.itemName);
                    const totalValue = item.quantity * marketPrice;
                    const storagePercent = Math.round((item.quantity / 1000) * 100 * 10) / 10;
                    
                    return (
                      <tr key={item.itemKey}>
                        <td>{item.itemName}</td>
                        <td>{item.quantity}</td>
                        <td className={`game-${item.rarity.toLowerCase()}`}>{item.rarity}</td>
                        <td>{marketPrice}g</td>
                        <td>{totalValue.toLocaleString()}g</td>
                        <td className={storagePercent > 50 ? 'game-warn' : 'game-muted'}>
                          {storagePercent}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="game-flex-col" style={{ gap: '12px' }}>
                <p className="game-muted">Warehouse is empty</p>
                <GameButton 
                  onClick={handlePopulateStarter}
                  disabled={populatingStarter}
                  variant="primary"
                  style={{ fontSize: '12px', padding: '8px 12px' }}
                >
                  {populatingStarter ? '🔄 Adding Items...' : '🎁 Add Starter Items (Debug)'}
                </GameButton>
                <p className="game-small game-muted" style={{ textAlign: 'center' }}>
                  This will give you starter items to test the warehouse functionality
                </p>
              </div>
            )}
          </div>

          <div className="game-card">
            <h3>Storage by Category</h3>
            <div className="game-grid-2">
              <div>
                <h4>Raw Materials</h4>
                <div className="game-flex-col">
                  {['Iron Ore', 'Hide', 'Herb', 'Pearl', 'Relic Fragment'].map(item => (
                    <div key={item} className="game-space-between">
                      <span className="game-small">{item}:</span>
                      <span className="game-pill">{warehouseMap[item] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4>Crafted Goods</h4>
                <div className="game-flex-col">
                  {['Iron Ingot', 'Leather Roll', 'Healing Tonic'].map(item => (
                    <div key={item} className="game-space-between">
                      <span className="game-small">{item}:</span>
                      <span className="game-pill game-pill-good">{warehouseMap[item] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="game-card">
            <h3>Quick Actions</h3>
            <div className="game-grid-3">
              <GameButton href="/missions">Send Mission</GameButton>
              <GameButton href="/auction">List Items</GameButton>
              <GameButton href="/crafting">Start Crafting</GameButton>
            </div>
          </div>
        </div>
      )}
    </GameLayout>
  );
}