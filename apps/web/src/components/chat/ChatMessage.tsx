'use client';

import { useState } from 'react';
import { ChatMessage } from './ChatSystem';

interface Props {
  message: ChatMessage;
  showAvatar?: boolean;
  showUsername?: boolean;
  isCompact?: boolean;
}

export function ChatMessageComponent({ 
  message, 
  showAvatar = true, 
  showUsername = true, 
  isCompact = false 
}: Props) {
  const [showOptions, setShowOptions] = useState(false);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // If today, show just time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year, show month/day and time
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
             date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Otherwise show full date
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

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
      default: return '';
    }
  };

  const getAvatar = (displayName: string) => {
    // Simple avatar using first letter of name
    const initial = displayName.charAt(0).toUpperCase();
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'];
    const colorIndex = displayName.charCodeAt(0) % colors.length;
    
    return (
      <div style={{
        width: isCompact ? '24px' : '32px',
        height: isCompact ? '24px' : '32px',
        borderRadius: '50%',
        background: colors[colorIndex],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isCompact ? '12px' : '14px',
        fontWeight: 'bold',
        color: '#fff',
        flexShrink: 0
      }}>
        {initial}
      </div>
    );
  };

  const renderMessageContent = () => {
    const { content, metadata } = message;

    // Handle special message types
    if (metadata?.type === 'system_message') {
      return (
        <div style={{ 
          fontStyle: 'italic',
          color: '#a1824a',
          fontSize: isCompact ? '12px' : '13px'
        }}>
          {content}
        </div>
      );
    }

    if (metadata?.type === 'announcement') {
      return (
        <div style={{ 
          background: '#2d1b0e',
          border: '1px solid #533b2c',
          borderRadius: '4px',
          padding: '8px',
          marginTop: '4px'
        }}>
          <div style={{ 
            fontSize: '12px',
            color: '#ffd700',
            marginBottom: '4px',
            fontWeight: 'bold'
          }}>
            📢 Announcement
          </div>
          <div>{content}</div>
        </div>
      );
    }

    if (metadata?.type === 'item_link') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ 
            background: '#2d1b0e',
            border: '1px solid #533b2c',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '12px',
            cursor: 'pointer'
          }}>
            🎒 {content}
          </span>
        </div>
      );
    }

    if (metadata?.type === 'listing_link') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ 
            background: '#2d1b0e',
            border: '1px solid #ffd700',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '12px',
            cursor: 'pointer',
            color: '#ffd700'
          }}>
            💰 {content}
          </span>
        </div>
      );
    }

    if (metadata?.type === 'price_check') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ 
            background: '#2d1b0e',
            border: '1px solid #4ade80',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '12px',
            color: '#4ade80'
          }}>
            📊 {content}
          </span>
        </div>
      );
    }

    // Regular message
    return <div>{content}</div>;
  };

  const handleReaction = (emoji: string) => {
    // TODO: Implement reaction system
    console.log('Reaction clicked:', emoji, message.id);
  };

  const handleReport = () => {
    // TODO: Implement reporting
    console.log('Report message:', message.id);
    setShowOptions(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setShowOptions(false);
  };

  return (
    <div 
      style={{ 
        display: 'flex',
        gap: showAvatar ? '8px' : '0',
        paddingLeft: showAvatar ? '0' : isCompact ? '32px' : '40px',
        paddingRight: '8px',
        paddingTop: showUsername ? '4px' : '1px',
        paddingBottom: '1px',
        position: 'relative'
      }}
      onMouseEnter={() => setShowOptions(true)}
      onMouseLeave={() => setShowOptions(false)}
    >
      {/* Avatar */}
      {showAvatar && getAvatar(message.displayName)}

      {/* Message Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Username and timestamp */}
        {showUsername && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '2px'
          }}>
            <span style={{ 
              fontWeight: 'bold',
              color: getRoleColor(message.guildRole),
              fontSize: isCompact ? '13px' : '14px'
            }}>
              {getRoleIcon(message.guildRole)}
              <a 
                href={`/profile/${message.userId}`}
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                  borderBottom: '1px solid transparent',
                  transition: 'border-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderBottomColor = getRoleColor(message.guildRole);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderBottomColor = 'transparent';
                }}
              >
                {message.displayName}
              </a>
            </span>
            
            {message.guildTag && (
              <span style={{ 
                fontSize: '11px',
                color: '#a1824a',
                background: '#2d1b0e',
                padding: '1px 4px',
                borderRadius: '2px'
              }}>
                [{message.guildTag}]
              </span>
            )}
            
            <span style={{ 
              fontSize: '11px',
              color: '#6b5b3d',
              userSelect: 'none'
            }}>
              {formatTime(message.timestamp)}
            </span>

            {message.editedAt && (
              <span style={{ 
                fontSize: '10px',
                color: '#6b5b3d',
                fontStyle: 'italic'
              }}>
                (edited)
              </span>
            )}
          </div>
        )}

        {/* Message text */}
        <div style={{ 
          fontSize: isCompact ? '13px' : '14px',
          lineHeight: isCompact ? '1.3' : '1.4',
          wordWrap: 'break-word',
          color: '#f1e5c8'
        }}>
          {renderMessageContent()}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div style={{ 
            display: 'flex',
            gap: '4px',
            marginTop: '4px',
            flexWrap: 'wrap'
          }}>
            {message.reactions.map(reaction => (
              <button
                key={reaction.id}
                className="game-btn game-btn-small"
                onClick={() => handleReaction(reaction.emoji)}
                style={{
                  fontSize: '11px',
                  padding: '1px 4px',
                  background: '#2d1b0e',
                  border: '1px solid #533b2c'
                }}
                title={`${reaction.displayName} reacted with ${reaction.emoji}`}
              >
                {reaction.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message Options (on hover) */}
      {showOptions && (
        <div style={{
          position: 'absolute',
          top: '4px',
          right: '8px',
          display: 'flex',
          gap: '2px',
          background: '#231913',
          border: '1px solid #533b2c',
          borderRadius: '4px',
          padding: '2px'
        }}>
          <button
            className="game-btn game-btn-small"
            onClick={() => handleReaction('👍')}
            style={{ fontSize: '12px', padding: '2px 4px' }}
            title="React with 👍"
          >
            👍
          </button>
          <button
            className="game-btn game-btn-small"
            onClick={() => handleReaction('❤️')}
            style={{ fontSize: '12px', padding: '2px 4px' }}
            title="React with ❤️"
          >
            ❤️
          </button>
          <button
            className="game-btn game-btn-small"
            onClick={handleCopy}
            style={{ fontSize: '10px', padding: '2px 4px' }}
            title="Copy message"
          >
            📋
          </button>
          <button
            className="game-btn game-btn-small"
            onClick={handleReport}
            style={{ fontSize: '10px', padding: '2px 4px' }}
            title="Report message"
          >
            🚨
          </button>
        </div>
      )}
    </div>
  );
}