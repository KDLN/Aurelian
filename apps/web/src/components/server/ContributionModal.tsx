'use client';

import { useState, useEffect } from 'react';
import GameButton from '@/components/ui/GameButton';
import GamePanel from '@/components/ui/GamePanel';
import { useUserDataQuery, userKeys } from '@/hooks/useUserDataQuery';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { triggerGlobalServerMissionsRefresh } from '@/hooks/useServerMissions';

interface ContributionModalProps {
  mission: {
    id: string;
    name: string;
    globalRequirements: Record<string, number>;
    globalProgress: Record<string, number>;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ContributionModal({ mission, isOpen, onClose, onSuccess }: ContributionModalProps) {
  const { inventory, user } = useUserDataQuery();
  const queryClient = useQueryClient();
  const [contributions, setContributions] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setContributions({});
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const availableItems = inventory?.inventory?.filter(item => 
    item.location === 'warehouse' && 
    item.quantity > 0 &&
    Object.keys(mission.globalRequirements).includes(item.itemKey)
  ) || [];

  const handleContributionChange = (itemKey: string, amount: number) => {
    setContributions(prev => ({
      ...prev,
      [itemKey]: Math.max(0, amount)
    }));
    setError(null);
  };

  const getMaxContribution = (itemKey: string) => {
    const inventoryItem = availableItems.find(item => item.itemKey === itemKey);
    return inventoryItem?.quantity || 0;
  };

  const getSmartMaxContribution = (itemKey: string) => {
    const inventoryAmount = getMaxContribution(itemKey);
    const required = mission.globalRequirements[itemKey] || 0;
    const currentProgress = mission.globalProgress[itemKey] || 0;
    const remainingNeeded = Math.max(0, required - currentProgress);
    
    // Take the minimum of what we have and what's actually needed
    return Math.min(inventoryAmount, remainingNeeded);
  };

  const handleSubmit = async () => {
    const contributionItems = Object.entries(contributions).filter(([_, amount]) => amount > 0);
    
    if (contributionItems.length === 0) {
      setError('Please select items to contribute');
      return;
    }

    // Validate contributions don't exceed available inventory
    for (const [itemKey, amount] of contributionItems) {
      const maxAmount = getMaxContribution(itemKey);
      if (amount > maxAmount) {
        setError(`You don't have enough ${itemKey.replace(/_/g, ' ')}`);
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      // Try the full participation endpoint first, fallback to simple if it fails
      let response;
      try {
        response = await fetch(`/api/server/missions/${mission.id}/participate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contribution: {
              items: Object.fromEntries(contributionItems)
            }
          })
        });
      } catch (error) {
        console.warn('Full participation failed, trying simplified approach:', error);
        
        // Fallback to simplified endpoint
        response = await fetch(`/api/server/missions/${mission.id}/contribute-simple`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contribution: {
              items: Object.fromEntries(contributionItems)
            }
          })
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Contribution failed:', errorData);
        
        // If this was the full endpoint and it failed, try the simple one
        if (response.url.includes('/participate')) {
          console.warn('Full participation failed, trying simplified approach');
          try {
            const simpleResponse = await fetch(`/api/server/missions/${mission.id}/contribute-simple`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                contribution: {
                  items: Object.fromEntries(contributionItems)
                }
              })
            });
            
            if (simpleResponse.ok) {
              console.log('Simplified contribution succeeded');
              response = simpleResponse;
            } else {
              throw new Error('Both full and simple contribution failed');
            }
          } catch (simpleError) {
            console.error('Simple contribution also failed:', simpleError);
          }
        }
        
        if (!response.ok) {
          let errorMessage = errorData.error || 'Failed to contribute';
          if (errorData.details) {
            if (Array.isArray(errorData.details)) {
              errorMessage += ': ' + errorData.details.join(', ');
            } else if (typeof errorData.details === 'string') {
              errorMessage += ': ' + errorData.details;
            } else {
              errorMessage += ': ' + JSON.stringify(errorData.details);
            }
          }
          throw new Error(errorMessage);
        }
      }

      // Invalidate all user data queries globally (for all components including main header)
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: userKeys.wallet(user.id) });
        queryClient.invalidateQueries({ queryKey: userKeys.inventory(user.id) });
      }
      
      // Trigger global server missions refresh to update the event banner
      triggerGlobalServerMissionsRefresh();
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Contribution error:', err);
      setError(err instanceof Error ? err.message : 'Failed to contribute');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalContributionValue = Object.entries(contributions).reduce((total, [itemKey, amount]) => {
    // Simple scoring: 1 point per item (could be more complex based on rarity)
    return total + amount;
  }, 0);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <GamePanel style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Contribute to {mission.name}</h2>
            <GameButton size="small" onClick={onClose}>✕</GameButton>
          </div>

          {error && (
            <div style={{ 
              backgroundColor: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid #ff6b6b',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '16px',
              color: '#ff6b6b'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <h3>Mission Requirements:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
              {Object.entries(mission.globalRequirements).map(([itemKey, required]) => {
                const current = mission.globalProgress[itemKey] || 0;
                const progress = Math.min(100, (current / required) * 100);
                
                return (
                  <div key={itemKey} style={{ 
                    backgroundColor: 'rgba(83, 59, 44, 0.2)',
                    border: '1px solid #533b2c',
                    borderRadius: '4px',
                    padding: '8px'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      {itemKey.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9b8c70' }}>
                      {current.toLocaleString()} / {required.toLocaleString()} ({Math.round(progress)}%)
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '4px', 
                      backgroundColor: 'rgba(0,0,0,0.3)', 
                      borderRadius: '2px',
                      marginTop: '4px'
                    }}>
                      <div style={{ 
                        width: `${progress}%`, 
                        height: '100%', 
                        backgroundColor: progress >= 100 ? '#4CAF50' : '#FFA726',
                        borderRadius: '2px'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>Your Available Resources:</h3>
            {availableItems.length === 0 ? (
              <p style={{ color: '#9b8c70' }}>
                No required resources in your warehouse. Visit the market to acquire items needed for this mission.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {availableItems.map((item) => {
                  const maxContribution = getMaxContribution(item.itemKey);
                  const smartMax = getSmartMaxContribution(item.itemKey);
                  const currentContribution = contributions[item.itemKey] || 0;
                  
                  return (
                    <div key={item.id} style={{
                      backgroundColor: 'rgba(26, 21, 17, 0.5)',
                      border: '1px solid #533b2c',
                      borderRadius: '4px',
                      padding: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <strong>{item.itemName || item.itemKey.replace(/_/g, ' ')}</strong>
                          <div style={{ fontSize: '12px', color: '#9b8c70' }}>
                            Available: {maxContribution.toLocaleString()}
                            {smartMax < maxContribution && (
                              <span> • Need: {smartMax.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <GameButton
                            size="small"
                            onClick={() => handleContributionChange(item.itemKey, Math.max(0, currentContribution - 1))}
                            disabled={currentContribution <= 0}
                          >
                            −
                          </GameButton>
                          <input
                            type="number"
                            min="0"
                            max={maxContribution}
                            value={currentContribution}
                            onChange={(e) => handleContributionChange(item.itemKey, parseInt(e.target.value) || 0)}
                            style={{
                              width: '80px',
                              padding: '4px',
                              backgroundColor: '#1a1511',
                              border: '1px solid #533b2c',
                              borderRadius: '4px',
                              color: '#f1e5c8',
                              textAlign: 'center'
                            }}
                          />
                          <GameButton
                            size="small"
                            onClick={() => handleContributionChange(item.itemKey, Math.min(maxContribution, currentContribution + 1))}
                            disabled={currentContribution >= maxContribution}
                          >
                            +
                          </GameButton>
                          <GameButton
                            size="small"
                            variant="secondary"
                            onClick={() => handleContributionChange(item.itemKey, getSmartMaxContribution(item.itemKey))}
                            disabled={smartMax === 0}
                            title={smartMax === 0 ? "Mission requirement already met" : `Contribute ${smartMax.toLocaleString()} (what's needed)`}
                          >
                            Max
                          </GameButton>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {totalContributionValue > 0 && (
            <div style={{ 
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid #4CAF50',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <strong>Contribution Summary:</strong>
              <div style={{ marginTop: '8px' }}>
                {Object.entries(contributions)
                  .filter(([_, amount]) => amount > 0)
                  .map(([itemKey, amount]) => (
                    <div key={itemKey} style={{ fontSize: '14px' }}>
                      • {amount.toLocaleString()} {itemKey.replace(/_/g, ' ')}
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <GameButton variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </GameButton>
            <GameButton 
              variant="primary" 
              onClick={handleSubmit}
              disabled={totalContributionValue === 0 || isSubmitting}
            >
              {isSubmitting ? 'Contributing...' : `Contribute ${totalContributionValue} Items`}
            </GameButton>
          </div>
        </div>
      </GamePanel>
    </div>
  );
}