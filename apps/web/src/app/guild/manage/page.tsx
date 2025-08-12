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
  maxMembers: number;
  memberCount: number;
  treasury: number;
  userRole: 'LEADER' | 'OFFICER' | 'TRADER' | 'MEMBER';
  isActive: boolean;
};

type GuildMember = {
  id: string;
  userId: string;
  role: 'LEADER' | 'OFFICER' | 'TRADER' | 'MEMBER';
  joinedAt: string;
  contributionPoints: number;
  lastActive: string;
  displayName: string;
};

export default function GuildManagePage() {
  const [guild, setGuild] = useState<Guild | null>(null);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'settings' | 'invites'>('overview');
  const [isClient, setIsClient] = useState(false);
  
  // Form states
  const [editingGuild, setEditingGuild] = useState(false);
  const [guildForm, setGuildForm] = useState({
    name: '',
    description: '',
    maxMembers: 50
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

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
      
      if (!guildData.inGuild) {
        setError('You are not in a guild');
        return;
      }

      const guildInfo = guildData.guild;
      
      // Check if user has management permissions
      if (!['LEADER', 'OFFICER'].includes(guildInfo.userRole)) {
        setError('You do not have permission to manage this guild');
        return;
      }

      setGuild({
        id: guildInfo.id,
        name: guildInfo.name,
        tag: guildInfo.tag,
        emblem: guildInfo.emblem,
        description: guildInfo.description,
        level: guildInfo.level,
        maxMembers: guildInfo.maxMembers,
        memberCount: guildInfo.memberCount,
        treasury: guildInfo.treasury,
        userRole: guildInfo.userRole,
        isActive: guildInfo.isActive
      });

      // Set form defaults
      setGuildForm({
        name: guildInfo.name,
        description: guildInfo.description || '',
        maxMembers: guildInfo.maxMembers
      });

      // Get members
      const membersResponse = await fetch('/api/guild/members', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setMembers(membersData.members);
      }

    } catch (err) {
      console.error('Error loading guild data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load guild data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guild) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // This would require a guild update endpoint
      alert('Guild update functionality not yet implemented. This would require a PATCH /api/guild/info endpoint.');
      
    } catch (err) {
      console.error('Error updating guild:', err);
      alert('Failed to update guild');
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) {
      alert('Please enter an email address');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // This would require updating the invite endpoint to support email-based invites
      alert('Email-based invitations not yet implemented. For now, users can browse and request to join guilds.');
      
    } catch (err) {
      console.error('Error sending invite:', err);
      alert('Failed to send invitation');
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
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'LEADER': 'game-pill-good',
      'OFFICER': 'game-pill-warn',
      'TRADER': 'game-pill-info',
      'MEMBER': 'game-pill'
    };
    return colors[role] || 'game-pill';
  };

  const getRoleIcon = (role: string) => {
    const icons: Record<string, string> = {
      'LEADER': '👑',
      'OFFICER': '⭐',
      'TRADER': '💼',
      'MEMBER': '👤'
    };
    return icons[role] || '👤';
  };

  const sidebar = guild ? (
    <div>
      <h3>Guild Management</h3>
      <div className="game-flex-col">
        <a href="/guild" className="game-btn game-btn-small">
          ← Back to Guild
        </a>
        <a href="/guild/members" className="game-btn game-btn-small">
          👥 Manage Members
        </a>
      </div>

      <h3>Your Permissions</h3>
      <div className="game-flex-col">
        <div className="game-space-between">
          <span>Role:</span>
          <span className={`game-pill ${getRoleColor(guild.userRole)}`}>
            {getRoleIcon(guild.userRole)} {guild.userRole}
          </span>
        </div>
        <div className="game-small game-muted">
          {guild.userRole === 'LEADER' ? 
            'Full access to all guild management features' : 
            'Limited access as an Officer'
          }
        </div>
      </div>

      <h3>Quick Stats</h3>
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
          <span>Status:</span>
          <span className={guild.isActive ? 'game-good' : 'game-bad'}>
            {guild.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <h3>Management Tasks</h3>
      <div className="game-flex-col">
        <button 
          className={`game-btn game-btn-small ${activeTab === 'overview' ? 'game-btn-primary' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`game-btn game-btn-small ${activeTab === 'members' ? 'game-btn-primary' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          👥 Member Summary
        </button>
        <button 
          className={`game-btn game-btn-small ${activeTab === 'settings' ? 'game-btn-primary' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Guild Settings
        </button>
        <button 
          className={`game-btn game-btn-small ${activeTab === 'invites' ? 'game-btn-primary' : ''}`}
          onClick={() => setActiveTab('invites')}
        >
          📧 Send Invites
        </button>
      </div>
    </div>
  ) : (
    <div>
      <h3>Loading...</h3>
    </div>
  );

  if (!isClient) {
    return (
      <GameLayout title="Guild Management" sidebar={<div>Loading...</div>}>
        <div>Loading guild management...</div>
      </GameLayout>
    );
  }

  if (loading) {
    return (
      <GameLayout title="Guild Management" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center">Loading guild management...</div>
        </div>
      </GameLayout>
    );
  }

  if (error) {
    return (
      <GameLayout title="Guild Management" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center game-bad">Error: {error}</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
            <button className="game-btn" onClick={loadGuildData}>
              Retry
            </button>
            <a href="/guild" className="game-btn game-btn-primary">
              Back to Guild
            </a>
          </div>
        </div>
      </GameLayout>
    );
  }

  if (!guild) {
    return (
      <GameLayout title="Guild Management" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center">No guild found</div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title={`Manage [${guild.tag}] ${guild.name}`} sidebar={sidebar}>
      <div className="game-flex-col">
        {activeTab === 'overview' && (
          <>
            <div className="game-card">
              <h3>Guild Management Overview</h3>
              <p className="game-muted">
                Welcome to the guild management panel. Here you can manage your guild's settings, 
                members, and other administrative tasks.
              </p>

              <div className="game-grid-3" style={{ margin: '16px 0' }}>
                <div className="game-center">
                  <div className="game-big">{guild.level}</div>
                  <div className="game-small game-muted">Guild Level</div>
                </div>
                <div className="game-center">
                  <div className="game-big">{guild.memberCount}</div>
                  <div className="game-small game-muted">Active Members</div>
                </div>
                <div className="game-center">
                  <div className="game-big game-good">{guild.treasury.toLocaleString()}g</div>
                  <div className="game-small game-muted">Treasury</div>
                </div>
              </div>
            </div>

            <div className="game-card">
              <h3>Guild Status</h3>
              <div className="game-flex-col">
                <div className="game-space-between">
                  <span>Guild Name:</span>
                  <span>[{guild.tag}] {guild.name}</span>
                </div>
                <div className="game-space-between">
                  <span>Member Capacity:</span>
                  <span>{guild.memberCount}/{guild.maxMembers} ({Math.round((guild.memberCount / guild.maxMembers) * 100)}% full)</span>
                </div>
                <div className="game-space-between">
                  <span>Status:</span>
                  <span className={guild.isActive ? 'game-good' : 'game-bad'}>
                    {guild.isActive ? 'Active & Recruiting' : 'Inactive'}
                  </span>
                </div>
                <div className="game-space-between">
                  <span>Your Role:</span>
                  <span className={`game-pill ${getRoleColor(guild.userRole)}`}>
                    {getRoleIcon(guild.userRole)} {guild.userRole}
                  </span>
                </div>
              </div>
            </div>

            <div className="game-card">
              <h3>Quick Actions</h3>
              <div className="game-grid-2">
                <a href="/guild/members" className="game-btn">
                  👥 Manage Members
                </a>
                <button 
                  className="game-btn"
                  onClick={() => setActiveTab('settings')}
                >
                  ⚙️ Guild Settings
                </button>
                <a href="/guild/treasury" className="game-btn">
                  💰 Treasury Management
                </a>
                <button 
                  className="game-btn"
                  onClick={() => setActiveTab('invites')}
                >
                  📧 Send Invitations
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'members' && (
          <div className="game-card">
            <h3>Member Summary</h3>
            <p className="game-muted">
              Quick overview of your guild members. For detailed member management, visit the 
              <a href="/guild/members" style={{ marginLeft: '4px' }}>members page</a>.
            </p>

            <div className="game-grid-2" style={{ margin: '16px 0' }}>
              <div className="game-space-between">
                <span>Leaders:</span>
                <span>{members.filter(m => m.role === 'LEADER').length}</span>
              </div>
              <div className="game-space-between">
                <span>Officers:</span>
                <span>{members.filter(m => m.role === 'OFFICER').length}</span>
              </div>
              <div className="game-space-between">
                <span>Traders:</span>
                <span>{members.filter(m => m.role === 'TRADER').length}</span>
              </div>
              <div className="game-space-between">
                <span>Members:</span>
                <span>{members.filter(m => m.role === 'MEMBER').length}</span>
              </div>
            </div>

            {members.length > 0 && (
              <div>
                <h4>Recent Members</h4>
                <div className="game-flex-col">
                  {members
                    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
                    .slice(0, 5)
                    .map(member => (
                    <div key={member.id} className="game-space-between">
                      <div>
                        <strong>{member.displayName}</strong>
                        <span className={`game-pill game-pill-small ${getRoleColor(member.role)}`} style={{ marginLeft: '8px' }}>
                          {getRoleIcon(member.role)} {member.role}
                        </span>
                      </div>
                      <div className="game-small game-muted">
                        Joined {formatTimeAgo(member.joinedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="game-card">
            <h3>Guild Settings</h3>
            {guild.userRole !== 'LEADER' && (
              <div className="game-warning" style={{ marginBottom: '16px' }}>
                <strong>⚠️ Limited Access:</strong> Only guild leaders can modify most settings.
              </div>
            )}

            <form onSubmit={handleUpdateGuild}>
              <div className="game-flex-col" style={{ gap: '16px' }}>
                <div>
                  <label className="game-small">Guild Name</label>
                  <input
                    type="text"
                    value={guildForm.name}
                    onChange={(e) => setGuildForm({...guildForm, name: e.target.value})}
                    className="game-input"
                    disabled={guild.userRole !== 'LEADER'}
                    maxLength={50}
                  />
                  <div className="game-small game-muted">Guild tag [{guild.tag}] cannot be changed</div>
                </div>

                <div>
                  <label className="game-small">Description</label>
                  <textarea
                    value={guildForm.description}
                    onChange={(e) => setGuildForm({...guildForm, description: e.target.value})}
                    className="game-input"
                    disabled={guild.userRole !== 'LEADER'}
                    rows={3}
                    maxLength={500}
                    placeholder="Describe your guild's purpose and goals..."
                  />
                </div>

                <div>
                  <label className="game-small">Maximum Members</label>
                  <input
                    type="number"
                    value={guildForm.maxMembers}
                    onChange={(e) => setGuildForm({...guildForm, maxMembers: parseInt(e.target.value) || 50})}
                    className="game-input"
                    disabled={guild.userRole !== 'LEADER'}
                    min={guild.memberCount}
                    max={200}
                  />
                  <div className="game-small game-muted">
                    Current: {guild.memberCount} members. Cannot be set below current member count.
                  </div>
                </div>

                {guild.userRole === 'LEADER' && (
                  <div className="game-flex" style={{ gap: '8px' }}>
                    <button type="submit" className="game-btn game-btn-primary">
                      💾 Save Changes
                    </button>
                    <button 
                      type="button" 
                      className="game-btn"
                      onClick={() => {
                        setGuildForm({
                          name: guild.name,
                          description: guild.description || '',
                          maxMembers: guild.maxMembers
                        });
                      }}
                    >
                      🔄 Reset
                    </button>
                  </div>
                )}
              </div>
            </form>

            {guild.userRole === 'LEADER' && (
              <div style={{ marginTop: '32px', padding: '16px', background: '#2a1f18', border: '1px solid #533b2c', borderRadius: '4px' }}>
                <h4 className="game-bad">⚠️ Danger Zone</h4>
                <p className="game-small game-muted">
                  These actions are permanent and cannot be undone.
                </p>
                <div className="game-flex" style={{ gap: '8px', marginTop: '12px' }}>
                  <button 
                    className="game-btn game-btn-danger game-btn-small"
                    onClick={() => alert('Guild deletion not implemented. This would require confirmation and transfer of assets.')}
                  >
                    🗑️ Delete Guild
                  </button>
                  <button 
                    className="game-btn game-btn-warning game-btn-small"
                    onClick={() => alert('Guild deactivation not implemented. This would hide the guild from browse lists.')}
                  >
                    ⏸️ Deactivate Guild
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'invites' && (
          <div className="game-card">
            <h3>Send Guild Invitations</h3>
            <p className="game-muted">
              Invite new members to join your guild. Players must have an account to receive invitations.
            </p>

            <form onSubmit={handleSendInvite} className="game-flex-col" style={{ gap: '16px', marginTop: '16px' }}>
              <div>
                <label className="game-small">Player Email or Username</label>
                <input
                  type="text"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="game-input"
                  placeholder="Enter email address or username..."
                  required
                />
                <div className="game-small game-muted">
                  The player must have an account to receive invitations.
                </div>
              </div>

              <div>
                <label className="game-small">Personal Message (Optional)</label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="game-input"
                  rows={3}
                  maxLength={200}
                  placeholder="Add a personal message to your invitation..."
                />
                <div className="game-small game-muted">
                  {inviteMessage.length}/200 characters
                </div>
              </div>

              <button type="submit" className="game-btn game-btn-primary">
                📧 Send Invitation
              </button>
            </form>

            <div style={{ marginTop: '24px', padding: '16px', background: '#1a1511', border: '1px solid #533b2c', borderRadius: '4px' }}>
              <h4>💡 Alternative: Public Guild Listing</h4>
              <p className="game-small game-muted">
                Your guild is automatically listed in the public guild browser. Players can find and request to join your guild from there.
              </p>
              <a href="/guild/browse" className="game-btn game-btn-small" style={{ marginTop: '8px' }}>
                🔍 View Guild Browser
              </a>
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  );
}