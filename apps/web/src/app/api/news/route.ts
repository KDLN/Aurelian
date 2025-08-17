import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/news
 * Fetch game news and announcements (public endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    console.log(`[Game News] Fetching news - category: ${category}, limit: ${limit}`);

    // Build where clause
    const where: any = {
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    };

    if (category) {
      where.category = category;
    }

    // Fetch news with proper ordering
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
        { isPinned: 'desc' },     // Pinned items first
        { priority: 'desc' },     // High priority first
        { publishedAt: 'desc' }   // Newest first
      ],
      take: Math.min(limit, 50) // Max 50 items
    });

    // Transform data for frontend
    const transformedNews = news.map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      category: item.category,
      priority: item.priority,
      isPinned: item.isPinned,
      publishedAt: item.publishedAt,
      expiresAt: item.expiresAt,
      metadata: item.metadata,
      author: {
        name: item.author.profile?.display || 'System Admin',
        id: item.authorId
      }
    }));

    console.log(`[Game News] Found ${news.length} active news items`);

    return createSuccessResponse({ 
      news: transformedNews,
      count: news.length,
      category: category || 'all'
    });

  } catch (error: any) {
    console.error('[Game News] Error fetching news:', {
      error,
      message: error?.message
    });
    
    return createErrorResponse('INTERNAL_ERROR', `Failed to fetch news: ${error?.message || 'Unknown error'}`);
  }
}