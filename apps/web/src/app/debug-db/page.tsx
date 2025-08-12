'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';

export default function DebugDbPage() {
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testDbConnection();
  }, []);

  const testDbConnection = async () => {
    try {
      setLoading(true);
      
      // Test a simple API endpoint to check database connection
      const response = await fetch('/api/debug/db-test', {
        method: 'POST'
      });

      const data = await response.json();
      
      setConnectionStatus({
        status: response.status,
        ok: response.ok,
        data: data
      });
    } catch (err) {
      setConnectionStatus({
        status: 'network_error',
        ok: false,
        data: { error: err instanceof Error ? err.message : 'Unknown error' }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <GameLayout title="Database Debug">
      <div className="game-card">
        <h3>Database Connection Test</h3>
        
        {loading && <div>Testing database connection...</div>}
        
        {connectionStatus && (
          <div className="game-flex-col" style={{ gap: '1rem' }}>
            <div className="game-card">
              <h4>Connection Status</h4>
              <div>Status: {connectionStatus.status}</div>
              <div>OK: {connectionStatus.ok ? 'Yes' : 'No'}</div>
              <div className={connectionStatus.ok ? 'game-good' : 'game-bad'}>
                {connectionStatus.ok ? '✅ Database Connected' : '❌ Database Connection Failed'}
              </div>
            </div>
            
            <div className="game-card">
              <h4>Response Data</h4>
              <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '400px' }}>
                {JSON.stringify(connectionStatus.data, null, 2)}
              </pre>
            </div>
            
            <button className="game-btn game-btn-primary" onClick={testDbConnection}>
              Test Again
            </button>
          </div>
        )}
      </div>
    </GameLayout>
  );
}