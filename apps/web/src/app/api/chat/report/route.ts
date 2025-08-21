import { NextRequest } from 'next/server';
import { 
  authenticateUser, 
  createErrorResponse, 
  createSuccessResponse
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST - Report a chat message for inappropriate content
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }
    const { user } = authResult;

    const { messageId, reason, description } = await request.json();

    if (!messageId || !reason) {
      return createErrorResponse('MISSING_FIELDS', 'messageId and reason are required');
    }

    // Validate reason
    const validReasons = [
      'spam',
      'harassment',
      'inappropriate_content',
      'hate_speech',
      'threats',
      'scam',
      'other'
    ];

    if (!validReasons.includes(reason)) {
      return createErrorResponse('MISSING_FIELDS', 'Invalid reason provided');
    }

    // Check if message exists
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    });

    if (!message) {
      return createErrorResponse('NOT_FOUND', 'Message not found');
    }

    // Don't allow users to report their own messages
    if (message.userId === user.id) {
      return createErrorResponse('CONFLICT', 'Cannot report your own message');
    }

    // Check if user has already reported this message
    const existingReport = await prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        // We'll need to create a ChatReport table in the future
        // For now, we'll log this in GuildLog if it's a guild message
      }
    });

    // For now, we'll create a simple log entry
    // In the future, we should create a proper ChatReport table
    if (message.channelType === 'GUILD' && message.guildChannelId) {
      // Get the guild channel to find the guild ID
      const guildChannel = await prisma.guildChannel.findUnique({
        where: { id: message.guildChannelId }
      });

      if (guildChannel) {
        await prisma.guildLog.create({
          data: {
            guildId: guildChannel.guildId,
            userId: user.id,
            action: 'message_reported',
            details: {
              reportedMessageId: messageId,
              reportedUserId: message.userId,
              reason,
              description: description || null,
              reportedUserName: message.user.profile?.display || 'Unknown'
            }
          }
        });
      }
    }

    // Log the report to console for now (in production, this would go to a proper logging system)
    console.log('Chat message reported:', {
      messageId,
      reportedBy: user.id,
      reportedUser: message.userId,
      reason,
      description,
      channelType: message.channelType,
      timestamp: new Date().toISOString()
    });

    return createSuccessResponse({
      message: 'Report submitted successfully. Our moderation team will review it shortly.',
      reportId: `temp_${Date.now()}` // Temporary ID until proper reporting system is implemented
    });

  } catch (error) {
    console.error('Error submitting chat report:', error);
    return createErrorResponse('INTERNAL_ERROR');
  }
}