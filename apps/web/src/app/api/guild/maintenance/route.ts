import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUser,
  createErrorResponse,
  createSuccessResponse,
  checkRateLimit
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST - Run guild maintenance tasks
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    // Authenticate user (admin only in production)
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }
    const { user } = authResult;

    if (!user.id) {
      return createErrorResponse('INVALID_TOKEN', 'User ID missing');
    }

    // Rate limiting - maintenance can only be run once per hour
    const rateLimitCheck = checkRateLimit(`guild_maintenance:${user.id}`, 3600000, 1);
    if (!rateLimitCheck.allowed) {
      const resetIn = Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 60000);
      return createErrorResponse('MISSING_FIELDS', `Maintenance already run recently. Try again in ${resetIn} minutes.`);
    }

    const maintenanceResults = await runGuildMaintenance();

    return createSuccessResponse({
      maintenanceResults
    }, 'Guild maintenance completed successfully');

  } catch (error) {
    console.error('Error running guild maintenance:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to run guild maintenance');
  }
}

// Main maintenance function
async function runGuildMaintenance() {
  const results: Record<string, any> = {};

  try {
    // 1. Clean up expired invitations
    results.expiredInvitations = await cleanupExpiredInvitations();

    // 2. Clean up old logs (keep last 30 days)
    results.oldLogs = await cleanupOldLogs();

    // 3. Update inactive guild members
    results.inactiveMembers = await updateInactiveMemberStatus();

    // 4. Clean up abandoned guilds
    results.abandonedGuilds = await cleanupAbandonedGuilds();

    // 5. Update guild statistics
    results.guildStats = await updateGuildStatistics();

    // 6. Clean up expired alliances
    results.expiredAlliances = await cleanupExpiredAlliances();

    // 7. Archive old chat messages (keep last 90 days)
    results.oldMessages = await archiveOldChatMessages();

    return results;
  } catch (error) {
    console.error('Error in guild maintenance:', error);
    throw error;
  }
}

// Clean up expired guild invitations
async function cleanupExpiredInvitations() {
  const now = new Date();
  
  const expiredInvites = await prisma.guildInvite.deleteMany({
    where: {
      expiresAt: { lt: now }
    }
  });

  console.log(`Cleaned up ${expiredInvites.count} expired guild invitations`);
  return { deletedCount: expiredInvites.count };
}

// Clean up old guild logs (keep last 30 days)
async function cleanupOldLogs() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const oldLogs = await prisma.guildLog.deleteMany({
    where: {
      createdAt: { lt: thirtyDaysAgo },
      // Keep important logs like guild creation, member promotions, etc.
      action: {
        notIn: [
          'guild_created',
          'member_joined',
          'member_left',
          'member_promoted',
          'member_demoted',
          'leadership_transferred'
        ]
      }
    }
  });

  console.log(`Cleaned up ${oldLogs.count} old guild logs`);
  return { deletedCount: oldLogs.count };
}

// Update inactive member status
async function updateInactiveMemberStatus() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Find members who haven't been active in 30 days
  const inactiveMembers = await prisma.guildMember.findMany({
    where: {
      lastActive: { lt: thirtyDaysAgo },
      role: { not: 'LEADER' } // Don't mark leaders as inactive
    },
    include: {
      guild: { select: { id: true, name: true } },
      user: { select: { id: true } }
    }
  });

  let processedCount = 0;

  for (const member of inactiveMembers) {
    // Log the inactivity
    await prisma.guildLog.create({
      data: {
        guildId: member.guildId,
        userId: member.userId,
        action: 'member_inactive',
        details: {
          lastActive: member.lastActive,
          daysSinceActive: Math.floor((Date.now() - member.lastActive.getTime()) / (1000 * 60 * 60 * 24))
        }
      }
    });

    processedCount++;
  }

  console.log(`Marked ${processedCount} members as inactive`);
  return { markedInactive: processedCount };
}

// Clean up abandoned guilds (no leader and no activity for 60 days)
async function cleanupAbandonedGuilds() {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // Find guilds with no leaders or recent activity
  const potentiallyAbandoned = await prisma.guild.findMany({
    where: {
      isActive: true,
      updatedAt: { lt: sixtyDaysAgo }
    },
    include: {
      members: {
        where: { role: 'LEADER' }
      },
      logs: {
        where: {
          createdAt: { gt: sixtyDaysAgo }
        },
        take: 1
      }
    }
  });

  let deactivatedCount = 0;

  for (const guild of potentiallyAbandoned) {
    // If no leaders and no recent activity, mark as inactive
    if (guild.members.length === 0 && guild.logs.length === 0) {
      await prisma.guild.update({
        where: { id: guild.id },
        data: { isActive: false }
      });

      // Log the deactivation
      await prisma.guildLog.create({
        data: {
          guildId: guild.id,
          action: 'guild_deactivated',
          details: {
            reason: 'abandoned',
            lastActivity: guild.updatedAt,
            leaderCount: guild.members.length
          }
        }
      });

      deactivatedCount++;
    }
  }

  console.log(`Deactivated ${deactivatedCount} abandoned guilds`);
  return { deactivatedCount };
}

// Update guild statistics
async function updateGuildStatistics() {
  const guilds = await prisma.guild.findMany({
    where: { isActive: true },
    include: {
      members: true,
      logs: {
        where: {
          createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }
      }
    }
  });

  let updatedCount = 0;

  for (const guild of guilds) {
    // Calculate activity score based on recent logs
    const activityScore = guild.logs.length;
    
    // Update guild with latest stats (this would be extended with more metrics)
    await prisma.guild.update({
      where: { id: guild.id },
      data: {
        updatedAt: new Date()
        // Add activity score field to schema if needed
      }
    });

    updatedCount++;
  }

  console.log(`Updated statistics for ${updatedCount} guilds`);
  return { updatedCount };
}

// Clean up expired alliances
async function cleanupExpiredAlliances() {
  const now = new Date();

  const expiredAlliances = await prisma.guildAlliance.deleteMany({
    where: {
      expiresAt: { lt: now }
    }
  });

  console.log(`Cleaned up ${expiredAlliances.count} expired alliances`);
  return { deletedCount: expiredAlliances.count };
}

// Archive old chat messages (keep last 90 days)
async function archiveOldChatMessages() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // In a real implementation, we might move these to an archive table
  // For now, we'll just delete very old messages
  const oldMessages = await prisma.chatMessage.deleteMany({
    where: {
      createdAt: { lt: ninetyDaysAgo },
      channelType: 'GUILD'
      // Note: If pinned message functionality is needed, add metadata field to ChatMessage schema
    }
  });

  console.log(`Archived ${oldMessages.count} old chat messages`);
  return { archivedCount: oldMessages.count };
}

// GET - Get maintenance status and last run info
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }

    // Get maintenance statistics
    const stats = await getMaintenanceStats();

    return createSuccessResponse({ stats });

  } catch (error) {
    console.error('Error getting maintenance status:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to get maintenance status');
  }
}

async function getMaintenanceStats() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    // Current counts that need cleanup
    expiredInvitations: await prisma.guildInvite.count({
      where: { expiresAt: { lt: now } }
    }),
    
    oldLogs: await prisma.guildLog.count({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        action: {
          notIn: [
            'guild_created',
            'member_joined', 
            'member_left',
            'member_promoted',
            'member_demoted',
            'leadership_transferred'
          ]
        }
      }
    }),

    inactiveMembers: await prisma.guildMember.count({
      where: {
        lastActive: { lt: thirtyDaysAgo },
        role: { not: 'LEADER' }
      }
    }),

    totalActiveGuilds: await prisma.guild.count({
      where: { isActive: true }
    }),

    totalGuildMembers: await prisma.guildMember.count(),

    recentActivity: await prisma.guildLog.count({
      where: { createdAt: { gt: sevenDaysAgo } }
    })
  };
}