import { Client } from 'colyseus';
import { ChatRoom, ChatUser, ChatMessage } from './chat-room';
import { prisma } from '../utils/prisma';

export type GuildRole = 'LEADER' | 'OFFICER' | 'TRADER' | 'MEMBER';

export class GuildChatRoom extends ChatRoom {
  guildId!: string;
  guildChannelId!: string;
  channelName!: string;
  requiredRole?: GuildRole;
  
  // Role hierarchy for permission checking
  private roleHierarchy: Record<GuildRole, number> = {
    LEADER: 4,
    OFFICER: 3,
    TRADER: 2,
    MEMBER: 1
  };

  onCreate(options: any) {
    this.guildId = options.guildId;
    this.guildChannelId = options.guildChannelId;
    this.channelName = options.channelName || 'general';
    this.requiredRole = options.requiredRole;
    
    console.log(`GuildChatRoom created for guild ${this.guildId}, channel: ${this.channelName}`);
    
    // Call parent onCreate
    super.onCreate(options);
    
    // Set up guild-specific message handlers
    this.setupGuildCommands();
  }

  async onAuth(client: Client, options: any) {
    // First get basic auth from parent
    const auth = await super.onAuth(client, options);
    
    // Additional validation for guild membership
    if (!auth.guildId || auth.guildId !== this.guildId) {
      throw new Error('User is not a member of this guild');
    }

    // Check role permissions for this channel
    if (this.requiredRole && auth.guildRole && !this.hasRolePermission(auth.guildRole, this.requiredRole)) {
      throw new Error(`Insufficient permissions. Requires ${this.requiredRole} role or higher`);
    }

    return auth;
  }

  private hasRolePermission(userRole: GuildRole, requiredRole: GuildRole): boolean {
    const userLevel = this.roleHierarchy[userRole] || 0;
    const requiredLevel = this.roleHierarchy[requiredRole] || 0;
    return userLevel >= requiredLevel;
  }

  private setupGuildCommands() {
    // Guild leader/officer commands
    this.onMessage('guild_command', (client, data) => {
      this.handleGuildCommand(client, data);
    });

    this.onMessage('pin_message', (client, data) => {
      this.handlePinMessage(client, data);
    });

    this.onMessage('slow_mode', (client, data) => {
      this.handleSlowMode(client, data);
    });

    this.onMessage('kick_user', (client, data) => {
      this.handleKickUser(client, data);
    });
  }

  protected async saveMessage(user: ChatUser, message: any): Promise<ChatMessage> {
    try {
      // Save message to database
      const savedMessage = await prisma.chatMessage.create({
        data: {
          content: message.content.trim(),
          userId: user.userId,
          channelType: 'GUILD',
          guildChannelId: this.guildChannelId,
          metadata: message.metadata || null
        },
        include: {
          user: {
            include: {
              profile: true,
              guildMembership: {
                include: {
                  guild: true
                }
              }
            }
          }
        }
      });

      // Convert to ChatMessage format
      const chatMessage: ChatMessage = {
        id: savedMessage.id,
        content: savedMessage.content,
        userId: savedMessage.userId,
        displayName: savedMessage.user.profile?.display || 'Unknown',
        timestamp: savedMessage.createdAt.getTime(),
        channelType: savedMessage.channelType,
        guildChannelId: savedMessage.guildChannelId || undefined,
        metadata: {
          ...(savedMessage.metadata as object || {}),
          guildRole: savedMessage.user.guildMembership?.role,
          guildTag: savedMessage.user.guildMembership?.guild.tag
        }
      };

      // Log guild activity
      await prisma.guildLog.create({
        data: {
          guildId: this.guildId,
          userId: user.userId,
          action: 'chat_message',
          details: {
            channelName: this.channelName,
            messageId: savedMessage.id,
            messageLength: message.content.length
          }
        }
      });

      return chatMessage;
    } catch (error) {
      console.error('Failed to save guild chat message:', error);
      throw error;
    }
  }

  protected async broadcastMessage(message: ChatMessage): Promise<void> {
    // Broadcast to all clients in this guild channel
    this.broadcast('chat_message', message);
    
    // Log for debugging
    console.log(`Broadcasting guild message in ${this.channelName} from ${message.displayName}: ${message.content}`);
  }

  protected async getMessageHistory(user: ChatUser, before?: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const whereClause: any = {
        channelType: 'GUILD',
        guildChannelId: this.guildChannelId,
        deletedAt: null
      };

      if (before) {
        whereClause.createdAt = {
          lt: new Date(parseInt(before))
        };
      }

      const messages = await prisma.chatMessage.findMany({
        where: whereClause,
        include: {
          user: {
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
        take: limit
      });

      // Convert to ChatMessage format and reverse to get chronological order
      const chatMessages: ChatMessage[] = messages.reverse().map(msg => ({
        id: msg.id,
        content: msg.content,
        userId: msg.userId,
        displayName: msg.user.profile?.display || 'Unknown',
        timestamp: msg.createdAt.getTime(),
        channelType: msg.channelType,
        guildChannelId: msg.guildChannelId || undefined,
        editedAt: msg.editedAt?.getTime(),
        metadata: {
          ...(msg.metadata as object || {}),
          guildRole: msg.user.guildMembership?.role,
          guildTag: msg.user.guildMembership?.guild.tag
        }
      }));

      return chatMessages;
    } catch (error) {
      console.error('Failed to fetch guild message history:', error);
      return [];
    }
  }

  private async handleGuildCommand(client: Client, data: any) {
    const user = this.users.get(client.sessionId);
    if (!user) return;

    const { command, args } = data;

    switch (command) {
      case 'invite':
        await this.handleInviteCommand(client, user, args);
        break;
      case 'promote':
        await this.handlePromoteCommand(client, user, args);
        break;
      case 'demote':
        await this.handleDemoteCommand(client, user, args);
        break;
      case 'announcement':
        await this.handleAnnouncementCommand(client, user, args);
        break;
      default:
        this.send(client, 'error', { message: 'Unknown guild command' });
    }
  }

  private async handleInviteCommand(client: Client, user: ChatUser, args: any) {
    // Only officers and leaders can invite
    if (!this.hasRolePermission(user.guildRole as GuildRole, 'OFFICER')) {
      this.send(client, 'error', { message: 'Only officers and leaders can invite members' });
      return;
    }

    try {
      const targetUser = await prisma.user.findFirst({
        where: {
          profile: {
            display: args.username
          }
        },
        include: {
          profile: true,
          guildMembership: true
        }
      });

      if (!targetUser) {
        this.send(client, 'error', { message: 'User not found' });
        return;
      }

      if (targetUser.guildMembership) {
        this.send(client, 'error', { message: 'User is already in a guild' });
        return;
      }

      // Create guild invitation
      await prisma.guildInvite.create({
        data: {
          guildId: this.guildId,
          userId: targetUser.id,
          invitedBy: user.userId,
          message: args.message || '',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      const systemMessage = {
        content: `${user.displayName} invited ${targetUser.profile?.display} to the guild`,
        metadata: {
          type: 'system_message',
          action: 'guild_invite',
          targetUser: targetUser.profile?.display
        }
      };

      const chatMessage = await this.saveMessage(user, systemMessage);
      await this.broadcastMessage(chatMessage);

    } catch (error) {
      console.error('Failed to invite user:', error);
      this.send(client, 'error', { message: 'Failed to send invitation' });
    }
  }

  private async handlePromoteCommand(client: Client, user: ChatUser, args: any) {
    // Only leaders can promote
    if (user.guildRole !== 'LEADER') {
      this.send(client, 'error', { message: 'Only guild leaders can promote members' });
      return;
    }

    // Implementation for promoting guild members
    // This would involve updating the GuildMember table
    this.send(client, 'info', { message: 'Promote command received (implementation pending)' });
  }

  private async handleDemoteCommand(client: Client, user: ChatUser, args: any) {
    // Only leaders can demote
    if (user.guildRole !== 'LEADER') {
      this.send(client, 'error', { message: 'Only guild leaders can demote members' });
      return;
    }

    // Implementation for demoting guild members
    this.send(client, 'info', { message: 'Demote command received (implementation pending)' });
  }

  private async handleAnnouncementCommand(client: Client, user: ChatUser, args: any) {
    // Only officers and leaders can make announcements
    if (!this.hasRolePermission(user.guildRole as GuildRole, 'OFFICER')) {
      this.send(client, 'error', { message: 'Only officers and leaders can make announcements' });
      return;
    }

    const announcementMessage = {
      content: args.message,
      metadata: {
        type: 'announcement',
        author: user.displayName,
        role: user.guildRole
      }
    };

    const chatMessage = await this.saveMessage(user, announcementMessage);
    await this.broadcastMessage(chatMessage);
  }

  private async handlePinMessage(client: Client, data: any) {
    const user = this.users.get(client.sessionId);
    if (!user || !this.hasRolePermission(user.guildRole as GuildRole, 'OFFICER')) {
      this.send(client, 'error', { message: 'Only officers and leaders can pin messages' });
      return;
    }

    // Implementation for pinning messages
    this.send(client, 'info', { message: 'Pin message feature coming soon' });
  }

  private async handleSlowMode(client: Client, data: any) {
    const user = this.users.get(client.sessionId);
    if (!user || !this.hasRolePermission(user.guildRole as GuildRole, 'OFFICER')) {
      this.send(client, 'error', { message: 'Only officers and leaders can enable slow mode' });
      return;
    }

    // Implementation for slow mode
    this.send(client, 'info', { message: 'Slow mode feature coming soon' });
  }

  private async handleKickUser(client: Client, data: any) {
    const user = this.users.get(client.sessionId);
    if (!user || !this.hasRolePermission(user.guildRole as GuildRole, 'OFFICER')) {
      this.send(client, 'error', { message: 'Only officers and leaders can kick users' });
      return;
    }

    // Find target user in current room
    const targetUser = Array.from(this.users.values()).find(u => u.displayName === data.username);
    if (!targetUser) {
      this.send(client, 'error', { message: 'User not found in this channel' });
      return;
    }

    // Don't allow kicking users with equal or higher role
    const targetRole = targetUser.guildRole as GuildRole;
    const userRole = user.guildRole as GuildRole;
    
    if (this.roleHierarchy[targetRole] >= this.roleHierarchy[userRole]) {
      this.send(client, 'error', { message: 'Cannot kick users with equal or higher role' });
      return;
    }

    // Find and disconnect the target client
    for (const [sessionId, chatUser] of this.users.entries()) {
      if (chatUser.userId === targetUser.userId) {
        const targetClient = this.clients.find(c => c.sessionId === sessionId);
        if (targetClient) {
          this.send(targetClient, 'kicked', { 
            reason: data.reason || 'No reason provided',
            kickedBy: user.displayName 
          });
          targetClient.leave();
          break;
        }
      }
    }

    // Log the kick action
    const systemMessage = {
      content: `${targetUser.displayName} was kicked from the channel by ${user.displayName}`,
      metadata: {
        type: 'system_message',
        action: 'user_kicked',
        targetUser: targetUser.displayName,
        reason: data.reason
      }
    };

    const chatMessage = await this.saveMessage(user, systemMessage);
    await this.broadcastMessage(chatMessage);
  }

  onJoin(client: Client, options: any, auth: any) {
    super.onJoin(client, options, auth);
    
    // Send recent message history to new user
    this.getMessageHistory(this.users.get(client.sessionId)!, undefined, 20)
      .then(messages => {
        this.send(client, 'message_history', { messages });
      })
      .catch(error => {
        console.error('Failed to send message history to new user:', error);
      });

    // Send channel info
    this.send(client, 'channel_info', {
      guildId: this.guildId,
      channelId: this.guildChannelId,
      channelName: this.channelName,
      requiredRole: this.requiredRole,
      userRole: auth.guildRole
    });
  }
}