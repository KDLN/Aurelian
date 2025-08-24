'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import GameButton from '@/components/ui/GameButton';
import { cn } from '@/lib/utils';

interface ContributionFormProps {
  mission: {
    id: string;
    name: string;
    globalRequirements: any;
    userParticipation?: any;
  };
  onSubmit: (contribution: any) => Promise<any>;
  onCancel?: () => void;
}

interface UserInventory {
  [itemKey: string]: number;
}

export default function ContributionForm({ mission, onSubmit, onCancel }: ContributionFormProps) {
  const [contribution, setContribution] = useState<any>({});
  const [userInventory, setUserInventory] = useState<UserInventory>({});
  const [userGold, setUserGold] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUserResources();
  }, []);

  const fetchUserResources = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Authentication required');
        return;
      }

      // Fetch user inventory
      const inventoryResponse = await fetch('/api/user/inventory', {
        headers: {
          'Cookie': `sb-access-token=${session.access_token}`
        }
      });

      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json();
        const inventory: UserInventory = {};
        
        inventoryData.inventory?.forEach((item: any) => {
          if (item.location === 'warehouse') {
            inventory[item.item.key] = item.qty;
          }
        });
        
        setUserInventory(inventory);
      }

      // Fetch user wallet
      const walletResponse = await fetch('/api/user/wallet', {
        headers: {
          'Cookie': `sb-access-token=${session.access_token}`
        }
      });

      if (walletResponse.ok) {
        const walletData = await walletResponse.json();
        setUserGold(walletData.wallet?.gold || 0);
      }

    } catch (err) {
      console.error('Error fetching user resources:', err);
      setError('Failed to load your resources');
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemContribution = (itemKey: string, quantity: number) => {
    const maxAvailable = userInventory[itemKey] || 0;
    const actualQuantity = Math.max(0, Math.min(quantity, maxAvailable));
    
    setContribution((prev: any) => ({
      ...prev,
      items: {
        ...prev.items,
        [itemKey]: actualQuantity
      }
    }));
  };

  const handleGoldContribution = (amount: number) => {
    const actualAmount = Math.max(0, Math.min(amount, userGold));
    setContribution((prev: any) => ({
      ...prev,
      gold: actualAmount
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate contribution
    const hasAnyContribution = 
      (contribution.items && Object.values(contribution.items).some((qty: any) => qty > 0)) ||
      (contribution.gold && contribution.gold > 0) ||
      (contribution.trades && contribution.trades > 0);

    if (!hasAnyContribution) {
      setError('Please contribute at least one resource');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      await onSubmit(contribution);
      
      // Reset form
      setContribution({});
    } catch (err: any) {
      console.error('Error submitting contribution:', err);
      setError(err.message || 'Failed to submit contribution');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requirements = mission.globalRequirements || {};

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-300">Loading your resources...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-yellow-400 mb-2">
          Contribute to {mission.name}
        </h3>
        <p className="text-gray-300 text-sm">
          Choose how much you want to contribute. Resources will be deducted from your warehouse.
        </p>
      </div>

      {error && (
        <div className="bg-red-900 bg-opacity-50 border border-red-600 rounded p-3">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Item contributions */}
        {requirements.items && Object.keys(requirements.items).length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-300 mb-3">Resource Contributions</h4>
            <div className="space-y-3">
              {Object.entries(requirements.items as Record<string, number>).map(([itemKey, _]) => {
                const available = userInventory[itemKey] || 0;
                const contributing = contribution.items?.[itemKey] || 0;
                
                return (
                  <div key={itemKey} className="bg-gray-800 p-3 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300 capitalize">
                        {itemKey.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-400">
                        Available: {available}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        min="0"
                        max={available}
                        value={contributing}
                        onChange={(e) => handleItemContribution(itemKey, parseInt(e.target.value) || 0)}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                        placeholder="0"
                        disabled={available === 0}
                      />
                      <GameButton
                        type="button"
                        size="small"
                        onClick={() => handleItemContribution(itemKey, available)}
                        disabled={available === 0}
                      >
                        Max
                      </GameButton>
                    </div>
                    
                    {available === 0 && (
                      <p className="text-red-400 text-xs mt-1">
                        You don't have any {itemKey.replace('_', ' ')} in your warehouse
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gold contribution */}
        {requirements.gold && (
          <div>
            <h4 className="font-semibold text-gray-300 mb-3">Gold Contribution</h4>
            <div className="bg-gray-800 p-3 rounded">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">💰 Gold</span>
                <span className="text-sm text-gray-400">
                  Available: {userGold.toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="0"
                  max={userGold}
                  value={contribution.gold || 0}
                  onChange={(e) => handleGoldContribution(parseInt(e.target.value) || 0)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  placeholder="0"
                  disabled={userGold === 0}
                />
                <GameButton
                  type="button"
                  size="small"
                  onClick={() => handleGoldContribution(userGold)}
                  disabled={userGold === 0}
                >
                  Max
                </GameButton>
              </div>
              
              {userGold === 0 && (
                <p className="text-red-400 text-xs mt-1">
                  You don't have any gold to contribute
                </p>
              )}
            </div>
          </div>
        )}

        {/* Trades contribution (if applicable) */}
        {requirements.trades && (
          <div>
            <h4 className="font-semibold text-gray-300 mb-3">Trade Activity</h4>
            <div className="bg-gray-800 p-3 rounded">
              <p className="text-sm text-gray-300 mb-2">
                Your recent trades will automatically count towards this mission.
              </p>
              <p className="text-xs text-gray-400">
                Complete trades to contribute to the server's trade volume goal.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <GameButton
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Contributing...' : 'Submit Contribution'}
          </GameButton>
          
          {onCancel && (
            <GameButton
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </GameButton>
          )}
        </div>
      </form>

      {/* Contribution Summary */}
      {(contribution.items || contribution.gold) && (
        <div className="bg-yellow-900 bg-opacity-20 border border-yellow-600 rounded p-3 mt-4">
          <h5 className="text-yellow-400 font-semibold text-sm mb-2">Contribution Summary</h5>
          <div className="text-sm text-gray-300">
            {contribution.items && Object.entries(contribution.items).map(([itemKey, qty]: [string, any]) => {
              if (qty > 0) {
                return (
                  <div key={itemKey} className="flex justify-between">
                    <span className="capitalize">{itemKey.replace('_', ' ')}</span>
                    <span>{qty}</span>
                  </div>
                );
              }
              return null;
            })}
            
            {contribution.gold > 0 && (
              <div className="flex justify-between">
                <span>Gold</span>
                <span>{contribution.gold.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}