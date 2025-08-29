import { Room, Client } from 'colyseus';
import { jwtVerify } from 'jose';
import { prisma } from '../utils/prisma';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

export interface ChatUser {
  id: string;
  sessionId: string;
  userId: string;
  displayName: string;
  guildId?: string;
  guildRole?: string;
  guildTag?: string;
  lastSeen: Date;
  isOnline: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  displayName: string;
  timestamp: number;
  channelType: string;
  guildChannelId?: string;
  allianceChannelId?: string;
  editedAt?: number;
  metadata?: any;
}

export interface RateLimitInfo {
  messages: number;
  lastReset: number;
  warnings: number;
}

export abstract class ChatRoom extends Room {
  maxClients = 100;
  users: Map<string, ChatUser> = new Map();
  rateLimits: Map<string, RateLimitInfo> = new Map();
  
  // Rate limiting configuration
  readonly RATE_LIMIT_MESSAGES = 5;
  readonly RATE_LIMIT_WINDOW = 10000; // 10 seconds
  readonly RATE_LIMIT_WARNINGS_MAX = 3;
  readonly MESSAGE_MAX_LENGTH = 500;

  onCreate(options: any) {
    logger.room(`${this.constructor.name} created`, { options });
    
    // Set up rate limit cleanup interval
    this.clock.setInterval(() => {
      this.cleanupRateLimits();
    }, 60000); // Cleanup every minute

    this.setupMessageHandlers();
  }

  async onAuth(client: Client, options: any) {
    try {
      const token = options.token;
      if (!token) {
        throw new Error('No authentication token provided');
      }

      // Verify JWT token using Supabase
      const supabase = createClient(
        process.env.SUPABASE_URL || 'https://apoboundupzmulkqxkxw.supabase.co',
        process.env.SUPABASE_ANON_KEY || 'sb_publishable_s1qsPPmJtjZgvnilMaPD2g_BPr3pDcF'
      );
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        throw new Error('Authentication failed: ' + (authError?.message || 'Invalid token'));
      }

      // Get user from database with profile and guild membership
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          profile: true,
          guildMembership: {
            include: {
              guild: true
            }
          }
        }
      });

      if (!dbUser || !dbUser.profile) {
        throw new Error('User not found or profile not created');
      }

      return {
        userId: dbUser.id,
        displayName: dbUser.profile.display,
        guildId: dbUser.guildMembership?.guildId,
        guildRole: dbUser.guildMembership?.role
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  onJoin(client: Client, options: any, auth: any) {
    logger.connection(`User joined ${this.constructor.name}`, { displayName: auth.displayName, roomType: this.constructor.name });
    
    const chatUser: ChatUser = {
      id: client.id,
      sessionId: client.sessionId,
      userId: auth.userId,
      displayName: auth.displayName,
      guildId: auth.guildId,
      guildRole: auth.guildRole,
      lastSeen: new Date(),
      isOnline: true
    };

    this.users.set(client.sessionId, chatUser);
    this.broadcastUserJoined(chatUser);
  }

  onLeave(client: Client, consented: boolean) {
    const user = this.users.get(client.sessionId);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      this.broadcastUserLeft(user);
      this.users.delete(client.sessionId);
    }
    
    // Clean up rate limit data
    this.rateLimits.delete(client.sessionId);
    logger.connection(`User left ${this.constructor.name}`, { roomType: this.constructor.name });
  }

  private setupMessageHandlers() {
    this.onMessage('chat_message', (client, message) => {
      this.handleChatMessage(client, message);
    });

    this.onMessage('typing_start', (client) => {
      this.handleTypingStart(client);
    });

    this.onMessage('typing_stop', (client) => {
      this.handleTypingStop(client);
    });

    this.onMessage('request_history', (client, data) => {
      this.handleHistoryRequest(client, data);
    });
  }

  private async handleChatMessage(client: Client, message: any) {
    const user = this.users.get(client.sessionId);
    if (!user) {
      this.send(client, 'error', { message: 'User not found' });
      return;
    }

    // Check rate limiting
    if (!this.checkRateLimit(client)) {
      return;
    }

    // Validate message
    if (!this.validateMessage(client, message)) {
      return;
    }

    try {
      // Save message to database and broadcast
      const chatMessage = await this.saveMessage(user, message);
      await this.broadcastMessage(chatMessage);
    } catch (error) {
      console.error('Failed to handle chat message:', error);
      this.send(client, 'error', { message: 'Failed to send message' });
    }
  }

  protected checkRateLimit(client: Client): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(client.sessionId) || {
      messages: 0,
      lastReset: now,
      warnings: 0
    };

    // Reset window if needed
    if (now - limit.lastReset > this.RATE_LIMIT_WINDOW) {
      limit.messages = 0;
      limit.lastReset = now;
    }

    limit.messages++;
    this.rateLimits.set(client.sessionId, limit);

    if (limit.messages > this.RATE_LIMIT_MESSAGES) {
      limit.warnings++;
      
      if (limit.warnings >= this.RATE_LIMIT_WARNINGS_MAX) {
        // Temporary ban - disconnect client
        this.send(client, 'error', { 
          message: 'Rate limit exceeded. Temporarily banned for spam.',
          type: 'RATE_LIMIT_BAN'
        });
        client.leave();
        return false;
      }

      this.send(client, 'error', { 
        message: 'Rate limit exceeded. Please slow down.',
        type: 'RATE_LIMIT_WARNING'
      });
      return false;
    }

    return true;
  }

  private validateMessage(client: Client, message: any): boolean {
    if (!message.content || typeof message.content !== 'string') {
      this.send(client, 'error', { message: 'Invalid message content' });
      return false;
    }

    const content = message.content.trim();
    if (content.length === 0) {
      this.send(client, 'error', { message: 'Message cannot be empty' });
      return false;
    }

    if (content.length > this.MESSAGE_MAX_LENGTH) {
      this.send(client, 'error', { 
        message: `Message too long. Maximum ${this.MESSAGE_MAX_LENGTH} characters.` 
      });
      return false;
    }

    return true;
  }

  protected abstract saveMessage(user: ChatUser, message: any): Promise<ChatMessage>;
  
  protected abstract broadcastMessage(message: ChatMessage): Promise<void>;

  private async handleHistoryRequest(client: Client, data: any) {
    try {
      const user = this.users.get(client.sessionId);
      if (!user) return;

      const messages = await this.getMessageHistory(user, data.before, data.limit || 50);
      this.send(client, 'message_history', { messages });
    } catch (error) {
      console.error('Failed to fetch message history:', error);
      this.send(client, 'error', { message: 'Failed to fetch message history' });
    }
  }

  protected abstract getMessageHistory(user: ChatUser, before?: string, limit?: number): Promise<ChatMessage[]>;

  protected handleTypingStart(client: Client) {
    const user = this.users.get(client.sessionId);
    if (!user) return;

    this.broadcast('user_typing_start', {
      userId: user.userId,
      displayName: user.displayName
    }, { except: client });
  }

  protected handleTypingStop(client: Client) {
    const user = this.users.get(client.sessionId);
    if (!user) return;

    this.broadcast('user_typing_stop', {
      userId: user.userId,
      displayName: user.displayName
    }, { except: client });
  }

  private broadcastUserJoined(user: ChatUser) {
    this.broadcast('user_joined', {
      userId: user.userId,
      displayName: user.displayName,
      guildId: user.guildId,
      guildRole: user.guildRole
    });
  }

  private broadcastUserLeft(user: ChatUser) {
    this.broadcast('user_left', {
      userId: user.userId,
      displayName: user.displayName
    });
  }

  private cleanupRateLimits() {
    const now = Date.now();
    for (const [sessionId, limit] of this.rateLimits.entries()) {
      // Remove old rate limit data
      if (now - limit.lastReset > this.RATE_LIMIT_WINDOW * 2) {
        this.rateLimits.delete(sessionId);
      }
    }
  }

  // Utility method to get online users
  getOnlineUsers(): ChatUser[] {
    return Array.from(this.users.values()).filter(user => user.isOnline);
  }

  // Utility method to send message to specific user
  sendToUser(userId: string, type: string, data: any): boolean {
    for (const [sessionId, user] of this.users.entries()) {
      if (user.userId === userId) {
        const client = this.clients.find(c => c.sessionId === sessionId);
        if (client) {
          this.send(client, type, data);
          return true;
        }
      }
    }
    return false;
  }
}