import { Client } from 'colyseus';
import { ChatRoom, ChatUser, ChatMessage } from './chat-room';
import { prisma } from '../utils/prisma';

export type GuildRole = 'LEADER' | 'OFFICER' | 'TRADER' | 'MEMBER';

export class AllianceChatRoom extends ChatRoom {
  allianceId!: string;
  allianceChannelId!: string;
  channelName!: string;
  allowedGuildIds: Set<string> = new Set();
  
  // Role hierarchy for permission checking
  private roleHierarchy: Record<GuildRole, number> = {
    LEADER: 4,
    OFFICER: 3,
    TRADER: 2,
    MEMBER: 1
  };

  async onCreate(options: any) {
    this.allianceChannelId = options.allianceChannelId;

    // Look up alliance channel details
    let channel = null;
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        channel = await prisma.allianceChannel.findUnique({
          where: { id: this.allianceChannelId },
          include: {
            alliance: {
              include: {
                fromGuild: { select: { id: true, name: true, tag: true } },
                toGuild: { select: { id: true, name: true, tag: true } }
              }
            }
          }
        });
        break;
      } catch (err) {
        if (attempt === maxRetries) {
          console.error('Failed to load alliance channel:', err);
          throw err;
        }
        await new Promise(res => setTimeout(res, 100 * attempt));
      }
    }

    if (!channel) {
      throw new Error('Alliance channel not found');
    }

    if (!channel.alliance || channel.alliance.status !== 'ACCEPTED') {
      throw new Error('Alliance channel is not active');
    }

    this.allianceId = channel.allianceId;
    this.channelName = channel.name;
    
    // Set up allowed guild IDs for this alliance
    this.allowedGuildIds.add(channel.alliance.fromGuildId);
    this.allowedGuildIds.add(channel.alliance.toGuildId);

    console.info(`AllianceChatRoom created for alliance ${this.allianceId}, channel: ${this.channelName}`);
    console.info(`Allowed guilds: ${Array.from(this.allowedGuildIds).join(', ')}`);

    // Call parent onCreate
    super.onCreate(options);

    // Set up alliance-specific message handlers
    this.setupAllianceCommands();
  }

  async onAuth(client: Client, options: any) {
    // First get basic auth from parent
    const auth = await super.onAuth(client, options);
    
    // Additional validation for alliance membership
    if (!auth.guildId || !this.allowedGuildIds.has(auth.guildId)) {
      throw new Error('User\'s guild is not part of this alliance');
    }

    // Check if alliance is still active
    const alliance = await prisma.guildAlliance.findUnique({
      where: { id: this.allianceId },
      select: { status: true, type: true }
    });

    if (!alliance || alliance.status !== 'ACCEPTED' || alliance.type !== 'ALLIANCE') {
      throw new Error('Alliance is no longer active');
    }

    return auth;
  }

  private setupAllianceCommands() {
    // Alliance-specific commands
    this.onMessage('alliance_announcement', (client, data) => {
      this.handleAllianceAnnouncement(client, data);
    });

    this.onMessage('guild_info', (client, data) => {
      this.handleGuildInfoRequest(client, data);
    });
  }

  protected async saveMessage(user: ChatUser, message: any): Promise<ChatMessage> {
    try {
      // Save message and log alliance activity
      const savedMessage = await prisma.$transaction(async (tx: any) => {
        const msg = await tx.chatMessage.create({
          data: {
            content: message.content.trim(),
            userId: user.userId,
            channelType: 'ALLIANCE',
            allianceChannelId: this.allianceChannelId,
            metadata: {
              ...(message.metadata || {}),
              allianceId: this.allianceId,
              guildId: user.guildId,
              guildRole: user.guildRole,
              guildTag: user.guildTag
            }
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

        // Log activity in both guilds
        for (const guildId of this.allowedGuildIds) {
          await tx.guildLog.create({
            data: {
              guildId: guildId,
              userId: user.userId,
              action: 'alliance_chat_message',
              details: {
                channelName: this.channelName,
                allianceId: this.allianceId,
                messageId: msg.id,
                messageLength: message.content.length,
                fromGuild: user.guildId,
                fromGuildTag: user.guildTag
              }
            }
          });
        }

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
        allianceChannelId: savedMessage.allianceChannelId || undefined,
        metadata: {
          ...(savedMessage.metadata as object || {}),
          allianceId: this.allianceId,
          guildRole: savedMessage.user.guildMembership?.role,
          guildTag: savedMessage.user.guildMembership?.guild.tag,
          guildName: savedMessage.user.guildMembership?.guild.name,
          isAllianceMessage: true
        }
      };

      return chatMessage;
    } catch (error) {
      console.error('Failed to save alliance chat message:', error);
      throw error;
    }
  }

  protected async broadcastMessage(message: ChatMessage): Promise<void> {
    // Broadcast to all clients in this alliance channel
    this.broadcast('chat_message', message);
    
    console.info(`Broadcasting alliance message in ${this.channelName} from ${message.displayName} [${message.metadata?.guildTag}]: ${message.content}`);
  }

  protected async getMessageHistory(user: ChatUser, before?: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const whereClause: any = {
        channelType: 'ALLIANCE',
        allianceChannelId: this.allianceChannelId,
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
      const chatMessages: ChatMessage[] = messages.reverse().map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        userId: msg.userId,
        displayName: msg.user.profile?.display || 'Unknown',
        timestamp: msg.createdAt.getTime(),
        channelType: msg.channelType,
        allianceChannelId: msg.allianceChannelId || undefined,
        editedAt: msg.editedAt?.getTime(),
        metadata: {
          ...(msg.metadata as object || {}),
          allianceId: this.allianceId,
          guildRole: msg.user.guildMembership?.role,
          guildTag: msg.user.guildMembership?.guild.tag,
          guildName: msg.user.guildMembership?.guild.name,
          isAllianceMessage: true
        }
      }));

      return chatMessages;
    } catch (error) {
      console.error('Failed to fetch alliance message history:', error);
      return [];
    }
  }

  private async handleAllianceAnnouncement(client: Client, data: any) {
    const user = this.users.get(client.sessionId);
    if (!user) return;

    // Only officers and leaders from either guild can make alliance announcements
    if (!this.hasRolePermission(user.guildRole as GuildRole, 'OFFICER')) {
      this.send(client, 'error', { message: 'Only officers and leaders can make alliance announcements' });
      return;
    }

    const announcementMessage = {
      content: data.message,
      metadata: {
        type: 'alliance_announcement',
        author: user.displayName,
        authorGuild: user.guildTag,
        role: user.guildRole,
        allianceId: this.allianceId
      }
    };

    const chatMessage = await this.saveMessage(user, announcementMessage);
    await this.broadcastMessage(chatMessage);
  }

  private async handleGuildInfoRequest(client: Client, data: any) {
    const user = this.users.get(client.sessionId);
    if (!user) return;

    try {
      // Get info about both guilds in the alliance
      const alliance = await prisma.guildAlliance.findUnique({
        where: { id: this.allianceId },
        include: {
          fromGuild: {
            select: {
              id: true,
              name: true,
              tag: true,
              level: true,
              treasury: true,
              _count: {
                select: { members: true }
              }
            }
          },
          toGuild: {
            select: {
              id: true,
              name: true,
              tag: true,
              level: true,
              treasury: true,
              _count: {
                select: { members: true }
              }
            }
          }
        }
      });

      if (alliance) {
        this.send(client, 'alliance_info', {
          alliance: {
            id: alliance.id,
            type: alliance.type,
            acceptedAt: alliance.acceptedAt,
            travelTaxReduction: alliance.travelTaxReduction,
            auctionFeeReduction: alliance.auctionFeeReduction
          },
          guilds: {
            [alliance.fromGuild.id]: {
              ...alliance.fromGuild,
              memberCount: alliance.fromGuild._count.members,
              isUserGuild: alliance.fromGuild.id === user.guildId
            },
            [alliance.toGuild.id]: {
              ...alliance.toGuild,
              memberCount: alliance.toGuild._count.members,
              isUserGuild: alliance.toGuild.id === user.guildId
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to get alliance info:', error);
      this.send(client, 'error', { message: 'Failed to get alliance information' });
    }
  }

  private hasRolePermission(userRole: GuildRole, requiredRole: GuildRole): boolean {
    const userLevel = this.roleHierarchy[userRole] || 0;
    const requiredLevel = this.roleHierarchy[requiredRole] || 0;
    return userLevel >= requiredLevel;
  }

  onJoin(client: Client, options: any, auth: any) {
    super.onJoin(client, options, auth);
    
    // Send recent message history to new user
    this.getMessageHistory(this.users.get(client.sessionId)!, undefined, 30)
      .then(messages => {
        this.send(client, 'message_history', { messages });
      })
      .catch(error => {
        console.error('Failed to send message history to new user:', error);
      });

    // Send alliance channel info
    this.send(client, 'alliance_channel_info', {
      allianceId: this.allianceId,
      channelId: this.allianceChannelId,
      channelName: this.channelName,
      allowedGuilds: Array.from(this.allowedGuildIds),
      userRole: auth.guildRole,
      userGuild: auth.guildId,
      canMakeAnnouncements: this.hasRolePermission(auth.guildRole, 'OFFICER')
    });

    // Announce user joining (if not a reconnection)
    if (!options.reconnecting) {
      const joinMessage = {
        content: `${auth.displayName} [${auth.guildTag}] joined the alliance channel`,
        metadata: {
          type: 'user_joined',
          joinedUser: auth.displayName,
          joinedGuild: auth.guildTag,
          isSystemMessage: true
        }
      };
      
      this.saveMessage(this.users.get(client.sessionId)!, joinMessage)
        .then(chatMessage => this.broadcastMessage(chatMessage))
        .catch(error => console.error('Failed to broadcast join message:', error));
    }
  }

  onLeave(client: Client, consented: boolean) {
    const user = this.users.get(client.sessionId);
    
    if (user && consented) {
      const leaveMessage = {
        content: `${user.displayName} [${user.guildTag}] left the alliance channel`,
        metadata: {
          type: 'user_left',
          leftUser: user.displayName,
          leftGuild: user.guildTag,
          isSystemMessage: true
        }
      };
      
      this.saveMessage(user, leaveMessage)
        .then(chatMessage => this.broadcastMessage(chatMessage))
        .catch(error => console.error('Failed to broadcast leave message:', error));
    }

    super.onLeave(client, consented);
  }
}