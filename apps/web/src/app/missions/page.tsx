'use client';

import { useState } from 'react';
import GameLayout from '@/components/GameLayout';
import { useGameWorld } from '@/lib/game/world';

export default function MissionsPage() {
  const { world } = useGameWorld();
  const [selectedItem, setSelectedItem] = useState('Iron Ore');
  const [quantity, setQuantity] = useState(10);
  const [risk, setRisk] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
  const [hours, setHours] = useState(6);

  const handleSendMission = () => {
    if (quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    const missionId = world.sendMission(selectedItem, quantity, risk, hours);
    alert(`Mission sent! ID: ${missionId.slice(0, 8)}`);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'good';
      case 'MEDIUM': return 'warn';
      case 'HIGH': return 'bad';
      default: return 'muted';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'good';
    if (progress >= 75) return 'warn';
    return 'muted';
  };

  const sidebar = (
    <div>
      <h3>Mission Guide</h3>
      <p className="game-muted game-small">
        Send caravans to gather resources. Higher risk missions have better rewards but higher failure rates.
      </p>
      
      <div className="game-flex-col">
        <div className="game-space-between">
          <span className="game-small">Low Risk:</span>
          <span className="game-good game-small">5% fail</span>
        </div>
        <div className="game-space-between">
          <span className="game-small">Medium Risk:</span>
          <span className="game-warn game-small">15% fail</span>
        </div>
        <div className="game-space-between">
          <span className="game-small">High Risk:</span>
          <span className="game-bad game-small">30% fail</span>
        </div>
      </div>
    </div>
  );

  return (
    <GameLayout 
      title="Mission Control" 
      characterActivity="mission" 
      characterLocation="Mission Hall"
      sidebar={sidebar}
    >
      <div className="game-flex-col">
        <div className="game-card">
          <h3>Send New Mission</h3>
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
                max="100"
                style={{ width: '100%' }}
              />
            </div>
            
            <div>
              <label className="game-small">Risk Level</label>
              <select 
                value={risk}
                onChange={(e) => setRisk(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                style={{ width: '100%' }}
              >
                <option value="LOW">Low (5% fail chance)</option>
                <option value="MEDIUM">Medium (15% fail chance)</option>
                <option value="HIGH">High (30% fail chance)</option>
              </select>
            </div>
            
            <div>
              <label className="game-small">Duration (hours)</label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                min="1"
                max="24"
                style={{ width: '100%' }}
              />
            </div>
          </div>
          
          <button 
            className="game-btn game-btn-primary"
            onClick={handleSendMission}
            style={{ marginTop: '12px' }}
          >
            Send Mission ({hours}h for {quantity} {selectedItem})
          </button>
        </div>

        <div className="game-card">
          <h3>Active Missions ({world.missions.length})</h3>
          {world.missions.length > 0 ? (
            <div className="game-flex-col">
              {world.missions.map(mission => (
                <div key={mission.id} className="game-card">
                  <div className="game-space-between">
                    <div>
                      <strong>{mission.item} x{mission.qty}</strong>
                      <div className="game-muted game-small">
                        ID: {mission.id.slice(0, 8)}
                      </div>
                    </div>
                    <span className={`game-pill game-pill-${getRiskColor(mission.risk)}`}>
                      {mission.risk}
                    </span>
                  </div>
                  
                  <div style={{ marginTop: '8px' }}>
                    <div className="game-progress">
                      <div 
                        className="game-progress-fill" 
                        style={{ 
                          width: `${mission.progress}%`,
                          background: mission.progress >= 100 ? '#68b06e' : '#b7b34d'
                        }}
                      >
                        {mission.progress >= 100 ? 'Complete!' : `${mission.progress}%`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="game-space-between game-small game-muted" style={{ marginTop: '4px' }}>
                    <span>ETA: {Math.max(0, mission.eta - (world.day - 1) * 24 * 60 - world.minute)}min</span>
                    <span>
                      {mission.progress >= 100 ? 'Ready for collection' : 'In progress'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="game-muted">No active missions</p>
          )}
        </div>

        <div className="game-card">
          <h3>Mission Statistics</h3>
          <div className="game-grid-3">
            <div className="game-space-between">
              <span>Total Active:</span>
              <span className="game-good">{world.missions.length}</span>
            </div>
            <div className="game-space-between">
              <span>Completed:</span>
              <span className="game-good">
                {world.missions.filter(m => m.progress >= 100).length}
              </span>
            </div>
            <div className="game-space-between">
              <span>In Progress:</span>
              <span className="game-warn">
                {world.missions.filter(m => m.progress < 100).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}