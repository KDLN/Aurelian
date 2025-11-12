'use client';

import { useState } from 'react';
import GameLayout from '@/components/GameLayout';
import { useCrafting } from '@/hooks/useCrafting';
import { useUserDataQuery } from '@/hooks/useUserDataQuery';
import { useOnboardingAction } from '@/hooks/useOnboardingTracker';

interface Blueprint {
  id: string;
  key: string;
  category: string;
  requiredLevel: number;
  xpReward: number;
  timeMin: number;
  outputQty: number;
  description?: string;
  isUnlocked: boolean;
  canCraft: boolean;
  maxCraftable: number;
  output: {
    name: string;
    rarity: string;
  };
  inputs: Array<{
    qty: number;
    available: number;
    item: {
      name: string;
      rarity: string;
    };
  }>;
}

export default function CraftingPage() {
  const { refreshData } = useUserDataQuery();
  const trackOnboardingAction = useOnboardingAction();
  const {
    blueprints,
    activeJobs,
    completedJobs,
    userStats,
    isLoading,
    error,
    startCrafting,
    completeCrafting,
    clearError
  } = useCrafting();
  
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');

  const categories = ['all', ...Array.from(new Set(blueprints.map(bp => bp.category)))];
  const filteredBlueprints = selectedCategory === 'all' 
    ? blueprints 
    : blueprints.filter(bp => bp.category === selectedCategory);

  const handleCraft = async () => {
    if (!selectedBlueprint || quantity < 1) return;
    
    try {
      clearError();
      const result = await startCrafting(selectedBlueprint.id, quantity);
      setMessage(`✅ ${result.message}`);
      setQuantity(1);
    } catch (err) {
      setMessage(`❌ ${err instanceof Error ? err.message : 'Failed to start crafting'}`);
    }
  };

  const handleComplete = async (jobId: string) => {
    try {
      clearError();
      const result = await completeCrafting(jobId);

      // Track onboarding step completion
      await trackOnboardingAction('first_craft');

      setMessage(`🎉 ${result.message}`);
      if (result.leveledUp) {
        setMessage(prev => `${prev}\n🆙 Level up! Now level ${result.newLevel}!`);
        if (result.newBlueprints?.length > 0) {
          setMessage(prev => `${prev}\n📜 Unlocked ${result.newBlueprints.length} new recipes!`);
        }
      }
      // Refresh user data to update inventory and gold in header/sidebar
      refreshData();
    } catch (err) {
      setMessage(`❌ ${err instanceof Error ? err.message : 'Failed to complete crafting'}`);
    }
  };


  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
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

  const sidebar = (
    <div>
      {userStats && (
        <div style={{ marginBottom: '16px' }}>
          <h3>Crafting Level {userStats.level}</h3>
          <div style={{ 
            background: '#1a1511',
            border: '1px solid #533b2c',
            borderRadius: '4px',
            padding: '8px',
            marginBottom: '8px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '12px',
              marginBottom: '4px'
            }}>
              <span>XP: {userStats.xp}</span>
              <span>Next: {userStats.xpNext}</span>
            </div>
            <div style={{
              background: '#2a1f19',
              borderRadius: '2px',
              height: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                background: 'linear-gradient(90deg, #d4af37, #b8941f)',
                height: '100%',
                width: `${(userStats.xp / userStats.xpNext) * 100}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        </div>
      )}

      {activeJobs.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h3>Active Jobs ({activeJobs.length})</h3>
          <div className="game-flex-col" style={{ gap: '8px' }}>
            {activeJobs.map(job => (
              <div key={job.id} style={{
                background: '#1a1511',
                border: '1px solid #533b2c',
                borderRadius: '4px',
                padding: '8px',
                fontSize: '12px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {job.qty}x {job.blueprint.output.name}
                </div>
                <div style={{
                  background: '#2a1f19',
                  borderRadius: '2px',
                  height: '6px',
                  overflow: 'hidden',
                  marginBottom: '4px'
                }}>
                  <div style={{
                    background: job.isComplete ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
                    height: '100%',
                    width: `${job.progress}%`,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{job.progress.toFixed(1)}%</span>
                  {job.canComplete ? (
                    <button 
                      onClick={() => handleComplete(job.id)}
                      className="game-btn"
                      style={{ padding: '2px 6px', fontSize: '10px' }}
                    >
                      Complete!
                    </button>
                  ) : (
                    <span>{formatTime(job.timeRemainingMinutes)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3>Recipe Categories</h3>
        <div className="game-flex-col" style={{ gap: '4px' }}>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`game-btn ${selectedCategory === category ? 'game-btn-primary' : ''}`}
              style={{ 
                width: '100%', 
                padding: '6px 8px',
                fontSize: '12px',
                textTransform: 'capitalize'
              }}
            >
              {category} ({category === 'all' ? blueprints.length : blueprints.filter(bp => bp.category === category).length})
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <GameLayout 
      title="Crafting Workshop" 
      sidebar={sidebar}
    >
      <div className="game-flex-col">
        {message && (
          <div style={{
            background: message.includes('❌') ? '#7f1d1d' : '#166534',
            border: `1px solid ${message.includes('❌') ? '#dc2626' : '#16a34a'}`,
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '14px',
            whiteSpace: 'pre-wrap'
          }}>
            {message}
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

        <div className="game-grid-2" style={{ gap: '16px', alignItems: 'start' }}>
          {/* Recipe List */}
          <div className="game-card">
            <h3>Recipe Book</h3>
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {filteredBlueprints.length === 0 ? (
                <div className="game-flex-col" style={{ gap: '12px' }}>
                  <p className="game-muted">No recipes available in this category.</p>
                </div>
              ) : (
                <div className="game-flex-col" style={{ gap: '8px' }}>
                  {filteredBlueprints.map(blueprint => (
                    <div 
                      key={blueprint.id}
                      onClick={() => setSelectedBlueprint(blueprint)}
                      style={{
                        background: selectedBlueprint?.id === blueprint.id ? '#533b2c' : '#1a1511',
                        border: `1px solid ${selectedBlueprint?.id === blueprint.id ? '#7b4b2d' : '#533b2c'}`,
                        borderRadius: '4px',
                        padding: '12px',
                        cursor: blueprint.isUnlocked ? 'pointer' : 'not-allowed',
                        opacity: blueprint.isUnlocked ? 1 : 0.6
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ 
                            fontWeight: 'bold', 
                            color: getRarityColor(blueprint.output.rarity),
                            marginBottom: '2px'
                          }}>
                            {blueprint.output.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#9b8c70' }}>
                            {blueprint.outputQty > 1 && `${blueprint.outputQty}x `}
                            Level {blueprint.requiredLevel} • {formatTime(blueprint.timeMin)} • {blueprint.xpReward} XP
                          </div>
                        </div>
                        {!blueprint.isUnlocked && (
                          <div style={{ fontSize: '12px', color: '#dc2626' }}>
                            🔒 Locked
                          </div>
                        )}
                      </div>
                      
                      <div style={{ fontSize: '12px' }}>
                        <strong>Materials:</strong>
                        <div style={{ marginTop: '4px' }}>
                          {blueprint.inputs.map((input, i) => (
                            <div key={i} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              color: '#9b8c70'
                            }}>
                              <span style={{ color: getRarityColor(input.item.rarity) }}>
                                {input.item.name}
                              </span>
                              <span>{input.qty} ({input.available} available)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {blueprint.description && (
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#9b8c70', 
                          marginTop: '8px',
                          fontStyle: 'italic'
                        }}>
                          {blueprint.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Crafting Panel */}
          <div className="game-card">
            <h3>Start Crafting</h3>
            {selectedBlueprint ? (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ color: getRarityColor(selectedBlueprint.output.rarity) }}>
                    {selectedBlueprint.output.name}
                  </h4>
                  <div style={{ fontSize: '12px', color: '#9b8c70', marginBottom: '8px' }}>
                    Produces {selectedBlueprint.outputQty}x • Takes {formatTime(selectedBlueprint.timeMin)} • Awards {selectedBlueprint.xpReward} XP
                  </div>
                  
                  {selectedBlueprint.description && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#9b8c70',
                      fontStyle: 'italic',
                      marginBottom: '12px'
                    }}>
                      {selectedBlueprint.description}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="game-small">Quantity</label>
                    <div style={{ fontSize: '12px', color: '#9b8c70' }}>
                      Max: {selectedBlueprint.maxCraftable}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(selectedBlueprint.maxCraftable, Number(e.target.value))))}
                      min="1"
                      max={selectedBlueprint.maxCraftable}
                      style={{ flex: 1 }}
                      disabled={!selectedBlueprint.isUnlocked || !selectedBlueprint.canCraft || selectedBlueprint.maxCraftable === 0}
                    />
                    <button
                      onClick={() => setQuantity(selectedBlueprint.maxCraftable)}
                      className="game-btn"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      disabled={!selectedBlueprint.isUnlocked || !selectedBlueprint.canCraft || selectedBlueprint.maxCraftable === 0}
                    >
                      Max
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div className="game-small" style={{ marginBottom: '8px' }}>Batch Summary:</div>
                  <div style={{ fontSize: '12px', color: '#9b8c70' }}>
                    <div>Total Time: {formatTime(selectedBlueprint.timeMin * quantity * (quantity > 1 ? 0.9 : 1))}</div>
                    <div>Total Output: {selectedBlueprint.outputQty * quantity}x {selectedBlueprint.output.name}</div>
                    <div>Total XP: {selectedBlueprint.xpReward * quantity}</div>
                    {quantity > 1 && <div style={{ color: '#10b981' }}>Batch Bonus: 10% time reduction</div>}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div className="game-small" style={{ marginBottom: '8px' }}>Required Materials:</div>
                  {selectedBlueprint.inputs.map((input, i) => {
                    const needed = input.qty * quantity;
                    const hasEnough = input.available >= needed;
                    return (
                      <div key={i} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: hasEnough ? '#9b8c70' : '#dc2626',
                        marginBottom: '2px'
                      }}>
                        <span style={{ color: getRarityColor(input.item.rarity) }}>
                          {input.item.name}
                        </span>
                        <span>{needed} needed ({input.available} available)</span>
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={handleCraft}
                  disabled={!selectedBlueprint.isUnlocked || !selectedBlueprint.canCraft || isLoading || selectedBlueprint.maxCraftable === 0}
                  className="game-btn game-btn-primary"
                  style={{ width: '100%', marginBottom: '8px' }}
                >
                  {isLoading ? 'Starting...' :
                   !selectedBlueprint.isUnlocked ? 'Recipe Locked' :
                   !selectedBlueprint.canCraft ? `Requires Level ${selectedBlueprint.requiredLevel}` :
                   selectedBlueprint.maxCraftable === 0 ? 'Insufficient Materials' :
                   'Start Crafting'}
                </button>
              </div>
            ) : (
              <p className="game-muted">Select a recipe from the list to begin crafting.</p>
            )}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}