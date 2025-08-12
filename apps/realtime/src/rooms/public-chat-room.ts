import { Client } from 'colyseus';
import { ChatRoom, ChatUser, ChatMessage } from './chat-room';
import { prisma } from '../utils/prisma';

export type PublicChannelType = 'GENERAL' | 'TRADE';

export class PublicChatRoom extends ChatRoom {
  channelType!: PublicChannelType;
  
  onCreate(options: any) {
    this.channelType = options.channelType || 'GENERAL';
    console.log(`PublicChatRoom created for channel: ${this.channelType}`);
    
    // Call parent onCreate
    super.onCreate(options);
    
    // Set up channel-specific configurations
    if (this.channelType === 'TRADE') {
      this.setupTradeChannelHandlers();
    }
  }

  private setupTradeChannelHandlers() {
    // Handle trade-specific commands
    this.onMessage('link_item', (client, data) => {
      this.handleLinkItem(client, data);
    });

    this.onMessage('link_listing', (client, data) => {
      this.handleLinkListing(client, data);
    });

    this.onMessage('price_check', (client, data) => {
      this.handlePriceCheck(client, data);
    });
  }

  protected async saveMessage(user: ChatUser, message: any): Promise<ChatMessage> {
    try {
      // Save message to database
      const savedMessage = await prisma.chatMessage.create({
        data: {
          content: message.content.trim(),
          userId: user.userId,
          channelType: this.channelType,
          metadata: message.metadata || null
        },
        include: {
          user: {
            include: {
              profile: true
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
        metadata: savedMessage.metadata
      };

      return chatMessage;
    } catch (error) {
      console.error('Failed to save public chat message:', error);
      throw error;
    }
  }

  protected async broadcastMessage(message: ChatMessage): Promise<void> {
    // Broadcast to all clients in this room
    this.broadcast('chat_message', message);
    
    // Log for debugging
    console.log(`Broadcasting ${this.channelType} message from ${message.displayName}: ${message.content}`);
  }

  protected async getMessageHistory(user: ChatUser, before?: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const whereClause: any = {
        channelType: this.channelType,
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
              profile: true
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
        editedAt: msg.editedAt?.getTime(),
        metadata: msg.metadata
      }));

      return chatMessages;
    } catch (error) {
      console.error('Failed to fetch message history:', error);
      return [];
    }
  }

  private async handleLinkItem(client: Client, data: any) {
    const user = this.users.get(client.sessionId);
    if (!user || this.channelType !== 'TRADE') return;

    try {
      // Verify user owns the item
      const inventory = await prisma.inventory.findFirst({
        where: {
          userId: user.userId,
          itemId: data.itemId,
          qty: { gte: data.quantity || 1 }
        },
        include: {
          item: true
        }
      });

      if (!inventory) {
        this.send(client, 'error', { message: 'Item not found in your inventory' });
        return;
      }

      // Create item link message
      const linkMessage = {
        content: `[${inventory.item.name}${data.quantity ? ` x${data.quantity}` : ''}]`,
        metadata: {
          type: 'item_link',
          itemId: inventory.itemId,
          itemName: inventory.item.name,
          quantity: data.quantity || 1,
          rarity: inventory.item.rarity
        }
      };

      // Save and broadcast the message
      const chatMessage = await this.saveMessage(user, linkMessage);
      await this.broadcastMessage(chatMessage);

    } catch (error) {
      console.error('Failed to link item:', error);
      this.send(client, 'error', { message: 'Failed to link item' });
    }
  }

  private async handleLinkListing(client: Client, data: any) {
    const user = this.users.get(client.sessionId);
    if (!user || this.channelType !== 'TRADE') return;

    try {
      // Verify listing exists and belongs to user
      const listing = await prisma.listing.findFirst({
        where: {
          id: data.listingId,
          sellerId: user.userId,
          status: 'active'
        },
        include: {
          item: true
        }
      });

      if (!listing) {
        this.send(client, 'error', { message: 'Listing not found or not owned by you' });
        return;
      }

      // Create listing link message
      const linkMessage = {
        content: `[Listing: ${listing.item.name} x${listing.qty} for ${listing.price}g each]`,
        metadata: {
          type: 'listing_link',
          listingId: listing.id,
          itemName: listing.item.name,
          quantity: listing.qty,
          price: listing.price,
          totalValue: listing.qty * listing.price
        }
      };

      // Save and broadcast the message
      const chatMessage = await this.saveMessage(user, linkMessage);
      await this.broadcastMessage(chatMessage);

    } catch (error) {
      console.error('Failed to link listing:', error);
      this.send(client, 'error', { message: 'Failed to link listing' });
    }
  }

  private async handlePriceCheck(client: Client, data: any) {
    const user = this.users.get(client.sessionId);
    if (!user || this.channelType !== 'TRADE') return;

    try {
      // Get recent price data for the item
      const recentTicks = await prisma.priceTick.findMany({
        where: {
          itemId: data.itemId
        },
        include: {
          item: true
        },
        orderBy: {
          at: 'desc'
        },
        take: 1
      });

      if (recentTicks.length === 0) {
        this.send(client, 'error', { message: 'No price data available for this item' });
        return;
      }

      const tick = recentTicks[0];
      
      // Create price check message
      const priceMessage = {
        content: `[Price Check: ${tick.item.name} - Current: ${tick.price}g${tick.trend ? ` (${tick.trend})` : ''}]`,
        metadata: {
          type: 'price_check',
          itemId: tick.itemId,
          itemName: tick.item.name,
          currentPrice: tick.price,
          trend: tick.trend,
          volume: tick.volume
        }
      };

      // Save and broadcast the message
      const chatMessage = await this.saveMessage(user, priceMessage);
      await this.broadcastMessage(chatMessage);

    } catch (error) {
      console.error('Failed to check price:', error);
      this.send(client, 'error', { message: 'Failed to check price' });
    }
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
  }
}