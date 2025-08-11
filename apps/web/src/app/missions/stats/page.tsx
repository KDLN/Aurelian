'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { supabase } from '@/lib/supabaseClient';

interface MissionStats {
  overview: {
    totalMissions: number;
    completedMissions: number;
    failedMissions: number;
    activeMissions: number;
    successRate: number;
    totalGoldEarned: number;
    totalItemsReceived: { [key: string]: number };
  };
  riskBreakdown: {
    [key: string]: {
      attempted: number;
      succeeded: number;
      failed: number;
      totalGold: number;
      avgGold: number;
    };
  };
  recentMissions: Array<{
    id: string;
    name: string;
    riskLevel: string;
    status: string;
    reward: number;
    completedAt: string;
    itemsReceived: any;
  }>;
  bestRewards: Array<{
    id: string;
    name: string;
    riskLevel: string;
    reward: number;
    completedAt: string;
  }>;
  popularRoutes: Array<{
    route: string;
    count: number;
    successRate: number;
    avgReward: number;
  }>;
  personalRecords: {
    highestSingleReward: number;
    highestRewardMission: string;
    longestStreak: number;
    currentStreak: number;
    favoriteRiskLevel: string;
    totalMissionsCompleted: number;
  };
}

export default function MissionStatsPage() {
  const [stats, setStats] = useState<MissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch('/api/missions/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'good';
      case 'MEDIUM': return 'warn';
      case 'HIGH': return 'bad';
      default: return 'muted';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'good';
      case 'failed': return 'bad';
      case 'active': return 'warn';
      default: return 'muted';
    }
  };

  if (loading) {
    return (
      <GameLayout title="Mission Statistics">
        <div className="game-container">
          <h1 className="game-title">Mission Statistics</h1>
          <div className="game-loading">Loading statistics...</div>
        </div>
      </GameLayout>
    );
  }

  if (error || !stats) {
    return (
      <GameLayout title="Mission Statistics">
        <div className="game-container">
          <h1 className="game-title">Mission Statistics</h1>
          <div className="game-error">{error || 'Failed to load statistics'}</div>
          <button className="game-btn" onClick={fetchStats}>Retry</button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Mission Statistics">
      <div className="game-container">
        <h1 className="game-title">Mission Statistics</h1>

        {/* Overview Cards */}
        <div className="game-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="game-card">
            <h3 className="game-subtitle">Total Missions</h3>
            <div className="game-value-large">{stats.overview.totalMissions}</div>
            <div className="game-space-between game-small">
              <span className="game-good">✓ {stats.overview.completedMissions}</span>
              <span className="game-bad">✗ {stats.overview.failedMissions}</span>
              <span className="game-warn">→ {stats.overview.activeMissions}</span>
            </div>
          </div>

          <div className="game-card">
            <h3 className="game-subtitle">Success Rate</h3>
            <div className="game-value-large game-good">{stats.overview.successRate}%</div>
            <div className="game-progress">
              <div 
                className="game-progress-fill" 
                style={{ 
                  width: `${stats.overview.successRate}%`,
                  background: stats.overview.successRate >= 70 ? '#68b06e' : 
                             stats.overview.successRate >= 50 ? '#b7b34d' : '#b06868'
                }}
              />
            </div>
          </div>

          <div className="game-card">
            <h3 className="game-subtitle">Total Earnings</h3>
            <div className="game-value-large game-gold">{stats.overview.totalGoldEarned.toLocaleString()}g</div>
            <div className="game-small game-muted">
              Avg: {stats.overview.completedMissions > 0 ? 
                Math.round(stats.overview.totalGoldEarned / stats.overview.completedMissions) : 0}g per mission
            </div>
          </div>

          <div className="game-card">
            <h3 className="game-subtitle">Current Streak</h3>
            <div className="game-value-large">
              {stats.personalRecords.currentStreak} 🔥
            </div>
            <div className="game-small game-muted">
              Best: {stats.personalRecords.longestStreak}
            </div>
          </div>
        </div>

        {/* Risk Analysis */}
        <div className="game-section">
          <h2 className="game-subtitle">Risk Level Analysis</h2>
          <div className="game-table">
            <div className="game-table-row game-table-header">
              <div>Risk Level</div>
              <div>Attempted</div>
              <div>Success Rate</div>
              <div>Avg Gold</div>
              <div>Total Gold</div>
            </div>
            {Object.entries(stats.riskBreakdown).map(([risk, data]) => {
              const successRate = data.attempted > 0 ? 
                Math.round((data.succeeded / data.attempted) * 100) : 0;
              return (
                <div key={risk} className="game-table-row">
                  <div>
                    <span className={`game-risk game-${getRiskColor(risk)}`}>{risk}</span>
                  </div>
                  <div>{data.attempted}</div>
                  <div className={successRate >= 70 ? 'game-good' : successRate >= 50 ? 'game-warn' : 'game-bad'}>
                    {successRate}%
                  </div>
                  <div className="game-gold">{data.avgGold}g</div>
                  <div className="game-gold">{data.totalGold.toLocaleString()}g</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="game-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          
          {/* Recent Missions */}
          <div className="game-section">
            <h2 className="game-subtitle">Recent Missions</h2>
            <div className="game-list">
              {stats.recentMissions.map((mission, index) => (
                <div key={mission.id} className="game-list-item">
                  <div className="game-space-between">
                    <div>
                      <div className="game-small">{mission.name}</div>
                      <span className={`game-risk game-${getRiskColor(mission.riskLevel)} game-small`}>
                        {mission.riskLevel}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className={`game-${getStatusColor(mission.status)}`}>
                        {mission.status === 'completed' ? '✓' : '✗'} {mission.reward || 0}g
                      </div>
                      <div className="game-small game-muted">
                        {new Date(mission.completedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {stats.recentMissions.length === 0 && (
                <div className="game-muted">No completed missions yet</div>
              )}
            </div>
          </div>

          {/* Best Rewards */}
          <div className="game-section">
            <h2 className="game-subtitle">Top Rewards 🏆</h2>
            <div className="game-list">
              {stats.bestRewards.map((mission, index) => (
                <div key={mission.id} className="game-list-item">
                  <div className="game-space-between">
                    <div>
                      <span className="game-gold" style={{ fontSize: '1.2rem' }}>
                        #{index + 1}
                      </span>
                      <div className="game-small">{mission.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="game-gold game-value">
                        {mission.reward.toLocaleString()}g
                      </div>
                      <span className={`game-risk game-${getRiskColor(mission.riskLevel)} game-small`}>
                        {mission.riskLevel}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {stats.bestRewards.length === 0 && (
                <div className="game-muted">Complete missions to see your best rewards</div>
              )}
            </div>
          </div>
        </div>

        {/* Popular Routes */}
        <div className="game-section">
          <h2 className="game-subtitle">Your Trade Routes</h2>
          <div className="game-table">
            <div className="game-table-row game-table-header">
              <div>Route</div>
              <div>Times Traveled</div>
              <div>Success Rate</div>
              <div>Avg Reward</div>
            </div>
            {stats.popularRoutes.map((route) => (
              <div key={route.route} className="game-table-row">
                <div className="game-small">{route.route}</div>
                <div>{route.count}</div>
                <div className={route.successRate >= 70 ? 'game-good' : route.successRate >= 50 ? 'game-warn' : 'game-bad'}>
                  {Math.round(route.successRate)}%
                </div>
                <div className="game-gold">{route.avgReward}g</div>
              </div>
            ))}
            {stats.popularRoutes.length === 0 && (
              <div className="game-table-row">
                <div colSpan={4} className="game-muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                  No routes traveled yet
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Personal Records */}
        <div className="game-section">
          <h2 className="game-subtitle">Personal Records 🏅</h2>
          <div className="game-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="game-stat">
              <div className="game-label">Highest Single Reward</div>
              <div className="game-value game-gold">{stats.personalRecords.highestSingleReward}g</div>
              <div className="game-small game-muted">{stats.personalRecords.highestRewardMission}</div>
            </div>
            <div className="game-stat">
              <div className="game-label">Longest Success Streak</div>
              <div className="game-value">{stats.personalRecords.longestStreak}</div>
            </div>
            <div className="game-stat">
              <div className="game-label">Favorite Risk Level</div>
              <div className={`game-value game-risk game-${getRiskColor(stats.personalRecords.favoriteRiskLevel)}`}>
                {stats.personalRecords.favoriteRiskLevel}
              </div>
            </div>
            <div className="game-stat">
              <div className="game-label">Career Completions</div>
              <div className="game-value">{stats.personalRecords.totalMissionsCompleted}</div>
            </div>
          </div>
        </div>

        {/* Items Collected */}
        {Object.keys(stats.overview.totalItemsReceived).length > 0 && (
          <div className="game-section">
            <h2 className="game-subtitle">Items Collected</h2>
            <div className="game-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {Object.entries(stats.overview.totalItemsReceived).map(([item, qty]) => (
                <div key={item} className="game-stat">
                  <div className="game-label">{item.replace(/_/g, ' ')}</div>
                  <div className="game-value">{qty}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  );
}