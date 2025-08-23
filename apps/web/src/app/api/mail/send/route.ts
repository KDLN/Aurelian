import { NextRequest } from 'next/server';
import { 
  authenticateUser, 
  createErrorResponse, 
  createSuccessResponse
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
    const { 
      recipientId, 
      recipientName, // Alternative to recipientId - look up by name
      subject, 
      content, 
      priority = 'NORMAL', 
      attachments, 
      parentMailId 
    } = body;

    // Validate required fields
    if (!content || content.trim().length === 0) {
      return createErrorResponse('MISSING_FIELDS', 'Content is required');
    }

    if (content.length > 5000) {
      return createErrorResponse('VALIDATION_ERROR', 'Content too long (max 5000 characters)');
    }

    if (subject && subject.length > 200) {
      return createErrorResponse('VALIDATION_ERROR', 'Subject too long (max 200 characters)');
    }

    // Find recipient by ID or name
    let recipient;
    if (recipientId) {
      recipient = await prisma.user.findUnique({
        where: { id: recipientId },
        include: { profile: true }
      });
    } else if (recipientName) {
      recipient = await prisma.user.findFirst({
        where: { 
          profile: { 
            display: {
              equals: recipientName,
              mode: 'insensitive'
            }
          }
        },
        include: { profile: true }
      });
    }

    if (!recipient) {
      return createErrorResponse('NOT_FOUND', 'Recipient not found');
    }

    // Can't send mail to yourself
    if (recipient.id === user.id) {
      return createErrorResponse('VALIDATION_ERROR', 'Cannot send mail to yourself');
    }

    // Check if sender is blocked by recipient
    const isBlocked = await prisma.mailBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: recipient.id,
          blockedId: user.id
        }
      }
    });

    if (isBlocked) {
      return createErrorResponse('FORBIDDEN', 'You are blocked by this user');
    }

    // Rate limiting check (10 mails per minute)
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentMails = await prisma.mail.count({
      where: {
        senderId: user.id,
        createdAt: {
          gte: oneMinuteAgo
        }
      }
    });

    if (recentMails >= 10) {
      return createErrorResponse('RATE_LIMITED', 'Too many mails sent recently. Please wait.');
    }

    // Validate parent mail if replying
    if (parentMailId) {
      const parentMail = await prisma.mail.findUnique({
        where: { id: parentMailId }
      });

      if (!parentMail) {
        return createErrorResponse('NOT_FOUND', 'Parent mail not found');
      }

      // Can only reply if you're involved in the conversation
      if (parentMail.senderId !== user.id && parentMail.recipientId !== user.id) {
        return createErrorResponse('FORBIDDEN', 'Cannot reply to this mail');
      }
    }

    // Create the mail
    const mail = await prisma.mail.create({
      data: {
        senderId: user.id,
        recipientId: recipient.id,
        subject: subject || (parentMailId ? 'Re: Reply' : 'No Subject'),
        content: content.trim(),
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