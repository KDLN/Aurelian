'use client';

import { ChatUser } from './ChatSystem';

interface Props {
  users: ChatUser[];
  onToggle: () => void;
  isCompact?: boolean;
}

export function UserList({ users, onToggle, isCompact = false }: Props) {
  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'LEADER': return '#ffd700'; // Gold
      case 'OFFICER': return '#c0c0c0'; // Silver
      case 'TRADER': return '#cd7f32'; // Bronze
      case 'MEMBER': return '#a1824a'; // Default
      default: return '#a1824a';
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'LEADER': return '👑';
      case 'OFFICER': return '🔥';
      case 'TRADER': return '💼';
      case 'MEMBER': return '👤';
      default: return '👤';
    }
  };

  const getAvatar = (displayName: string) => {
    // Simple avatar using first letter of name
    const initial = displayName.charAt(0).toUpperCase();
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'];
    const colorIndex = displayName.charCodeAt(0) % colors.length;
    
    return (
      <div style={{
        width: isCompact ? '20px' : '24px',
        height: isCompact ? '20px' : '24px',
        borderRadius: '50%',
        background: colors[colorIndex],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isCompact ? '10px' : '12px',
        fontWeight: 'bold',
        color: '#fff',
        flexShrink: 0
      }}>
        {initial}
      </div>
    );
  };

  // Sort users by role hierarchy, then alphabetically
  const sortedUsers = [...users].sort((a, b) => {
    const roleOrder = { LEADER: 4, OFFICER: 3, TRADER: 2, MEMBER: 1 };
    const aRole = roleOrder[a.guildRole as keyof typeof roleOrder] || 0;
    const bRole = roleOrder[b.guildRole as keyof typeof roleOrder] || 0;
    
    if (aRole !== bRole) {
      return bRole - aRole; // Higher roles first
    }
    
    return a.displayName.localeCompare(b.displayName);
  });

  return (
    <div style={{
      width: isCompact ? '150px' : '200px',
      borderLeft: '1px solid #533b2c',
      background: '#1a1511',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '8px',
        borderBottom: '1px solid #533b2c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#231913'
      }}>
        <div style={{ 
          fontSize: isCompact ? '12px' : '14px',
          fontWeight: 'bold',
          color: '#f1e5c8'
        }}>
          Online ({users.length})
        </div>
        
        <button
          className="game-btn game-btn-small"
          onClick={onToggle}
          style={{ 
            fontSize: '10px',
            padding: '2px 4px',
            minWidth: 'auto'
          }}
          title="Hide user list"
        >
          ✕
        </button>
      </div>

      {/* User List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '4px'
      }}>
        {sortedUsers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#a1824a',
            fontSize: '12px',
            padding: '20px 8px'
          }}>
            No users online
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {sortedUsers.map(user => (
              <div
                key={user.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2d1b0e';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                title={`${user.displayName}${user.guildRole ? ` (${user.guildRole})` : ''}`}
              >
                {/* Avatar */}
                {getAvatar(user.displayName)}

                {/* User Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: isCompact ? '11px' : '12px',
                    fontWeight: 'bold',
                    color: getRoleColor(user.guildRole),
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {user.displayName}
                  </div>
                  
                  {user.guildRole && (
                    <div style={{
                      fontSize: '10px',
                      color: '#a1824a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}>
                      {getRoleIcon(user.guildRole)}
                      <span>{user.guildRole}</span>
                    </div>
                  )}
                </div>

                {/* Online Status */}
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: user.isOnline ? '#4ade80' : '#6b5b3d',
                  flexShrink: 0
                }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{
        borderTop: '1px solid #533b2c',
        padding: '6px',
        background: '#231913'
      }}>
        <div style={{
          display: 'flex',
          gap: '4px',
          justifyContent: 'center'
        }}>
          <button
            className="game-btn game-btn-small"
            style={{ 
              fontSize: '10px',
              padding: '2px 4px',
              flex: 1
            }}
            title="Refresh user list"
          >
            🔄
          </button>
          <button
            className="game-btn game-btn-small"
            style={{ 
              fontSize: '10px',
              padding: '2px 4px',
              flex: 1
            }}
            title="Chat settings"
          >
            ⚙️
          </button>
        </div>
      </div>
    </div>
  );
}