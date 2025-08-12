'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { useMissions, useStartMission, useCompleteMission, useMissionHelpers } from '@/hooks/useMissionsQuery';
import { MissionDef, MissionInstance, MissionsData } from '@/lib/api/missions';
import { useUserDataQuery } from '@/hooks/useUserDataQuery';
import MissionTimer from '@/components/MissionTimer';
import { getCaravanStatus, formatTimeRemaining, getRiskColor as getCaravanRiskColor, getCaravanSlotName } from '@/lib/caravan-slots';

export default function MissionsPage() {
  const { data, isLoading, error, refetch } = useMissions(); // Uses optimized 60s polling
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
  const [completingMissions, setCompletingMissions] = useState<Set<string>>(new Set());

  // Extract data with safe defaults and proper typing
  const missionDefs = (data as MissionsData | undefined)?.missionDefs ?? [];
  const activeMissions = (data as MissionsData | undefined)?.activeMissions ?? [];
  
  // Debug logging to track mission state changes
  console.log('🎯 [MissionsPage] Current state:', {
    isLoading,
    hasData: !!data,
    missionDefCount: missionDefs.length,
    activeMissionCount: activeMissions.length,
    activeMissionIds: activeMissions.map(m => ({ id: m.id, missionId: m.missionId }))
  });

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
    // Prevent double-clicks by checking if mission is already being completed
    if (completingMissions.has(missionInstanceId)) {
      console.log('⚠️ Mission already being completed, ignoring duplicate click');
      return;
    }

    try {
      // Mark mission as being completed
      setCompletingMissions(prev => new Set(prev).add(missionInstanceId));
      console.log('🎯 Starting completion for mission:', missionInstanceId);
      
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
    } finally {
      // Always remove from completing set, even on error
      setCompletingMissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(missionInstanceId);
        return newSet;
      });
      console.log('🏁 Completion finished for mission:', missionInstanceId);
    }
  }, [completeMissionMutation, completingMissions]);

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

  const caravanStatus = useMemo(() => {
    return getCaravanStatus(activeMissions, 3); // Default 3 caravan slots
  }, [activeMissions]);

  const sidebar = useMemo(() => (
    <div>
      <h3>Mission Guide</h3>
      <p className="game-muted game-small">
        You have 3 caravan slots available. Select missions to send your caravans on expeditions. Higher risk missions offer better rewards.
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
      
      <div style={{ marginTop: '1rem' }}>
        <a href="/missions/stats" className="game-btn game-btn-secondary" style={{ width: '100%', textAlign: 'center', display: 'block', marginBottom: '0.5rem' }}>
          📊 View Statistics
        </a>
        <a href="/missions/leaderboard" className="game-btn game-btn-secondary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
          🏆 Leaderboards
        </a>
      </div>
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
                     caravanStatus.availableSlots === 0 ||
                     startMissionMutation.isPending}
          >
            {startMissionMutation.isPending ? 'Starting...' : 
             caravanStatus.availableSlots === 0 ? 'All Caravans Busy' :
             'Start Mission'}
          </button>
        </div>

        <div className="game-card">
          <h3>Your Caravans ({caravanStatus.occupiedSlots}/{caravanStatus.totalSlots})</h3>
          <div className="game-flex-col">
            {caravanStatus.slots.map(slot => (
              <div key={slot.slotNumber} className="game-card" style={{ 
                backgroundColor: slot.isOccupied ? '#2a4d32' : '#1a1a1a',
                borderColor: slot.isOccupied ? '#68b06e' : '#333'
              }}>
                <div className="game-space-between">
                  <div>
                    <strong>{getCaravanSlotName(slot.slotNumber)}</strong>
                    {slot.isOccupied && slot.mission ? (
                      <div>
                        <div className="game-good" style={{ fontSize: '14px' }}>
                          {slot.mission.name}
                        </div>
                        <div className="game-muted game-small">
                          {(() => {
                            const activeMission = activeMissionsWithStatus.find(m => m.id === slot.mission?.id);
                            const missionDef = activeMission?.missionDef;
                            return missionDef ? `${missionDef.fromHub} → ${missionDef.toHub}` : 'Route unknown';
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="game-muted game-small">Available</div>
                    )}
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    {slot.isOccupied && slot.mission ? (
                      <div>
                        <span className={`game-pill game-pill-${getRiskColor(slot.mission.riskLevel)}`}>
                          {slot.mission.riskLevel}
                        </span>
                        <div style={{ marginTop: '0.5rem' }}>
                          {(() => {
                            const activeMission = activeMissionsWithStatus.find(m => m.id === slot.mission?.id);
                            return activeMission ? (
                              <MissionTimer
                                startTime={activeMission.startTime}
                                endTime={activeMission.endTime}
                                onComplete={handleCompleteMission}
                                missionInstanceId={activeMission.id}
                                riskColor={getRiskColor(slot.mission.riskLevel)}
                                isCompleting={completingMissions.has(activeMission.id)}
                              />
                            ) : (
                              <div className="game-small">Timer unavailable</div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <span className="game-pill">Empty</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
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