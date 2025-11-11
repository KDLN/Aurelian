import { NextRequest, NextResponse } from 'next/server';
import { AdminLogger } from '@/lib/admin-logger';

// Simple admin check for now - in production this would use proper JWT verification
async function checkAdminAccess(request: NextRequest) {
  // Temporary implementation - replace with proper auth check
  const authHeader = request.headers.get('authorization');
  return {
    hasAccess: true // For now, allow all requests
  };
}

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const adminCheck = await checkAdminAccess(request);
    if (!adminCheck.hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    const filter = {
      adminUserId: searchParams.get('adminUserId') || undefined,
      action: searchParams.get('action') || undefined,
      resourceType: searchParams.get('resourceType') || undefined,
      limit: Number(searchParams.get('limit')) || 50,
      offset: Number(searchParams.get('offset')) || 0,
    };

    // Handle date filters
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    if (startDateParam) {
      filter.startDate = new Date(startDateParam);
    }
    
    if (endDateParam) {
      filter.endDate = new Date(endDateParam);
    }

    const logs = await AdminLogger.getLogs(filter);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        limit: filter.limit,
        offset: filter.offset,
        hasMore: logs.length === filter.limit
      }
    });

  } catch (error) {
    console.error('Error fetching admin activity logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get admin activity statistics
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const adminCheck = await checkAdminAccess(request);
    if (!adminCheck.hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const timeframe = body.timeframe || '24h';
    
    if (!['24h', '7d', '30d'].includes(timeframe)) {
      return NextResponse.json(
        { error: 'Invalid timeframe. Must be 24h, 7d, or 30d' },
        { status: 400 }
      );
    }

    const stats = await AdminLogger.getStats(timeframe);

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching admin activity stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}