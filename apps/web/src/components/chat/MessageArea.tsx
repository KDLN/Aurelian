'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatSystem';
import { MessageList } from './MessageList';

interface Props {
  messages: ChatMessage[];
  typing: string[];
  onLoadMore: (before?: number) => void;
  isCompact?: boolean;
}

export function MessageArea({ messages, typing, onLoadMore, isCompact = false }: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const lastMessageCountRef = useRef(0);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive, but only if user was already at bottom
    if (messages.length > lastMessageCountRef.current && isAtBottomRef.current) {
      scrollToBottom();
    }
    lastMessageCountRef.current = messages.length;
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    
    // Check if user is at the bottom (within 100px)
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;

    // Load more messages when scrolled to top
    if (scrollTop === 0 && messages.length > 0) {
      const oldestMessage = messages[0];
      onLoadMore(oldestMessage.timestamp);
    }
  };

  const handleLoadMore = () => {
    if (messages.length > 0) {
      const oldestMessage = messages[0];
      onLoadMore(oldestMessage.timestamp);
    }
  };

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: 0
    }}>
      {/* Messages Container */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ 
          flex: 1,
          overflowY: 'auto',
          padding: isCompact ? '4px' : '8px',
          background: '#1a1511'
        }}
      >
        {/* Load More Button */}
        {messages.length > 0 && (
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <button 
              className="game-btn game-btn-small"
              onClick={handleLoadMore}
              style={{ fontSize: '11px', padding: '2px 8px' }}
            >
              Load Earlier Messages
            </button>
          </div>
        )}

        {/* Messages List */}
        <MessageList messages={messages} isCompact={isCompact} />

        {/* Typing Indicators */}
        {typing.length > 0 && (
          <div style={{ 
            padding: '4px 8px',
            fontSize: '12px',
            color: '#a1824a',
            fontStyle: 'italic'
          }}>
            {typing.length === 1 
              ? `${typing[0]} is typing...`
              : typing.length === 2
              ? `${typing[0]} and ${typing[1]} are typing...`
              : `${typing[0]} and ${typing.length - 1} others are typing...`
            }
          </div>
        )}
      </div>

      {/* Scroll to Bottom Button */}
      {!isAtBottomRef.current && (
        <div style={{ 
          position: 'absolute',
          bottom: '60px',
          right: '20px',
          zIndex: 1000
        }}>
          <button 
            className="game-btn game-btn-small game-btn-primary"
            onClick={scrollToBottom}
            style={{ 
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              padding: 0,
              fontSize: '14px'
            }}
            title="Scroll to bottom"
          >
            ↓
          </button>
        </div>
      )}
    </div>
  );
}