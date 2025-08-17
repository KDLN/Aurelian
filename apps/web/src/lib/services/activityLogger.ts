import { prisma } from '@/lib/prisma';

export type ActivityType = 'mission_completed' | 'auction_sold' | 'agent_hired' | 'item_crafted' | 'trade_completed' | 'guild_joined' | 'achievement_unlocked';

interface ActivityMetadata {
  reward?: number;
  itemName?: string;
  itemQuantity?: number;
  agentName?: string;
  missionName?: string;
  guildName?: string;
  achievementName?: string;
  [key: string]: any;
}

/**
 * Central activity logging service
 * Records user activities for display in hub recent activity feed
 */
export class ActivityLogger {
  
  /**
   * Log a mission completion
   */
  static async logMissionCompleted(userId: string, missionName: string, reward: number) {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          type: 'mission_completed',
          message: `Mission to ${missionName} completed successfully`,
          metadata: {
            missionName,
            reward
          }
        }
      });
    } catch (error) {
      console.error('Failed to log mission completion:', error);
    }
  }

  /**
   * Log an auction sale
   */
  static async logAuctionSold(userId: string, itemName: string, quantity: number, totalPrice: number) {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          type: 'auction_sold',
          message: `Sold ${quantity} ${itemName} for ${totalPrice}g`,
          metadata: {
            itemName,
            itemQuantity: quantity,
            reward: totalPrice
          }
        }
      });
    } catch (error) {
      console.error('Failed to log auction sale:', error);
    }
  }

  /**
   * Log hiring a new agent
   */
  static async logAgentHired(userId: string, agentName: string, agentClass: string) {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          type: 'agent_hired',
          message: `Hired new ${agentClass} agent: ${agentName}`,
          metadata: {
            agentName,
            agentClass
          }
        }
      });
    } catch (error) {
      console.error('Failed to log agent hire:', error);
    }
  }

  /**
   * Log item crafting
   */
  static async logItemCrafted(userId: string, itemName: string, quantity: number) {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          type: 'item_crafted',
          message: `Crafted ${quantity} ${itemName}`,
          metadata: {
            itemName,
            itemQuantity: quantity
          }
        }
      });
    } catch (error) {
      console.error('Failed to log item crafting:', error);
    }
  }

  /**
   * Log trade completion
   */
  static async logTradeCompleted(userId: string, itemName: string, quantity: number, price: number, isBuy: boolean) {
    try {
      const action = isBuy ? 'Bought' : 'Sold';
      await prisma.activityLog.create({
        data: {
          userId,
          type: 'trade_completed',
          message: `${action} ${quantity} ${itemName} for ${price}g`,
          metadata: {
            itemName,
            itemQuantity: quantity,
            price,
            action: action.toLowerCase()
          }
        }
      });
    } catch (error) {
      console.error('Failed to log trade completion:', error);
    }
  }

  /**
   * Log guild joining
   */
  static async logGuildJoined(userId: string, guildName: string) {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          type: 'guild_joined',
          message: `Joined guild: ${guildName}`,
          metadata: {
            guildName
          }
        }
      });
    } catch (error) {
      console.error('Failed to log guild join:', error);
    }
  }

  /**
   * Log achievement unlock
   */
  static async logAchievementUnlocked(userId: string, achievementName: string) {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          type: 'achievement_unlocked',
          message: `Achievement unlocked: ${achievementName}`,
          metadata: {
            achievementName
          }
        }
      });
    } catch (error) {
      console.error('Failed to log achievement unlock:', error);
    }
  }

  /**
   * Generic activity logger
   */
  static async logActivity(userId: string, type: ActivityType, message: string, metadata?: ActivityMetadata) {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          type,
          message,
          metadata: metadata || {}
        }
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  /**
   * Get recent activities for a user
   */
  static async getUserActivities(userId: string, limit: number = 10) {
    try {
      return await prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error('Failed to fetch user activities:', error);
      return [];
    }
  }

  /**
   * Get global recent activities (for public feed)
   */
  static async getGlobalActivities(limit: number = 20) {
    try {
      return await prisma.activityLog.findMany({
        include: {
          user: {
            include: {
              profile: {
                select: { display: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error('Failed to fetch global activities:', error);
      return [];
    }
  }

  /**
   * Clean up old activities (keep only last 100 per user)
   */
  static async cleanupOldActivities() {
    try {
      // This would typically be run as a background job
      // Delete activities older than 30 days or beyond the last 100 per user
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      await prisma.activityLog.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo
          }
        }
      });
    } catch (error) {
      console.error('Failed to cleanup old activities:', error);
    }
  }
}