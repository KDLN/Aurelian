import { NextRequest } from 'next/server';
import { 
  authenticateUser, 
  createErrorResponse, 
  createSuccessResponse
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Get user's mail folders with counts
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }

    const { user } = authResult;

    // Get mail counts for each folder
    const [inboxCount, inboxUnreadCount, sentCount, archivedCount] = await Promise.all([
      prisma.mail.count({
        where: {
          recipientId: user.id,
          status: { in: ['UNREAD', 'READ'] }
        }
      }),
      prisma.mail.count({
        where: {
          recipientId: user.id,
          status: 'UNREAD'
        }
      }),
      prisma.mail.count({
        where: {
          senderId: user.id,
          status: { not: 'DELETED' }
        }
      }),
      prisma.mail.count({
        where: {
          recipientId: user.id,
          status: 'ARCHIVED'
        }
      })
    ]);

    // Build default folders
    const folders = [
      {
        id: 'inbox',
        name: 'Inbox',
        isSystem: true,
        mailCount: inboxCount,
        unreadCount: inboxUnreadCount,
        sortOrder: 0
      },
      {
        id: 'sent',
        name: 'Sent',
        isSystem: true,
        mailCount: sentCount,
        unreadCount: 0,
        sortOrder: 1
      },
      {
        id: 'archived',
        name: 'Archived',
        isSystem: true,
        mailCount: archivedCount,
        unreadCount: 0,
        sortOrder: 2
      }
    ];

    // Get custom folders
    const customFolders = await prisma.mailFolder.findMany({
      where: {
        userId: user.id,
        isSystem: false
      },
      orderBy: {
        sortOrder: 'asc'
      }
    });

    const allFolders = [
      ...folders,
      ...customFolders.map(folder => ({
        id: folder.id,
        name: folder.name,
        isSystem: folder.isSystem,
        mailCount: folder.mailCount,
        unreadCount: folder.unreadCount,
        sortOrder: folder.sortOrder
      }))
    ];

    return createSuccessResponse({ folders: allFolders });

  } catch (error) {
    console.error('Error fetching mail folders:', error);
    return createErrorResponse('INTERNAL_ERROR');
  }
}

// POST - Create a custom mail folder
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }

    const { user } = authResult;
    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return createErrorResponse('MISSING_FIELDS', 'Folder name is required');
    }

    if (name.length > 50) {
      return createErrorResponse('VALIDATION_ERROR', 'Folder name too long (max 50 characters)');
    }

    // Check if folder already exists
    const existingFolder = await prisma.mailFolder.findUnique({
      where: {
        userId_name: {
          userId: user.id,
          name: name.trim()
        }
      }
    });

    if (existingFolder) {
      return createErrorResponse('CONFLICT', 'Folder with this name already exists');
    }

    // Count existing custom folders (limit to 10)
    const customFolderCount = await prisma.mailFolder.count({
      where: {
        userId: user.id,
        isSystem: false
      }
    });

    if (customFolderCount >= 10) {
      return createErrorResponse('VALIDATION_ERROR', 'Maximum 10 custom folders allowed');
    }

    const folder = await prisma.mailFolder.create({
      data: {
        userId: user.id,
        name: name.trim(),
        isSystem: false,
        sortOrder: 100 + customFolderCount
      }
    });

    return createSuccessResponse({
      folder: {
        id: folder.id,
        name: folder.name,
        isSystem: folder.isSystem,
        mailCount: folder.mailCount,
        unreadCount: folder.unreadCount,
        sortOrder: folder.sortOrder
      }
    });

  } catch (error) {
    console.error('Error creating mail folder:', error);
    return createErrorResponse('INTERNAL_ERROR');
  }
}