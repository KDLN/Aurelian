import { BaseService } from './base.service';
import { MissionDef, MissionInstance } from '@prisma/client';

/**
 * Mission service for mission-related operations
 */
export class MissionService extends BaseService {
  /**
   * Get all active mission definitions
   */
  async getActiveMissionDefs(): Promise<MissionDef[]> {
    return this.db.missionDef.findMany({
      where: { isActive: true },
      orderBy: { riskLevel: 'asc' },
    });
  }

  /**
   * Get mission definition by ID
   */
  async getMissionDefById(missionId: string): Promise<MissionDef | null> {
    return this.db.missionDef.findUnique({
      where: { id: missionId },
    });
  }

  /**
   * Get user's active missions
   */
  async getUserActiveMissions(userId: string) {
    return this.db.missionInstance.findMany({
      where: {
        userId,
        status: 'active',
      },
      include: {
        mission: true,
        agent: {
          select: {
            id: true,
            name: true,
            level: true,
            specialty: true,
            successBonus: true,
            speedBonus: true,
            rewardBonus: true,
          },
        },
      },
      orderBy: {
        caravanSlot: 'asc',
      },
    });
  }

  /**
   * Get missions by caravan slot
   */
  async getOccupiedCaravanSlots(userId: string): Promise<number[]> {
    const missions = await this.db.missionInstance.findMany({
      where: {
        userId,
        status: 'active',
      },
      select: {
        caravanSlot: true,
      },
    });
    return missions.map((m) => m.caravanSlot);
  }

  /**
   * Find first available caravan slot
   */
  async findAvailableCaravanSlot(userId: string, totalSlots: number): Promise<number | null> {
    const occupiedSlots = await this.getOccupiedCaravanSlots(userId);

    for (let slot = 1; slot <= totalSlots; slot++) {
      if (!occupiedSlots.includes(slot)) {
        return slot;
      }
    }
    return null;
  }

  /**
   * Start a new mission
   */
  async startMission(params: {
    userId: string;
    missionId: string;
    agentId: string;
    caravanSlot: number;
    endTime: Date;
  }): Promise<MissionInstance> {
    return this.db.missionInstance.create({
      data: {
        userId: params.userId,
        missionId: params.missionId,
        agentId: params.agentId,
        status: 'active',
        endTime: params.endTime,
        caravanSlot: params.caravanSlot,
      },
      include: {
        mission: true,
        agent: {
          select: {
            id: true,
            name: true,
            specialty: true,
            level: true,
            successBonus: true,
            speedBonus: true,
            rewardBonus: true,
          },
        },
      },
    });
  }

  /**
   * Complete a mission and award rewards
   */
  async completeMission(
    missionInstanceId: string,
    rewards: {
      gold: number;
      items?: Array<{ itemKey: string; qty: number }>;
    }
  ) {
    return this.transaction(async (tx) => {
      // Update mission status
      const missionInstance = await tx.missionInstance.update({
        where: { id: missionInstanceId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          actualReward: rewards.gold,
          itemsReceived: rewards.items || [],
        },
        include: {
          mission: true,
          agent: true,
        },
      });

      // Award gold
      await tx.wallet.update({
        where: { userId: missionInstance.userId },
        data: {
          gold: { increment: rewards.gold },
        },
      });

      // Award items if any (batch fetch to avoid N+1 query)
      if (rewards.items && rewards.items.length > 0) {
        // Batch fetch all item definitions
        const itemKeys = rewards.items.map((i) => i.itemKey);
        const itemDefs = await tx.itemDef.findMany({
          where: { key: { in: itemKeys } },
        });
        const itemDefMap = new Map(itemDefs.map((i) => [i.key, i]));

        // Upsert inventory for each item
        for (const item of rewards.items) {
          const itemDef = itemDefMap.get(item.itemKey);

          if (itemDef) {
            await tx.inventory.upsert({
              where: {
                userId_itemId_location: {
                  userId: missionInstance.userId,
                  itemId: itemDef.id,
                  location: 'warehouse',
                },
              },
              create: {
                userId: missionInstance.userId,
                itemId: itemDef.id,
                qty: item.qty,
                location: 'warehouse',
              },
              update: {
                qty: { increment: item.qty },
              },
            });
          }
        }
      }

      // Log transaction
      await tx.ledgerTx.create({
        data: {
          userId: missionInstance.userId,
          amount: rewards.gold,
          reason: `Mission completed: ${missionInstance.mission.name}`,
          meta: {
            type: 'mission_reward',
            missionId: missionInstance.missionId,
            instanceId: missionInstanceId,
          },
        },
      });

      // Update agent experience
      if (missionInstance.agentId) {
        await tx.agent.update({
          where: { id: missionInstance.agentId },
          data: {
            experience: { increment: 10 },
          },
        });
      }

      return missionInstance;
    });
  }

  /**
   * Cancel a mission
   */
  async cancelMission(missionInstanceId: string): Promise<MissionInstance> {
    return this.db.missionInstance.update({
      where: { id: missionInstanceId },
      data: {
        status: 'cancelled',
      },
    });
  }

  /**
   * Get completed missions count for user
   */
  async getCompletedMissionsCount(userId: string): Promise<number> {
    return this.db.missionInstance.count({
      where: {
        userId,
        status: 'completed',
      },
    });
  }
}
