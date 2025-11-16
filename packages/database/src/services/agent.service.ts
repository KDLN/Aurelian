import { BaseService } from './base.service';
import { Agent, AgentType } from '@prisma/client';
import {
  ResourceNotFoundError,
  OperationNotAllowedError,
} from '../errors';

/**
 * Agent service for agent management
 */
export class AgentService extends BaseService {
  /**
   * Get user's agents
   */
  async getUserAgents(userId: string) {
    return this.db.agent.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        hiredAt: 'asc',
      },
    });
  }

  /**
   * Get agent by ID
   */
  async getAgentById(agentId: string, userId?: string): Promise<Agent | null> {
    const where: any = { id: agentId };
    if (userId) {
      where.userId = userId;
    }

    return this.db.agent.findFirst({
      where,
    });
  }

  /**
   * Hire a new agent
   */
  async hireAgent(params: {
    userId: string;
    name: string;
    specialty: AgentType;
  }): Promise<Agent> {
    return this.db.agent.create({
      data: {
        userId: params.userId,
        name: params.name,
        specialty: params.specialty,
        level: 1,
        experience: 0,
        isActive: true,
      },
    });
  }

  /**
   * Check if agent is on mission
   */
  async isAgentOnMission(agentId: string): Promise<boolean> {
    const activeMission = await this.db.missionInstance.findFirst({
      where: {
        agentId,
        status: 'active',
      },
    });
    return !!activeMission;
  }

  /**
   * Get available agents (not on mission) - optimized single query
   */
  async getAvailableAgents(userId: string) {
    return this.db.agent.findMany({
      where: {
        userId,
        isActive: true,
        // Use Prisma's relation filter to exclude agents with active missions
        missionInstances: {
          none: {
            status: 'active',
          },
        },
      },
      orderBy: {
        hiredAt: 'asc',
      },
    });
  }

  /**
   * Update agent equipment
   */
  async updateEquipment(
    agentId: string,
    equipment: {
      weapon?: string | null;
      armor?: string | null;
      tool?: string | null;
      accessory?: string | null;
    }
  ): Promise<Agent> {
    return this.db.agent.update({
      where: { id: agentId },
      data: equipment,
    });
  }

  /**
   * Add experience to agent
   */
  async addExperience(agentId: string, xp: number): Promise<Agent> {
    const agent = await this.db.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new ResourceNotFoundError('Agent', agentId);
    }

    const newXP = agent.experience + xp;
    const newLevel = Math.floor(1 + newXP / 100); // Simple leveling formula

    return this.db.agent.update({
      where: { id: agentId },
      data: {
        experience: newXP,
        level: newLevel,
      },
    });
  }

  /**
   * Dismiss an agent
   */
  async dismissAgent(agentId: string, userId: string): Promise<Agent> {
    // Verify agent exists and belongs to user
    const agent = await this.db.agent.findFirst({
      where: {
        id: agentId,
        userId,
      },
    });

    if (!agent) {
      throw new ResourceNotFoundError('Agent', agentId);
    }

    // Check if agent is on a mission
    const onMission = await this.isAgentOnMission(agentId);
    if (onMission) {
      throw new OperationNotAllowedError('Cannot dismiss agent while on mission');
    }

    return this.db.agent.update({
      where: {
        id: agentId,
      },
      data: {
        isActive: false,
      },
    });
  }
}
