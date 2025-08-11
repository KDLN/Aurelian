'use client';

import { useState, useEffect } from 'react';
import { useMissions, useStartMission, useCompleteMission } from '@/hooks/useMissionsQuery';

export default function MissionTestPage() {
  const { data, isLoading, error, refetch } = useMissions({ refetchInterval: 2000 });
  const startMissionMutation = useStartMission();
  const completeMissionMutation = useCompleteMission();
  
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState('');
  const [completingMissions, setCompletingMissions] = useState<Set<string>>(new Set());
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 19)]); // Keep last 20 logs
  };

  useEffect(() => {
    if (data) {
      addLog(`📊 Data updated - Active: ${data.activeMissions?.length || 0}, Defs: ${data.missionDefs?.length || 0}`);
    }
  }, [data]);

  const handleStartMission = async () => {
    if (!selectedMissionId) {
      addLog('❌ No mission selected');
      return;
    }

    try {
      addLog(`🚀 Starting mission: ${selectedMissionId.substring(0, 8)}...`);
      const result = await startMissionMutation.mutateAsync(selectedMissionId);
      
      if (result.success) {
        addLog(`✅ Mission started: ${result.missionInstance?.id?.substring(0, 8)}`);
        setSelectedMissionId('');
      } else {
        addLog('❌ Mission start failed');
      }
    } catch (error: any) {
      addLog(`❌ Error starting mission: ${error.message}`);
    }
  };

  const handleCompleteMission = async (missionInstanceId: string) => {
    // Prevent double-clicks by checking if mission is already being completed
    if (completingMissions.has(missionInstanceId)) {
      addLog(`⚠️ Mission ${missionInstanceId.substring(0, 8)} already being completed, ignoring duplicate click`);
      return;
    }

    try {
      // Mark mission as being completed
      setCompletingMissions(prev => new Set(prev).add(missionInstanceId));
      addLog(`🎯 Completing mission: ${missionInstanceId.substring(0, 8)}...`);
      
      const result = await completeMissionMutation.mutateAsync(missionInstanceId);
      
      if (result.success) {
        const outcome = result.missionSuccess ? 'SUCCESS' : 'FAILED';
        const rewards = result.rewards?.gold || 0;
        addLog(`✅ Mission completed: ${outcome} - ${rewards}g earned`);
      }
    } catch (error: any) {
      addLog(`❌ Error completing mission: ${error.message}`);
    } finally {
      // Always remove from completing set, even on error
      setCompletingMissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(missionInstanceId);
        return newSet;
      });
    }
  };

  const clearLogs = () => setLogs([]);
  
  const handleForceRefresh = () => {
    addLog('🔄 Force refreshing data...');
    refetch();
  };

  if (isLoading && !data) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
        <h1>Mission Test Page</h1>
        <p>Loading missions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
        <h1>Mission Test Page</h1>
        <p style={{ color: 'red' }}>Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  const missionDefs = data?.missionDefs || [];
  const activeMissions = data?.activeMissions || [];
  
  // Filter available missions
  const availableMissions = missionDefs.filter(def => 
    !activeMissions.some(active => active.missionId === def.id)
  );

  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'monospace', 
      backgroundColor: '#1a1a1a', 
      color: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#4CAF50' }}>🧪 Mission Test Page</h1>
      
      {/* Status Overview */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#2d2d2d', 
          borderRadius: '8px',
          border: `2px solid ${activeMissions.length > 0 ? '#4CAF50' : '#666'}`
        }}>
          <h3>Active Missions</h3>
          <div style={{ fontSize: '2rem', color: activeMissions.length > 0 ? '#4CAF50' : '#999' }}>
            {activeMissions.length}
          </div>
        </div>
        
        <div style={{ padding: '1rem', backgroundColor: '#2d2d2d', borderRadius: '8px', border: '2px solid #666' }}>
          <h3>Available Missions</h3>
          <div style={{ fontSize: '2rem', color: '#FFC107' }}>
            {availableMissions.length}
          </div>
        </div>
        
        <div style={{ padding: '1rem', backgroundColor: '#2d2d2d', borderRadius: '8px', border: '2px solid #666' }}>
          <h3>Loading Status</h3>
          <div style={{ fontSize: '1rem', color: isLoading ? '#FF9800' : '#4CAF50' }}>
            {isLoading ? '🔄 Loading...' : '✅ Ready'}
          </div>
        </div>
      </div>

      {/* Mission Controls */}
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#2d2d2d', borderRadius: '8px' }}>
        <h3>Mission Controls</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label>Start Mission:</label>
          <select 
            value={selectedMissionId}
            onChange={(e) => setSelectedMissionId(e.target.value)}
            style={{ 
              marginLeft: '1rem', 
              padding: '0.5rem', 
              backgroundColor: '#1a1a1a',
              color: '#f0f0f0',
              border: '1px solid #666',
              borderRadius: '4px',
              minWidth: '300px'
            }}
          >
            <option value="">Select a mission...</option>
            {availableMissions.map(mission => (
              <option key={mission.id} value={mission.id}>
                {mission.name} - {Math.floor(mission.baseDuration / 60)}min - {mission.baseReward}g
              </option>
            ))}
          </select>
          
          <button 
            onClick={handleStartMission}
            disabled={!selectedMissionId || startMissionMutation.isPending}
            style={{ 
              marginLeft: '1rem', 
              padding: '0.5rem 1rem',
              backgroundColor: selectedMissionId ? '#4CAF50' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: selectedMissionId ? 'pointer' : 'not-allowed'
            }}
          >
            {startMissionMutation.isPending ? 'Starting...' : 'Start Mission'}
          </button>
        </div>

        <div>
          <button 
            onClick={handleForceRefresh}
            disabled={isLoading}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '1rem'
            }}
          >
            🔄 Force Refresh
          </button>
          
          <button 
            onClick={clearLogs}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: '#FF5722',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear Logs
          </button>
        </div>
      </div>

      {/* Active Missions */}
      {activeMissions.length > 0 && (
        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#2d2d2d', borderRadius: '8px' }}>
          <h3>Active Missions ({activeMissions.length})</h3>
          
          {activeMissions.map(mission => {
            const timeLeft = Math.max(0, Math.ceil((new Date(mission.endTime).getTime() - Date.now()) / 1000));
            const isReady = timeLeft <= 0;
            
            return (
              <div key={mission.id} style={{ 
                padding: '1rem', 
                margin: '0.5rem 0',
                backgroundColor: '#1a1a1a',
                borderRadius: '4px',
                border: `2px solid ${isReady ? '#4CAF50' : '#FFC107'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div><strong>{mission.mission?.name || 'Unknown Mission'}</strong></div>
                    <div style={{ color: '#999', fontSize: '0.9rem' }}>
                      ID: {mission.id.substring(0, 8)}... | Status: {mission.status}
                    </div>
                    <div style={{ color: isReady ? '#4CAF50' : '#FFC107' }}>
                      {isReady ? '✅ Ready to Complete!' : `⏰ Time Left: ${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s`}
                    </div>
                  </div>
                  
                  {isReady && (
                    <button
                      onClick={() => handleCompleteMission(mission.id)}
                      disabled={completingMissions.has(mission.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: completingMissions.has(mission.id) ? '#666' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: completingMissions.has(mission.id) ? 'not-allowed' : 'pointer',
                        opacity: completingMissions.has(mission.id) ? 0.6 : 1
                      }}
                    >
                      {completingMissions.has(mission.id) ? 'Completing...' : 'Complete Mission'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity Logs */}
      <div style={{ padding: '1rem', backgroundColor: '#2d2d2d', borderRadius: '8px' }}>
        <h3>Activity Logs</h3>
        <div style={{ 
          height: '300px', 
          overflowY: 'auto', 
          backgroundColor: '#1a1a1a', 
          padding: '1rem',
          borderRadius: '4px',
          border: '1px solid #666'
        }}>
          {logs.length === 0 ? (
            <div style={{ color: '#666' }}>No logs yet...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ 
                marginBottom: '0.5rem',
                paddingBottom: '0.5rem',
                borderBottom: index < logs.length - 1 ? '1px solid #333' : 'none'
              }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Debug Info */}
      <details style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#2d2d2d', borderRadius: '8px' }}>
        <summary style={{ cursor: 'pointer', fontSize: '1.2rem' }}>🔍 Debug Information</summary>
        <pre style={{ 
          backgroundColor: '#1a1a1a', 
          padding: '1rem', 
          borderRadius: '4px',
          overflow: 'auto',
          fontSize: '0.8rem',
          marginTop: '1rem'
        }}>
          {JSON.stringify({
            timestamp: new Date().toISOString(),
            dataLoaded: !!data,
            isLoading,
            hasError: !!error,
            missionDefsCount: missionDefs.length,
            activeMissionsCount: activeMissions.length,
            availableMissionsCount: availableMissions.length,
            debugTimestamp: data?.debugTimestamp,
            activeMissionDetails: activeMissions.map(m => ({
              id: m.id.substring(0, 8),
              missionId: m.missionId,
              status: m.status,
              endTime: m.endTime,
              timeRemaining: Math.max(0, Math.ceil((new Date(m.endTime).getTime() - Date.now()) / 1000))
            }))
          }, null, 2)}
        </pre>
      </details>
    </div>
  );
}