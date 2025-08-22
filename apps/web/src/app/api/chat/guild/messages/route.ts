import { NextRequest } from 'next/server';
import { 
  authenticateUser, 
  createErrorResponse, 
  createSuccessResponse,
  getUserGuildMembership
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Get guild chat messages for a specific channel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const before = searchParams.get('before'); // timestamp for pagination
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!channelId) {
      return createErrorResponse('MISSING_FIELDS', 'channelId parameter is required');
    }

    if (limit > 100) {
      return createErrorResponse('MISSING_FIELDS', 'Maximum limit is 100 messages');
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }
    const { user } = authResult;

    if (!user.id) {
      return createErrorResponse('INVALID_TOKEN', 'User ID missing');
    }

    // Get user's guild membership
    const membershipResult = await getUserGuildMembership(user.id);
    if ('error' in membershipResult) {
      return createErrorResponse(membershipResult.error as string);
    }
    const { membership } = membershipResult;

    // Verify the guild channel exists and user has access
    const guildChannel = await prisma.guildChannel.findFirst({
      where: {
        id: channelId,
        guildId: membership.guildId,
        isActive: true
      }
    });

    if (!guildChannel) {
      return createErrorResponse('NOT_FOUND', 'Guild channel not found');
    }

    // Check role permissions
    if (guildChannel.roleRequired) {
      const roleHierarchy: Record<string, number> = { LEADER: 4, OFFICER: 3, TRADER: 2, MEMBER: 1 };
      const userLevel = roleHierarchy[membership.role] || 0;
      const requiredLevel = roleHierarchy[guildChannel.roleRequired] || 0;
      
      if (userLevel < requiredLevel) {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 
          `This channel requires ${guildChannel.roleRequired} role or higher`);
      }
    }

    // Build where clause
    const whereClause: any = {
      channelType: 'GUILD',
      guildChannelId: channelId,
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
      guildRole: msg.user.guildMembership?.role,
      timestamp: msg.createdAt.getTime(),
      editedAt: msg.editedAt?.getTime(),
      channelType: msg.channelType,
      guildChannelId: msg.guildChannelId,
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
      channel: {
        id: guildChannel.id,
        name: guildChannel.name,
        description: guildChannel.description,
        roleRequired: guildChannel.roleRequired
      },
      hasMore: messages.length === limit
    });

  } catch (error) {
    console.error('Error fetching guild chat messages:', error);
    return createErrorResponse('INTERNAL_ERROR');
  }
}