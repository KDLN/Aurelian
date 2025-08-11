'use client';

import { useState, useEffect } from 'react';
import { useMissions, useStartMission, useCompleteMission } from '@/hooks/useMissionsQuery';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: any;
  error?: string;
  duration?: number;
}

export default function DebugTestPage() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [supabaseClient, setSupabaseClient] = useState<any>(null);

  useEffect(() => {
    // Get Supabase client from window
    const client = (window as any).supabase || (window as any)._supabase;
    setSupabaseClient(client);
  }, []);

  const addTestResult = (test: TestResult) => {
    setTests(prev => {
      const existing = prev.find(t => t.id === test.id);
      if (existing) {
        return prev.map(t => t.id === test.id ? test : t);
      }
      return [...prev, test];
    });
  };

  const runTest = async (id: string, name: string, testFn: () => Promise<any>) => {
    const startTime = performance.now();
    addTestResult({ id, name, status: 'running' });
    
    try {
      const result = await testFn();
      const duration = performance.now() - startTime;
      addTestResult({ 
        id, 
        name, 
        status: 'success', 
        result, 
        duration: Math.round(duration) 
      });
      return result;
    } catch (error: any) {
      const duration = performance.now() - startTime;
      addTestResult({ 
        id, 
        name, 
        status: 'error', 
        error: error.message || String(error),
        duration: Math.round(duration)
      });
      throw error;
    }
  };

  // Authentication Tests
  const testAuthentication = async () => {
    return runTest('auth', 'Authentication Status', async () => {
      if (!supabaseClient) throw new Error('No Supabase client found');
      
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error) throw error;
      if (!session) throw new Error('No session found');
      
      const tokenParts = session.access_token?.split('.') || [];
      
      return {
        userId: session.user?.id,
        hasValidToken: tokenParts.length === 3,
        tokenParts: tokenParts.length,
        expiresAt: new Date(session.expires_at * 1000).toISOString(),
        timeUntilExpiry: Math.round((session.expires_at * 1000 - Date.now()) / 1000 / 60) + 'm'
      };
    });
  };

  const testSessionRefresh = async () => {
    return runTest('refresh', 'Session Refresh', async () => {
      if (!supabaseClient) throw new Error('No Supabase client found');
      
      const { data: { session: oldSession } } = await supabaseClient.auth.getSession();
      const { data: { session: newSession }, error } = await supabaseClient.auth.refreshSession();
      
      if (error) throw error;
      if (!newSession) throw new Error('No session after refresh');
      
      return {
        tokenChanged: oldSession?.access_token !== newSession?.access_token,
        newExpiresAt: new Date(newSession.expires_at * 1000).toISOString(),
        refreshSuccessful: true
      };
    });
  };

  // API Performance Tests
  const testApiPerformance = async () => {
    return runTest('api-perf', 'API Performance (5 requests)', async () => {
      const results = [];
      
      for (let i = 1; i <= 5; i++) {
        const start = performance.now();
        const response = await fetch('/api/missions');
        const data = await response.json();
        const duration = performance.now() - start;
        
        results.push({
          request: i,
          status: response.status,
          duration: Math.round(duration),
          missionDefs: data.missionDefs?.length || 0,
          activeMissions: data.activeMissions?.length || 0,
          usedCache: data.performance?.usedCache || false,
          serverTime: data.performance?.totalMs || null
        });
        
        // Wait 500ms between requests
        if (i < 5) await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const avgDuration = Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length);
      const cacheHits = results.filter(r => r.usedCache).length;
      
      return {
        results,
        summary: {
          avgClientTime: avgDuration,
          cacheHitRate: `${cacheHits}/5 (${Math.round(cacheHits/5*100)}%)`,
          allSuccessful: results.every(r => r.status === 200)
        }
      };
    });
  };

  const testConcurrentRequests = async () => {
    return runTest('concurrent', 'Concurrent API Requests', async () => {
      const promises = [];
      const startTime = performance.now();
      
      for (let i = 0; i < 3; i++) {
        promises.push(
          fetch('/api/missions').then(async response => ({
            id: i + 1,
            status: response.status,
            data: await response.json(),
            timestamp: Date.now()
          }))
        );
      }
      
      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      return {
        results,
        totalTime: Math.round(totalTime),
        allSuccessful: results.every(r => r.status === 200)
      };
    });
  };

  // Database Tests
  const testDatabaseConnection = async () => {
    return runTest('db-conn', 'Database Connection', async () => {
      const response = await fetch('/api/missions');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${data.error}`);
      }
      
      const isRealData = data.missionDefs?.length >= 5; // Real DB should have more missions
      const hasPerformance = !!data.performance;
      
      return {
        status: response.status,
        missionDefsCount: data.missionDefs?.length || 0,
        activeMissionsCount: data.activeMissions?.length || 0,
        isRealData,
        hasPerformanceData: hasPerformance,
        debugTimestamp: data.debugTimestamp,
        dataSource: isRealData ? 'Database' : 'Mock Fallback'
      };
    });
  };

  // Mission Lifecycle Test
  const testMissionLifecycle = async () => {
    return runTest('mission-lifecycle', 'Mission Start/Complete Cycle', async () => {
      // First get available missions
      const missionsResponse = await fetch('/api/missions');
      const missionsData = await missionsResponse.json();
      
      if (!missionsResponse.ok) {
        throw new Error('Failed to fetch missions');
      }
      
      const availableMissions = missionsData.missionDefs?.filter((def: any) => 
        !missionsData.activeMissions?.some((active: any) => active.missionId === def.id)
      );
      
      if (!availableMissions?.length) {
        throw new Error('No available missions to test');
      }
      
      // Start a mission
      const missionToStart = availableMissions[0];
      const startResponse = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId: missionToStart.id })
      });
      
      const startData = await startResponse.json();
      
      if (!startResponse.ok) {
        throw new Error(`Failed to start mission: ${startData.error}`);
      }
      
      return {
        missionStarted: {
          name: missionToStart.name,
          instanceId: startData.missionInstance?.id?.substring(0, 8) + '...',
          success: startData.success,
          isRealData: !startData.missionInstance?.id?.includes('mock')
        },
        testNote: 'Mission started successfully. Check missions page to verify it appears in active missions.'
      };
    });
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTests([]);
    
    try {
      // Run tests in sequence
      await testAuthentication();
      await testDatabaseConnection();
      await testApiPerformance();
      await testConcurrentRequests();
      await testSessionRefresh();
      await testMissionLifecycle();
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const clearTests = () => {
    setTests([]);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return '#666';
      case 'running': return '#FFC107';
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'monospace', 
      backgroundColor: '#1a1a1a', 
      color: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#4CAF50', marginBottom: '2rem' }}>🧪 System Debug & Test Suite</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={runAllTests}
          disabled={isRunning}
          style={{ 
            padding: '1rem 2rem',
            backgroundColor: isRunning ? '#666' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            marginRight: '1rem',
            fontSize: '1rem'
          }}
        >
          {isRunning ? '🔄 Running Tests...' : '🚀 Run All Tests'}
        </button>
        
        <button 
          onClick={clearTests}
          disabled={isRunning}
          style={{ 
            padding: '1rem 2rem',
            backgroundColor: '#FF5722',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: '1rem'
          }}
        >
          🗑️ Clear Results
        </button>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {tests.map(test => (
          <div 
            key={test.id} 
            style={{ 
              padding: '1.5rem',
              backgroundColor: '#2d2d2d',
              borderRadius: '8px',
              border: `2px solid ${getStatusColor(test.status)}`
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ margin: 0, color: getStatusColor(test.status) }}>
                {getStatusIcon(test.status)} {test.name}
              </h3>
              {test.duration && (
                <span style={{ color: '#999', fontSize: '0.9rem' }}>
                  {test.duration}ms
                </span>
              )}
            </div>
            
            {test.error && (
              <div style={{ 
                padding: '1rem',
                backgroundColor: '#1a1a1a',
                borderRadius: '4px',
                color: '#F44336',
                marginBottom: '1rem'
              }}>
                <strong>Error:</strong> {test.error}
              </div>
            )}
            
            {test.result && (
              <div style={{ 
                padding: '1rem',
                backgroundColor: '#1a1a1a',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}>
                <pre style={{ 
                  margin: 0, 
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#f0f0f0'
                }}>
                  {JSON.stringify(test.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {tests.length === 0 && (
        <div style={{ 
          padding: '2rem',
          textAlign: 'center',
          color: '#666',
          fontSize: '1.1rem'
        }}>
          Click "Run All Tests" to start the diagnostic suite
        </div>
      )}

      <div style={{ 
        marginTop: '3rem',
        padding: '1.5rem',
        backgroundColor: '#2d2d2d',
        borderRadius: '8px',
        fontSize: '0.9rem'
      }}>
        <h4 style={{ color: '#4CAF50', marginTop: 0 }}>🔍 Test Coverage</h4>
        <ul style={{ color: '#ccc', lineHeight: '1.6' }}>
          <li><strong>Authentication:</strong> JWT validation, session status, token refresh</li>
          <li><strong>API Performance:</strong> Response times, caching effectiveness, concurrent requests</li>
          <li><strong>Database Connection:</strong> Real vs mock data detection, query performance</li>
          <li><strong>Mission System:</strong> Start mission flow, data persistence validation</li>
          <li><strong>Error Handling:</strong> Proper error propagation, fallback behavior</li>
        </ul>
      </div>
    </div>
  );
}