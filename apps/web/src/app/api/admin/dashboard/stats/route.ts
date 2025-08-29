import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, withAuth } from '@/lib/api/server-utils';
import type { AuthUser } from '@/types/api';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalErrors: number;
  criticalAlerts: number;
  serverUptime: string;
  lastUpdated: string;
}

export const dynamic = 'force-dynamic';

// GET - Get admin dashboard stats
export const GET = withAuth(async (request: NextRequest, user: AuthUser): Promise<NextResponse> => {
  try {
    // Check admin access first
    const adminUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return apiError('Admin access required', 403);
    }

    // Get total users count
    const totalUsers = await prisma.user.count();

    // Get active users (users who logged in within last 24 hours)
    const activeUsers = await prisma.user.count({
      where: {
        lastActiveAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    // For now, we'll simulate error and alert counts
    // In a real implementation, these would come from a logging system
    const totalErrors = 0; // TODO: Integrate with logging system
    const criticalAlerts = 0; // TODO: Integrate with monitoring system

    // Calculate server uptime (simplified - in production would come from monitoring)
    const startTime = new Date('2024-01-01'); // Placeholder start time
    const now = new Date();
    const uptimeMs = now.getTime() - startTime.getTime();
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    const serverUptime = `${days}d ${hours}h ${minutes}m`;

    const stats: DashboardStats = {
      totalUsers,
      activeUsers,
      totalErrors,
      criticalAlerts,
      serverUptime,
      lastUpdated: new Date().toISOString()
    };

    return apiSuccess(stats);
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return apiError('Failed to fetch admin dashboard stats', 500);
  }
});