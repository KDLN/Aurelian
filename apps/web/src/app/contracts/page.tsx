'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { useGameWorld } from '@/lib/game/world';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';

export default function ContractsPage() {
  const { world } = useGameWorld();
  const { user, wallet } = useUserData();
  const [selectedItem, setSelectedItem] = useState('Iron Ore');
  const [quantity, setQuantity] = useState(10);
  const [priceLimit, setPriceLimit] = useState(15);
  const [duration, setDuration] = useState(6);
  const [contracts, setContracts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  const fetchContracts = async () => {
    if (!user) return;
    
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) return;

      const response = await fetch('/api/contracts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContracts(data.contracts || []);
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    }
  };

  const handleCreateContract = async () => {
    if (quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    if (priceLimit <= 0) {
      alert('Price limit must be greater than 0');
      return;
    }

    const cost = quantity * priceLimit;
    if (wallet && wallet.gold < cost) {
      alert(`Not enough gold! Need ${cost}g, have ${wallet.gold}g`);
      return;
    }

    setIsLoading(true);
    setMessage('');
    
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) {
        alert('Authentication failed');
        return;
      }

      // Map item names to keys
      const itemKeyMap: Record<string, string> = {
        'Iron Ore': 'iron_ore',
        'Herb': 'herb', 
        'Hide': 'hide',
        'Pearl': 'pearl',
        'Relic Fragment': 'relic_fragment'
      };

      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemKey: itemKeyMap[selectedItem],
          quantity,
          priceLimit,
          duration
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage(`✅ ${result.message}`);
        fetchContracts(); // Refresh contracts list
        // Reset form
        setQuantity(10);
        setPriceLimit(15);
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create contract:', error);
      setMessage('❌ Failed to create contract');
    } finally {
      setIsLoading(false);
    }
  };

  const getContractStatus = (contract: any) => {
    const timeLeft = Math.max(0, contract.expires - (world.day - 1) * 24 * 60 - world.minute);
    if (timeLeft === 0) return { status: 'Expired', color: 'bad' };
    if (contract.filled >= contract.qty) return { status: 'Filled', color: 'good' };
    return { status: 'Active', color: 'warn' };
  };

  const sidebar = (
    <div>
      <h3>Contract Guide</h3>
      <p className="game-muted game-small">
        Create buy orders for items at specific prices. Contracts automatically purchase 
        items from the market when available at or below your price limit.
      </p>
      
      <div className="game-flex-col">
        <div className="game-space-between">
          <span className="game-small">Gold Required:</span>
          <span className="game-good game-small">Full Amount</span>
        </div>
        <div className="game-space-between">
          <span className="game-small">Auto-Execute:</span>
          <span className="game-warn game-small">When Available</span>
        </div>
        <div className="game-space-between">
          <span className="game-small">Refund:</span>
          <span className="game-good game-small">On Expiry</span>
        </div>
      </div>
    </div>
  );

  return (
    <GameLayout 
      title="Trading Contracts" 
      characterActivity="trading" 
      characterLocation="Trade Office"
      sidebar={sidebar}
    >
      <div className="game-flex-col">
        <div className="game-card">
          <h3>Create New Contract</h3>
          <div className="game-grid-2">
            <div>
              <label className="game-small">Target Item</label>
              <select 
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                style={{ width: '100%' }}
              >
                {Object.keys(world.commodities).map(item => (
                  <option key={item} value={item}>{item}</option>
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
                max="1000"
                style={{ width: '100%' }}
              />
            </div>
            
            <div>
              <label className="game-small">Max Price (per unit)</label>
              <input
                type="number"
                value={priceLimit}
                onChange={(e) => setPriceLimit(Number(e.target.value))}
                min="1"
                style={{ width: '100%' }}
              />
            </div>
            
            <div>
              <label className="game-small">Duration (hours)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min="1"
                max="24"
                style={{ width: '100%' }}
              />
            </div>
          </div>
          
          <div className="game-flex-col" style={{ marginTop: '12px' }}>
            <div className="game-grid-2">
              <div className="game-space-between">
                <span>Total Cost:</span>
                <span className="game-warn">{(quantity * priceLimit).toLocaleString()}g</span>
              </div>
              <div className="game-space-between">
                <span>Market Price:</span>
                <span className="game-good">{world.priceOf(selectedItem)}g</span>
              </div>
              <div className="game-space-between">
                <span>Your Gold:</span>
                <span className={(wallet?.gold || 0) >= quantity * priceLimit ? 'game-good' : 'game-bad'}>
                  {(wallet?.gold || 0).toLocaleString()}g
                </span>
              </div>
              <div className="game-space-between">
                <span>Duration:</span>
                <span>{duration} hours</span>
              </div>
            </div>
            
            <button 
              className="game-btn game-btn-primary"
              onClick={handleCreateContract}
              disabled={(wallet?.gold || 0) < quantity * priceLimit || isLoading}
            >
              Create Contract ({(quantity * priceLimit).toLocaleString()}g)
            </button>
          </div>
        </div>

        {message && (
          <div className="game-card" style={{ 
            backgroundColor: message.includes('❌') ? '#7f1d1d' : '#166534',
            borderColor: message.includes('❌') ? '#dc2626' : '#16a34a'
          }}>
            <p>{message}</p>
            <button 
              onClick={() => setMessage('')}
              style={{
                float: 'right',
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ×
            </button>
          </div>
        )}

        <div className="game-card">
          <h3>Active Contracts ({contracts.length})</h3>
          {contracts.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Progress</th>
                  <th>Price Limit</th>
                  <th>Locked Funds</th>
                  <th>Time Left</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(contract => {
                  const progress = Math.round((contract.filled / contract.qty) * 100);
                  const expiresAt = new Date(contract.expires);
                  const timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60)));
                  const status = timeLeft <= 0 ? 'expired' : (contract.filled >= contract.qty ? 'filled' : 'active');
                  const statusColor = status === 'expired' ? 'bad' : (status === 'filled' ? 'good' : 'warn');
                  
                  return (
                    <tr key={contract.id}>
                      <td>{contract.item}</td>
                      <td>
                        <div className="game-progress">
                          <div 
                            className="game-progress-fill" 
                            style={{ 
                              width: `${progress}%`,
                              background: progress >= 100 ? '#68b06e' : '#b7b34d'
                            }}
                          >
                            {contract.filled}/{contract.qty}
                          </div>
                        </div>
                      </td>
                      <td>{contract.limit}g</td>
                      <td>{((contract.qty - contract.filled) * contract.limit).toLocaleString()}g</td>
                      <td>{timeLeft}min</td>
                      <td>
                        <span className={`game-pill game-pill-${statusColor}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="game-muted">No active contracts</p>
          )}
        </div>

        <div className="game-card">
          <h3>Contract Statistics</h3>
          <div className="game-grid-3">
            <div className="game-space-between">
              <span>Total Active:</span>
              <span className="game-good">{contracts.length}</span>
            </div>
            <div className="game-space-between">
              <span>Locked Funds:</span>
              <span className="game-warn">
                {contracts.reduce((sum, c) => sum + ((c.qty - c.filled) * c.limit), 0).toLocaleString()}g
              </span>
            </div>
            <div className="game-space-between">
              <span>Completed:</span>
              <span className="game-good">
                {contracts.filter(c => c.filled >= c.qty).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}