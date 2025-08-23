import { NextRequest } from 'next/server';
import { 
  authenticateUser, 
  createErrorResponse, 
  createSuccessResponse
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Get user's mail (inbox, sent, etc.)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'inbox'; // inbox, sent, archive
    const status = searchParams.get('status'); // UNREAD, READ, ARCHIVED, DELETED
    const before = searchParams.get('before'); // timestamp for pagination
    const limit = parseInt(searchParams.get('limit') || '25');

    if (limit > 100) {
      return createErrorResponse('MISSING_FIELDS', 'Maximum limit is 100 messages');
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }

    const { user } = authResult;

    // Build where clause based on folder
    const whereClause: any = {
      status: { not: 'DELETED' }
    };

    if (folder === 'inbox') {
      whereClause.recipientId = user.id;
    } else if (folder === 'sent') {
      whereClause.senderId = user.id;
    } else {
      return createErrorResponse('MISSING_FIELDS', 'Invalid folder parameter');
    }

    if (status) {
      whereClause.status = status;
    }

    if (before) {
      const beforeDate = new Date(parseInt(before));
      if (isNaN(beforeDate.getTime())) {
        return createErrorResponse('MISSING_FIELDS', 'Invalid before timestamp');
      }
      whereClause.createdAt = {
        lt: beforeDate
      };
    }

    // Fetch mail messages
    const mails = await prisma.mail.findMany({
      where: whereClause,
      include: {
        sender: {
          include: {
            profile: true,
            guildMembership: {
              include: {
                guild: true
              }
            }
          }
        },
        recipient: {
          include: {
            profile: true
          }
        },
        parentMail: {
          include: {
            sender: {
              include: {
                profile: true
              }
            }
          }
        },
        _count: {
          select: {
            replies: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    // Format mails for response
    const formattedMails = mails.map(mail => ({
      id: mail.id,
      subject: mail.subject,
      content: mail.content,
      status: mail.status,
      priority: mail.priority,
      isStarred: mail.isStarred,
      senderId: mail.senderId,
      senderName: mail.sender.profile?.display || 'Unknown',
      senderGuildTag: mail.sender.guildMembership?.guild.tag,
      recipientId: mail.recipientId,
      recipientName: mail.recipient.profile?.display || 'Unknown',
      attachments: mail.attachments,
      parentMailId: mail.parentMailId,
      parentSubject: mail.parentMail?.subject,
      replyCount: mail._count.replies,
      readAt: mail.readAt?.getTime(),
      createdAt: mail.createdAt.getTime(),
      expiresAt: mail.expiresAt?.getTime()
    }));

    // Get unread count for inbox
    let unreadCount = 0;
    if (folder === 'inbox') {
      unreadCount = await prisma.mail.count({
        where: {
          recipientId: user.id,
          status: 'UNREAD'
        }
      });
    }

    return createSuccessResponse({
      mails: formattedMails,
      folder,
      unreadCount,
      hasMore: mails.length === limit
    });

  } catch (error) {
    console.error('Error fetching mail:', error);
    return createErrorResponse('INTERNAL_ERROR');
  }
}

// POST - Send a new mail
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }

    const { user } = authResult;
    const body = await request.json();
    const { recipientId, subject, content, priority = 'NORMAL', attachments, parentMailId } = body;

    // Validate required fields
    if (!recipientId || !content) {
      return createErrorResponse('MISSING_FIELDS', 'recipientId and content are required');
    }

    if (content.length > 5000) {
      return createErrorResponse('VALIDATION_ERROR', 'Content too long (max 5000 characters)');
    }

    if (subject && subject.length > 200) {
      return createErrorResponse('VALIDATION_ERROR', 'Subject too long (max 200 characters)');
    }

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      include: { profile: true }
    });

    if (!recipient) {
      return createErrorResponse('NOT_FOUND', 'Recipient not found');
    }

    // Check if sender is blocked by recipient
    const isBlocked = await prisma.mailBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: recipientId,
          blockedId: user.id
        }
      }
    });

    if (isBlocked) {
      return createErrorResponse('FORBIDDEN', 'You are blocked by this user');
    }

    // Rate limiting check (5 mails per minute)
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentMails = await prisma.mail.count({
      where: {
        senderId: user.id,
        createdAt: {
          gte: oneMinuteAgo
        }
      }
    });

    if (recentMails >= 5) {
      return createErrorResponse('RATE_LIMITED', 'Too many mails sent recently. Please wait.');
    }

    // Create the mail
    const mail = await prisma.mail.create({
      data: {
        senderId: user.id,
        recipientId,
        subject: subject || 'No Subject',
        content,
        priority,
        attachments,
        parentMailId
      },
      include: {
        sender: {
          include: {
            profile: true
          }
        },
        recipient: {
          include: {
            profile: true
          }
        }
      }
    });

    return createSuccessResponse({
      mail: {
        id: mail.id,
        subject: mail.subject,
        content: mail.content,
        recipientName: mail.recipient.profile?.display || 'Unknown',
        createdAt: mail.createdAt.getTime()
      }
    });

  } catch (error) {
    console.error('Error sending mail:', error);
    return createErrorResponse('INTERNAL_ERROR');
  }
}