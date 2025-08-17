import { NextRequest } from 'next/server';
import { withAuthLight, getRequestBody } from '@/lib/auth/middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/news
 * Fetch all news for admin management
 */
export async function GET(request: NextRequest) {
  return withAuthLight(request, async (user) => {
    try {
      // TODO: Add admin role check here
      // For now, any authenticated user can access admin functions
      console.log(`[Admin News] User ${user.id} fetching news for admin`);

      const url = new URL(request.url);
      const includeInactive = url.searchParams.get('includeInactive') === 'true';
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);

      const where = includeInactive ? {} : { isActive: true };

      const news = await prisma.gameNews.findMany({
        where,
        include: {
          author: {
            include: {
              profile: {
                select: { display: true }
              }
            }
          }
        },
        orderBy: [
          { isPinned: 'desc' },
          { publishedAt: 'desc' }
        ],
        take: Math.min(limit, 100)
      });

      const transformedNews = news.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        priority: item.priority,
        isActive: item.isActive,
        isPinned: item.isPinned,
        publishedAt: item.publishedAt,
        expiresAt: item.expiresAt,
        metadata: item.metadata,
        author: {
          name: item.author.profile?.display || 'System Admin',
          id: item.authorId
        },
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }));

      return createSuccessResponse({ 
        news: transformedNews,
        count: news.length
      });

    } catch (error: any) {
      console.error('[Admin News] Error fetching news:', error);
      return createErrorResponse('INTERNAL_ERROR', `Failed to fetch news: ${error?.message || 'Unknown error'}`);
    }
  });
}

/**
 * POST /api/admin/news
 * Create new news item
 */
export async function POST(request: NextRequest) {
  return withAuthLight(request, async (user) => {
    try {
      // TODO: Add admin role check here
      console.log(`[Admin News] User ${user.id} creating news item`);

      const body = await getRequestBody<{
        title: string;
        content: string;
        category: string;
        priority?: string;
        isPinned?: boolean;
        expiresAt?: string;
        metadata?: any;
      }>(request);

      if (!body?.title || !body?.content || !body?.category) {
        return createErrorResponse('MISSING_FIELDS', 'Title, content, and category are required');
      }

      // Validate category
      const validCategories = ['update', 'event', 'maintenance', 'market', 'announcement'];
      if (!validCategories.includes(body.category)) {
        return createErrorResponse('MISSING_FIELDS', `Category must be one of: ${validCategories.join(', ')}`);
      }

      // Validate priority
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      if (body.priority && !validPriorities.includes(body.priority)) {
        return createErrorResponse('MISSING_FIELDS', `Priority must be one of: ${validPriorities.join(', ')}`);
      }

      const newsItem = await prisma.gameNews.create({
        data: {
          title: body.title,
          content: body.content,
          category: body.category,
          priority: body.priority || 'normal',
          isPinned: body.isPinned || false,
          authorId: user.id,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          metadata: body.metadata || {}
        },
        include: {
          author: {
            include: {
              profile: { select: { display: true } }
            }
          }
        }
      });

      console.log(`[Admin News] Created news item: ${newsItem.id}`);

      return createSuccessResponse({ 
        news: newsItem,
        message: 'News item created successfully'
      });

    } catch (error: any) {
      console.error('[Admin News] Error creating news:', error);
      return createErrorResponse('INTERNAL_ERROR', `Failed to create news: ${error?.message || 'Unknown error'}`);
    }
  });
}

/**
 * PUT /api/admin/news
 * Update existing news item
 */
export async function PUT(request: NextRequest) {
  return withAuthLight(request, async (user) => {
    try {
      console.log(`[Admin News] User ${user.id} updating news item`);

      const body = await getRequestBody<{
        id: string;
        title?: string;
        content?: string;
        category?: string;
        priority?: string;
        isActive?: boolean;
        isPinned?: boolean;
        expiresAt?: string | null;
        metadata?: any;
      }>(request);

      if (!body?.id) {
        return createErrorResponse('MISSING_FIELDS', 'News item ID is required');
      }

      // Build update data
      const updateData: any = {};
      if (body.title !== undefined) updateData.title = body.title;
      if (body.content !== undefined) updateData.content = body.content;
      if (body.category !== undefined) updateData.category = body.category;
      if (body.priority !== undefined) updateData.priority = body.priority;
      if (body.isActive !== undefined) updateData.isActive = body.isActive;
      if (body.isPinned !== undefined) updateData.isPinned = body.isPinned;
      if (body.expiresAt !== undefined) {
        updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
      }
      if (body.metadata !== undefined) updateData.metadata = body.metadata;

      const newsItem = await prisma.gameNews.update({
        where: { id: body.id },
        data: updateData,
        include: {
          author: {
            include: {
              profile: { select: { display: true } }
            }
          }
        }
      });

      console.log(`[Admin News] Updated news item: ${newsItem.id}`);

      return createSuccessResponse({ 
        news: newsItem,
        message: 'News item updated successfully'
      });

    } catch (error: any) {
      console.error('[Admin News] Error updating news:', error);
      return createErrorResponse('INTERNAL_ERROR', `Failed to update news: ${error?.message || 'Unknown error'}`);
    }
  });
}

/**
 * DELETE /api/admin/news
 * Delete news item
 */
export async function DELETE(request: NextRequest) {
  return withAuthLight(request, async (user) => {
    try {
      console.log(`[Admin News] User ${user.id} deleting news item`);

      const url = new URL(request.url);
      const newsId = url.searchParams.get('id');

      if (!newsId) {
        return createErrorResponse('MISSING_FIELDS', 'News item ID is required');
      }

      await prisma.gameNews.delete({
        where: { id: newsId }
      });

      console.log(`[Admin News] Deleted news item: ${newsId}`);

      return createSuccessResponse({ 
        message: 'News item deleted successfully'
      });

    } catch (error: any) {
      console.error('[Admin News] Error deleting news:', error);
      return createErrorResponse('INTERNAL_ERROR', `Failed to delete news: ${error?.message || 'Unknown error'}`);
    }
  });
}