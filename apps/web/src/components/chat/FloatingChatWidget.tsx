'use client';

import { useState } from 'react';
import { ChatSystem } from './ChatSystem';

interface Props {
  className?: string;
}

export function FloatingChatWidget({ className = '' }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeChannel, setActiveChannel] = useState<'general' | 'trade'>('general');

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isExpanded) {
    // Collapsed floating button
    return (
      <div className={className} style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <button
          className="game-btn game-btn-primary"
          onClick={toggleExpanded}
          style={{
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            position: 'relative'
          }}
          title="Open chat"
        >
          💬
          {/* Notification badge placeholder */}
          <div style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '16px',
            height: '16px',
            background: '#ef4444',
            borderRadius: '50%',
            fontSize: '10px',
            display: 'none', // Will be shown when there are unread messages
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            3
          </div>
        </button>
      </div>
    );
  }

  // Expanded chat widget
  return (
    <div className={className} style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '400px',
      height: '500px',
      zIndex: 1000,
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* Header with channel selector and close button */}
      <div style={{
        background: '#231913',
        borderBottom: '1px solid #533b2c',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className={`game-btn game-btn-small ${activeChannel === 'general' ? 'game-btn-primary' : ''}`}
            onClick={() => setActiveChannel('general')}
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            🌍 General
          </button>
          <button
            className={`game-btn game-btn-small ${activeChannel === 'trade' ? 'game-btn-primary' : ''}`}
            onClick={() => setActiveChannel('trade')}
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            💰 Trade
          </button>
        </div>
        
        <button
          className="game-btn game-btn-small"
          onClick={toggleExpanded}
          style={{ 
            fontSize: '12px', 
            padding: '4px 6px',
            minWidth: 'auto'
          }}
          title="Close chat"
        >
          ✕
        </button>
      </div>

      {/* Chat content */}
      <div style={{ height: 'calc(100% - 49px)' }}>
        <ChatSystem
          initialChannel={activeChannel}
          isCompact={true}
          className="floating-chat"
        />
      </div>
    </div>
  );
}