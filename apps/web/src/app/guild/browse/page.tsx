'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { supabase } from '@/lib/supabaseClient';

type Guild = {
  id: string;
  name: string;
  tag: string;
  emblem?: any;
  description?: string;
  level: number;
  memberCount: number;
  maxMembers: number;
  achievementCount: number;
  createdAt: string;
  leader: {
    displayName: string;
    joinedAt: string;
  } | null;
  recentAchievements: Array<{
    key: string;
    name: string;
    unlockedAt: string;
  }>;
  isRecruiting: boolean;
  membershipFull: boolean;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export default function GuildBrowsePage() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('level');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  const [userInGuild, setUserInGuild] = useState(false);
  const [currentGuild, setCurrentGuild] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    loadGuilds();
  }, [isClient, search, sortBy, sortOrder, currentPage]);

  const loadGuilds = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const params = new URLSearchParams({
        search,
        sortBy,
        sortOrder,
        page: currentPage.toString(),
        limit: '20'
      });

      const response = await fetch(`/api/guild/browse?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load guilds');
      }

      const data = await response.json();
      setGuilds(data.guilds);
      setPagination(data.pagination);
      setUserInGuild(data.userInGuild);
      setCurrentGuild(data.currentGuild);

    } catch (err) {
      console.error('Error loading guilds:', err);
      setError(err instanceof Error ? err.message : 'Failed to load guilds');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadGuilds();
  };

  const handleJoinRequest = async (guildId: string) => {
    // This would typically send a join request or application
    // For now, we'll show a placeholder message
    alert('Guild join requests are not implemented yet. Contact the guild leader directly or look for an invite.');
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const sidebar = (
    <div>
      <h3>Guild Browser</h3>
      <div className="game-flex-col">
        <a href="/guild" className="game-btn game-btn-small">
          ← Back to Guild
        </a>
        {!userInGuild && (
          <a href="/guild/create" className="game-btn game-btn-small game-btn-primary">
            🏛️ Create Guild
          </a>
        )}
      </div>

      {userInGuild && currentGuild && (
        <>
          <h3>Your Guild</h3>
          <div className="game-flex-col">
            <div className="game-space-between">
              <span>Guild:</span>
              <span>[{currentGuild.tag}] {currentGuild.name}</span>
            </div>
            <div className="game-small game-muted">
              You are already a member of a guild. You cannot join another guild unless you leave your current one.
            </div>
          </div>
        </>
      )}

      <h3>Search & Filter</h3>
      <form onSubmit={handleSearch} className="game-flex-col">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search guilds..."
          className="game-input"
        />
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="game-input"
        >
          <option value="level">Sort by Level</option>
          <option value="members">Sort by Members</option>
          <option value="name">Sort by Name</option>
          <option value="created">Sort by Age</option>
        </select>
        
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="game-input"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
        
        <button type="submit" className="game-btn game-btn-primary game-btn-small">
          🔍 Search
        </button>
      </form>

      {pagination && (
        <>
          <h3>Results</h3>
          <div className="game-flex-col">
            <div className="game-space-between">
              <span>Page:</span>
              <span>{pagination.page} of {pagination.totalPages}</span>
            </div>
            <div className="game-space-between">
              <span>Total:</span>
              <span>{pagination.total} guilds</span>
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (!isClient) {
    return (
      <GameLayout title="Browse Guilds" sidebar={<div>Loading...</div>}>
        <div>Loading guild browser...</div>
      </GameLayout>
    );
  }

  if (loading) {
    return (
      <GameLayout title="Browse Guilds" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center">Loading guilds...</div>
        </div>
      </GameLayout>
    );
  }

  if (error) {
    return (
      <GameLayout title="Browse Guilds" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center game-bad">Error: {error}</div>
          <button className="game-btn" onClick={loadGuilds}>
            Retry
          </button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Browse Guilds" sidebar={sidebar}>
      <div className="game-flex-col">
        {userInGuild && (
          <div className="game-card game-warning">
            <h3>⚠️ Already in a Guild</h3>
            <p>You are currently a member of [{currentGuild?.tag}] {currentGuild?.name}. 
            You must leave your current guild before joining another one.</p>
          </div>
        )}

        {/* Guild List */}
        <div className="game-flex-col">
          {guilds.length > 0 ? (
            guilds.map(guild => (
              <div key={guild.id} className="game-card">
                <div className="game-space-between" style={{ marginBottom: '12px' }}>
                  <div>
                    <div className="game-flex" style={{ alignItems: 'center', gap: '12px' }}>
                      {guild.emblem && (
                        <div style={{ 
                          width: '48px', 
                          height: '48px', 
                          background: guild.emblem.color || '#533b2c',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px'
                        }}>
                          {guild.emblem.symbol || '⚔️'}
                        </div>
                      )}
                      <div>
                        <h3>[{guild.tag}] {guild.name}</h3>
                        {guild.leader && (
                          <div className="game-small game-muted">
                            Led by {guild.leader.displayName}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {guild.description && (
                      <p className="game-muted" style={{ margin: '8px 0' }}>
                        {guild.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="game-center" style={{ minWidth: '120px' }}>
                    <div className="game-big">{guild.level}</div>
                    <div className="game-small game-muted">Level</div>
                  </div>
                </div>

                <div className="game-grid-3" style={{ marginBottom: '12px' }}>
                  <div className="game-center">
                    <div className="game-big">{guild.memberCount}/{guild.maxMembers}</div>
                    <div className="game-small game-muted">Members</div>
                  </div>
                  <div className="game-center">
                    <div className="game-big">{guild.achievementCount}</div>
                    <div className="game-small game-muted">Achievements</div>
                  </div>
                  <div className="game-center">
                    <div className="game-small">
                      {guild.membershipFull ? (
                        <span className="game-pill game-pill-bad">Full</span>
                      ) : guild.isRecruiting ? (
                        <span className="game-pill game-pill-good">Recruiting</span>
                      ) : (
                        <span className="game-pill">Open</span>
                      )}
                    </div>
                    <div className="game-small game-muted">Status</div>
                  </div>
                </div>

                {guild.recentAchievements.length > 0 && (
                  <div style={{ margin: '12px 0' }}>
                    <div className="game-small game-muted" style={{ marginBottom: '4px' }}>Recent Achievements:</div>
                    <div className="game-flex" style={{ gap: '8px', flexWrap: 'wrap' }}>
                      {guild.recentAchievements.slice(0, 3).map(achievement => (
                        <span key={achievement.key} className="game-pill game-pill-small game-pill-info">
                          🏆 {achievement.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="game-flex" style={{ gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="game-small game-muted">
                    Founded {formatTimeAgo(guild.createdAt)}
                  </div>
                  
                  <div className="game-flex" style={{ gap: '8px' }}>
                    <button
                      className="game-btn game-btn-small"
                      onClick={() => setSelectedGuild(selectedGuild?.id === guild.id ? null : guild)}
                    >
                      {selectedGuild?.id === guild.id ? 'Hide Details' : 'View Details'}
                    </button>
                    
                    {!userInGuild && !guild.membershipFull && (
                      <button
                        className="game-btn game-btn-small game-btn-primary"
                        onClick={() => handleJoinRequest(guild.id)}
                      >
                        Request to Join
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedGuild?.id === guild.id && (
                  <div className="game-card" style={{ margin: '12px 0 0 0', background: '#1a1511' }}>
                    <h4>Guild Details</h4>
                    
                    <div className="game-grid-2" style={{ marginBottom: '12px' }}>
                      <div className="game-space-between">
                        <span>Guild ID:</span>
                        <span className="game-small game-muted">{guild.id.slice(0, 8)}...</span>
                      </div>
                      <div className="game-space-between">
                        <span>Max Members:</span>
                        <span>{guild.maxMembers}</span>
                      </div>
                      <div className="game-space-between">
                        <span>Founded:</span>
                        <span>{new Date(guild.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="game-space-between">
                        <span>Achievements:</span>
                        <span>{guild.achievementCount}</span>
                      </div>
                    </div>

                    {guild.leader && (
                      <div style={{ marginBottom: '12px' }}>
                        <strong>Leadership:</strong>
                        <div className="game-small">
                          {guild.leader.displayName} (Leader since {formatTimeAgo(guild.leader.joinedAt)})
                        </div>
                      </div>
                    )}

                    {guild.recentAchievements.length > 0 && (
                      <div>
                        <strong>Recent Achievements:</strong>
                        <div className="game-flex-col" style={{ gap: '4px', marginTop: '4px' }}>
                          {guild.recentAchievements.map(achievement => (
                            <div key={achievement.key} className="game-space-between">
                              <span>🏆 {achievement.name}</span>
                              <span className="game-small game-muted">
                                {formatTimeAgo(achievement.unlockedAt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="game-card">
              <div className="game-center">
                <div>No guilds found</div>
                <div className="game-small game-muted">
                  {search ? 'Try adjusting your search terms' : 'No active guilds to display'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="game-card">
            <div className="game-flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="game-btn game-btn-small"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!pagination.hasPrev}
              >
                ← Previous
              </button>
              
              <div className="game-flex" style={{ gap: '8px', alignItems: 'center' }}>
                <span>Page {pagination.page} of {pagination.totalPages}</span>
                <span className="game-small game-muted">({pagination.total} total)</span>
              </div>
              
              <button
                className="game-btn game-btn-small"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!pagination.hasNext}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  );
}