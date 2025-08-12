'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { supabase } from '@/lib/supabaseClient';
import { GuildChannel } from '@/types/guild';

export default function GuildChannelsPage() {
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<GuildChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [guild, setGuild] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  // New channel creation state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [newChannelRole, setNewChannelRole] = useState<string>('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    loadChannels();
  }, [isClient]);

  const loadChannels = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch('/api/guild/channels', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load channels');
      }

      const data = await response.json();
      setChannels(data.channels);
      setGuild(data.guild);
      setUserRole(data.userRole);

      // Select first channel by default
      if (data.channels.length > 0 && !selectedChannel) {
        setSelectedChannel(data.channels[0]);
      }

    } catch (err) {
      console.error('Error loading channels:', err);
      setError(err instanceof Error ? err.message : 'Failed to load channels');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      alert('Channel name is required');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/guild/channels', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newChannelName,
          description: newChannelDescription,
          roleRequired: newChannelRole || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create channel');
      }

      const result = await response.json();
      alert(result.message);
      
      // Reset form and reload channels
      setNewChannelName('');
      setNewChannelDescription('');
      setNewChannelRole('');
      setShowCreateForm(false);
      loadChannels();

    } catch (err) {
      console.error('Error creating channel:', err);
      alert(err instanceof Error ? err.message : 'Failed to create channel');
    }
  };

  const getRoleColor = (role?: string) => {
    const colors: Record<string, string> = {
      'LEADER': 'game-pill-good',
      'OFFICER': 'game-pill-warn',
      'TRADER': 'game-pill-info',
      'MEMBER': 'game-pill'
    };
    return role ? colors[role] || 'game-pill' : '';
  };

  const sidebar = guild ? (
    <div>
      <h3>Guild Chat</h3>
      <div className="game-flex-col">
        <div className="game-space-between">
          <span>Guild:</span>
          <span>[{guild.tag}] {guild.name}</span>
        </div>
        <div className="game-space-between">
          <span>Your Role:</span>
          <span className={`game-pill ${getRoleColor(userRole)}`}>{userRole}</span>
        </div>
      </div>

      <h3>Channels</h3>
      <div className="game-flex-col">
        {channels.map(channel => (
          <button
            key={channel.id}
            className={`game-btn game-btn-small ${selectedChannel?.id === channel.id ? 'game-btn-primary' : ''}`}
            onClick={() => setSelectedChannel(channel)}
          >
            #{channel.name}
            {channel.roleRequired && (
              <span className={`game-pill game-pill-small ${getRoleColor(channel.roleRequired)}`}>
                {channel.roleRequired}
              </span>
            )}
          </button>
        ))}
      </div>

      {['LEADER', 'OFFICER'].includes(userRole) && (
        <>
          <h3>Management</h3>
          <div className="game-flex-col">
            <button 
              className="game-btn game-btn-small game-btn-primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : '➕ Create Channel'}
            </button>
            <a href="/guild" className="game-btn game-btn-small">
              ← Back to Guild
            </a>
          </div>
        </>
      )}
    </div>
  ) : (
    <div>
      <h3>Loading...</h3>
    </div>
  );

  if (!isClient) {
    return (
      <GameLayout title="Guild Channels" sidebar={<div>Loading...</div>}>
        <div>Loading guild chat...</div>
      </GameLayout>
    );
  }

  if (loading) {
    return (
      <GameLayout title="Guild Channels" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center">Loading guild channels...</div>
        </div>
      </GameLayout>
    );
  }

  if (error) {
    return (
      <GameLayout title="Guild Channels" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center game-bad">Error: {error}</div>
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button className="game-btn" onClick={loadChannels}>
              Retry
            </button>
          </div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Guild Channels" sidebar={sidebar}>
      <div className="game-flex-col">
        {/* Channel Creation Form */}
        {showCreateForm && (
          <div className="game-card">
            <h3>Create New Channel</h3>
            
            <div className="game-flex-col" style={{ gap: '12px' }}>
              <div>
                <label className="game-small">Channel Name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g., trade-talk, announcements"
                  className="game-input"
                  style={{ width: '100%' }}
                />
                <div className="game-small game-muted">Use lowercase letters, numbers, and hyphens only</div>
              </div>
              
              <div>
                <label className="game-small">Description (Optional)</label>
                <input
                  type="text"
                  value={newChannelDescription}
                  onChange={(e) => setNewChannelDescription(e.target.value)}
                  placeholder="What is this channel for?"
                  className="game-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label className="game-small">Minimum Role (Optional)</label>
                <select
                  value={newChannelRole}
                  onChange={(e) => setNewChannelRole(e.target.value)}
                  className="game-input"
                  style={{ width: '100%' }}
                >
                  <option value="">Everyone</option>
                  <option value="TRADER">Trader and above</option>
                  <option value="OFFICER">Officer and above</option>
                  <option value="LEADER">Leader only</option>
                </select>
              </div>

              <div className="game-flex" style={{ gap: '8px' }}>
                <button
                  className="game-btn game-btn-primary"
                  onClick={handleCreateChannel}
                >
                  Create Channel
                </button>
                <button
                  className="game-btn"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selected Channel */}
        {selectedChannel ? (
          <div className="game-card">
            <div className="game-space-between" style={{ marginBottom: '16px' }}>
              <div>
                <h3>#{selectedChannel.name}</h3>
                {selectedChannel.description && (
                  <p className="game-muted game-small">{selectedChannel.description}</p>
                )}
              </div>
              {selectedChannel.roleRequired && (
                <span className={`game-pill ${getRoleColor(selectedChannel.roleRequired)}`}>
                  {selectedChannel.roleRequired}+ Only
                </span>
              )}
            </div>

            {/* Chat Area - Placeholder for now */}
            <div style={{ 
              border: '1px solid #533b2c', 
              borderRadius: '4px', 
              padding: '16px', 
              minHeight: '400px',
              background: '#1a1511',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column'
            }}>
              <div className="game-muted">💬 Chat System Coming Soon</div>
              <div className="game-small game-muted" style={{ marginTop: '8px' }}>
                Real-time guild chat will be implemented here
              </div>
            </div>

            {/* Message Input - Placeholder */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder={`Message #${selectedChannel.name}`}
                className="game-input"
                style={{ flex: 1 }}
                disabled
              />
              <button className="game-btn game-btn-primary" disabled>
                Send
              </button>
            </div>
          </div>
        ) : (
          <div className="game-card">
            <div className="game-center">
              <div className="game-muted">Select a channel to start chatting</div>
            </div>
          </div>
        )}

        {/* Chat Instructions */}
        <div className="game-card">
          <h3>Guild Chat Guidelines</h3>
          <div className="game-flex-col game-small">
            <div>• Be respectful to all guild members</div>
            <div>• Use appropriate channels for different topics</div>
            <div>• Role-restricted channels require minimum permissions</div>
            <div>• Leaders and Officers can create and manage channels</div>
            <div>• Report any issues to guild leadership</div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}