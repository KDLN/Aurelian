import { NextRequest } from 'next/server';
import { 
  authenticateUser, 
  createErrorResponse, 
  createSuccessResponse
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - List all users (Admin only)
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }

    const { user } = authResult;
    
    // Check if user is admin
    const adminEmails = ['kdln@live.com']; // Add more admin emails as needed
    if (!adminEmails.includes(user.email || '')) {
      return createErrorResponse('FORBIDDEN', 'Admin access required');
    }

    // Get all users with related data
    const users = await prisma.user.findMany({
      include: {
        profile: {
          select: {
            display: true,
            avatar: true
          }
        },
        wallets: {
          select: {
            gold: true
          }
        },
        guildMembership: {
          include: {
            guild: {
              select: {
                name: true,
                tag: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      profile: user.profile,
      wallet: user.wallets,
      guildMembership: user.guildMembership
    }));

    return createSuccessResponse({
      users: formattedUsers,
      total: formattedUsers.length
    });

  } catch (error) {
    console.error('Error fetching users for admin:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch users');
  }
}