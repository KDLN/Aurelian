import { NextRequest } from 'next/server';
import { 
  authenticateUser, 
  createErrorResponse, 
  createSuccessResponse
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Get online users count and recent activity for public channels
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') as 'GENERAL' | 'TRADE';

    if (!channel || !['GENERAL', 'TRADE'].includes(channel)) {
      return createErrorResponse('MISSING_FIELDS', 'Valid channel parameter is required (GENERAL or TRADE)');
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }

    // Get recent message senders in the last 15 minutes to estimate online users
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const recentSenders = await prisma.chatMessage.findMany({
      where: {
        channelType: channel,
        createdAt: {
          gte: fifteenMinutesAgo
        },
        deletedAt: null
      },
      distinct: ['userId'],
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
      take: 50 // Limit to prevent large responses
    });

    // Format recent users
    const recentUsers = recentSenders.map(msg => ({
      userId: msg.userId,
      displayName: msg.user.profile?.display || 'Unknown',
      guildTag: msg.user.guildMembership?.guild.tag,
      lastSeen: msg.createdAt.getTime()
    }));

    // Get total message count for the channel in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const messageCount = await prisma.chatMessage.count({
      where: {
        channelType: channel,
        createdAt: {
          gte: oneDayAgo
        },
        deletedAt: null
      }
    });

    return createSuccessResponse({
      channel,
      estimatedOnlineUsers: recentUsers.length,
      recentUsers,
      dailyMessageCount: messageCount,
      lastUpdated: Date.now()
    });

  } catch (error) {
    console.error('Error fetching online users:', error);
    return createErrorResponse('INTERNAL_ERROR');
  }
}