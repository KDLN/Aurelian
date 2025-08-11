'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  data?: any;
}

export default function TestsPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test 1: Check Supabase authentication
    await runTest('Supabase Auth Check', async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) throw new Error('No authenticated user');
      return { userId: user.id, email: user.email };
    });

    // Test 2: Get auth session for API calls
    await runTest('Get Auth Session', async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session) throw new Error('No session found');
      return { 
        hasToken: !!session.access_token,
        tokenLength: session.access_token.length,
        expiresAt: new Date(session.expires_at! * 1000).toISOString()
      };
    });

    // Test 3: Test missions GET endpoint
    await runTest('Missions API - GET', async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session for API test');

      const response = await fetch('/api/missions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData, null, 2)}`);
      }

      const data = await response.json();
      return {
        missionDefsCount: data.missionDefs?.length || 0,
        activeMissionsCount: data.activeMissions?.length || 0,
        hasDebugTimestamp: !!data.debugTimestamp,
        debugTimestamp: data.debugTimestamp
      };
    });

    // Test 4: Test missions POST endpoint (start mission)
    await runTest('Missions API - POST (Start)', async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session for API test');

      // First get available missions
      const getResponse = await fetch('/api/missions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!getResponse.ok) {
        throw new Error(`Failed to get missions: HTTP ${getResponse.status}`);
      }

      const missionsData = await getResponse.json();
      if (!missionsData.missionDefs || missionsData.missionDefs.length === 0) {
        return { message: 'No missions available to test' };
      }

      const testMissionId = missionsData.missionDefs[0].id;

      // Try to start the mission
      const response = await fetch('/api/missions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ missionId: testMissionId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData, null, 2)}`);
      }

      const data = await response.json();
      return {
        success: data.success,
        missionInstanceId: data.missionInstance?.id,
        status: data.missionInstance?.status
      };
    });

    // Test 5: Check environment variables
    await runTest('Environment Variables', async () => {
      const response = await fetch('/api/test-env');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return data;
    });

    // Test 6: Direct database test
    await runTest('Database Connection', async () => {
      const response = await fetch('/api/test-db');
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData, null, 2)}`);
      }
      const data = await response.json();
      return data;
    });

    // Test 7: Test wallet endpoint
    await runTest('Wallet API', async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session for API test');

      const response = await fetch('/api/user/wallet', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData, null, 2)}`);
      }

      const data = await response.json();
      return data;
    });

    // Test 8: Test inventory endpoint
    await runTest('Inventory API', async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session for API test');

      const response = await fetch('/api/user/inventory', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData, null, 2)}`);
      }

      const data = await response.json();
      return data;
    });

    setIsRunning(false);
  };

  const runTest = async (name: string, testFn: () => Promise<any>) => {
    const testResult: TestResult = {
      name,
      status: 'pending'
    };

    setTestResults(prev => [...prev, testResult]);

    try {
      const data = await testFn();
      setTestResults(prev => 
        prev.map(t => 
          t.name === name 
            ? { ...t, status: 'success', data, message: 'Test passed' }
            : t
        )
      );
    } catch (error) {
      setTestResults(prev => 
        prev.map(t => 
          t.name === name 
            ? { 
                ...t, 
                status: 'error', 
                message: error instanceof Error ? error.message : 'Unknown error',
                data: error instanceof Error && 'stack' in error ? error.stack : undefined
              }
            : t
        )
      );
    }
  };

  useEffect(() => {
    // Auto-run tests on mount
    runTests();
  }, []);

  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'monospace', 
      backgroundColor: '#1a1611', 
      color: '#f1e5c8',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#b7b34d' }}>🧪 API Test Suite</h1>
      
      <button 
        onClick={runTests}
        disabled={isRunning}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#b7b34d',
          color: '#1a1611',
          border: 'none',
          cursor: isRunning ? 'not-allowed' : 'pointer',
          marginBottom: '2rem'
        }}
      >
        {isRunning ? 'Running Tests...' : 'Run All Tests'}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {testResults.map((result, index) => (
          <div 
            key={index}
            style={{
              padding: '1rem',
              border: '1px solid #3a3123',
              backgroundColor: '#231913',
              borderLeftWidth: '4px',
              borderLeftColor: 
                result.status === 'success' ? '#68b06e' : 
                result.status === 'error' ? '#d9534f' : 
                '#b7b34d'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>
                {result.status === 'success' ? '✅' : 
                 result.status === 'error' ? '❌' : 
                 '⏳'}
              </span>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: '#f1e5c8' }}>{result.name}</h3>
                {result.message && (
                  <p style={{ 
                    margin: '0.5rem 0 0 0', 
                    color: result.status === 'error' ? '#d9534f' : '#a09678' 
                  }}>
                    {result.message}
                  </p>
                )}
                {result.data && (
                  <pre style={{ 
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    backgroundColor: '#1a1611',
                    overflow: 'auto',
                    fontSize: '0.85rem',
                    color: '#a09678'
                  }}>
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {testResults.length === 0 && !isRunning && (
        <p style={{ color: '#a09678' }}>Click "Run All Tests" to start the test suite</p>
      )}

      <div style={{ marginTop: '3rem', padding: '1rem', border: '1px solid #3a3123' }}>
        <h3 style={{ color: '#b7b34d' }}>📝 Test Summary</h3>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
          <div>
            <span style={{ color: '#68b06e' }}>✅ Passed: </span>
            <strong>{testResults.filter(t => t.status === 'success').length}</strong>
          </div>
          <div>
            <span style={{ color: '#d9534f' }}>❌ Failed: </span>
            <strong>{testResults.filter(t => t.status === 'error').length}</strong>
          </div>
          <div>
            <span style={{ color: '#b7b34d' }}>⏳ Pending: </span>
            <strong>{testResults.filter(t => t.status === 'pending').length}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}