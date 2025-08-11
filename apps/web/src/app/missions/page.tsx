'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { useMissions, useStartMission, useCompleteMission, useMissionHelpers } from '@/hooks/useMissionsQuery';
import { MissionDef, MissionInstance } from '@/lib/api/missions';
import { useUserDataQuery } from '@/hooks/useUserDataQuery';
import MissionTimer from '@/components/MissionTimer';

export default function MissionsPage() {
  const { data, isLoading, error, refetch } = useMissions();
  const startMissionMutation = useStartMission();
  const completeMissionMutation = useCompleteMission();
  
  // Only load user data after component mounts to avoid blocking initial render
  const [mounted, setMounted] = useState(false);
  const { wallet } = useUserDataQuery();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const missionHelpers = useMissionHelpers();
  const { formatDuration, getRiskColor, isReady } = missionHelpers;
  
  const [selectedMission, setSelectedMission] = useState<string>('');
  const [completionMessage, setCompletionMessage] = useState<string>('');

  // Extract data with safe defaults
  const missionDefs = data?.missionDefs ?? [];
  const activeMissions = data?.activeMissions ?? [];

  const handleStartMission = useCallback(async () => {
    if (!selectedMission) {
      alert('Please select a mission first');
      return;
    }

    try {
      const result = await startMissionMutation.mutateAsync(selectedMission);
      if (result.success) {
        setSelectedMission('');
        alert('Mission started successfully!');
      }
    } catch (error) {
      console.error('Failed to start mission:', error);
      alert('Failed to start mission. Please try again.');
    }
  }, [selectedMission, startMissionMutation]);

  const handleCompleteMission = useCallback(async (missionInstanceId: string) => {
    try {
      const result = await completeMissionMutation.mutateAsync(missionInstanceId);
      if (result.success) {
        const rewards = result.rewards;
        const goldText = rewards?.gold && rewards.gold > 0 ? `${rewards.gold} gold` : '';
        const itemsText = rewards?.items?.length 
          ? rewards.items.map((item: any) => `${item.qty} ${item.itemKey}`).join(', ')
          : '';
        const rewardText = [goldText, itemsText].filter(Boolean).join(' and ');
        
        if (result.missionSuccess) {
          setCompletionMessage(`Mission completed successfully! Received: ${rewardText}`);
        } else {
          setCompletionMessage('Mission failed! You received partial or no rewards.');
        }
        setTimeout(() => setCompletionMessage(''), 5000);
      }
    } catch (error) {
      console.error('Failed to complete mission:', error);
      setCompletionMessage('Failed to complete mission. Please try again.');
      setTimeout(() => setCompletionMessage(''), 5000);
    }
  }, [completeMissionMutation]);

  // Memoize expensive calculations
  const activeMissionsWithStatus = useMemo(() => {
    return activeMissions.map(mission => ({
      ...mission,
      missionDef: mission.mission || missionDefs.find(def => def.id === mission.missionId),
    }));
  }, [activeMissions, missionDefs]);

  const readyMissionsCount = useMemo(() => {
    return activeMissions.filter(m => isReady(m.endTime)).length;
  }, [activeMissions, isReady]);

  const sidebar = useMemo(() => (
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

      {mounted && wallet && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Your Gold</h3>
          <div className="game-pill game-pill-good" style={{ fontSize: '18px', textAlign: 'center' }}>
            {wallet.gold.toLocaleString()}g
          </div>
        </div>
      )}
    </div>
  ), [mounted, wallet]);

  if (isLoading) {
    return (
      <GameLayout title="Mission Control" sidebar={<div>Loading...</div>}>
        <div className="game-card">
          <div className="game-flex" style={{ alignItems: 'center', gap: '1rem' }}>
            <div>Loading missions...</div>
            <div className="game-spinner" />
          </div>
        </div>
      </GameLayout>
    );
  }

  if (error) {
    return (
      <GameLayout title="Mission Control" sidebar={sidebar}>
        <div className="game-card">
          <h3>Error</h3>
          <p className="game-bad">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <button 
            className="game-btn game-btn-primary" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            {isLoading ? 'Retrying...' : 'Retry'}
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
            disabled={!selectedMission || 
                     activeMissions.some(m => m.missionId === selectedMission) ||
                     startMissionMutation.isPending}
          >
            {startMissionMutation.isPending ? 'Starting...' : 'Start Mission'}
          </button>
        </div>

        <div className="game-card">
          <h3>Active Missions ({activeMissions.length})</h3>
          {activeMissions.length > 0 ? (
            <div className="game-flex-col">
              {activeMissionsWithStatus.map(mission => (
                <div key={mission.id} className="game-card">
                  <div className="game-space-between">
                    <div>
                      <strong>{mission.missionDef?.name || 'Unknown Mission'}</strong>
                      <div className="game-muted game-small">
                        {mission.missionDef?.fromHub} → {mission.missionDef?.toHub}
                      </div>
                    </div>
                    <span className={`game-pill game-pill-${getRiskColor(mission.missionDef?.riskLevel || 'LOW')}`}>
                      {mission.missionDef?.riskLevel || 'LOW'}
                    </span>
                  </div>
                  
                  <MissionTimer
                    startTime={mission.startTime}
                    endTime={mission.endTime}
                    onComplete={handleCompleteMission}
                    missionInstanceId={mission.id}
                    riskColor={getRiskColor(mission.missionDef?.riskLevel || 'LOW')}
                    isCompleting={completeMissionMutation.isPending}
                  />
                </div>
              ))}
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
              <span className="game-good">{readyMissionsCount}</span>
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}