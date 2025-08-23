import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUser,
  createErrorResponse,
  createSuccessResponse,
  validateRequiredFields
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Search for users by email or display name
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }
    const { user } = authResult;

    // Get search query from URL params
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.trim().length < 2) {
      return createErrorResponse('MISSING_FIELDS', 'Search query must be at least 2 characters');
    }

    const searchTerm = query.trim();

    // Check if this is for guild search (exclude guild members) or general search
    const forGuild = searchParams.get('guild') === 'true';
    
    // Search users by email or display name
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            id: { not: user.id } // Exclude current user
          },
          // Only exclude guild members if this is for guild search
          ...(forGuild ? [{ guildMembership: null }] : []),
          {
            OR: [
              {
                email: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              },
              {
                profile: {
                  display: {
                    contains: searchTerm,
                    mode: 'insensitive'
                  }
                }
              }
            ]
          }
        ]
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        profile: {
          select: {
            display: true,
            avatar: true
          }
        },
        guildMembership: {
          include: {
            guild: true
          }
        }
      },
      take: 10, // Limit results
      orderBy: [
        {
          profile: {
            display: 'asc'
          }
        },
        {
          email: 'asc'
        }
      ]
    });

    const formattedUsers = users.map(foundUser => ({
      id: foundUser.id,
      email: foundUser.email,
      displayName: foundUser.profile?.display || foundUser.email || 'Unknown',
      avatar: foundUser.profile?.avatar,
      guildTag: foundUser.guildMembership?.guild.tag,
      guildRole: foundUser.guildMembership?.role,
      joinedAt: foundUser.createdAt
    }));

    return createSuccessResponse({
      users: formattedUsers,
      query: searchTerm,
      total: formattedUsers.length
    });

  } catch (error) {
    console.error('Error searching users:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to search users');
  }
}