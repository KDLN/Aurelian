import { Room, Client } from 'colyseus';
import { jwtVerify } from 'jose';
import { prisma } from '../utils/prisma';
import { ChatRoom, ChatUser, ChatMessage } from './chat-room';

export interface DirectMessageState {
  participants: Map<string, ChatUser>;
  messages: ChatMessage[];
  typingUsers: string[];
  lastActivity: number;
}

export class DirectMessageRoom extends ChatRoom {
  maxClients = 2; // Only 2 participants in a DM
  participants: string[] = []; // User IDs of the two participants
  
  onCreate(options: any) {
    // DirectMessageRoom created
    
    // Validate that we have exactly 2 participants
    if (!options.participants || options.participants.length !== 2) {
      throw new Error('DirectMessage room requires exactly 2 participants');
    }
    
    this.participants = options.participants;
    this.roomId = `dm_${this.participants.sort().join('_')}`;
    
    // Set up message handlers
    this.onMessage('send_message', this.handleSendMessage.bind(this));
    this.onMessage('typing_start', this.handleTypingStart.bind(this));
    this.onMessage('typing_stop', this.handleTypingStop.bind(this));
    this.onMessage('mark_read', this.handleMarkRead.bind(this));
    
    // Set room metadata
    this.setMetadata({
      type: 'direct_message',
      participants: this.participants,
      created: Date.now()
    });
  }

  async onAuth(client: Client, options: any) {
    try {
      if (!options.token) {
        throw new Error('No authentication token provided');
      }

      // Verify JWT token using jose
      const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
      const { payload } = await jwtVerify(options.token, secret);
      
      if (!payload.sub) {
        throw new Error('Invalid token: no user ID');
      }

      // Check if this user is one of the participants
      if (!this.participants.includes(payload.sub)) {
        throw new Error('User not authorized for this conversation');
      }

      // Load user profile from database
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          profile: true,
          guildMembership: {
            include: {
              guild: true
            }
          }
        }
      });

      if (!user || !user.profile) {
        throw new Error('User profile not found');
      }

      return {
        userId: user.id,
        displayName: user.profile.display,
        guildId: user.guildMembership?.guildId,
        guildRole: user.guildMembership?.role,
        guildTag: user.guildMembership?.guild.tag
      };
    } catch (error) {
      // DirectMessage auth error
      throw error;
    }
  }

  async onJoin(client: Client, options: any) {
    // User joined DM room
    
    const chatUser: ChatUser = {
      id: client.id,
      sessionId: client.sessionId,
      userId: client.auth.userId,
      displayName: client.auth.displayName,
      guildId: client.auth.guildId,
      guildRole: client.auth.guildRole,
      guildTag: client.auth.guildTag,
      lastSeen: new Date(),
      isOnline: true
    };

    this.users.set(client.sessionId, chatUser);

    // Load recent direct messages between these two users
    try {
      const recentMails = await prisma.mail.findMany({
        where: {
          OR: [
            {
              senderId: this.participants[0],
              recipientId: this.participants[1]
            },
            {
              senderId: this.participants[1],
              recipientId: this.participants[0]
            }
          ],
          status: { not: 'DELETED' }
        },
        include: {
          sender: {
            include: {
              profile: true,
              guildMembership: {
                include: {
                  guild: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20
      });

      // Convert mails to chat messages for real-time display
      const chatMessages: ChatMessage[] = recentMails.reverse().map(mail => ({
        id: mail.id,
        content: mail.content,
        userId: mail.senderId,
        displayName: mail.sender.profile?.display || 'Unknown',
        timestamp: mail.createdAt.getTime(),
        channelType: 'DIRECT',
        metadata: {
          mailId: mail.id,
          subject: mail.subject,
          priority: mail.priority,
          isStarred: mail.isStarred
        }
      }));

      // Send recent messages to joining client
      client.send('message_history', {
        messages: chatMessages,
        users: Array.from(this.users.values())
      });

    } catch (error) {
      // Error loading DM history
    }

    // Broadcast user joined
    this.broadcast('user_joined', chatUser, { except: client });
  }

  async onLeave(client: Client, consented: boolean) {
    // User left DM room
    
    const user = this.users.get(client.sessionId);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      
      // Broadcast user left
      this.broadcast('user_left', user);
      
      // Remove user after a delay to allow for reconnection
      setTimeout(() => {
        this.users.delete(client.sessionId);
      }, 30000);
    }

    // If room is empty, dispose after a delay
    if (this.clients.length === 0) {
      setTimeout(() => {
        if (this.clients.length === 0) {
          this.disconnect();
        }
      }, 300000); // 5 minutes
    }
  }

  async handleSendMessage(client: Client, data: any) {
    try {
      const user = this.users.get(client.sessionId);
      if (!user) return;

      // Rate limiting check
      if (!this.checkRateLimit(client)) {
        client.send('error', { message: 'Rate limit exceeded. Please slow down.' });
        return;
      }

      const { content, subject } = data;
      if (!content || content.trim().length === 0) {
        return;
      }

      if (content.length > this.MESSAGE_MAX_LENGTH) {
        client.send('error', { message: `Message too long (max ${this.MESSAGE_MAX_LENGTH} characters)` });
        return;
      }

      // Find the other participant
      const otherParticipantId = this.participants.find(id => id !== user.userId);
      if (!otherParticipantId) {
        client.send('error', { message: 'No other participant found' });
        return;
      }

      // Save to database as Mail
      const mail = await prisma.mail.create({
        data: {
          senderId: user.userId,
          recipientId: otherParticipantId,
          subject: subject || 'Direct Message',
          content: content.trim(),
          priority: 'NORMAL'
        }
      });

      // Create chat message for real-time broadcast
      const chatMessage: ChatMessage = {
        id: mail.id,
        content: content.trim(),
        userId: user.userId,
        displayName: user.displayName,
        timestamp: Date.now(),
        channelType: 'DIRECT',
        metadata: {
          mailId: mail.id,
          subject: mail.subject,
          isDirect: true
        }
      };

      // Broadcast to all clients in the room
      this.broadcast('new_message', chatMessage);

    } catch (error) {
      // Error handling direct message
      client.send('error', { message: 'Failed to send message' });
    }
  }

  async handleMarkRead(client: Client, data: any) {
    try {
      const user = this.users.get(client.sessionId);
      if (!user) return;

      const { mailId } = data;
      if (!mailId) return;

      // Mark mail as read
      await prisma.mail.update({
        where: { 
          id: mailId,
          recipientId: user.userId // Only recipient can mark as read
        },
        data: { 
          status: 'READ',
          readAt: new Date()
        }
      });

      // Broadcast read status to other participant
      this.broadcast('message_read', { mailId, userId: user.userId }, { except: client });

    } catch (error) {
      // Error marking message as read
    }
  }

  handleTypingStart(client: Client) {
    const user = this.users.get(client.sessionId);
    if (!user) return;

    this.broadcast('typing_start', { 
      userId: user.userId,
      displayName: user.displayName 
    }, { except: client });
  }

  handleTypingStop(client: Client) {
    const user = this.users.get(client.sessionId);
    if (!user) return;

    this.broadcast('typing_stop', { 
      userId: user.userId 
    }, { except: client });
  }

  // Implement abstract methods from ChatRoom
  protected async saveMessage(user: ChatUser, message: any): Promise<ChatMessage> {
    // Find the other participant
    const otherParticipantId = this.participants.find(id => id !== user.userId);
    if (!otherParticipantId) {
      throw new Error('No other participant found');
    }

    // Save to database as Mail
    const mail = await prisma.mail.create({
      data: {
        senderId: user.userId,
        recipientId: otherParticipantId,
        subject: message.subject || 'Direct Message',
        content: message.content.trim(),
        priority: 'NORMAL'
      }
    });

    // Return as ChatMessage
    return {
      id: mail.id,
      content: message.content.trim(),
      userId: user.userId,
      displayName: user.displayName,
      timestamp: Date.now(),
      channelType: 'DIRECT',
      metadata: {
        mailId: mail.id,
        subject: mail.subject,
        isDirect: true
      }
    };
  }

  protected async broadcastMessage(message: ChatMessage): Promise<void> {
    this.broadcast('new_message', message);
  }

  protected async getMessageHistory(user: ChatUser, before?: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const recentMails = await prisma.mail.findMany({
        where: {
          OR: [
            {
              senderId: this.participants[0],
              recipientId: this.participants[1]
            },
            {
              senderId: this.participants[1],
              recipientId: this.participants[0]
            }
          ],
          status: { not: 'DELETED' },
          ...(before && { createdAt: { lt: new Date(before) } })
        },
        include: {
          sender: {
            include: {
              profile: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return recentMails.reverse().map(mail => ({
        id: mail.id,
        content: mail.content,
        userId: mail.senderId,
        displayName: mail.sender.profile?.display || 'Unknown',
        timestamp: mail.createdAt.getTime(),
        channelType: 'DIRECT',
        metadata: {
          mailId: mail.id,
          subject: mail.subject,
          priority: mail.priority,
          isStarred: mail.isStarred
        }
      }));
    } catch (error) {
      // Error loading DM history
      return [];
    }
  }

}