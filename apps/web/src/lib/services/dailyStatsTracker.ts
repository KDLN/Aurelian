import { prisma } from '@/lib/prisma';

/**
 * Daily Statistics Tracking Service
 * Tracks user activity metrics on a daily basis
 */
export class DailyStatsTracker {

  /**
   * Get today's date string in YYYY-MM-DD format
   */
  private static getTodayDate(): Date {
    const today = new Date();
    // Reset to start of day
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }

  /**
   * Get or create today's daily stats record
   */
  private static async getOrCreateTodaysStats(userId: string) {
    const today = this.getTodayDate();
    
    return await prisma.dailyStats.upsert({
      where: {
        userId_date: {
          userId,
          date: today
        }
      },
      update: {
        updatedAt: new Date()
      },
      create: {
        userId,
        date: today
      }
    });
  }

  /**
   * Track gold earned
   */
  static async trackGoldEarned(userId: string, amount: number) {
    try {
      const today = this.getTodayDate();
      
      await prisma.dailyStats.upsert({
        where: {
          userId_date: { userId, date: today }
        },
        update: {
          goldEarned: { increment: amount },
          updatedAt: new Date()
        },
        create: {
          userId,
          date: today,
          goldEarned: amount
        }
      });
    } catch (error) {
      console.error('Failed to track gold earned:', error);
    }
  }

  /**
   * Track gold spent
   */
  static async trackGoldSpent(userId: string, amount: number) {
    try {
      const today = this.getTodayDate();
      
      await prisma.dailyStats.upsert({
        where: {
          userId_date: { userId, date: today }
        },
        update: {
          goldSpent: { increment: amount },
          updatedAt: new Date()
        },
        create: {
          userId,
          date: today,
          goldSpent: amount
        }
      });
    } catch (error) {
      console.error('Failed to track gold spent:', error);
    }
  }

  /**
   * Track mission completion
   */
  static async trackMissionCompleted(userId: string, succeeded: boolean = true) {
    try {
      const today = this.getTodayDate();
      
      const updateData = succeeded 
        ? { missionsCompleted: { increment: 1 } }
        : { missionsFailed: { increment: 1 } };
      
      await prisma.dailyStats.upsert({
        where: {
          userId_date: { userId, date: today }
        },
        update: {
          ...updateData,
          updatedAt: new Date()
        },
        create: {
          userId,
          date: today,
          ...(succeeded ? { missionsCompleted: 1 } : { missionsFailed: 1 })
        }
      });
    } catch (error) {
      console.error('Failed to track mission completion:', error);
    }
  }

  /**
   * Track items traded (bought or sold)
   */
  static async trackItemsTraded(userId: string, quantity: number) {
    try {
      const today = this.getTodayDate();
      
      await prisma.dailyStats.upsert({
        where: {
          userId_date: { userId, date: today }
        },
        update: {
          itemsTraded: { increment: quantity },
          updatedAt: new Date()
        },
        create: {
          userId,
          date: today,
          itemsTraded: quantity
        }
      });
    } catch (error) {
      console.error('Failed to track items traded:', error);
    }
  }

  /**
   * Track items crafted
   */
  static async trackItemsCrafted(userId: string, quantity: number) {
    try {
      const today = this.getTodayDate();
      
      await prisma.dailyStats.upsert({
        where: {
          userId_date: { userId, date: today }
        },
        update: {
          itemsCrafted: { increment: quantity },
          updatedAt: new Date()
        },
        create: {
          userId,
          date: today,
          itemsCrafted: quantity
        }
      });
    } catch (error) {
      console.error('Failed to track items crafted:', error);
    }
  }

  /**
   * Track agent hired
   */
  static async trackAgentHired(userId: string) {
    try {
      const today = this.getTodayDate();
      
      await prisma.dailyStats.upsert({
        where: {
          userId_date: { userId, date: today }
        },
        update: {
          agentsHired: { increment: 1 },
          updatedAt: new Date()
        },
        create: {
          userId,
          date: today,
          agentsHired: 1
        }
      });
    } catch (error) {
      console.error('Failed to track agent hired:', error);
    }
  }

  /**
   * Track user login
   */
  static async trackLogin(userId: string) {
    try {
      const today = this.getTodayDate();
      
      await prisma.dailyStats.upsert({
        where: {
          userId_date: { userId, date: today }
        },
        update: {
          loginCount: { increment: 1 },
          updatedAt: new Date()
        },
        create: {
          userId,
          date: today,
          loginCount: 1
        }
      });
    } catch (error) {
      console.error('Failed to track login:', error);
    }
  }

  /**
   * Track active time in minutes
   */
  static async trackActiveTime(userId: string, minutes: number) {
    try {
      const today = this.getTodayDate();
      
      await prisma.dailyStats.upsert({
        where: {
          userId_date: { userId, date: today }
        },
        update: {
          activeTimeMinutes: { increment: minutes },
          updatedAt: new Date()
        },
        create: {
          userId,
          date: today,
          activeTimeMinutes: minutes
        }
      });
    } catch (error) {
      console.error('Failed to track active time:', error);
    }
  }

  /**
   * Get today's stats for a user
   */
  static async getTodaysStats(userId: string) {
    try {
      const today = this.getTodayDate();
      
      return await prisma.dailyStats.findUnique({
        where: {
          userId_date: { userId, date: today }
        }
      });
    } catch (error) {
      console.error('Failed to get today\'s stats:', error);
      return null;
    }
  }

  /**
   * Get weekly stats for a user (last 7 days)
   */
  static async getWeeklyStats(userId: string) {
    try {
      const today = this.getTodayDate();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      return await prisma.dailyStats.findMany({
        where: {
          userId,
          date: {
            gte: weekAgo,
            lte: today
          }
        },
        orderBy: { date: 'desc' }
      });
    } catch (error) {
      console.error('Failed to get weekly stats:', error);
      return [];
    }
  }

  /**
   * Get user performance summary
   */
  static async getPerformanceSummary(userId: string) {
    try {
      const weeklyStats = await this.getWeeklyStats(userId);
      
      if (weeklyStats.length === 0) {
        return null;
      }

      // Calculate totals
      const totals = weeklyStats.reduce((acc, day) => ({
        goldEarned: acc.goldEarned + day.goldEarned,
        goldSpent: acc.goldSpent + day.goldSpent,
        missionsCompleted: acc.missionsCompleted + day.missionsCompleted,
        missionsFailed: acc.missionsFailed + day.missionsFailed,
        itemsTraded: acc.itemsTraded + day.itemsTraded,
        itemsCrafted: acc.itemsCrafted + day.itemsCrafted,
        agentsHired: acc.agentsHired + day.agentsHired,
        activeTimeMinutes: acc.activeTimeMinutes + day.activeTimeMinutes,
      }), {
        goldEarned: 0,
        goldSpent: 0,
        missionsCompleted: 0,
        missionsFailed: 0,
        itemsTraded: 0,
        itemsCrafted: 0,
        agentsHired: 0,
        activeTimeMinutes: 0,
      });

      // Calculate performance metrics
      const totalMissions = totals.missionsCompleted + totals.missionsFailed;
      const successRate = totalMissions > 0 ? (totals.missionsCompleted / totalMissions) * 100 : 0;
      const netGold = totals.goldEarned - totals.goldSpent;
      const goldPerHour = totals.activeTimeMinutes > 0 ? (totals.goldEarned / (totals.activeTimeMinutes / 60)) : 0;

      return {
        todaysStats: weeklyStats[0], // Most recent (today)
        weeklyTotals: totals,
        performance: {
          missionSuccessRate: Math.round(successRate * 10) / 10,
          netGoldWeek: netGold,
          goldPerHour: Math.round(goldPerHour * 10) / 10,
          averageActiveTimePerDay: Math.round((totals.activeTimeMinutes / weeklyStats.length) * 10) / 10,
          tradingVolume: totals.itemsTraded,
          craftingProductivity: totals.itemsCrafted
        }
      };
    } catch (error) {
      console.error('Failed to get performance summary:', error);
      return null;
    }
  }
}