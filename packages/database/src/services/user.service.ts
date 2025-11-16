import { BaseService } from './base.service';
import { User, Prisma } from '@prisma/client';

/**
 * User service for all user-related database operations
 */
export class UserService extends BaseService {
  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { email },
    });
  }

  /**
   * Create a new user
   */
  async create(data: {
    id: string;
    email?: string | null;
  }): Promise<User> {
    return this.db.user.create({
      data: {
        id: data.id,
        email: data.email ?? null,
      },
    });
  }

  /**
   * Update user
   */
  async update(userId: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.db.user.update({
      where: { id: userId },
      data,
    });
  }

  /**
   * Get user with profile
   */
  async getUserWithProfile(userId: string) {
    return this.db.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        wallets: true,
      },
    });
  }

  /**
   * Get user's caravan slots
   */
  async getCaravanSlots(userId: string): Promise<{
    unlocked: number;
    premium: number;
    total: number;
  } | null> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        caravanSlotsUnlocked: true,
        caravanSlotsPremium: true,
      },
    });

    if (!user) return null;

    return {
      unlocked: user.caravanSlotsUnlocked,
      premium: user.caravanSlotsPremium,
      total: user.caravanSlotsUnlocked + user.caravanSlotsPremium,
    };
  }

  /**
   * Check if user is admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    return user?.isAdmin ?? false;
  }

  /**
   * Get or create user (upsert)
   */
  async getOrCreate(userId: string, email?: string | null): Promise<User> {
    return this.db.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: email ?? null,
      },
      update: {},
    });
  }
}
