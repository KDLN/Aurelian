import { NextRequest } from 'next/server';
import { 
  authenticateUser, 
  createErrorResponse, 
  createSuccessResponse
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Get specific mail by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { mailId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }

    const { user } = authResult;
    const { mailId } = params;

    const mail = await prisma.mail.findUnique({
      where: { id: mailId },
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
        replies: {
          include: {
            sender: {
              include: {
                profile: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!mail) {
      return createErrorResponse('NOT_FOUND', 'Mail not found');
    }

    // Check if user has permission to view this mail
    if (mail.senderId !== user.id && mail.recipientId !== user.id) {
      return createErrorResponse('FORBIDDEN', 'You do not have permission to view this mail');
    }

    // Mark as read if user is the recipient and mail is unread
    if (mail.recipientId === user.id && mail.status === 'UNREAD') {
      await prisma.mail.update({
        where: { id: mailId },
        data: { 
          status: 'READ',
          readAt: new Date()
        }
      });
    }

    const formattedMail = {
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
      parentSender: mail.parentMail?.sender.profile?.display,
      replies: mail.replies.map(reply => ({
        id: reply.id,
        content: reply.content,
        senderName: reply.sender.profile?.display || 'Unknown',
        createdAt: reply.createdAt.getTime()
      })),
      readAt: mail.readAt?.getTime(),
      createdAt: mail.createdAt.getTime(),
      expiresAt: mail.expiresAt?.getTime()
    };

    return createSuccessResponse({ mail: formattedMail });

  } catch (error) {
    console.error('Error fetching mail:', error);
    return createErrorResponse('INTERNAL_ERROR');
  }
}

// PATCH - Update mail (mark as read, star, archive, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { mailId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }

    const { user } = authResult;
    const { mailId } = params;
    const body = await request.json();
    const { status, isStarred } = body;

    const mail = await prisma.mail.findUnique({
      where: { id: mailId }
    });

    if (!mail) {
      return createErrorResponse('NOT_FOUND', 'Mail not found');
    }

    // Check if user has permission to modify this mail
    if (mail.senderId !== user.id && mail.recipientId !== user.id) {
      return createErrorResponse('FORBIDDEN', 'You do not have permission to modify this mail');
    }

    // Only recipients can mark as read/unread, both can star
    const updateData: any = {};
    
    if (status !== undefined && mail.recipientId === user.id) {
      updateData.status = status;
      if (status === 'READ' && !mail.readAt) {
        updateData.readAt = new Date();
      }
    }
    
    if (isStarred !== undefined) {
      updateData.isStarred = isStarred;
    }

    const updatedMail = await prisma.mail.update({
      where: { id: mailId },
      data: updateData
    });

    return createSuccessResponse({
      mail: {
        id: updatedMail.id,
        status: updatedMail.status,
        isStarred: updatedMail.isStarred,
        readAt: updatedMail.readAt?.getTime()
      }
    });

  } catch (error) {
    console.error('Error updating mail:', error);
    return createErrorResponse('INTERNAL_ERROR');
  }
}

// DELETE - Delete mail (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { mailId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }

    const { user } = authResult;
    const { mailId } = params;

    const mail = await prisma.mail.findUnique({
      where: { id: mailId }
    });

    if (!mail) {
      return createErrorResponse('NOT_FOUND', 'Mail not found');
    }

    // Check if user has permission to delete this mail
    if (mail.senderId !== user.id && mail.recipientId !== user.id) {
      return createErrorResponse('FORBIDDEN', 'You do not have permission to delete this mail');
    }

    await prisma.mail.update({
      where: { id: mailId },
      data: { status: 'DELETED' }
    });

    return createSuccessResponse({ deleted: true });

  } catch (error) {
    console.error('Error deleting mail:', error);
    return createErrorResponse('INTERNAL_ERROR');
  }
}