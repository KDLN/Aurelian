'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { supabase } from '@/lib/supabaseClient';

export default function DebugCraftingPage() {
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDebugData();
  }, []);

  const fetchDebugData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Not authenticated');
        return;
      }

      // Test the crafting blueprints API
      const response = await fetch('/api/crafting/blueprints', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      setDebugData({
        status: response.status,
        ok: response.ok,
        data: data,
        userSession: {
          userId: session.user?.id,
          email: session.user?.email
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GameLayout title="Debug Crafting">
      <div className="game-card">
        <h3>Crafting API Debug</h3>
        
        {loading && <div>Loading debug data...</div>}
        
        {error && (
          <div className="game-bad">
            Error: {error}
          </div>
        )}
        
        {debugData && (
          <div className="game-flex-col" style={{ gap: '1rem' }}>
            <div className="game-card">
              <h4>API Response Status</h4>
              <div>Status: {debugData.status}</div>
              <div>OK: {debugData.ok ? 'Yes' : 'No'}</div>
            </div>
            
            <div className="game-card">
              <h4>User Session</h4>
              <div>User ID: {debugData.userSession.userId}</div>
              <div>Email: {debugData.userSession.email}</div>
            </div>
            
            <div className="game-card">
              <h4>User Stats</h4>
              {debugData.data.userStats ? (
                <div>
                  <div>Level: {debugData.data.userStats.level}</div>
                  <div>XP: {debugData.data.userStats.xp}</div>
                  <div>XP Next: {debugData.data.userStats.xpNext}</div>
                </div>
              ) : (
                <div className="game-bad">No user stats found</div>
              )}
            </div>
            
            <div className="game-card">
              <h4>Blueprints Found</h4>
              <div>Count: {debugData.data.blueprints?.length || 0}</div>
              {debugData.data.blueprints?.map((bp: any, index: number) => (
                <div key={bp.id} className="game-card" style={{ marginTop: '0.5rem' }}>
                  <div><strong>#{index + 1}: {bp.key}</strong></div>
                  <div>Level Required: {bp.requiredLevel}</div>
                  <div>Starter Recipe: {bp.starterRecipe ? 'Yes' : 'No'}</div>
                  <div>Is Unlocked: {bp.isUnlocked ? 'Yes' : 'No'}</div>
                  <div>Can Craft: {bp.canCraft ? 'Yes' : 'No'}</div>
                  <div>Output: {bp.output?.name}</div>
                </div>
              ))}
            </div>
            
            <div className="game-card">
              <h4>Raw API Response</h4>
              <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '400px' }}>
                {JSON.stringify(debugData.data, null, 2)}
              </pre>
            </div>
            
            <button className="game-btn game-btn-primary" onClick={fetchDebugData}>
              Refresh Debug Data
            </button>
          </div>
        )}
      </div>
    </GameLayout>
  );
}