import { NextRequest } from 'next/server';
import { 
  authenticateUser, 
  createErrorResponse, 
  createSuccessResponse
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Get public chat messages (General or Trade)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') as 'GENERAL' | 'TRADE';
    const before = searchParams.get('before'); // timestamp for pagination
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!channel || !['GENERAL', 'TRADE'].includes(channel)) {
      return createErrorResponse('MISSING_FIELDS', 'Valid channel parameter is required (GENERAL or TRADE)');
    }

    if (limit > 100) {
      return createErrorResponse('MISSING_FIELDS', 'Maximum limit is 100 messages');
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    // Authenticate user (public channels are accessible to all authenticated users)
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }

    // Build where clause
    const whereClause: any = {
      channelType: channel,
      deletedAt: null
    };

    if (before) {
      const beforeDate = new Date(parseInt(before));
      if (isNaN(beforeDate.getTime())) {
        return createErrorResponse('MISSING_FIELDS', 'Invalid before timestamp');
      }
      whereClause.createdAt = {
        lt: beforeDate
      };
    }

    // Fetch messages
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
        },
        reactions: {
          include: {
            user: {
              include: {
                profile: true
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

    // Format messages for response
    const formattedMessages = messages.reverse().map(msg => ({
      id: msg.id,
      content: msg.content,
      userId: msg.userId,
      displayName: msg.user.profile?.display || 'Unknown',
      guildTag: msg.user.guildMembership?.guild.tag,
      timestamp: msg.createdAt.getTime(),
      editedAt: msg.editedAt?.getTime(),
      channelType: msg.channelType,
      metadata: msg.metadata,
      reactions: msg.reactions.map(reaction => ({
        id: reaction.id,
        emoji: reaction.emoji,
        userId: reaction.userId,
        displayName: reaction.user.profile?.display || 'Unknown'
      }))
    }));

    return createSuccessResponse({
      messages: formattedMessages,
      channel,
      hasMore: messages.length === limit
    });

  } catch (error) {
    console.error('Error fetching public chat messages:', error);
    return createErrorResponse('INTERNAL_ERROR');
  }
}