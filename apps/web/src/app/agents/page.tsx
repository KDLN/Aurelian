'use client';

import { useState } from 'react';
import GameLayout from '@/components/GameLayout';
import { useAgents, useHireAgent, useEquipAgent, useStarterGear } from '@/hooks/useAgents';
import { useUserDataQuery } from '@/hooks/useUserDataQuery';
import { useEquipment } from '@/hooks/useEquipment';
import { AgentType, EquipmentSlot } from '@prisma/client';
import { agentTypeInfo, getHiringCost } from '@/lib/agents/generator';
import { getAgentLevelProgress } from '@/lib/missions/calculator';

export default function AgentsPage() {
  const { agents, isLoading, error, refetch } = useAgents();
  const { hireAgent, isHiring } = useHireAgent();
  const { equipItem, isEquipping } = useEquipAgent();
  const { giveStarterGear, isGivingGear } = useStarterGear();
  const { wallet, inventory } = useUserDataQuery();
  const { equipment } = useEquipment();
  
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType>(AgentType.SCOUT);
  const [equipmentMode, setEquipmentMode] = useState<{ agentId: string; slot: EquipmentSlot } | null>(null);

  const handleHireAgent = async () => {
    const success = await hireAgent(selectedAgentType);
    if (success) {
      // Check if this is the user's first agent and give starter gear
      if (agents.length === 0) {
        const gearSuccess = await giveStarterGear();
        if (gearSuccess) {
          console.log('Starter gear given for first agent hire');
        }
      }
      refetch();
    }
  };

  const handleEquipItem = async (itemKey: string) => {
    if (!equipmentMode) return;
    
    const success = await equipItem(equipmentMode.agentId, itemKey, equipmentMode.slot);
    if (success) {
      setEquipmentMode(null);
      refetch();
    }
  };

  const getSlotItemName = (agent: any, slot: EquipmentSlot): string => {
    const slotKey = slot.toLowerCase() as keyof typeof agent;
    const itemKey = agent[slotKey] as string | null;
    
    if (!itemKey) return 'Empty';
    
    // Convert itemKey to display name (simple conversion)
    return itemKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const sidebar = (
    <div>
      <h3>Agent Management</h3>
      <p className="game-muted game-small">
        Hire and equip agents to handle missions. Each agent has unique specializations
        and can be equipped with gear to improve their performance.
      </p>
      
      <h3>Agent Types</h3>
      <div className="game-flex-col">
        {Object.entries(agentTypeInfo).map(([type, info]) => (
          <div key={type} className="game-card-sm">
            <h4 className="game-small">{info.name}</h4>
            <p className="game-muted game-tiny">{info.description}</p>
            <div className="game-flex-col">
              <span className="game-tiny">Success: +{info.baseStats.successBonus}%</span>
              <span className="game-tiny">Speed: +{info.baseStats.speedBonus}%</span>
              <span className="game-tiny">Reward: +{info.baseStats.rewardBonus}%</span>
            </div>
          </div>
        ))}
      </div>

      <h3>Current Status</h3>
      <div className="game-flex-col">
        <div className="game-space-between">
          <span className="game-small">Active Agents:</span>
          <span className="game-good game-small">{agents.length}/4</span>
        </div>
        <div className="game-space-between">
          <span className="game-small">Your Gold:</span>
          <span className="game-good game-small">{wallet?.gold?.toLocaleString() || 0}g</span>
        </div>
      </div>

      <h3>Starter Equipment</h3>
      <p className="game-muted game-small">
        Get basic equipment to outfit your agents for their first missions.
      </p>
      <button 
        className="game-btn game-btn-secondary" 
        style={{ width: '100%', fontSize: '12px' }}
        onClick={async () => {
          const success = await giveStarterGear();
          if (success) {
            alert('Starter gear added to your warehouse!');
          }
        }}
        disabled={isGivingGear}
      >
        {isGivingGear ? 'Adding Gear...' : 'Get Starter Gear'}
      </button>
    </div>
  );

  return (
    <GameLayout 
      title="Agent Management" 
      characterActivity="hiring" 
      characterLocation="Guild Hall"
      sidebar={sidebar}
    >
      {isLoading ? (
        <div className="game-card">
          <p>Loading agents...</p>
        </div>
      ) : error ? (
        <div className="game-card">
          <p className="game-bad">Error: {error}</p>
        </div>
      ) : (
        <div className="game-flex-col">
          {/* Hire New Agent */}
          <div className="game-card">
            <h3>Hire New Agent</h3>
            <div className="game-grid-3">
              <div>
                <label className="game-small">Agent Type</label>
                <select 
                  value={selectedAgentType}
                  onChange={(e) => setSelectedAgentType(e.target.value as AgentType)}
                  style={{ width: '100%' }}
                >
                  {Object.entries(agentTypeInfo).map(([type, info]) => (
                    <option key={type} value={type}>
                      {info.name} - {getHiringCost(type as AgentType)}g
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="game-small">Hiring Cost</label>
                <div className="game-pill game-pill-warn">
                  {getHiringCost(selectedAgentType)}g
                </div>
              </div>

              <div>
                <button 
                  className="game-btn game-btn-primary"
                  onClick={handleHireAgent}
                  disabled={
                    isHiring || 
                    isGivingGear ||
                    agents.length >= 4 || 
                    (wallet?.gold || 0) < getHiringCost(selectedAgentType)
                  }
                >
                  {isHiring ? 'Hiring...' : isGivingGear ? 'Adding Gear...' : 'Hire Agent'}
                </button>
              </div>
            </div>

            {agents.length >= 4 && (
              <p className="game-warn game-small">Maximum agents reached (4/4)</p>
            )}
            {(wallet?.gold || 0) < getHiringCost(selectedAgentType) && (
              <p className="game-bad game-small">
                Insufficient gold (need {getHiringCost(selectedAgentType)}g)
              </p>
            )}
          </div>

          {/* Current Agents */}
          <div className="game-card">
            <h3>Your Agents ({agents.length}/4)</h3>
            {agents.length > 0 ? (
              <div className="game-grid-2">
                {agents.map((agent) => {
                  const levelProgress = getAgentLevelProgress(agent);
                  const typeInfo = agentTypeInfo[agent.specialty];
                  
                  return (
                    <div key={agent.id} className="game-card-sm">
                      <div className="game-space-between">
                        <h4>{agent.name}</h4>
                        <span className={`game-pill game-pill-${
                          agent.specialty === AgentType.SCOUT ? 'good' :
                          agent.specialty === AgentType.TRADER ? 'warn' :
                          agent.specialty === AgentType.GUARD ? 'bad' : 'neutral'
                        }`}>
                          {typeInfo.name}
                        </span>
                      </div>

                      <div className="game-grid-2 game-small">
                        <div>Level: {agent.level}</div>
                        <div>Active Missions: {agent._count.missions}</div>
                      </div>

                      <div className="game-progress">
                        <div 
                          className="game-progress-fill" 
                          style={{ 
                            width: `${levelProgress.xpProgress}%`,
                            background: levelProgress.canLevelUp ? '#68b06e' : '#b7b34d'
                          }}
                        >
                          XP: {levelProgress.currentXP}/{levelProgress.xpForNextLevel}
                        </div>
                      </div>

                      <div className="game-grid-3 game-tiny">
                        <div>Success: +{agent.successBonus}%</div>
                        <div>Speed: +{agent.speedBonus}%</div>
                        <div>Reward: +{agent.rewardBonus}%</div>
                      </div>

                      <h5 className="game-small">Equipment</h5>
                      <div className="game-grid-2 game-tiny">
                        <div>
                          <strong>Weapon:</strong><br />
                          <button 
                            className="game-btn-link game-tiny"
                            onClick={() => setEquipmentMode({ agentId: agent.id, slot: EquipmentSlot.WEAPON })}
                            style={{ textAlign: 'left', padding: 0 }}
                          >
                            {getSlotItemName(agent, EquipmentSlot.WEAPON)}
                          </button>
                        </div>
                        <div>
                          <strong>Armor:</strong><br />
                          <button 
                            className="game-btn-link game-tiny"
                            onClick={() => setEquipmentMode({ agentId: agent.id, slot: EquipmentSlot.ARMOR })}
                            style={{ textAlign: 'left', padding: 0 }}
                          >
                            {getSlotItemName(agent, EquipmentSlot.ARMOR)}
                          </button>
                        </div>
                        <div>
                          <strong>Tool:</strong><br />
                          <button 
                            className="game-btn-link game-tiny"
                            onClick={() => setEquipmentMode({ agentId: agent.id, slot: EquipmentSlot.TOOL })}
                            style={{ textAlign: 'left', padding: 0 }}
                          >
                            {getSlotItemName(agent, EquipmentSlot.TOOL)}
                          </button>
                        </div>
                        <div>
                          <strong>Accessory:</strong><br />
                          <button 
                            className="game-btn-link game-tiny"
                            onClick={() => setEquipmentMode({ agentId: agent.id, slot: EquipmentSlot.ACCESSORY })}
                            style={{ textAlign: 'left', padding: 0 }}
                          >
                            {getSlotItemName(agent, EquipmentSlot.ACCESSORY)}
                          </button>
                        </div>
                      </div>

                      <div className="game-space-between">
                        <span className="game-small">Hired: {new Date(agent.hiredAt).toLocaleDateString()}</span>
                        <button 
                          className="game-btn-sm"
                          onClick={() => setSelectedAgent(selectedAgent === agent.id ? '' : agent.id)}
                        >
                          {selectedAgent === agent.id ? 'Close' : 'Manage'}
                        </button>
                      </div>

                      {selectedAgent === agent.id && (
                        <div className="game-card-nested">
                          <h5>Agent Details</h5>
                          <div className="game-grid-3 game-tiny">
                            <div><strong>Level:</strong> {agent.level}</div>
                            <div><strong>XP:</strong> {agent.experience}</div>
                            <div><strong>Missions:</strong> {agent._count.missions}</div>
                          </div>
                          
                          <h5>Current Equipment Bonuses</h5>
                          <div className="game-grid-3 game-tiny">
                            <div>Success: +{agent.successBonus}%</div>
                            <div>Speed: +{agent.speedBonus}%</div>
                            <div>Reward: +{agent.rewardBonus}%</div>
                          </div>
                          
                          <p className="game-small">Click on equipment slots above to change equipment.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="game-muted">No agents hired yet. Hire your first agent above!</p>
            )}
          </div>

          {/* Agent Statistics */}
          <div className="game-card">
            <h3>Agent Statistics</h3>
            <div className="game-grid-3">
              <div className="game-space-between">
                <span>Total Agents:</span>
                <span className="game-good">{agents.length}</span>
              </div>
              <div className="game-space-between">
                <span>Active Missions:</span>
                <span className="game-warn">
                  {agents.reduce((sum, agent) => sum + agent._count.missions, 0)}
                </span>
              </div>
              <div className="game-space-between">
                <span>Average Level:</span>
                <span className="game-good">
                  {agents.length > 0 
                    ? Math.round(agents.reduce((sum, agent) => sum + agent.level, 0) / agents.length * 10) / 10
                    : 0
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Equipment Selection Modal */}
          {equipmentMode && (
            <div className="game-card">
              <h3>Equip {equipmentMode.slot.charAt(0) + equipmentMode.slot.slice(1).toLowerCase()}</h3>
              <p className="game-small">Select equipment from your inventory:</p>
              
              <div className="game-grid-2" style={{ marginBottom: '1rem' }}>
                {equipment
                  .filter(eq => eq.slot === equipmentMode.slot)
                  .filter(eq => {
                    const agent = agents.find(a => a.id === equipmentMode.agentId);
                    if (!agent) return false;
                    
                    // Check level requirement
                    if (agent.level < eq.minLevel) return false;
                    
                    // Check agent type requirement  
                    if (eq.agentType && eq.agentType !== agent.specialty) return false;
                    
                    // Check if user has this item in inventory
                    const hasItem = inventory?.inventory?.some(inv => 
                      inv.itemKey === eq.itemKey && inv.quantity > 0 && inv.location === 'warehouse'
                    );
                    
                    return hasItem;
                  })
                  .map(eq => {
                    const inventoryItem = inventory?.inventory?.find(inv => inv.itemKey === eq.itemKey);
                    const rarityColor = eq.rarity === 'COMMON' ? 'neutral' : 
                                      eq.rarity === 'UNCOMMON' ? 'good' :
                                      eq.rarity === 'RARE' ? 'warn' : 
                                      eq.rarity === 'EPIC' ? 'bad' : 'legendary';
                    
                    return (
                      <div key={eq.id} className="game-card-sm">
                        <div className="game-space-between">
                          <h5>{eq.name}</h5>
                          <span className={`game-pill game-pill-${rarityColor}`}>
                            {eq.rarity}
                          </span>
                        </div>
                        
                        {eq.description && (
                          <p className="game-tiny game-muted">{eq.description}</p>
                        )}
                        
                        <div className="game-grid-3 game-tiny">
                          <div>Success: +{eq.successBonus}%</div>
                          <div>Speed: +{eq.speedBonus}%</div>
                          <div>Reward: +{eq.rewardBonus}%</div>
                        </div>
                        
                        <div className="game-space-between game-tiny">
                          <span>Level Req: {eq.minLevel}</span>
                          <span>Owned: {inventoryItem?.quantity || 0}</span>
                        </div>
                        
                        <button 
                          className="game-btn game-btn-primary game-btn-sm"
                          onClick={() => handleEquipItem(eq.itemKey)}
                          disabled={isEquipping}
                          style={{ marginTop: '0.5rem', width: '100%' }}
                        >
                          {isEquipping ? 'Equipping...' : 'Equip'}
                        </button>
                      </div>
                    );
                  })}
              </div>
              
              {equipment.filter(eq => eq.slot === equipmentMode.slot).length === 0 && (
                <p className="game-muted">No equipment available for this slot.</p>
              )}
              
              <div className="game-space-between">
                <button 
                  className="game-btn game-btn-secondary"
                  onClick={() => setEquipmentMode(null)}
                >
                  Cancel
                </button>
                <button 
                  className="game-btn"
                  onClick={() => handleEquipItem('')}
                  disabled={isEquipping}
                >
                  {isEquipping ? 'Unequipping...' : 'Unequip Current'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </GameLayout>
  );
}