'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { supabase } from '@/lib/supabaseClient';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  value: number;
  completedMissions?: number;
  totalAttempts?: number;
  totalGold?: number;
  isCurrentUser?: boolean;
}

interface LeaderboardData {
  leaderboards: {
    totalGold: LeaderboardEntry[];
    successRate: LeaderboardEntry[];
    totalMissions: LeaderboardEntry[];
    currentStreak: LeaderboardEntry[];
    longestStreak: LeaderboardEntry[];
  };
  userRankings?: {
    totalGold: { rank: number; value: number } | null;
    successRate: { rank: number; value: number } | null;
    totalMissions: { rank: number; value: number } | null;
    currentStreak: { rank: number; value: number } | null;
    longestStreak: { rank: number; value: number } | null;
  };
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<keyof LeaderboardData['leaderboards']>('totalGold');

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/missions/leaderboard', { headers });

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboards');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const formatValue = (value: number, type: keyof LeaderboardData['leaderboards']) => {
    switch (type) {
      case 'totalGold':
        return `${value.toLocaleString()}g`;
      case 'successRate':
        return `${value}%`;
      case 'totalMissions':
      case 'currentStreak':
      case 'longestStreak':
        return value.toString();
      default:
        return value.toString();
    }
  };

  const getTabLabel = (tab: keyof LeaderboardData['leaderboards']) => {
    switch (tab) {
      case 'totalGold': return '💰 Total Gold';
      case 'successRate': return '🎯 Success Rate';
      case 'totalMissions': return '📋 Missions Completed';
      case 'currentStreak': return '🔥 Current Streak';
      case 'longestStreak': return '⭐ Longest Streak';
    }
  };

  const getDescription = (tab: keyof LeaderboardData['leaderboards']) => {
    switch (tab) {
      case 'totalGold': return 'Top gold earners from all missions (minimum 3 attempts)';
      case 'successRate': return 'Highest success rates (minimum 10 missions)';
      case 'totalMissions': return 'Most missions completed successfully';
      case 'currentStreak': return 'Current consecutive successful missions';
      case 'longestStreak': return 'Longest streak of consecutive successes ever achieved';
    }
  };

  const sidebar = (
    <div>
      <h3>Hall of Fame</h3>
      <p className="game-muted game-small">
        Compete with traders across the realm in various categories.
      </p>
      
      <div className="game-flex-col" style={{ gap: '0.5rem', marginTop: '1rem' }}>
        {data?.userRankings && (
          <>
            <h4>Your Rankings</h4>
            <div className="game-flex-col" style={{ gap: '0.25rem' }}>
              {Object.entries(data.userRankings).map(([category, ranking]) => (
                ranking && (
                  <div key={category} className="game-space-between game-small">
                    <span>{getTabLabel(category as any).replace(/[🔥💰🎯📋⭐]/g, '').trim()}:</span>
                    <span className="game-good">#{ranking.rank}</span>
                  </div>
                )
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <a href="/missions" className="game-btn game-btn-secondary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
          ← Back to Missions
        </a>
      </div>
    </div>
  );

  if (loading) {
    return (
      <GameLayout title="Mission Leaderboards" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-flex" style={{ alignItems: 'center', gap: '1rem' }}>
            <div>Loading leaderboards...</div>
            <div className="game-spinner" />
          </div>
        </div>
      </GameLayout>
    );
  }

  if (error || !data) {
    return (
      <GameLayout title="Mission Leaderboards" sidebar={sidebar}>
        <div className="game-card">
          <h3>Error</h3>
          <p className="game-bad">{error || 'Failed to load leaderboards'}</p>
          <button 
            className="game-btn game-btn-primary" 
            onClick={fetchLeaderboards}
          >
            Retry
          </button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout 
      title="Mission Leaderboards" 
      characterActivity="idle"
      characterLocation="Hall of Fame"
      sidebar={sidebar}
    >
      <div className="game-flex-col">
        {/* Tabs */}
        <div className="game-card">
          <div className="game-flex" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
            {Object.keys(data.leaderboards).map((tab) => (
              <button
                key={tab}
                className={`game-btn ${activeTab === tab ? 'game-btn-primary' : 'game-btn-secondary'}`}
                onClick={() => setActiveTab(tab as keyof LeaderboardData['leaderboards'])}
                style={{ fontSize: '0.9rem' }}
              >
                {getTabLabel(tab as keyof LeaderboardData['leaderboards'])}
              </button>
            ))}
          </div>
          <p className="game-muted game-small" style={{ marginTop: '0.5rem' }}>
            {getDescription(activeTab)}
          </p>
        </div>

        {/* Leaderboard Table */}
        <div className="game-card">
          <h3>
            {getTabLabel(activeTab)} Leaderboard
          </h3>
          
          {data.leaderboards[activeTab].length > 0 ? (
            <div className="game-table">
              <div className="game-table-row game-table-header">
                <div>Rank</div>
                <div>Trader</div>
                <div>{getTabLabel(activeTab).replace(/[🔥💰🎯📋⭐]/g, '').trim()}</div>
                {activeTab === 'successRate' && <div>Attempts</div>}
                {(activeTab === 'successRate' || activeTab === 'currentStreak' || activeTab === 'longestStreak') && <div>Completed</div>}
                {activeTab === 'totalMissions' && <div>Total Gold</div>}
              </div>
              
              {data.leaderboards[activeTab].map((entry) => (
                <div 
                  key={entry.userId} 
                  className={`game-table-row ${entry.isCurrentUser ? 'game-highlight' : ''}`}
                >
                  <div style={{ fontWeight: 'bold' }}>
                    {getRankIcon(entry.rank)}
                  </div>
                  <div>
                    {entry.name}
                    {entry.isCurrentUser && <span className="game-good game-small"> (You)</span>}
                  </div>
                  <div className="game-good" style={{ fontWeight: 'bold' }}>
                    {formatValue(entry.value, activeTab)}
                  </div>
                  {activeTab === 'successRate' && (
                    <div className="game-muted">
                      {entry.totalAttempts}
                    </div>
                  )}
                  {(activeTab === 'successRate' || activeTab === 'currentStreak' || activeTab === 'longestStreak') && (
                    <div className="game-muted">
                      {entry.completedMissions}
                    </div>
                  )}
                  {activeTab === 'totalMissions' && (
                    <div className="game-gold">
                      {entry.totalGold?.toLocaleString()}g
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="game-muted" style={{ textAlign: 'center', padding: '2rem' }}>
              No data available for this leaderboard yet.
              <br />
              <span className="game-small">Complete some missions to see rankings!</span>
            </div>
          )}
        </div>

        {/* Competition Info */}
        <div className="game-card">
          <h3>Competition Rules</h3>
          <div className="game-flex-col" style={{ gap: '0.5rem' }}>
            <div className="game-space-between">
              <span className="game-small">💰 Total Gold:</span>
              <span className="game-small game-muted">Minimum 3 mission attempts required</span>
            </div>
            <div className="game-space-between">
              <span className="game-small">🎯 Success Rate:</span>
              <span className="game-small game-muted">Minimum 10 missions required for ranking</span>
            </div>
            <div className="game-space-between">
              <span className="game-small">🔥 Streaks:</span>
              <span className="game-small game-muted">Consecutive successful missions only</span>
            </div>
            <div className="game-space-between">
              <span className="game-small">📊 Updates:</span>
              <span className="game-small game-muted">Rankings refresh in real-time</span>
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}