'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { supabase } from '@/lib/supabaseClient';

type WarehouseItem = {
  id: string;
  itemId: string;
  quantity: number;
  item: {
    id: string;
    key: string;
    name: string;
    rarity: string;
    stack: number;
    meta: any;
  };
};

type UserInventoryItem = {
  id: string;
  itemId: string;
  itemKey: string;
  itemName: string;
  rarity: string;
  quantity: number;
  location: string;
};

export default function GuildWarehousePage() {
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [userInventory, setUserInventory] = useState<UserInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'warehouse' | 'deposit' | 'withdraw'>('warehouse');
  const [depositAmounts, setDepositAmounts] = useState<Record<string, number>>({});
  const [withdrawAmounts, setWithdrawAmounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadWarehouseData();
  }, []);

  const loadWarehouseData = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      // Get guild warehouse items
      const warehouseResponse = await fetch('/api/guild/warehouse', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!warehouseResponse.ok) {
        throw new Error('Failed to fetch warehouse data');
      }

      const warehouseData = await warehouseResponse.json();
      console.log('Guild warehouse response:', warehouseData);
      setWarehouseItems(warehouseData.items || []);

      // Get user's personal warehouse inventory for deposits
      const inventoryResponse = await fetch('/api/user/inventory?location=warehouse', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json();
        console.log('User inventory response:', inventoryData);
        setUserInventory(inventoryData.inventory || []);
      } else {
        console.error('Failed to fetch user inventory:', inventoryResponse.status);
        const errorData = await inventoryResponse.json();
        console.error('Inventory error:', errorData);
      }

    } catch (err) {
      console.error('Error loading warehouse data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load warehouse data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (itemId: string, amount: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/guild/warehouse/deposit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itemId, amount })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to deposit item');
      }

      const result = await response.json();
      alert(result.message);
      
      // Reset deposit amount and reload data
      setDepositAmounts(prev => ({ ...prev, [itemId]: 0 }));
      loadWarehouseData();

    } catch (err) {
      console.error('Error depositing item:', err);
      alert(err instanceof Error ? err.message : 'Failed to deposit item');
    }
  };

  const handleWithdraw = async (itemId: string, amount: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/guild/warehouse/withdraw', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itemId, amount })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to withdraw item');
      }

      const result = await response.json();
      alert(result.message);
      
      // Reset withdraw amount and reload data
      setWithdrawAmounts(prev => ({ ...prev, [itemId]: 0 }));
      loadWarehouseData();

    } catch (err) {
      console.error('Error withdrawing item:', err);
      alert(err instanceof Error ? err.message : 'Failed to withdraw item');
    }
  };

  const sidebar = (
    <div>
      <h3>Guild Warehouse</h3>
      <p className="game-muted game-small">
        Shared storage for guild members to pool resources.
      </p>

      <h3>Navigation</h3>
      <div className="game-flex-col">
        <button 
          className={`game-btn ${selectedTab === 'warehouse' ? 'game-btn-primary' : ''}`}
          onClick={() => setSelectedTab('warehouse')}
        >
          📦 View Items
        </button>
        <button 
          className={`game-btn ${selectedTab === 'deposit' ? 'game-btn-primary' : ''}`}
          onClick={() => setSelectedTab('deposit')}
        >
          ⬆️ Deposit Items
        </button>
        <button 
          className={`game-btn ${selectedTab === 'withdraw' ? 'game-btn-primary' : ''}`}
          onClick={() => setSelectedTab('withdraw')}
        >
          ⬇️ Withdraw Items
        </button>
      </div>

      <h3>Quick Links</h3>
      <div className="game-flex-col">
        <a href="/guild" className="game-btn game-btn-small">
          🏛️ Guild Overview
        </a>
        <a href="/inventory" className="game-btn game-btn-small">
          🎒 Personal Inventory
        </a>
      </div>
    </div>
  );

  if (loading) {
    return (
      <GameLayout title="Guild Warehouse" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center">Loading warehouse...</div>
        </div>
      </GameLayout>
    );
  }

  if (error) {
    return (
      <GameLayout title="Guild Warehouse" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center game-bad">Error: {error}</div>
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button className="game-btn" onClick={loadWarehouseData}>
              Retry
            </button>
          </div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Guild Warehouse" sidebar={sidebar}>
      <div className="game-flex-col">
        {selectedTab === 'warehouse' && (
          <div className="game-card">
            <h3>Guild Warehouse Inventory</h3>
            {warehouseItems.length > 0 ? (
              <div className="game-flex-col">
                {warehouseItems.map(item => (
                  <div key={item.id} className="game-space-between" style={{ padding: '8px 0', borderBottom: '1px solid #533b2c' }}>
                    <div>
                      <strong>{item.item.name}</strong>
                      <div className="game-small game-muted">{item.item.key}</div>
                      <div className="game-small">
                        Rarity: {item.item.rarity} • Stack: {item.item.stack}
                      </div>
                    </div>
                    <div className="game-center">
                      <div className="game-big">{item.quantity.toLocaleString()}</div>
                      <div className="game-small game-muted">in stock</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="game-muted">No items in guild warehouse</p>
            )}
          </div>
        )}

        {selectedTab === 'deposit' && (
          <div className="game-card">
            <h3>Deposit Items to Guild Warehouse</h3>
            <p className="game-muted game-small">
              Move items from your personal warehouse to the guild warehouse.
            </p>
            {userInventory.length > 0 ? (
              <div className="game-flex-col">
                {userInventory.map(item => (
                  <div key={item.id} className="game-space-between" style={{ padding: '8px 0', borderBottom: '1px solid #533b2c' }}>
                    <div>
                      <strong>{item.itemName}</strong>
                      <div className="game-small game-muted">You have: {item.quantity}</div>
                      <div className="game-small">Rarity: {item.rarity}</div>
                    </div>
                    <div className="game-flex" style={{ gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        max={item.quantity}
                        value={depositAmounts[item.itemId] || ''}
                        onChange={(e) => setDepositAmounts(prev => ({
                          ...prev,
                          [item.itemId]: parseInt(e.target.value) || 0
                        }))}
                        className="game-input"
                        style={{ width: '80px' }}
                        placeholder="Amount"
                      />
                      <button
                        className="game-btn game-btn-primary game-btn-small"
                        onClick={() => handleDeposit(item.itemId, depositAmounts[item.itemId] || 0)}
                        disabled={!depositAmounts[item.itemId] || depositAmounts[item.itemId] <= 0 || depositAmounts[item.itemId] > (item as any).qty}
                      >
                        Deposit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="game-muted">No items in your personal warehouse to deposit</p>
            )}
          </div>
        )}

        {selectedTab === 'withdraw' && (
          <div className="game-card">
            <h3>Withdraw Items from Guild Warehouse</h3>
            <p className="game-muted game-small">
              Move items from guild warehouse to your personal warehouse.
            </p>
            {warehouseItems.length > 0 ? (
              <div className="game-flex-col">
                {warehouseItems.map(item => (
                  <div key={item.id} className="game-space-between" style={{ padding: '8px 0', borderBottom: '1px solid #533b2c' }}>
                    <div>
                      <strong>{item.item.name}</strong>
                      <div className="game-small game-muted">Available: {item.quantity}</div>
                    </div>
                    <div className="game-flex" style={{ gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        max={item.quantity}
                        value={withdrawAmounts[item.itemId] || ''}
                        onChange={(e) => setWithdrawAmounts(prev => ({
                          ...prev,
                          [item.itemId]: parseInt(e.target.value) || 0
                        }))}
                        className="game-input"
                        style={{ width: '80px' }}
                        placeholder="Amount"
                      />
                      <button
                        className="game-btn game-btn-primary game-btn-small"
                        onClick={() => handleWithdraw(item.itemId, withdrawAmounts[item.itemId] || 0)}
                        disabled={!withdrawAmounts[item.itemId] || withdrawAmounts[item.itemId] <= 0 || withdrawAmounts[item.itemId] > item.quantity}
                      >
                        Withdraw
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="game-muted">No items in guild warehouse to withdraw</p>
            )}
          </div>
        )}
      </div>
    </GameLayout>
  );
}