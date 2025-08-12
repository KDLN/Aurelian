'use client';

import { ChannelType } from './ChatSystem';

interface GuildChannel {
  id: string;
  name: string;
  description?: string;
  roleRequired?: string;
}

interface Props {
  activeChannel: ChannelType;
  activeGuildChannel: string;
  guildChannels: GuildChannel[];
  onChannelChange: (channel: ChannelType, guildChannelId?: string) => void;
  connected: boolean;
}

export function ChannelTabs({ 
  activeChannel, 
  activeGuildChannel, 
  guildChannels, 
  onChannelChange, 
  connected 
}: Props) {

  const getChannelIcon = (channel: ChannelType) => {
    switch (channel) {
      case 'general': return '🌍';
      case 'trade': return '💰';
      case 'guild': return '🏛️';
      default: return '💬';
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'LEADER': return '👑';
      case 'OFFICER': return '🔒';
      case 'TRADER': return '💼';
      default: return '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Main Channel Tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #533b2c',
        background: '#1a1511'
      }}>
        <button
          className={`game-btn game-btn-small ${activeChannel === 'general' ? 'game-btn-primary' : ''}`}
          onClick={() => onChannelChange('general')}
          disabled={!connected}
          style={{ 
            borderRadius: 0, 
            border: 'none',
            borderRight: '1px solid #533b2c'
          }}
        >
          {getChannelIcon('general')} General
        </button>
        
        <button
          className={`game-btn game-btn-small ${activeChannel === 'trade' ? 'game-btn-primary' : ''}`}
          onClick={() => onChannelChange('trade')}
          disabled={!connected}
          style={{ 
            borderRadius: 0, 
            border: 'none',
            borderRight: '1px solid #533b2c'
          }}
        >
          {getChannelIcon('trade')} Trade
        </button>
        
        {guildChannels.length > 0 && (
          <button
            className={`game-btn game-btn-small ${activeChannel === 'guild' ? 'game-btn-primary' : ''}`}
            onClick={() => onChannelChange('guild', activeGuildChannel || guildChannels[0]?.id)}
            disabled={!connected}
            style={{ 
              borderRadius: 0, 
              border: 'none'
            }}
          >
            {getChannelIcon('guild')} Guild
          </button>
        )}
        
        <div style={{ flex: 1 }} />
        
        {/* Connection Status Indicator */}
        <div style={{ 
          padding: '4px 8px', 
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <div 
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: connected ? '#4ade80' : '#ef4444',
              marginRight: '4px'
            }}
          />
          <span className={connected ? 'game-good' : 'game-bad'}>
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Guild Channel Selector */}
      {activeChannel === 'guild' && guildChannels.length > 0 && (
        <div style={{ 
          display: 'flex', 
          background: '#231913',
          borderBottom: '1px solid #533b2c',
          padding: '4px'
        }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#a1824a',
            margin: '4px 8px',
            display: 'flex',
            alignItems: 'center'
          }}>
            Channels:
          </div>
          
          {guildChannels.map(channel => (
            <button
              key={channel.id}
              className={`game-btn game-btn-small ${activeGuildChannel === channel.id ? 'game-btn-primary' : ''}`}
              onClick={() => onChannelChange('guild', channel.id)}
              disabled={!connected}
              style={{ 
                fontSize: '11px',
                padding: '2px 6px',
                margin: '2px',
                borderRadius: '2px'
              }}
              title={channel.description}
            >
              {getRoleIcon(channel.roleRequired)}#{channel.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}