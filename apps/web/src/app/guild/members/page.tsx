'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { supabase } from '@/lib/supabaseClient';
import { useGuildInvitations, useUserSearch } from '@/hooks/useGuild';

type GuildMember = {
  id: string;
  userId: string;
  role: 'LEADER' | 'OFFICER' | 'TRADER' | 'MEMBER';
  joinedAt: string;
  contributionPoints: number;
  lastActive: string;
  displayName: string;
};

type Guild = {
  id: string;
  name: string;
  tag: string;
};

export default function GuildMembersPage() {
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMember, setSelectedMember] = useState<GuildMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Use guild invitation hooks
  const { sendInvitation, isLoading: inviteLoading, error: inviteError, clearError } = useGuildInvitations();
  const { searchUsers, isLoading: searchLoading } = useUserSearch();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    loadMembers();
  }, [isClient]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch('/api/guild/members', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load members');
      }

      const data = await response.json();
      setMembers(data.members);
      setGuild(data.guild);
      
      // Find user's role
      const currentUser = data.members.find((m: GuildMember) => m.userId === session.user.id);
      setUserRole(currentUser?.role || '');

    } catch (err) {
      console.error('Error loading members:', err);
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberAction = async (targetUserId: string, action: string, newRole?: string) => {
    if (!confirm(`Are you sure you want to ${action} this member?`)) {
      return;
    }

    try {
      setActionLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/guild/members', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          targetUserId,
          newRole
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${action} member`);
      }

      alert(`Member ${action} successful!`);
      setSelectedMember(null);
      loadMembers(); // Reload the member list

    } catch (err) {
      console.error(`Error ${action} member:`, err);
      alert(err instanceof Error ? err.message : `Failed to ${action} member`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUserSearch = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const results = await searchUsers(query);
    setSearchResults(results);
  };

  const handleSendInvite = async () => {
    if (!selectedUser) {
      alert('Please select a user to invite');
      return;
    }

    clearError(); // Clear any previous errors
    const success = await sendInvitation(selectedUser.id, inviteMessage);
    
    if (success) {
      alert(`Invitation sent to ${selectedUser.displayName}!`);
      // Reset form
      setSelectedUser(null);
      setInviteQuery('');
      setInviteMessage('');
      setSearchResults([]);
      setSelectedMember(null);
    } else if (inviteError) {
      alert(inviteError);
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

  const canManageMember = (targetRole: string) => {
    const roleHierarchy: Record<string, number> = { LEADER: 4, OFFICER: 3, TRADER: 2, MEMBER: 1 };
    const userLevel = roleHierarchy[userRole] || 0;
    const targetLevel = roleHierarchy[targetRole] || 0;
    return userLevel > targetLevel;
  };

  const canPromoteTo = (role: string) => {
    if (userRole !== 'LEADER' && (role === 'LEADER' || role === 'OFFICER')) {
      return false; // Only leaders can promote to officer or leader
    }
    return ['LEADER', 'OFFICER'].includes(userRole);
  };

  const sidebar = guild ? (
    <div>
      <h3>Guild Management</h3>
      <div className="game-flex-col">
        <div className="game-space-between">
          <span>Guild:</span>
          <span>[{guild.tag}] {guild.name}</span>
        </div>
        <div className="game-space-between">
          <span>Your Role:</span>
          <span className={`game-pill ${getRoleColor(userRole)}`}>
            {getRoleIcon(userRole)} {userRole}
          </span>
        </div>
        <div className="game-space-between">
          <span>Total Members:</span>
          <span>{members.length}</span>
        </div>
      </div>

      <h3>Quick Actions</h3>
      <div className="game-flex-col">
        <a href="/guild" className="game-btn game-btn-small">
          ← Back to Guild
        </a>
        {['LEADER', 'OFFICER'].includes(userRole) && (
          <button 
            className="game-btn game-btn-small game-btn-primary"
            onClick={() => setSelectedMember({ id: 'invite', userId: '', role: 'MEMBER', joinedAt: '', contributionPoints: 0, lastActive: '', displayName: 'New Invite' })}
          >
            📧 Send Invite
          </button>
        )}
      </div>

      <h3>Role Permissions</h3>
      <div className="game-flex-col game-small">
        <div>👑 <strong>Leader:</strong> Full control</div>
        <div>⭐ <strong>Officer:</strong> Invite, promote, kick</div>
        <div>💼 <strong>Trader:</strong> Access warehouse</div>
        <div>👤 <strong>Member:</strong> Basic access</div>
      </div>
    </div>
  ) : (
    <div>
      <h3>Loading...</h3>
    </div>
  );

  if (!isClient) {
    return (
      <GameLayout title="Guild Members" sidebar={<div>Loading...</div>}>
        <div>Loading member management...</div>
      </GameLayout>
    );
  }

  if (loading) {
    return (
      <GameLayout title="Guild Members" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center">Loading guild members...</div>
        </div>
      </GameLayout>
    );
  }

  if (error) {
    return (
      <GameLayout title="Guild Members" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center game-bad">Error: {error}</div>
          <button className="game-btn" onClick={loadMembers}>
            Retry
          </button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Guild Members" sidebar={sidebar}>
      <div className="game-flex-col">
        {/* Member List */}
        <div className="game-card">
          <h3>Guild Members ({members.length})</h3>
          {members.length > 0 ? (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Contribution</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.id}>
                    <td>
                      <a 
                        href={`/profile/${member.userId}`} 
                        className="member-name-link"
                      >
                        <strong>{member.displayName}</strong>
                      </a>
                    </td>
                    <td>
                      <span className={`game-pill game-pill-small ${getRoleColor(member.role)}`}>
                        {getRoleIcon(member.role)} {member.role}
                      </span>
                    </td>
                    <td className="game-small">
                      {formatTimeAgo(member.joinedAt)}
                    </td>
                    <td className="game-center">
                      {member.contributionPoints.toLocaleString()}
                    </td>
                    <td className="game-small">
                      {formatTimeAgo(member.lastActive)}
                    </td>
                    <td>
                      {canManageMember(member.role) && (
                        <button
                          className="game-btn game-btn-small"
                          onClick={() => setSelectedMember(member)}
                          disabled={actionLoading}
                        >
                          Manage
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="game-muted">No members found</p>
          )}
        </div>

        {/* Member Management Modal */}
        {selectedMember && selectedMember.id !== 'invite' && (
          <div className="game-card">
            <h3>Manage {selectedMember.displayName}</h3>
            
            <div className="game-grid-2" style={{ marginBottom: '16px' }}>
              <div>
                <strong>Current Role:</strong> {selectedMember.role}
              </div>
              <div>
                <strong>Contribution:</strong> {selectedMember.contributionPoints.toLocaleString()} points
              </div>
            </div>

            <div className="game-flex" style={{ gap: '8px', flexWrap: 'wrap' }}>
              {/* Promotion buttons */}
              {canPromoteTo('OFFICER') && selectedMember.role === 'MEMBER' && (
                <button
                  className="game-btn game-btn-small game-btn-primary"
                  onClick={() => handleMemberAction(selectedMember.userId, 'promote', 'OFFICER')}
                  disabled={actionLoading}
                >
                  ⬆️ Promote to Officer
                </button>
              )}
              
              {canPromoteTo('TRADER') && selectedMember.role === 'MEMBER' && (
                <button
                  className="game-btn game-btn-small game-btn-primary"
                  onClick={() => handleMemberAction(selectedMember.userId, 'promote', 'TRADER')}
                  disabled={actionLoading}
                >
                  ⬆️ Promote to Trader
                </button>
              )}

              {userRole === 'LEADER' && selectedMember.role === 'OFFICER' && (
                <button
                  className="game-btn game-btn-small game-btn-primary"
                  onClick={() => handleMemberAction(selectedMember.userId, 'promote', 'LEADER')}
                  disabled={actionLoading}
                >
                  ⬆️ Promote to Leader
                </button>
              )}

              {/* Demotion buttons */}
              {canManageMember(selectedMember.role) && selectedMember.role !== 'MEMBER' && (
                <button
                  className="game-btn game-btn-small game-btn-warning"
                  onClick={() => handleMemberAction(selectedMember.userId, 'demote', 'MEMBER')}
                  disabled={actionLoading}
                >
                  ⬇️ Demote to Member
                </button>
              )}

              {/* Kick button */}
              {canManageMember(selectedMember.role) && (
                <button
                  className="game-btn game-btn-small game-btn-danger"
                  onClick={() => handleMemberAction(selectedMember.userId, 'kick')}
                  disabled={actionLoading}
                >
                  ❌ Kick from Guild
                </button>
              )}

              <button
                className="game-btn game-btn-small"
                onClick={() => setSelectedMember(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Invitation Form */}
        {selectedMember && selectedMember.id === 'invite' && (
          <div className="game-card">
            <h3>Send Guild Invitation</h3>
            
            <div className="game-flex-col" style={{ gap: '12px' }}>
              <div>
                <label className="game-small">Search Player</label>
                <input
                  type="text"
                  value={inviteQuery}
                  onChange={(e) => {
                    setInviteQuery(e.target.value);
                    handleUserSearch(e.target.value);
                  }}
                  placeholder="Enter email or username..."
                  style={{ width: '100%' }}
                  disabled={inviteLoading}
                />
                {searchLoading && (
                  <div className="game-small game-muted" style={{ marginTop: '4px' }}>
                    Searching...
                  </div>
                )}
                
                {/* Search Results */}
                {searchResults.length > 0 && !selectedUser && (
                  <div style={{ 
                    border: '1px solid #533b2c', 
                    borderRadius: '4px', 
                    marginTop: '8px', 
                    maxHeight: '200px', 
                    overflowY: 'auto'
                  }}>
                    {searchResults.map(user => (
                      <div 
                        key={user.id} 
                        className="game-space-between" 
                        style={{ 
                          padding: '8px', 
                          borderBottom: '1px solid #533b2c',
                          cursor: 'pointer',
                          background: 'rgba(83, 59, 44, 0.1)'
                        }}
                        onClick={() => {
                          setSelectedUser(user);
                          setInviteQuery(user.displayName);
                          setSearchResults([]);
                        }}
                      >
                        <div>
                          <strong>{user.displayName}</strong>
                          <div className="game-small game-muted">{user.email}</div>
                        </div>
                        <div className="game-small game-muted">
                          Joined {new Date(user.joinedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Selected User */}
                {selectedUser && (
                  <div style={{ 
                    border: '1px solid #6eb5ff', 
                    borderRadius: '4px', 
                    padding: '8px', 
                    marginTop: '8px', 
                    background: 'rgba(110, 181, 255, 0.1)'
                  }}>
                    <div className="game-space-between">
                      <div>
                        <strong>{selectedUser.displayName}</strong>
                        <div className="game-small game-muted">{selectedUser.email}</div>
                      </div>
                      <button 
                        className="game-btn game-btn-small"
                        onClick={() => {
                          setSelectedUser(null);
                          setInviteQuery('');
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="game-small">Invitation Message (Optional)</label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Add a personal message to your invitation..."
                  rows={3}
                  style={{ width: '100%' }}
                  disabled={inviteLoading}
                />
              </div>

              <div className="game-flex" style={{ gap: '8px' }}>
                <button
                  className="game-btn game-btn-primary"
                  onClick={handleSendInvite}
                  disabled={inviteLoading || !selectedUser}
                >
                  📧 Send Invitation
                </button>
                
                <button
                  className="game-btn"
                  onClick={() => {
                    setSelectedMember(null);
                    setInviteQuery('');
                    setInviteMessage('');
                    setSelectedUser(null);
                    setSearchResults([]);
                    clearError();
                  }}
                >
                  Cancel
                </button>
              </div>
              
              {inviteError && (
                <div className="game-small game-bad" style={{ marginTop: '8px' }}>
                  ❌ {inviteError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Member Statistics */}
        <div className="game-card">
          <h3>Member Statistics</h3>
          <div className="game-grid-2">
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
            <div className="game-space-between">
              <span>Total Contribution:</span>
              <span>{members.reduce((sum, m) => sum + m.contributionPoints, 0).toLocaleString()}</span>
            </div>
            <div className="game-space-between">
              <span>Active This Week:</span>
              <span>
                {members.filter(m => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return new Date(m.lastActive) > weekAgo;
                }).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .member-name-link {
          color: #f1e5c8;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.2s ease;
        }

        .member-name-link:hover {
          color: #a36a43;
          border-bottom-color: #a36a43;
        }
      `}</style>
    </GameLayout>
  );
}