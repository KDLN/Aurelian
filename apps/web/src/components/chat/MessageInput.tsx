'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { ChannelType } from './ChatSystem';

interface Props {
  onSendMessage: (content: string, metadata?: any) => void;
  onTyping: () => void;
  disabled?: boolean;
  channelType: ChannelType;
}

export function MessageInput({ onSendMessage, onTyping, disabled = false, channelType }: Props) {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxLength = 500;

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;

    // Check for special commands
    if (trimmed.startsWith('/')) {
      handleCommand(trimmed);
    } else {
      onSendMessage(trimmed);
    }
    
    setMessage('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (value: string) => {
    setMessage(value);
    if (value.length > 0) {
      onTyping();
    }
  };

  const handleCommand = (command: string) => {
    const [cmd, ...args] = command.slice(1).split(' ');
    const argString = args.join(' ');

    switch (cmd.toLowerCase()) {
      case 'help':
        showHelpMessage();
        break;
      case 'clear':
        // TODO: Clear chat messages locally
        console.log('Clear command - not implemented yet');
        break;
      case 'wtb':
        if (channelType === 'trade' && argString) {
          onSendMessage(`🔍 WTB: ${argString}`, { type: 'trade_command', command: 'wtb' });
        }
        break;
      case 'wts':
        if (channelType === 'trade' && argString) {
          onSendMessage(`💰 WTS: ${argString}`, { type: 'trade_command', command: 'wts' });
        }
        break;
      case 'price':
        if (channelType === 'trade' && argString) {
          onSendMessage(`📊 Price check: ${argString}`, { type: 'trade_command', command: 'price' });
        }
        break;
      default:
        onSendMessage(command); // Send as regular message if unknown command
    }
  };

  const showHelpMessage = () => {
    let helpText = 'Available commands:\n';
    helpText += '• /help - Show this help message\n';
    helpText += '• /clear - Clear chat history locally\n';
    
    if (channelType === 'trade') {
      helpText += '• /wtb <item> - Want to buy\n';
      helpText += '• /wts <item> - Want to sell\n';
      helpText += '• /price <item> - Check item price\n';
    }
    
    // Display help in a temporary overlay or console
    console.log(helpText);
    alert(helpText); // Temporary - should be replaced with proper UI
  };

  const insertEmoji = (emoji: string) => {
    const newMessage = message + emoji;
    setMessage(newMessage);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const commonEmojis = ['😀', '😂', '😢', '😍', '🤔', '👍', '👎', '❤️', '🔥', '💯', '🎉', '😎'];

  const getPlaceholder = () => {
    switch (channelType) {
      case 'general':
        return 'Message #general...';
      case 'trade':
        return 'Message #trade... (try /wtb, /wts, /price)';
      case 'guild':
        return 'Message guild...';
      default:
        return 'Type a message...';
    }
  };

  return (
    <div style={{ 
      borderTop: '1px solid #533b2c',
      padding: '8px',
      background: '#231913'
    }}>
      {/* Quick Actions for Trade Channel */}
      {channelType === 'trade' && (
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          marginBottom: '8px',
          flexWrap: 'wrap'
        }}>
          <button
            className="game-btn game-btn-small"
            onClick={() => setMessage('/wtb ')}
            disabled={disabled}
            style={{ fontSize: '11px', padding: '2px 6px' }}
          >
            🔍 WTB
          </button>
          <button
            className="game-btn game-btn-small"
            onClick={() => setMessage('/wts ')}
            disabled={disabled}
            style={{ fontSize: '11px', padding: '2px 6px' }}
          >
            💰 WTS
          </button>
          <button
            className="game-btn game-btn-small"
            onClick={() => setMessage('/price ')}
            disabled={disabled}
            style={{ fontSize: '11px', padding: '2px 6px' }}
          >
            📊 Price
          </button>
        </div>
      )}

      {/* Message Input Area */}
      <div style={{ 
        display: 'flex', 
        gap: '8px',
        alignItems: 'flex-end',
        position: 'relative'
      }}>
        {/* Emoji Picker Button */}
        <div style={{ position: 'relative' }}>
          <button
            className="game-btn game-btn-small"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            style={{ 
              fontSize: '14px',
              padding: '4px 6px',
              minWidth: '32px'
            }}
          >
            😀
          </button>

          {/* Emoji Picker Dropdown */}
          {showEmojiPicker && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              background: '#231913',
              border: '1px solid #533b2c',
              borderRadius: '4px',
              padding: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '4px',
              marginBottom: '4px',
              zIndex: 1000
            }}>
              {commonEmojis.map(emoji => (
                <button
                  key={emoji}
                  className="game-btn game-btn-small"
                  onClick={() => insertEmoji(emoji)}
                  style={{ 
                    fontSize: '14px',
                    padding: '4px',
                    minWidth: '28px'
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text Input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={getPlaceholder()}
            disabled={disabled}
            maxLength={maxLength}
            className="game-input"
            style={{ 
              width: '100%',
              paddingRight: '50px' // Space for character counter
            }}
          />
          
          {/* Character Counter */}
          <div style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '11px',
            color: message.length > maxLength * 0.8 ? '#ef4444' : '#6b5b3d',
            pointerEvents: 'none'
          }}>
            {message.length}/{maxLength}
          </div>
        </div>

        {/* Send Button */}
        <button
          className="game-btn game-btn-primary"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          style={{ 
            padding: '6px 12px',
            minWidth: '60px'
          }}
        >
          Send
        </button>
      </div>

      {/* Input Helper Text */}
      {channelType === 'trade' && message.startsWith('/') && (
        <div style={{ 
          fontSize: '11px',
          color: '#a1824a',
          marginTop: '4px',
          fontStyle: 'italic'
        }}>
          💡 Type /help for available commands
        </div>
      )}
    </div>
  );
}