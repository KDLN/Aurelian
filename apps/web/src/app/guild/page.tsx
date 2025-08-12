'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { supabase } from '@/lib/supabaseClient';

type GuildInfo = {
  id: string;
  name: string;
  tag: string;
  emblem?: any;
  description?: string;
  level: number;
  xp: number;
  xpNext: number;
  xpProgress: number;
  treasury: number;
  memberCount: number;
  maxMembers: number;
  userRole: 'LEADER' | 'OFFICER' | 'TRADER' | 'MEMBER';
  userJoinedAt: string;
  userContributionPoints: number;
  recentAchievements: Array<{
    key: string;
    name: string;
    description: string;
    unlockedAt: string;
    reward: any;
  }>;
  channels: Array<{
    id: string;
    name: string;
    description?: string;
    roleRequired?: string;
  }>;
  recentActivity: Array<{
    action: string;
    details: any;
    createdAt: string;
    user: string;
  }>;
};

type GuildInvitation = {
  id: string;
  guild: {
    id: string;
    name: string;
    tag: string;
    level: number;
    memberCount: number;
  };
  inviter: {
    displayName: string;
  };
  message?: string;
  createdAt: string;
  expiresAt: string;
};

export default function GuildPage() {
  const [guild, setGuild] = useState<GuildInfo | null>(null);
  const [invitations, setInvitations] = useState<GuildInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'wars' | 'invites'>('overview');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    loadGuildData();
  }, [isClient]);

  const loadGuildData = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Get guild info
      const guildResponse = await fetch('/api/guild/info', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!guildResponse.ok) {
        throw new Error('Failed to fetch guild data');
      }

      const guildData = await guildResponse.json();
      
      if (guildData.inGuild) {
        setGuild(guildData.guild);
      }

      // Get invitations if not in guild
      if (!guildData.inGuild) {
        const inviteResponse = await fetch('/api/guild/invite', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (inviteResponse.ok) {
          const inviteData = await inviteResponse.json();
          setInvitations(inviteData.invitations || []);
        }
      }

    } catch (err) {
      console.error('Error loading guild data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load guild data');
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationResponse = async (invitationId: string, action: 'accept' | 'decline') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/guild/invite/respond', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ invitationId, action })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to respond to invitation');
      }

      const result = await response.json();
      alert(result.message);
      
      // Reload data
      loadGuildData();

    } catch (err) {
      console.error('Error responding to invitation:', err);
      alert(err instanceof Error ? err.message : 'Failed to respond to invitation');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getActivityIcon = (action: string) => {
    const icons: Record<string, string> = {
      'guild_created': '🏛️',
      'member_joined': '👋',
      'member_left': '👋',
      'member_promoted': '⬆️',
      'member_demoted': '⬇️',
      'member_kicked': '❌',
      'invitation_sent': '📧',
      'invitation_declined': '📧',
      'war_declared': '⚔️',
      'alliance_proposed': '🤝',
      'deposit': '💰',
      'withdraw': '💰'
    };
    return icons[action] || '📝';
  };

  const sidebar = guild ? (
    <div>
      <h3>Guild Navigation</h3>
      <div className="game-flex-col">
        <button 
          className={`game-btn ${activeTab === 'overview' ? 'game-btn-primary' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`game-btn ${activeTab === 'members' ? 'game-btn-primary' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          👥 Members
        </button>
        <button 
          className={`game-btn ${activeTab === 'wars' ? 'game-btn-primary' : ''}`}
          onClick={() => setActiveTab('wars')}
        >
          ⚔️ Wars & Alliances
        </button>
      </div>

      <h3>Guild Stats</h3>
      <div className="game-flex-col">
        <div className="game-space-between">
          <span>Level:</span>
          <span className="game-good">{guild.level}</span>
        </div>
        <div className="game-space-between">
          <span>Members:</span>
          <span>{guild.memberCount}/{guild.maxMembers}</span>
        </div>
        <div className="game-space-between">
          <span>Treasury:</span>
          <span className="game-good">{guild.treasury.toLocaleString()}g</span>
        </div>
        <div className="game-space-between">
          <span>Your Role:</span>
          <span className="game-pill game-pill-good">{guild.userRole}</span>
        </div>
      </div>

      <h3>Quick Actions</h3>
      <div className="game-flex-col">
        <a href="/guild/warehouse" className="game-btn game-btn-small">
          📦 Guild Warehouse
        </a>
        <a href="/guild/achievements" className="game-btn game-btn-small">
          🏆 Achievements
        </a>
        {['LEADER', 'OFFICER'].includes(guild.userRole) && (
          <a href="/guild/manage" className="game-btn game-btn-small">
            ⚙️ Manage Guild
          </a>
        )}
      </div>
    </div>
  ) : (
    <div>
      <h3>Guild System</h3>
      <p className="game-muted game-small">
        Join or create a guild to access exclusive features, shared warehouses, and group activities.
      </p>
      
      {invitations.length > 0 && (
        <>
          <h3>Pending Invitations</h3>
          <div className="game-space-between">
            <span>Received:</span>
            <span className="game-good">{invitations.length}</span>
          </div>
        </>
      )}
    </div>
  );

  if (!isClient) {
    return (
      <GameLayout title="Guild" sidebar={<div>Loading...</div>}>
        <div>Loading guild information...</div>
      </GameLayout>
    );
  }

  if (loading) {
    return (
      <GameLayout title="Guild" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center">Loading guild information...</div>
        </div>
      </GameLayout>
    );
  }

  if (error) {
    const handleSyncUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const response = await fetch('/api/auth/sync-user', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });
          const result = await response.json();
          console.log('Sync result:', result);
          alert('User synced! Try creating a guild again.');
        }
      } catch (err) {
        console.error('Sync error:', err);
        alert('Sync failed');
      }
    };

    return (
      <GameLayout title="Guild" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center game-bad">Error: {error}</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
            <button className="game-btn" onClick={loadGuildData}>
              Retry
            </button>
            <button className="game-btn game-btn-primary" onClick={handleSyncUser}>
              Sync User
            </button>
          </div>
        </div>
      </GameLayout>
    );
  }

  // Not in a guild - show invitations and create option
  if (!guild) {
    return (
      <GameLayout title="Guild" sidebar={sidebar}>
        <div className="game-flex-col">
          {invitations.length > 0 && (
            <div className="game-card">
              <h3>Guild Invitations ({invitations.length})</h3>
              {invitations.map(invitation => (
                <div key={invitation.id} className="game-card" style={{ margin: '8px 0' }}>
                  <div className="game-space-between" style={{ marginBottom: '8px' }}>
                    <div>
                      <strong>[{invitation.guild.tag}] {invitation.guild.name}</strong>
                      <div className="game-small game-muted">
                        Level {invitation.guild.level} • {invitation.guild.memberCount} members
                      </div>
                      <div className="game-small game-muted">
                        Invited by {invitation.inviter.displayName} • {formatTimeAgo(invitation.createdAt)}
                      </div>
                    </div>
                  </div>
                  
                  {invitation.message && (
                    <div className="game-small" style={{ margin: '8px 0', fontStyle: 'italic' }}>
                      "{invitation.message}"
                    </div>
                  )}
                  
                  <div className="game-flex" style={{ gap: '8px' }}>
                    <button 
                      className="game-btn game-btn-primary game-btn-small"
                      onClick={() => handleInvitationResponse(invitation.id, 'accept')}
                    >
                      Accept
                    </button>
                    <button 
                      className="game-btn game-btn-small"
                      onClick={() => handleInvitationResponse(invitation.id, 'decline')}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="game-card">
            <h3>Create or Join a Guild</h3>
            <p className="game-muted">
              Guilds provide shared warehouses, group missions, and competitive gameplay.
            </p>
            
            <div className="game-flex" style={{ gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
              <a href="/guild/create" className="game-btn game-btn-primary">
                🏛️ Create Guild
              </a>
              <a href="/guild/browse" className="game-btn">
                🔍 Browse Guilds
              </a>
              <button 
                className="game-btn game-btn-warning game-btn-small"
                onClick={async () => {
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                      const response = await fetch('/api/auth/sync-user', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${session.access_token}`
                        }
                      });
                      const result = await response.json();
                      console.log('Sync result:', result);
                      
                      if (response.ok) {
                        alert('User synced! You can now create a guild.');
                      } else {
                        alert(`Sync failed: ${result.error || result.details || 'Unknown error'}`);
                      }
                    } else {
                      alert('Please log in first');
                    }
                  } catch (err) {
                    console.error('Sync error:', err);
                    alert(`Sync failed: ${err.message}`);
                  }
                }}
              >
                🔄 Sync User
              </button>
            </div>
          </div>

          <div className="game-card">
            <h3>Guild Benefits</h3>
            <div className="game-flex-col">
              <div>📦 <strong>Shared Warehouse</strong> - Pool resources with guild members</div>
              <div>💰 <strong>Guild Treasury</strong> - Shared gold for group investments</div>
              <div>⚔️ <strong>Guild Wars</strong> - Compete against rival guilds</div>
              <div>🏆 <strong>Achievements</strong> - Unlock guild-wide rewards</div>
              <div>💬 <strong>Private Channels</strong> - Guild-only communication</div>
              <div>🎯 <strong>Group Missions</strong> - Exclusive high-reward content</div>
            </div>
          </div>
        </div>
      </GameLayout>
    );
  }

  // In a guild - show guild overview
  return (
    <GameLayout title={`[${guild.tag}] ${guild.name}`} sidebar={sidebar}>
      <div className="game-flex-col">
        {activeTab === 'overview' && (
          <>
            <div className="game-card">
              <div className="game-space-between" style={{ marginBottom: '16px' }}>
                <div>
                  <h2>[{guild.tag}] {guild.name}</h2>
                  {guild.description && (
                    <p className="game-muted">{guild.description}</p>
                  )}
                </div>
                {guild.emblem && (
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    background: guild.emblem.color || '#533b2c',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px'
                  }}>
                    {guild.emblem.symbol || '⚔️'}
                  </div>
                )}
              </div>

              <div className="game-grid-3">
                <div className="game-center">
                  <div className="game-big">{guild.level}</div>
                  <div className="game-small game-muted">Level</div>
                </div>
                <div className="game-center">
                  <div className="game-big">{guild.memberCount}</div>
                  <div className="game-small game-muted">Members</div>
                </div>
                <div className="game-center">
                  <div className="game-big game-good">{guild.treasury.toLocaleString()}g</div>
                  <div className="game-small game-muted">Treasury</div>
                </div>
              </div>

              <div style={{ margin: '16px 0' }}>
                <div className="game-space-between">
                  <span>Experience Progress</span>
                  <span>{guild.xp.toLocaleString()} / {guild.xpNext.toLocaleString()} XP</span>
                </div>
                <div style={{ 
                  background: '#1a1511',
                  border: '1px solid #533b2c',
                  borderRadius: '4px',
                  height: '12px',
                  marginTop: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: 'linear-gradient(90deg, #6eb5ff, #4a8acc)',
                    height: '100%',
                    width: `${guild.xpProgress}%`,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            </div>

            {guild.recentAchievements.length > 0 && (
              <div className="game-card">
                <h3>Recent Achievements</h3>
                {guild.recentAchievements.map(achievement => (
                  <div key={achievement.key} className="game-space-between" style={{ margin: '8px 0' }}>
                    <div>
                      <strong>🏆 {achievement.name}</strong>
                      <div className="game-small game-muted">{achievement.description}</div>
                    </div>
                    <div className="game-small game-muted">
                      {formatTimeAgo(achievement.unlockedAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="game-card">
              <h3>Guild Channels</h3>
              <div className="game-flex-col">
                {guild.channels.map(channel => (
                  <div key={channel.id} className="game-space-between">
                    <div>
                      <strong>#{channel.name}</strong>
                      {channel.description && (
                        <div className="game-small game-muted">{channel.description}</div>
                      )}
                    </div>
                    {channel.roleRequired && (
                      <span className="game-pill game-pill-small">{channel.roleRequired}+</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="game-card">
              <h3>Recent Activity</h3>
              {guild.recentActivity.length > 0 ? (
                <div className="game-flex-col">
                  {guild.recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="game-space-between">
                      <div>
                        {getActivityIcon(activity.action)} <strong>{activity.user}</strong>
                        <span className="game-small"> {activity.action.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="game-small game-muted">
                        {formatTimeAgo(activity.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="game-muted">No recent activity</p>
              )}
            </div>
          </>
        )}

        {activeTab === 'members' && (
          <div className="game-card">
            <h3>Guild Members</h3>
            <p className="game-muted">Member management is available at <a href="/guild/members">/guild/members</a></p>
          </div>
        )}

        {activeTab === 'wars' && (
          <div className="game-card">
            <h3>Wars & Alliances</h3>
            <p className="game-muted">War system is available at <a href="/guild/wars">/guild/wars</a></p>
          </div>
        )}
      </div>
    </GameLayout>
  );
}