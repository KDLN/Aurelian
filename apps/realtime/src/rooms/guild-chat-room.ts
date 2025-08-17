import { Client } from 'colyseus';
import { ChatRoom, ChatUser, ChatMessage } from './chat-room';
import { prisma } from '../utils/prisma';

// Guild invite expiration (7 days)
const GUILD_INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

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

  // Slow mode tracking
  private userLastMessage: Map<string, number> = new Map();
  private slowModeSettings: { enabled: boolean; duration: number } = { enabled: false, duration: 0 };

  async onCreate(options: any) {
    this.guildChannelId = options.guildChannelId;

    // Look up channel details to determine guild and permissions with simple retry logic
    let channel = null;
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        channel = await prisma.guildChannel.findUnique({
          where: { id: this.guildChannelId }
        });
        break;
      } catch (err) {
        if (attempt === maxRetries) {
          console.error('Failed to load guild channel:', err);
          throw err;
        }
        // small backoff before retrying
        await new Promise(res => setTimeout(res, 100 * attempt));
      }
    }

    if (!channel) {
      throw new Error('Guild channel not found');
    }

    this.guildId = channel.guildId;
    this.channelName = channel.name || 'general';
    this.requiredRole = channel.roleRequired as GuildRole | undefined;

    // Note: Slow mode settings would require adding metadata field to GuildChannel schema
    // For now, slow mode is disabled by default
    this.slowModeSettings = { enabled: false, duration: 0 };

    console.info(`GuildChatRoom created for guild ${this.guildId}, channel: ${this.channelName}`);

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
      // Check slow mode restrictions (officers and leaders are exempt)
      if (this.slowModeSettings.enabled && !this.hasRolePermission(user.guildRole as GuildRole, 'OFFICER')) {
        const lastMessageTime = this.userLastMessage.get(user.userId) || 0;
        const now = Date.now();
        const timeSinceLastMessage = (now - lastMessageTime) / 1000;

        if (timeSinceLastMessage < this.slowModeSettings.duration) {
          const remainingTime = Math.ceil(this.slowModeSettings.duration - timeSinceLastMessage);
          throw new Error(`Slow mode active. You can send another message in ${remainingTime} seconds.`);
        }

        // Update last message time
        this.userLastMessage.set(user.userId, now);
      }

      // Save message and log guild activity in a transaction
      const savedMessage = await prisma.$transaction(async (tx) => {
        const msg = await tx.chatMessage.create({
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

        await tx.guildLog.create({
          data: {
            guildId: this.guildId,
            userId: user.userId,
            action: 'chat_message',
            details: {
              channelName: this.channelName,
              messageId: msg.id,
              messageLength: message.content.length
            }
          }
        });

        return msg;
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
    console.info(`Broadcasting guild message in ${this.channelName} from ${message.displayName}: ${message.content}`);
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
          expiresAt: new Date(Date.now() + GUILD_INVITE_EXPIRY_MS)
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

    const { username, role } = args;
    if (!username || !role) {
      this.send(client, 'error', { message: 'Usage: /promote <username> <role>' });
      return;
    }

    const validRoles = ['MEMBER', 'TRADER', 'OFFICER'];
    if (!validRoles.includes(role.toUpperCase())) {
      this.send(client, 'error', { message: 'Valid roles: MEMBER, TRADER, OFFICER' });
      return;
    }

    try {
      // Find the target user in the guild
      const targetMember = await prisma.guildMember.findFirst({
        where: {
          guildId: this.guildId,
          user: {
            profile: {
              display: username
            }
          }
        },
        include: {
          user: {
            include: {
              profile: true
            }
          }
        }
      });

      if (!targetMember) {
        this.send(client, 'error', { message: `User ${username} not found in guild` });
        return;
      }

      // Check if target is already at or above the role
      const currentLevel = this.roleHierarchy[targetMember.role as GuildRole];
      const newLevel = this.roleHierarchy[role.toUpperCase() as GuildRole];

      if (currentLevel >= newLevel) {
        this.send(client, 'error', { message: `${username} is already ${targetMember.role} or higher` });
        return;
      }

      // Update the member's role
      await prisma.guildMember.update({
        where: { id: targetMember.id },
        data: { role: role.toUpperCase() as any }
      });

      // Log the promotion
      await prisma.guildLog.create({
        data: {
          guildId: this.guildId,
          userId: user.userId,
          action: 'member_promoted',
          details: {
            targetUserId: targetMember.userId,
            targetUsername: username,
            oldRole: targetMember.role,
            newRole: role.toUpperCase(),
            promotedBy: user.displayName,
            via: 'chat_command'
          }
        }
      });

      // Broadcast system message
      const systemMessage = {
        content: `${username} has been promoted to ${role.toUpperCase()} by ${user.displayName}`,
        metadata: {
          type: 'system_message',
          action: 'member_promoted',
          targetUser: username,
          newRole: role.toUpperCase()
        }
      };

      const chatMessage = await this.saveMessage(user, systemMessage);
      await this.broadcastMessage(chatMessage);

    } catch (error) {
      console.error('Failed to promote member:', error);
      this.send(client, 'error', { message: 'Failed to promote member' });
    }
  }

  private async handleDemoteCommand(client: Client, user: ChatUser, args: any) {
    // Only leaders can demote
    if (user.guildRole !== 'LEADER') {
      this.send(client, 'error', { message: 'Only guild leaders can demote members' });
      return;
    }

    const { username, role } = args;
    if (!username) {
      this.send(client, 'error', { message: 'Usage: /demote <username> [role]' });
      return;
    }

    try {
      // Find the target user in the guild
      const targetMember = await prisma.guildMember.findFirst({
        where: {
          guildId: this.guildId,
          user: {
            profile: {
              display: username
            }
          }
        },
        include: {
          user: {
            include: {
              profile: true
            }
          }
        }
      });

      if (!targetMember) {
        this.send(client, 'error', { message: `User ${username} not found in guild` });
        return;
      }

      // Can't demote yourself
      if (targetMember.userId === user.userId) {
        this.send(client, 'error', { message: 'You cannot demote yourself' });
        return;
      }

      // Determine new role
      const currentLevel = this.roleHierarchy[targetMember.role as GuildRole];
      let newRole = role ? role.toUpperCase() : 'MEMBER';

      // Validate new role
      if (role) {
        const validRoles = ['MEMBER', 'TRADER', 'OFFICER'];
        if (!validRoles.includes(newRole)) {
          this.send(client, 'error', { message: 'Valid roles: MEMBER, TRADER, OFFICER' });
          return;
        }
        
        const newLevel = this.roleHierarchy[newRole as GuildRole];
        if (newLevel >= currentLevel) {
          this.send(client, 'error', { message: `Cannot demote ${username} to same or higher role` });
          return;
        }
      } else {
        // Default demotion logic
        if (currentLevel <= 1) {
          this.send(client, 'error', { message: `${username} is already at the lowest role` });
          return;
        }
        
        // Demote by one level
        const roleLevels: GuildRole[] = ['MEMBER', 'TRADER', 'OFFICER', 'LEADER'];
        newRole = roleLevels[currentLevel - 2]; // currentLevel is 1-indexed, array is 0-indexed
      }

      // Update the member's role
      await prisma.guildMember.update({
        where: { id: targetMember.id },
        data: { role: newRole as any }
      });

      // Log the demotion
      await prisma.guildLog.create({
        data: {
          guildId: this.guildId,
          userId: user.userId,
          action: 'member_demoted',
          details: {
            targetUserId: targetMember.userId,
            targetUsername: username,
            oldRole: targetMember.role,
            newRole: newRole,
            demotedBy: user.displayName,
            via: 'chat_command'
          }
        }
      });

      // Broadcast system message
      const systemMessage = {
        content: `${username} has been demoted to ${newRole} by ${user.displayName}`,
        metadata: {
          type: 'system_message',
          action: 'member_demoted',
          targetUser: username,
          newRole: newRole
        }
      };

      const chatMessage = await this.saveMessage(user, systemMessage);
      await this.broadcastMessage(chatMessage);

    } catch (error) {
      console.error('Failed to demote member:', error);
      this.send(client, 'error', { message: 'Failed to demote member' });
    }
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

    const { messageId, action } = data; // action: 'pin' or 'unpin'
    if (!messageId) {
      this.send(client, 'error', { message: 'Message ID required' });
      return;
    }

    try {
      // Find the message in this channel
      const message = await prisma.chatMessage.findFirst({
        where: {
          id: messageId,
          guildChannelId: this.guildChannelId,
          deletedAt: null
        },
        include: {
          user: {
            include: {
              profile: true
            }
          }
        }
      });

      if (!message) {
        this.send(client, 'error', { message: 'Message not found in this channel' });
        return;
      }

      const isPinning = action === 'pin';
      const currentlyPinned = message.metadata && 
        typeof message.metadata === 'object' && 
        'pinned' in message.metadata && 
        message.metadata.pinned === true;

      if (isPinning && currentlyPinned) {
        this.send(client, 'error', { message: 'Message is already pinned' });
        return;
      }

      if (!isPinning && !currentlyPinned) {
        this.send(client, 'error', { message: 'Message is not pinned' });
        return;
      }

      // Update message metadata
      const updatedMetadata = {
        ...(message.metadata as object || {}),
        pinned: isPinning,
        ...(isPinning && {
          pinnedBy: user.displayName,
          pinnedAt: new Date().toISOString()
        })
      };

      await prisma.chatMessage.update({
        where: { id: messageId },
        data: { metadata: updatedMetadata }
      });

      // Log the action
      await prisma.guildLog.create({
        data: {
          guildId: this.guildId,
          userId: user.userId,
          action: isPinning ? 'message_pinned' : 'message_unpinned',
          details: {
            messageId,
            channelName: this.channelName,
            originalAuthor: message.user.profile?.display || 'Unknown',
            messagePreview: message.content.substring(0, 100),
            pinnedBy: user.displayName
          }
        }
      });

      // Broadcast pin/unpin notification
      const notificationMessage = {
        content: `📌 Message ${isPinning ? 'pinned' : 'unpinned'} by ${user.displayName}`,
        metadata: {
          type: 'system_message',
          action: isPinning ? 'message_pinned' : 'message_unpinned',
          pinnedMessageId: messageId,
          originalMessage: {
            author: message.user.profile?.display || 'Unknown',
            content: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
            timestamp: message.createdAt.getTime()
          }
        }
      };

      const chatMessage = await this.saveMessage(user, notificationMessage);
      await this.broadcastMessage(chatMessage);

      // Send updated message data to all clients
      this.broadcast('message_updated', {
        messageId,
        metadata: updatedMetadata,
        action: isPinning ? 'pinned' : 'unpinned'
      });

    } catch (error) {
      console.error('Failed to pin/unpin message:', error);
      this.send(client, 'error', { message: 'Failed to update message pin status' });
    }
  }

  private async handleSlowMode(client: Client, data: any) {
    const user = this.users.get(client.sessionId);
    if (!user || !this.hasRolePermission(user.guildRole as GuildRole, 'OFFICER')) {
      this.send(client, 'error', { message: 'Only officers and leaders can enable slow mode' });
      return;
    }

    const { action, duration } = data; // action: 'enable' or 'disable', duration in seconds
    
    try {
      if (action === 'enable') {
        if (!duration || duration < 1 || duration > 300) {
          this.send(client, 'error', { message: 'Duration must be between 1 and 300 seconds' });
          return;
        }

        // Note: Channel metadata field would need to be added to GuildChannel schema
        // For now, just update local state
        // await prisma.guildChannel.update({
        //   where: { id: this.guildChannelId },
        //   data: { /* metadata field not available */ }
        // });

        // Log the action
        await prisma.guildLog.create({
          data: {
            guildId: this.guildId,
            userId: user.userId,
            action: 'slow_mode_enabled',
            details: {
              channelName: this.channelName,
              duration: duration,
              enabledBy: user.displayName
            }
          }
        });

        // Broadcast system message
        const systemMessage = {
          content: `🐌 Slow mode enabled by ${user.displayName} - ${duration} second cooldown between messages`,
          metadata: {
            type: 'system_message',
            action: 'slow_mode_enabled',
            duration: duration,
            enabledBy: user.displayName
          }
        };

        const chatMessage = await this.saveMessage(user, systemMessage);
        await this.broadcastMessage(chatMessage);

        // Update local slow mode settings
        this.slowModeSettings = {
          enabled: true,
          duration: duration
        };

        // Notify all clients about slow mode state
        this.broadcast('slow_mode_updated', {
          enabled: true,
          duration: duration,
          enabledBy: user.displayName
        });

      } else if (action === 'disable') {
        // Note: Channel metadata field would need to be added to GuildChannel schema
        // For now, just update local state
        // await prisma.guildChannel.update({
        //   where: { id: this.guildChannelId },
        //   data: { /* metadata field not available */ }
        // });

        // Log the action
        await prisma.guildLog.create({
          data: {
            guildId: this.guildId,
            userId: user.userId,
            action: 'slow_mode_disabled',
            details: {
              channelName: this.channelName,
              disabledBy: user.displayName
            }
          }
        });

        // Broadcast system message
        const systemMessage = {
          content: `🚀 Slow mode disabled by ${user.displayName}`,
          metadata: {
            type: 'system_message',
            action: 'slow_mode_disabled',
            disabledBy: user.displayName
          }
        };

        const chatMessage = await this.saveMessage(user, systemMessage);
        await this.broadcastMessage(chatMessage);

        // Update local slow mode settings
        this.slowModeSettings = {
          enabled: false,
          duration: 0
        };

        // Clear all user message timestamps when disabling
        this.userLastMessage.clear();

        // Notify all clients about slow mode state
        this.broadcast('slow_mode_updated', {
          enabled: false,
          disabledBy: user.displayName
        });

      } else {
        this.send(client, 'error', { message: 'Invalid action. Use "enable" or "disable"' });
      }

    } catch (error) {
      console.error('Failed to update slow mode:', error);
      this.send(client, 'error', { message: 'Failed to update slow mode settings' });
    }
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
      userRole: auth.guildRole,
      slowMode: this.slowModeSettings
    });
  }
}