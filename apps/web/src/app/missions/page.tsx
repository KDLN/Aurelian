'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { useMissions, MissionDef, MissionInstance } from '@/hooks/useMissions';
import { useUserData } from '@/hooks/useUserData';

export default function MissionsPage() {
  const { missionDefs, activeMissions, loading, error, startMission, completeMission, refreshMissions } = useMissions();
  const { wallet } = useUserData();
  const [selectedMission, setSelectedMission] = useState<string>('');
  const [completionMessage, setCompletionMessage] = useState<string>('');

  // Auto-refresh missions every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshMissions();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshMissions]);

  const handleStartMission = async () => {
    if (!selectedMission) {
      alert('Please select a mission first');
      return;
    }

    const success = await startMission(selectedMission);
    if (success) {
      setSelectedMission('');
      alert('Mission started successfully!');
    }
  };

  const handleCompleteMission = async (missionInstanceId: string) => {
    const result = await completeMission(missionInstanceId);
    if (result.success !== undefined) {
      if (result.success) {
        const rewards = result.rewards;
        const goldText = rewards?.gold > 0 ? `${rewards.gold} gold` : '';
        const itemsText = rewards?.items?.length > 0 
          ? rewards.items.map((item: any) => `${item.qty} ${item.itemKey}`).join(', ')
          : '';
        const rewardText = [goldText, itemsText].filter(Boolean).join(' and ');
        setCompletionMessage(`Mission completed successfully! Received: ${rewardText}`);
      } else {
        setCompletionMessage('Mission failed! You received partial or no rewards.');
      }
      setTimeout(() => setCompletionMessage(''), 5000);
    }
  };

  const formatTimeRemaining = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ready!';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getMissionProgress = (startTime: string, endTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
    return Math.floor(progress);
  };

  const isReady = (endTime: string) => {
    return new Date() >= new Date(endTime);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'good';
      case 'MEDIUM': return 'warn';
      case 'HIGH': return 'bad';
      default: return 'muted';
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const sidebar = (
    <div>
      <h3>Mission Guide</h3>
      <p className="game-muted game-small">
        Select missions to send your caravans on expeditions. Higher risk missions offer better rewards.
      </p>
      
      <div className="game-flex-col">
        <div className="game-space-between">
          <span className="game-small">Low Risk:</span>
          <span className="game-good game-small">95% success</span>
        </div>
        <div className="game-space-between">
          <span className="game-small">Medium Risk:</span>
          <span className="game-warn game-small">85% success</span>
        </div>
        <div className="game-space-between">
          <span className="game-small">High Risk:</span>
          <span className="game-bad game-small">75% success</span>
        </div>
      </div>

      {wallet && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Your Gold</h3>
          <div className="game-pill game-pill-good" style={{ fontSize: '18px', textAlign: 'center' }}>
            {wallet.gold.toLocaleString()}g
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <GameLayout title="Mission Control" sidebar={<div>Loading...</div>}>
        <div>Loading missions...</div>
      </GameLayout>
    );
  }

  if (error) {
    return (
      <GameLayout title="Mission Control" sidebar={sidebar}>
        <div className="game-card">
          <h3>Error</h3>
          <p className="game-bad">{error}</p>
          <button 
            className="game-btn game-btn-primary" 
            onClick={refreshMissions}
          >
            Retry
          </button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout 
      title="Mission Control" 
      characterActivity="mission" 
      characterLocation="Mission Hall"
      sidebar={sidebar}
    >
      <div className="game-flex-col">
        {completionMessage && (
          <div className="game-card" style={{ backgroundColor: '#2a4d32', borderColor: '#68b06e' }}>
            <p className="game-good">{completionMessage}</p>
          </div>
        )}

        <div className="game-card">
          <h3>Available Missions</h3>
          <div style={{ marginBottom: '1rem' }}>
            <label className="game-small">Select Mission:</label>
            <select 
              value={selectedMission}
              onChange={(e) => setSelectedMission(e.target.value)}
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              <option value="">Choose a mission...</option>
              {missionDefs.map(mission => {
                const hasActiveMission = activeMissions.some(active => active.missionId === mission.id);
                return (
                  <option 
                    key={mission.id} 
                    value={mission.id}
                    disabled={hasActiveMission}
                  >
                    {mission.name} - {formatDuration(mission.baseDuration)} - {mission.baseReward}g {hasActiveMission ? '(Active)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedMission && (
            <div className="game-card" style={{ marginBottom: '1rem' }}>
              {(() => {
                const mission = missionDefs.find(m => m.id === selectedMission);
                if (!mission) return null;
                return (
                  <div>
                    <div className="game-space-between">
                      <h4>{mission.name}</h4>
                      <span className={`game-pill game-pill-${getRiskColor(mission.riskLevel)}`}>
                        {mission.riskLevel} RISK
                      </span>
                    </div>
                    <p className="game-muted game-small">{mission.description}</p>
                    <div className="game-grid-2" style={{ marginTop: '0.5rem' }}>
                      <div className="game-space-between">
                        <span>Route:</span>
                        <span>{mission.fromHub} → {mission.toHub}</span>
                      </div>
                      <div className="game-space-between">
                        <span>Distance:</span>
                        <span>{mission.distance} km</span>
                      </div>
                      <div className="game-space-between">
                        <span>Duration:</span>
                        <span>{formatDuration(mission.baseDuration)}</span>
                      </div>
                      <div className="game-space-between">
                        <span>Gold Reward:</span>
                        <span className="game-good">{mission.baseReward}g</span>
                      </div>
                    </div>
                    {mission.itemRewards && mission.itemRewards.length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <span className="game-small">Item Rewards:</span>
                        <div className="game-flex" style={{ gap: '0.5rem', marginTop: '0.25rem' }}>
                          {mission.itemRewards.map((reward, idx) => (
                            <span key={idx} className="game-pill game-pill-good">
                              {reward.qty} {reward.itemKey.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          
          <button 
            className="game-btn game-btn-primary"
            onClick={handleStartMission}
            disabled={!selectedMission || activeMissions.some(m => m.missionId === selectedMission)}
          >
            Start Mission
          </button>
        </div>

        <div className="game-card">
          <h3>Active Missions ({activeMissions.length})</h3>
          {activeMissions.length > 0 ? (
            <div className="game-flex-col">
              {activeMissions.map(mission => {
                const progress = getMissionProgress(mission.startTime, mission.endTime);
                const ready = isReady(mission.endTime);
                const missionDef = mission.mission || missionDefs.find(def => def.id === mission.missionId);
                
                return (
                  <div key={mission.id} className="game-card">
                    <div className="game-space-between">
                      <div>
                        <strong>{missionDef?.name || 'Unknown Mission'}</strong>
                        <div className="game-muted game-small">
                          {missionDef?.fromHub} → {missionDef?.toHub}
                        </div>
                      </div>
                      <span className={`game-pill game-pill-${getRiskColor(missionDef?.riskLevel || 'LOW')}`}>
                        {missionDef?.riskLevel || 'LOW'}
                      </span>
                    </div>
                    
                    <div style={{ marginTop: '8px' }}>
                      <div className="game-progress">
                        <div 
                          className="game-progress-fill" 
                          style={{ 
                            width: `${progress}%`,
                            background: ready ? '#68b06e' : '#b7b34d'
                          }}
                        >
                          {ready ? 'Ready!' : `${progress}%`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="game-space-between game-small" style={{ marginTop: '4px' }}>
                      <span>
                        Time remaining: {formatTimeRemaining(mission.endTime)}
                      </span>
                      {ready && (
                        <button 
                          className="game-btn game-btn-small game-btn-primary"
                          onClick={() => handleCompleteMission(mission.id)}
                        >
                          Complete Mission
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="game-muted">No active missions. Start one from the available missions above!</p>
          )}
        </div>

        <div className="game-card">
          <h3>Mission Statistics</h3>
          <div className="game-grid-3">
            <div className="game-space-between">
              <span>Available:</span>
              <span className="game-good">{missionDefs.length}</span>
            </div>
            <div className="game-space-between">
              <span>Active:</span>
              <span className="game-warn">{activeMissions.length}</span>
            </div>
            <div className="game-space-between">
              <span>Ready:</span>
              <span className="game-good">
                {activeMissions.filter(m => isReady(m.endTime)).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}