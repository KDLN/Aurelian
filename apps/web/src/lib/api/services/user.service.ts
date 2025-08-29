import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiSuccess, apiError, validateRequestBody, getQueryParam } from '@/lib/api/server-utils';
import { handleApiError } from '@/lib/api/error-handler';
import { z } from 'zod';
import type { AuthUser } from '@/types/api';

/**
 * Consolidated User Service
 * Combines user profile, inventory, wallet, and activity operations
 */

// Validation schemas
const UpdateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.object({
    body: z.number(),
    outfit: z.number(),
    hair: z.number(),
    eyes: z.number()
  }).optional()
});

const UpdateAvatarSchema = z.object({
  body: z.number().min(0),
  outfit: z.number().min(0),
  hair: z.number().min(0),
  eyes: z.number().min(0)
});

const CreateWalletSchema = z.object({
  initialAmount: z.number().min(0).max(10000).optional()
});

/**
 * User Service Class - Consolidates all user operations
 */
export class UserService {
  
  /**
   * Get user profile with comprehensive data
   */
  static async getProfile(request: NextRequest, user: AuthUser): Promise<NextResponse> {
    try {
      const userProfile = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          profile: true,
          wallet: true,
          _count: {
            select: {
              agents: true,
              inventory: true,
              missions: true
            }
          }
        }
      });

      if (!userProfile) {
        return apiError('User not found', 404);
      }

      return apiSuccess({
        id: userProfile.id,
        email: userProfile.email,
        isAdmin: userProfile.isAdmin,
        profile: userProfile.profile,
        wallet: userProfile.wallet,
        stats: {
          agentCount: userProfile._count.agents,
          itemCount: userProfile._count.inventory,
          missionCount: userProfile._count.missions
        },
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt
      });

    } catch (error) {
      return handleApiError(error, 'Failed to fetch user profile');
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(request: NextRequest, user: AuthUser): Promise<NextResponse> {
    try {
      const validation = await validateRequestBody(request, UpdateProfileSchema);
      if ('error' in validation) {
        return validation.error;
      }

      const { name, bio, avatar } = validation.data;

      // Update or create profile
      const updatedProfile = await prisma.profile.upsert({
        where: { userId: user.id },
        update: {
          ...(name && { name }),
          ...(bio && { bio }),
          ...(avatar && { avatar })
        },
        create: {
          userId: user.id,
          name: name || 'Unnamed Trader',
          bio: bio || '',
          avatar: avatar || {
            body: 0,
            outfit: 0,
            hair: 0,
            eyes: 0
          }
        }
      });

      return apiSuccess(updatedProfile);

    } catch (error) {
      return handleApiError(error, 'Failed to update profile');
    }
  }

  /**
   * Update user avatar
   */
  static async updateAvatar(request: NextRequest, user: AuthUser): Promise<NextResponse> {
    try {
      const validation = await validateRequestBody(request, UpdateAvatarSchema);
      if ('error' in validation) {
        return validation.error;
      }

      const avatarData = validation.data;

      // Update avatar in profile
      const updatedProfile = await prisma.profile.upsert({
        where: { userId: user.id },
        update: {
          avatar: avatarData
        },
        create: {
          userId: user.id,
          name: 'Unnamed Trader',
          avatar: avatarData
        }
      });

      return apiSuccess({
        message: 'Avatar updated successfully',
        avatar: updatedProfile.avatar
      });

    } catch (error) {
      return handleApiError(error, 'Failed to update avatar');
    }
  }

  /**
   * Get user inventory with filtering and pagination
   */
  static async getInventory(request: NextRequest, user: AuthUser): Promise<NextResponse> {
    try {
      const location = getQueryParam(request, 'location', 'warehouse');
      const page = parseInt(getQueryParam(request, 'page', '1') || '1');
      const limit = parseInt(getQueryParam(request, 'limit', '50') || '50');
      
      const skip = (page - 1) * limit;

      // Get inventory items
      const [items, total] = await Promise.all([
        prisma.inventory.findMany({
          where: {
            userId: user.id,
            location: location as any
          },
          include: {
            itemDef: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.inventory.count({
          where: {
            userId: user.id,
            location: location as any
          }
        })
      ]);

      return apiSuccess({
        items: items.map(item => ({
          id: item.id,
          itemDefId: item.itemDefId,
          quantity: item.quantity,
          location: item.location,
          acquiredAt: item.createdAt,
          itemDef: item.itemDef
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        location
      });

    } catch (error) {
      return handleApiError(error, 'Failed to fetch inventory');
    }
  }

  /**
   * Get or create user wallet
   */
  static async getWallet(request: NextRequest, user: AuthUser): Promise<NextResponse> {
    try {
      let wallet = await prisma.wallet.findUnique({
        where: { userId: user.id }
      });

      if (!wallet) {
        // Create default wallet with 2000 starting gold
        wallet = await prisma.wallet.create({
          data: {
            userId: user.id,
            gold: 2000
          }
        });
      }

      return apiSuccess(wallet);

    } catch (error) {
      return handleApiError(error, 'Failed to fetch wallet');
    }
  }

  /**
   * Create wallet with optional initial amount
   */
  static async createWallet(request: NextRequest, user: AuthUser): Promise<NextResponse> {
    try {
      // Check if wallet already exists
      const existingWallet = await prisma.wallet.findUnique({
        where: { userId: user.id }
      });

      if (existingWallet) {
        return apiSuccess({
          message: 'Wallet already exists',
          wallet: existingWallet
        });
      }

      const validation = await validateRequestBody(request, CreateWalletSchema);
      if ('error' in validation) {
        return validation.error;
      }

      const { initialAmount = 2000 } = validation.data;

      const wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          gold: initialAmount
        }
      });

      return apiSuccess({
        message: 'Wallet created successfully',
        wallet
      });

    } catch (error) {
      return handleApiError(error, 'Failed to create wallet');
    }
  }

  /**
   * Get user activity/statistics
   */
  static async getStats(request: NextRequest, user: AuthUser): Promise<NextResponse> {
    try {
      // Get comprehensive user statistics
      const [
        agentCount,
        itemCount,
        missionCount,
        completedMissions,
        totalGoldEarned,
        recentActivity
      ] = await Promise.all([
        prisma.agent.count({ where: { userId: user.id } }),
        prisma.inventory.count({ where: { userId: user.id } }),
        prisma.mission.count({ where: { userId: user.id } }),
        prisma.mission.count({ 
          where: { 
            userId: user.id,
            status: 'COMPLETED'
          } 
        }),
        // Calculate total gold from completed missions
        prisma.mission.aggregate({
          where: { 
            userId: user.id,
            status: 'COMPLETED'
          },
          _sum: { goldReward: true }
        }),
        // Get recent activities (last 10)
        prisma.mission.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            missionDef: {
              select: { name: true, description: true }
            }
          }
        })
      ]);

      const stats = {
        agents: agentCount,
        items: itemCount,
        missions: {
          total: missionCount,
          completed: completedMissions,
          successRate: missionCount > 0 ? (completedMissions / missionCount * 100).toFixed(1) : '0.0'
        },
        goldEarned: totalGoldEarned._sum.goldReward || 0,
        recentActivity: recentActivity.map(mission => ({
          id: mission.id,
          action: 'Mission',
          description: `${mission.missionDef.name} - ${mission.status}`,
          timestamp: mission.createdAt,
          status: mission.status
        }))
      };

      return apiSuccess(stats);

    } catch (error) {
      return handleApiError(error, 'Failed to fetch user stats');
    }
  }

  /**
   * Populate starter inventory for new users
   */
  static async populateStarterInventory(request: NextRequest, user: AuthUser): Promise<NextResponse> {
    try {
      // Check if user already has items
      const existingItems = await prisma.inventory.count({
        where: { userId: user.id }
      });

      if (existingItems > 0) {
        return apiSuccess({
          message: 'User already has inventory items',
          itemCount: existingItems
        });
      }

      // Get starter items
      const starterItems = await prisma.itemDef.findMany({
        where: {
          name: {
            in: ['Iron Ore', 'Herb', 'Hide']
          }
        }
      });

      if (starterItems.length === 0) {
        return apiError('Starter items not found in database', 404);
      }

      // Create starter inventory
      const inventoryItems = await Promise.all(
        starterItems.map(item => 
          prisma.inventory.create({
            data: {
              userId: user.id,
              itemDefId: item.id,
              quantity: 10,
              location: 'warehouse'
            }
          })
        )
      );

      return apiSuccess({
        message: 'Starter inventory created successfully',
        items: inventoryItems
      });

    } catch (error) {
      return handleApiError(error, 'Failed to populate starter inventory');
    }
  }

  /**
   * Search users for social features
   */
  static async searchUsers(request: NextRequest, user: AuthUser): Promise<NextResponse> {
    try {
      const query = getQueryParam(request, 'q', '');
      const limit = parseInt(getQueryParam(request, 'limit', '20') || '20');

      if (!query || query.length < 2) {
        return apiError('Search query must be at least 2 characters', 400);
      }

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { profile: { name: { contains: query, mode: 'insensitive' } } }
          ],
          // Don't include current user in search results
          id: { not: user.id }
        },
        include: {
          profile: true
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
      });

      return apiSuccess({
        users: users.map(u => ({
          id: u.id,
          email: u.email,
          profile: u.profile,
          createdAt: u.createdAt
        })),
        query,
        count: users.length
      });

    } catch (error) {
      return handleApiError(error, 'Failed to search users');
    }
  }
}

// Export wrapped methods for use in API routes
export const userGetProfile = withAuth(UserService.getProfile);
export const userUpdateProfile = withAuth(UserService.updateProfile);
export const userUpdateAvatar = withAuth(UserService.updateAvatar);
export const userGetInventory = withAuth(UserService.getInventory);
export const userGetWallet = withAuth(UserService.getWallet);
export const userCreateWallet = withAuth(UserService.createWallet);
export const userGetStats = withAuth(UserService.getStats);
export const userPopulateStarterInventory = withAuth(UserService.populateStarterInventory);
export const userSearchUsers = withAuth(UserService.searchUsers);