'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { supabase } from '@/lib/supabaseClient';

type Guild = {
  id: string;
  name: string;
  tag: string;
  level: number;
  xp: number;
  treasury: number;
  memberCount: number;
};

type Rivalry = {
  id: string;
  opponent: Guild;
  proposedAt: string;
  acceptedAt?: string;
  status: string;
};

type LeaderboardEntry = {
  rank: number;
  guild: Guild;
  isOwnGuild: boolean;
};

type WarData = {
  rivalries: Rivalry[];
  canDeclareWar: boolean;
};

type CompetitionData = {
  leaderboard: LeaderboardEntry[];
  currentGuildRank: number;
  weeklyStats: {
    tradingVolume: number;
    craftingJobs: number;
  };
};

export default function GuildWarsPage() {
  const [wars, setWars] = useState<WarData | null>(null);
  const [competitions, setCompetitions] = useState<CompetitionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'wars' | 'competitions'>('wars');
  const [targetGuildId, setTargetGuildId] = useState('');
  const [warType, setWarType] = useState<'ALLIANCE' | 'RIVALRY'>('RIVALRY');
  const [actionLoading, setActionLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    loadWarData();
  }, [isClient]);

  const loadWarData = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch('/api/guild/wars', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load war data');
      }

      const data = await response.json();
      setWars(data.wars);
      setCompetitions(data.competitions);

    } catch (err) {
      console.error('Error loading war data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load war data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclareWar = async () => {
    if (!targetGuildId) {
      alert('Please enter a target guild ID');
      return;
    }

    const action = warType === 'RIVALRY' ? 'declare war on' : 'propose alliance with';
    if (!confirm(`Are you sure you want to ${action} this guild?`)) {
      return;
    }

    try {
      setActionLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/guild/wars', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetGuildId,
          type: warType
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to declare war/alliance');
      }

      const result = await response.json();
      alert(result.message);
      setTargetGuildId('');
      loadWarData(); // Reload data

    } catch (err) {
      console.error('Error declaring war:', err);
      alert(err instanceof Error ? err.message : 'Failed to declare war/alliance');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'game-good';
    if (rank <= 3) return 'game-warn';
    if (rank <= 10) return 'game-muted';
    return '';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const sidebar = (
    <div>
      <h3>Guild Wars</h3>
      <div className="game-flex-col">
        <button 
          className={`game-btn ${activeTab === 'wars' ? 'game-btn-primary' : ''}`}
          onClick={() => setActiveTab('wars')}
        >
          ⚔️ Wars & Alliances
        </button>
        <button 
          className={`game-btn ${activeTab === 'competitions' ? 'game-btn-primary' : ''}`}
          onClick={() => setActiveTab('competitions')}
        >
          🏆 Competitions
        </button>
      </div>

      <h3>War Status</h3>
      <div className="game-flex-col">
        <div className="game-space-between">
          <span>Active Rivalries:</span>
          <span className="game-bad">{wars?.rivalries.length || 0}</span>
        </div>
        <div className="game-space-between">
          <span>Can Declare War:</span>
          <span className={wars?.canDeclareWar ? 'game-good' : 'game-muted'}>
            {wars?.canDeclareWar ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {competitions && (
        <>
          <h3>Competition Rank</h3>
          <div className="game-center">
            <div className="game-big">{getRankIcon(competitions.currentGuildRank)}</div>
            <div className="game-small game-muted">
              Rank {competitions.currentGuildRank} of {competitions.leaderboard.length}
            </div>
          </div>
        </>
      )}

      <h3>Quick Actions</h3>
      <div className="game-flex-col">
        <a href="/guild" className="game-btn game-btn-small">
          ← Back to Guild
        </a>
        <a href="/guild/members" className="game-btn game-btn-small">
          👥 Manage Members
        </a>
      </div>
    </div>
  );

  if (!isClient) {
    return (
      <GameLayout title="Guild Wars" sidebar={<div>Loading...</div>}>
        <div>Loading guild wars...</div>
      </GameLayout>
    );
  }

  if (loading) {
    return (
      <GameLayout title="Guild Wars" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center">Loading guild wars...</div>
        </div>
      </GameLayout>
    );
  }

  if (error) {
    return (
      <GameLayout title="Guild Wars" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center game-bad">Error: {error}</div>
          <button className="game-btn" onClick={loadWarData}>
            Retry
          </button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Guild Wars" sidebar={sidebar}>
      <div className="game-flex-col">
        {activeTab === 'wars' && wars && (
          <>
            {/* Declare War Section */}
            {wars.canDeclareWar && (
              <div className="game-card">
                <h3>Declare War or Alliance</h3>
                
                <div className="game-flex-col" style={{ gap: '12px' }}>
                  <div className="game-grid-2">
                    <div>
                      <label className="game-small">Target Guild ID</label>
                      <input
                        type="text"
                        value={targetGuildId}
                        onChange={(e) => setTargetGuildId(e.target.value)}
                        placeholder="Enter guild ID..."
                        style={{ width: '100%' }}
                        disabled={actionLoading}
                      />
                    </div>
                    
                    <div>
                      <label className="game-small">Action Type</label>
                      <select
                        value={warType}
                        onChange={(e) => setWarType(e.target.value as 'ALLIANCE' | 'RIVALRY')}
                        style={{ width: '100%' }}
                        disabled={actionLoading}
                      >
                        <option value="RIVALRY">⚔️ Declare War</option>
                        <option value="ALLIANCE">🤝 Propose Alliance</option>
                      </select>
                    </div>
                  </div>

                  <button
                    className="game-btn game-btn-primary"
                    onClick={handleDeclareWar}
                    disabled={actionLoading || !targetGuildId}
                  >
                    {actionLoading ? 'Processing...' : 
                     warType === 'RIVALRY' ? '⚔️ Declare War' : '🤝 Propose Alliance'}
                  </button>
                </div>
              </div>
            )}

            {/* Active Rivalries */}
            <div className="game-card">
              <h3>Active Rivalries ({wars.rivalries.length})</h3>
              {wars.rivalries.length > 0 ? (
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Opponent Guild</th>
                      <th>Level</th>
                      <th>Status</th>
                      <th>Started</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wars.rivalries.map(rivalry => (
                      <tr key={rivalry.id}>
                        <td>
                          <strong>[{rivalry.opponent.tag}] {rivalry.opponent.name}</strong>
                        </td>
                        <td>{rivalry.opponent.level}</td>
                        <td>
                          <span className="game-pill game-pill-bad">
                            ⚔️ {rivalry.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="game-small">
                          {formatTimeAgo(rivalry.proposedAt)}
                        </td>
                        <td>
                          <button className="game-btn game-btn-small" disabled>
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="game-muted">No active rivalries. Declare war to compete against other guilds!</p>
              )}
            </div>

            <div className="game-card">
              <h3>War Benefits</h3>
              <div className="game-flex-col">
                <div>⚔️ <strong>Guild Rivalries:</strong> Competitive challenges and rewards</div>
                <div>🤝 <strong>Guild Alliances:</strong> Shared benefits and cooperation</div>
                <div>🏆 <strong>War Victories:</strong> Prestige and special achievements</div>
                <div>💰 <strong>Conflict Rewards:</strong> Enhanced trading opportunities</div>
                <div>📈 <strong>Reputation:</strong> Guild standing in the community</div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'competitions' && competitions && (
          <>
            {/* Guild Leaderboard */}
            <div className="game-card">
              <h3>Guild Leaderboard</h3>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Guild</th>
                    <th>Level</th>
                    <th>XP</th>
                    <th>Members</th>
                    <th>Treasury</th>
                  </tr>
                </thead>
                <tbody>
                  {competitions.leaderboard.slice(0, 20).map(entry => (
                    <tr key={entry.guild.id} className={entry.isOwnGuild ? 'game-highlight' : ''}>
                      <td className={getRankColor(entry.rank)}>
                        <strong>{getRankIcon(entry.rank)}</strong>
                      </td>
                      <td>
                        <strong>[{entry.guild.tag}] {entry.guild.name}</strong>
                        {entry.isOwnGuild && (
                          <span className="game-pill game-pill-small game-pill-good">YOU</span>
                        )}
                      </td>
                      <td>{entry.guild.level}</td>
                      <td>{entry.guild.xp.toLocaleString()}</td>
                      <td>{entry.guild.memberCount}</td>
                      <td className="game-good">{entry.guild.treasury.toLocaleString()}g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Weekly Statistics */}
            <div className="game-card">
              <h3>This Week's Performance</h3>
              <div className="game-grid-2">
                <div className="game-center">
                  <div className="game-big game-good">{competitions.weeklyStats.tradingVolume.toLocaleString()}g</div>
                  <div className="game-small game-muted">Trading Volume</div>
                </div>
                <div className="game-center">
                  <div className="game-big">{competitions.weeklyStats.craftingJobs}</div>
                  <div className="game-small game-muted">Crafting Jobs Completed</div>
                </div>
              </div>
            </div>

            {/* Competition Categories */}
            <div className="game-card">
              <h3>Competition Categories</h3>
              <div className="game-flex-col">
                <div className="game-space-between">
                  <div>
                    <strong>📈 Trading Competition</strong>
                    <div className="game-small game-muted">Highest weekly trading volume</div>
                  </div>
                  <span className="game-pill">Weekly</span>
                </div>
                
                <div className="game-space-between">
                  <div>
                    <strong>🔨 Crafting Challenge</strong>
                    <div className="game-small game-muted">Most items crafted</div>
                  </div>
                  <span className="game-pill">Weekly</span>
                </div>
                
                <div className="game-space-between">
                  <div>
                    <strong>🏆 Overall Leaderboard</strong>
                    <div className="game-small game-muted">Guild level and experience</div>
                  </div>
                  <span className="game-pill game-pill-good">Permanent</span>
                </div>
                
                <div className="game-space-between">
                  <div>
                    <strong>💰 Treasury Challenge</strong>
                    <div className="game-small game-muted">Largest guild treasury</div>
                  </div>
                  <span className="game-pill">Monthly</span>
                </div>
              </div>
            </div>

            {/* Competition Rewards */}
            <div className="game-card">
              <h3>Competition Rewards</h3>
              <div className="game-flex-col">
                <div>🥇 <strong>1st Place:</strong> 5000 XP, 10000g, Legendary Emblem</div>
                <div>🥈 <strong>2nd Place:</strong> 3000 XP, 5000g, Epic Emblem</div>
                <div>🥉 <strong>3rd Place:</strong> 2000 XP, 2500g, Rare Emblem</div>
                <div>📊 <strong>Top 10:</strong> 1000 XP, 1000g, Achievement Badge</div>
              </div>
            </div>
          </>
        )}
      </div>
    </GameLayout>
  );
}