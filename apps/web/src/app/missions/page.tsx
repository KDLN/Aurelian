'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { useMissions, useStartMission, useCompleteMission, useMissionHelpers } from '@/hooks/useMissionsQuery';
import { MissionDef, MissionInstance, MissionsData } from '@/lib/api/missions';
import { useUserDataQuery } from '@/hooks/useUserDataQuery';
import { useAgents } from '@/hooks/useAgents';
import MissionTimer from '@/components/MissionTimer';
import { getCaravanStatus, formatTimeRemaining, getRiskColor as getCaravanRiskColor, getCaravanSlotName } from '@/lib/caravan-slots';
import { calculateMissionSuccess, getMissionDifficultyText } from '@/lib/missions/calculator';
import { agentTypeInfo } from '@/lib/agents/generator';
import { supabase } from '@/lib/supabaseClient';
import HelpTooltip, { RiskTooltip, DurationTooltip } from '@/components/HelpTooltip';
import ContributionModal from '@/components/server/ContributionModal';
import { triggerGlobalServerMissionsRefresh } from '@/hooks/useServerMissions';
import PageErrorBoundary from '@/components/PageErrorBoundary';
import { useOnboardingAction } from '@/hooks/useOnboardingTracker';

export default function MissionsPage() {
  const { data, isLoading, error, refetch } = useMissions(); // Uses optimized 60s polling
  const startMissionMutation = useStartMission();
  const completeMissionMutation = useCompleteMission();
  const trackOnboardingAction = useOnboardingAction();
  
  // Only load user data after component mounts to avoid blocking initial render
  const [mounted, setMounted] = useState(false);
  const { wallet, refreshData } = useUserDataQuery();
  const { agents, isLoading: agentsLoading } = useAgents();
  const [serverMissions, setServerMissions] = useState<any[]>([]);
  const [serverMissionsLoading, setServerMissionsLoading] = useState(false);
  const [selectedMissionForContribution, setSelectedMissionForContribution] = useState<any | null>(null);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch server missions
  useEffect(() => {
    const fetchServerMissions = async () => {
      setServerMissionsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const response = await fetch('/api/server/missions?status=active', {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          });
          if (response.ok) {
            const result = await response.json();
            setServerMissions(result.missions || []);
          }
        }
      } catch (error) {
        console.error('Failed to fetch server missions:', error);
      } finally {
        setServerMissionsLoading(false);
      }
    };

    fetchServerMissions();
  }, []);
  
  const missionHelpers = useMissionHelpers();
  
  const { formatDuration, getRiskColor, isReady } = missionHelpers;
  
  const [selectedMission, setSelectedMission] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
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

    if (!selectedAgent) {
      alert('Please select an agent first');
      return;
    }

    try {
      const result = await startMissionMutation.mutateAsync({ missionId: selectedMission, agentId: selectedAgent });
      if (result.success) {
        setSelectedMission('');
        setSelectedAgent('');
        alert('Mission started successfully!');
      }
    } catch (error) {
      console.error('Failed to start mission:', error);
      alert('Failed to start mission. Please try again.');
    }
  }, [selectedMission, selectedAgent, startMissionMutation]);

  const handleCompleteMission = useCallback(async (missionInstanceId: string) => {
    // Prevent double-clicks by checking if mission is already being completed
    if (completingMissions.has(missionInstanceId)) {
      console.log('⚠️ Mission already being completed, ignoring duplicate click');
      return;
    }

    // Also check if the mission is pending completion in React Query
    if (completeMissionMutation.isPending) {
      console.log('⚠️ Another mission completion in progress, ignoring click');
      return;
    }

    try {
      // Mark mission as being completed
      setCompletingMissions(prev => new Set(prev).add(missionInstanceId));
      console.log('🎯 Starting completion for mission:', missionInstanceId);
      
      const result = await completeMissionMutation.mutateAsync(missionInstanceId);
      if (result.success) {
        // Track onboarding step completion
        await trackOnboardingAction('first_mission');

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
  }, [completeMissionMutation, completingMissions, trackOnboardingAction]);


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

  // Get available agents (not on missions)
  const availableAgents = useMemo(() => {
    return agents.filter(agent => agent._count.missions === 0);
  }, [agents]);

  const sidebar = useMemo(() => (
    <div>
      <h3>Agent Status</h3>
      <div className="game-flex-col">
        <div className="game-space-between">
          <span className="game-small">Total Agents:</span>
          <span className="game-good game-small">{agents.length}</span>
        </div>
        <div className="game-space-between">
          <span className="game-small">Available:</span>
          <span className="game-good game-small">{availableAgents.length}</span>
        </div>
        <div className="game-space-between">
          <span className="game-small">On Missions:</span>
          <span className="game-warn game-small">{agents.length - availableAgents.length}</span>
        </div>
      </div>

      {availableAgents.length === 0 && agents.length === 0 && (
        <div className="game-card-sm" style={{ marginTop: '1rem' }}>
          <p className="game-warn game-small">No agents hired!</p>
          <a href="/agents" className="game-btn game-btn-primary" style={{ fontSize: 'var(--font-size-xs)' }}>
            Hire Agents
          </a>
        </div>
      )}

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
        <a href="/missions/leaderboard" className="game-btn game-btn-secondary" style={{ width: '100%', textAlign: 'center', display: 'block', marginBottom: '0.5rem' }}>
          🏆 Leaderboards
        </a>
      </div>
    </div>
  ), [mounted, wallet, activeMissions.length, agents.length, availableAgents.length]);

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
    <PageErrorBoundary pageName="Missions">
      <GameLayout 
        title="Mission Control" 
        sidebar={sidebar}
      >
      <div className="game-flex-col">
        {completionMessage && (
          <div className="game-card" style={{ backgroundColor: '#2a4d32', borderColor: '#68b06e' }}>
            <p className="game-good">{completionMessage}</p>
          </div>
        )}

        {/* Active Server Missions */}
        {serverMissions.length > 0 && (
          <div className="game-card">
            <h3>🌍 Server-Wide Events</h3>
            <p className="game-muted game-small">
              Join forces with all players to complete these massive collaborative missions!
            </p>
            
            <div className="game-grid-2" style={{ marginTop: '1rem' }}>
              {serverMissions.map((mission: any) => {
                const progress = mission.globalProgress || {};
                const requirements = mission.globalRequirements || {};
                
                // Calculate overall progress percentage
                let totalProgress = 0;
                let totalRequired = 0;
                Object.keys(requirements).forEach(key => {
                  totalProgress += progress[key] || 0;
                  totalRequired += requirements[key] || 0;
                });
                const progressPercent = totalRequired > 0 ? Math.round((totalProgress / totalRequired) * 100) : 0;
                
                const timeRemaining = mission.endsAt ? new Date(mission.endsAt).getTime() - Date.now() : 0;
                const hoursLeft = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
                
                // Check if user has participated and get their contribution
                const userParticipation = mission.userParticipation;
                const hasParticipated = !!userParticipation;
                const userContribution = userParticipation?.contribution;
                const userTier = userParticipation?.tier;
                
                return (
                  <div key={mission.id} className="game-card-nested" style={{
                    ...(hasParticipated ? {
                      backgroundColor: 'rgba(76, 175, 80, 0.05)',
                      border: '2px solid rgba(76, 175, 80, 0.3)',
                      boxShadow: '0 0 8px rgba(76, 175, 80, 0.2)'
                    } : {})
                  }}>
                    <div className="game-space-between" style={{ marginBottom: '0.5rem' }}>
                      <h4 className="game-good">{mission.name}</h4>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {hasParticipated && (
                          <span className="game-pill game-pill-good">
                            ✓ Participating{userTier ? ` (${userTier})` : ''}
                          </span>
                        )}
                        <span className={`game-pill ${
                          mission.status === 'active' ? 'game-pill-good' : 
                          mission.status === 'scheduled' ? 'game-pill-warn' : 'game-pill-muted'
                        }`}>
                          {mission.status}
                        </span>
                      </div>
                    </div>
                    
                    <p className="game-muted game-small" style={{ marginBottom: '0.5rem' }}>
                      {mission.description}
                    </p>

                    {/* User's contributions (if participated) */}
                    {hasParticipated && userContribution && (
                      <div className="game-small" style={{ 
                        marginBottom: '0.75rem',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        border: '1px solid rgba(76, 175, 80, 0.3)',
                        borderRadius: '4px',
                        padding: '8px'
                      }}>
                        <strong className="game-good">Your Total Contributions:</strong>
                        <div className="game-flex-row" style={{ flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                          {userContribution.items && Object.entries(userContribution.items).map(([key, value]) => (
                            <span key={key} className="game-pill game-pill-good game-small">
                              {key.replace(/_/g, ' ')}: {(value as number).toLocaleString()}
                            </span>
                          ))}
                          {userContribution.gold && (
                            <span className="game-pill game-pill-good game-small">
                              Gold: {userContribution.gold.toLocaleString()}
                            </span>
                          )}
                          {userContribution.trades && (
                            <span className="game-pill game-pill-good game-small">
                              Trades: {userContribution.trades.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {userParticipation.joinedAt && (
                          <div className="game-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                            Joined: {new Date(userParticipation.joinedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Requirements breakdown */}
                    <div className="game-small" style={{ marginBottom: '0.5rem' }}>
                      <strong>Required Resources:</strong>
                      <div className="game-flex-row" style={{ flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                        {Object.entries(requirements).map(([key, value]) => (
                          <span key={key} className="game-pill game-pill-muted">
                            {key.replace(/_/g, ' ')}: {(progress[key] || 0).toLocaleString()}/{(value as number).toLocaleString()}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="game-space-between" style={{ marginBottom: '0.5rem' }}>
                      <div>
                        <span className="game-small">Global Progress: </span>
                        <span className="game-good game-small">{progressPercent}%</span>
                      </div>
                      {hoursLeft > 0 && (
                        <div className="game-small game-muted">
                          {hoursLeft}h remaining
                        </div>
                      )}
                    </div>
                    
                    <div className="game-progress-bar" style={{ marginBottom: '0.5rem' }}>
                      <div 
                        className="game-progress-fill"
                        style={{ width: `${Math.min(100, progressPercent)}%` }}
                      ></div>
                    </div>
                    
                    {mission.status === 'active' && (
                      <button 
                        className={`game-btn ${hasParticipated ? 'game-btn-secondary' : 'game-btn-primary'} game-btn-small`}
                        style={{ width: '100%' }}
                        onClick={() => setSelectedMissionForContribution(mission)}
                      >
                        {hasParticipated ? '➕ Contribute More' : '🎯 Start Contributing'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mission Guide and Quick Stats */}
        <div className="game-card">
          <div className="game-grid-2">
            <div>
              <h3>Mission Control</h3>
              <p className="game-muted game-small">
                Select an agent and mission to send them on expeditions. Agents with better equipment have higher success rates.
              </p>
            </div>
            <div>
              <h4>Risk Levels <RiskTooltip /></h4>
              <div className="game-grid-3 game-small">
                <div className="game-space-between">
                  <span>Low Risk:</span>
                  <span className="game-good">85% base</span>
                </div>
                <div className="game-space-between">
                  <span>Medium Risk:</span>
                  <span className="game-warn">65% base</span>
                </div>
                <div className="game-space-between">
                  <span>High Risk:</span>
                  <span className="game-bad">40% base</span>
                </div>
              </div>
            </div>
          </div>
        </div>

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
              {missionDefs.length === 0 && !isLoading && (
                <option disabled>No missions available</option>
              )}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="game-small">Select Agent:</label>
            <select 
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              style={{ width: '100%', marginTop: '0.25rem' }}
              disabled={!selectedMission || availableAgents.length === 0}
            >
              <option value="">Choose an agent...</option>
              {availableAgents.map(agent => {
                const typeInfo = agentTypeInfo[agent.specialty];
                return (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} (Lv.{agent.level} {typeInfo.name}) - Success: +{agent.successBonus}%
                  </option>
                );
              })}
            </select>
            {availableAgents.length === 0 && (
              <p className="game-warn game-small">No available agents. <a href="/agents">Hire agents</a> or wait for current missions to complete.</p>
            )}
          </div>

          {selectedMission && selectedAgent && (
            <div className="game-card" style={{ marginBottom: '1rem' }}>
              {(() => {
                const mission = missionDefs.find(m => m.id === selectedMission);
                const agent = agents.find(a => a.id === selectedAgent);
                if (!mission || !agent) return null;

                const calculations = calculateMissionSuccess(mission as any, agent);
                const difficultyInfo = getMissionDifficultyText(mission.riskLevel as any);
                const typeInfo = agentTypeInfo[agent.specialty];

                return (
                  <div>
                    <div className="game-space-between">
                      <h4>{mission.name}</h4>
                      <span className={`game-pill game-pill-${difficultyInfo.color.replace('game-', '')}`}>
                        {difficultyInfo.text}
                      </span>
                    </div>
                    <p className="game-muted game-small">{mission.description}</p>
                    
                    <div className="game-card-nested" style={{ margin: '0.5rem 0' }}>
                      <h5>Agent: {agent.name}</h5>
                      <p className="game-small">{typeInfo.description}</p>
                      <div className="game-grid-3 game-small">
                        <div>Level: {agent.level}</div>
                        <div>Type: {typeInfo.name}</div>
                        <div>Experience: {agent.experience}</div>
                      </div>
                    </div>

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
                        <span>
                          Base Duration:
                          <DurationTooltip />
                        </span>
                        <span className="game-muted">{formatDuration(mission.baseDuration)}</span>
                      </div>
                      <div className="game-space-between">
                        <span>Agent Duration:</span>
                        <span className="game-good">{formatDuration(calculations.duration)}</span>
                      </div>
                      <div className="game-space-between">
                        <span>Base Reward:</span>
                        <span className="game-muted">{mission.baseReward}g</span>
                      </div>
                      <div className="game-space-between">
                        <span>Agent Reward:</span>
                        <span className="game-good">{calculations.estimatedReward}g</span>
                      </div>
                      <div className="game-space-between">
                        <span>Success Rate:</span>
                        <span className={`game-${calculations.successRate >= 80 ? 'good' : calculations.successRate >= 60 ? 'warn' : 'bad'}`}>
                          {calculations.successRate}%
                        </span>
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
            disabled={!selectedMission || !selectedAgent || 
                     activeMissions.some(m => m.missionId === selectedMission) ||
                     availableAgents.length === 0 ||
                     startMissionMutation.isPending}
          >
            {startMissionMutation.isPending ? 'Starting...' : 
             !selectedMission ? 'Select Mission' :
             !selectedAgent ? 'Select Agent' :
             availableAgents.length === 0 ? 'No Available Agents' :
             'Send Agent on Mission'}
          </button>
        </div>

        <div className="game-card">
          <h3>Active Missions ({activeMissions.length})</h3>
          <div className="game-flex-col">
            {activeMissions.length > 0 ? activeMissions.map(missionInstance => {
              const missionDef = missionInstance.mission || missionDefs.find(def => def.id === missionInstance.missionId);
              const agentOnMission = missionInstance.agent || agents.find(a => a.id === missionInstance.agentId);
              
              return (
              <div key={missionInstance.id} className="game-card" style={{ 
                backgroundColor: '#2a4d32',
                borderColor: '#68b06e'
              }}>
                <div className="game-space-between">
                  <div>
                    <strong>Agent: {agentOnMission?.name || 'Unknown Agent'}</strong>
                    <div className="game-good" style={{ fontSize: '14px' }}>
                      {missionDef?.name || 'Unknown Mission'}
                    </div>
                    <div className="game-muted game-small">
                      {missionDef ? `${missionDef.fromHub} → ${missionDef.toHub}` : 'Route unknown'}
                    </div>
                    {agentOnMission && (
                      <div className="game-small" style={{ marginTop: '0.25rem' }}>
                        Lv.{agentOnMission.level} {agentTypeInfo[agentOnMission.specialty]?.name}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <span className={`game-pill game-pill-${missionDef ? getRiskColor(missionDef.riskLevel) : 'neutral'}`}>
                      {missionDef?.riskLevel || 'UNKNOWN'}
                    </span>
                    <div style={{ marginTop: '0.5rem' }}>
                      <MissionTimer
                        startTime={missionInstance.startTime}
                        endTime={missionInstance.endTime}
                        onComplete={handleCompleteMission}
                        missionInstanceId={missionInstance.id}
                        riskColor={missionDef ? getRiskColor(missionDef.riskLevel) : 'neutral'}
                        isCompleting={completingMissions.has(missionInstance.id)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              );
            }) : (
              <div className="game-muted" style={{ textAlign: 'center', padding: '2rem' }}>
                No active missions. Select a mission and agent above to get started!
              </div>
            )}
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

      {/* Contribution Modal */}
      {selectedMissionForContribution && (
        <ContributionModal
          mission={selectedMissionForContribution}
          isOpen={!!selectedMissionForContribution}
          onClose={() => setSelectedMissionForContribution(null)}
          onSuccess={() => {
            // Refresh user wallet/inventory data for header
            refreshData();
            
            // Trigger global server missions refresh to update all components
            triggerGlobalServerMissionsRefresh();
            
            // Also refresh local missions data
            const fetchServerMissions = async () => {
              try {
                const response = await fetch('/api/server/missions?status=active');
                if (response.ok) {
                  const result = await response.json();
                  setServerMissions(result.missions || []);
                }
              } catch (error) {
                console.error('Failed to refresh server missions:', error);
              }
            };
            fetchServerMissions();
          }}
        />
      )}
    </GameLayout>
    </PageErrorBoundary>
  );
}