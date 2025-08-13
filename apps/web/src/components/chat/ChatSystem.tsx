'use client';

import { useState, useEffect, useRef } from 'react';
import { Client, Room } from 'colyseus.js';
import { supabase } from '@/lib/supabaseClient';
import { ChannelTabs } from './ChannelTabs';
import { MessageArea } from './MessageArea';
import { MessageInput } from './MessageInput';
import { UserList } from './UserList';

export interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  displayName: string;
  guildTag?: string;
  guildRole?: string;
  timestamp: number;
  editedAt?: number;
  channelType: string;
  guildChannelId?: string;
  metadata?: any;
  reactions?: Array<{
    id: string;
    emoji: string;
    userId: string;
    displayName: string;
  }>;
}

export interface ChatUser {
  userId: string;
  displayName: string;
  guildId?: string;
  guildRole?: string;
  isOnline: boolean;
  lastSeen?: number;
}

export type ChannelType = 'general' | 'trade' | 'guild';

interface Props {
  initialChannel?: ChannelType;
  className?: string;
  isCompact?: boolean;
  guildChannels?: Array<{
    id: string;
    name: string;
    description?: string;
    roleRequired?: string;
  }>;
}

export function ChatSystem({ 
  initialChannel = 'general', 
  className = '',
  isCompact = false,
  guildChannels = []
}: Props) {
  const [activeChannel, setActiveChannel] = useState<ChannelType>(initialChannel);
  const [activeGuildChannel, setActiveGuildChannel] = useState<string>(
    guildChannels.length > 0 ? guildChannels[0].id : ''
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState<string[]>([]);
  const [showUserList, setShowUserList] = useState(!isCompact);

  const clientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeChat();
    return () => {
      disconnect();
    };
  }, []);

  useEffect(() => {
    if (connected) {
      switchChannel(activeChannel, activeGuildChannel);
    }
  }, [activeChannel, activeGuildChannel, connected]);

  const initializeChat = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8787';
      const client = new Client(wsUrl.replace(/^http/, 'ws'));
      clientRef.current = client;

      await connectToChannel(activeChannel, session.access_token);
      setConnected(true);

    } catch (err) {
      console.error('Failed to initialize chat:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to chat');
    } finally {
      setLoading(false);
    }
  };

  const connectToChannel = async (channel: ChannelType, token: string) => {
    if (!clientRef.current) return;

    // Disconnect from current room
    if (roomRef.current) {
      roomRef.current.leave();
      roomRef.current = null;
    }

    let roomName: string;
    let roomOptions: any = { token };

    switch (channel) {
      case 'general':
        roomName = 'chat_general';
        break;
      case 'trade':
        roomName = 'chat_trade';
        break;
      case 'guild':
        if (!activeGuildChannel) {
          setError('No guild channel selected');
          return;
        }
        roomName = 'chat_guild';
        roomOptions.guildChannelId = activeGuildChannel;
        break;
      default:
        setError('Invalid channel type');
        return;
    }

    try {
      const room = await clientRef.current.joinOrCreate(roomName, roomOptions);
      roomRef.current = room;
      setupRoomHandlers(room);
      
      // Clear previous messages and users when switching channels
      setMessages([]);
      setUsers([]);
      setTyping([]);
      
      // Set connected state to true after successful join
      setConnected(true);
      setError('');

    } catch (error) {
      console.error(`Failed to join ${roomName}:`, error);
      setError(`Failed to join ${channel} channel`);
      setConnected(false);
    }
  };

  const setupRoomHandlers = (room: Room) => {
    room.onMessage('chat_message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    room.onMessage('message_history', (data: { messages: ChatMessage[] }) => {
      setMessages(data.messages);
    });

    room.onMessage('user_joined', (user: ChatUser) => {
      setUsers(prev => [...prev.filter(u => u.userId !== user.userId), user]);
    });

    room.onMessage('user_left', (user: { userId: string }) => {
      setUsers(prev => prev.filter(u => u.userId !== user.userId));
    });

    room.onMessage('user_typing_start', (data: { userId: string; displayName: string }) => {
      setTyping(prev => [...prev.filter(name => name !== data.displayName), data.displayName]);
    });

    room.onMessage('user_typing_stop', (data: { displayName: string }) => {
      setTyping(prev => prev.filter(name => name !== data.displayName));
    });

    room.onMessage('error', (data: { message: string; type?: string }) => {
      console.error('Chat error:', data);
      if (data.type === 'RATE_LIMIT_BAN') {
        setError('You have been temporarily banned for spamming');
        disconnect();
      } else {
        setError(data.message);
      }
    });

    room.onMessage('kicked', (data: { reason: string; kickedBy: string }) => {
      setError(`You were kicked from the channel by ${data.kickedBy}. Reason: ${data.reason}`);
      disconnect();
    });

    room.onLeave(() => {
      setConnected(false);
      setUsers([]);
    });

    room.onError((code, message) => {
      console.error('Room error:', code, message);
      setError(`Connection error: ${message}`);
      setConnected(false);
    });
  };

  const switchChannel = async (channel: ChannelType, guildChannelId?: string) => {
    if (!connected || !clientRef.current) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Not authenticated');
      return;
    }

    setActiveChannel(channel);
    if (guildChannelId) {
      setActiveGuildChannel(guildChannelId);
    }

    await connectToChannel(channel, session.access_token);
  };

  const sendMessage = (content: string, metadata?: any) => {
    if (!roomRef.current || !content.trim()) return;

    roomRef.current.send('chat_message', {
      content: content.trim(),
      metadata
    });
  };

  const sendTypingStart = () => {
    if (!roomRef.current) return;
    roomRef.current.send('typing_start');
  };

  const sendTypingStop = () => {
    if (!roomRef.current) return;
    roomRef.current.send('typing_stop');
  };

  const handleTyping = () => {
    sendTypingStart();
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop();
    }, 3000);
  };

  const disconnect = () => {
    if (roomRef.current) {
      roomRef.current.leave();
      roomRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current = null;
    }
    setConnected(false);
    setUsers([]);
  };

  const requestHistory = (before?: number) => {
    if (!roomRef.current) return;
    roomRef.current.send('request_history', { before, limit: 50 });
  };

  if (loading) {
    return (
      <div className={`${className} game-card`}>
        <div className="game-center" style={{ padding: '20px' }}>
          <div>Connecting to chat...</div>
        </div>
      </div>
    );
  }

  if (error && !connected) {
    return (
      <div className={`${className} game-card`}>
        <div className="game-center game-bad" style={{ padding: '20px' }}>
          <div>Chat Error: {error}</div>
          <button 
            className="game-btn game-btn-small" 
            onClick={initializeChat}
            style={{ marginTop: '10px' }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} game-card`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Channel Tabs */}
      <ChannelTabs
        activeChannel={activeChannel}
        activeGuildChannel={activeGuildChannel}
        guildChannels={guildChannels}
        onChannelChange={switchChannel}
        connected={connected}
      />

      {/* Main Chat Area */}
      <div style={{ 
        display: 'flex', 
        flex: 1, 
        minHeight: 0,
        borderTop: '1px solid #533b2c'
      }}>
        {/* Messages Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <MessageArea
            messages={messages}
            typing={typing}
            onLoadMore={requestHistory}
            isCompact={isCompact}
          />
          
          <MessageInput
            onSendMessage={sendMessage}
            onTyping={handleTyping}
            disabled={!connected}
            channelType={activeChannel}
          />
        </div>

        {/* User List (collapsible) */}
        {showUserList && (
          <UserList
            users={users}
            onToggle={() => setShowUserList(false)}
            isCompact={isCompact}
          />
        )}
      </div>

      {/* Status Bar */}
      <div style={{ 
        borderTop: '1px solid #533b2c',
        padding: '4px 8px',
        fontSize: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span className={connected ? 'game-good' : 'game-bad'}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
        
        {!showUserList && (
          <button 
            className="game-btn game-btn-small"
            onClick={() => setShowUserList(true)}
            style={{ fontSize: '10px', padding: '2px 6px' }}
          >
            Users ({users.length})
          </button>
        )}
      </div>
    </div>
  );
}