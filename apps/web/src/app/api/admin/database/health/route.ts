import { NextRequest, NextResponse } from 'next/server';
import { prisma, DatabaseOptimizer } from '@/lib/prisma';
import { withAuth, apiSuccess, apiError } from '@/lib/api/server-utils';
import { handleApiError } from '@/lib/api/error-handler';
import type { AuthUser } from '@/types/api';

/**
 * Database Health Monitoring API
 * GET /api/admin/database/health
 * 
 * Provides database connection pool stats and performance metrics
 * Admin only access
 */

async function getDatabaseHealth(request: NextRequest, user: AuthUser): Promise<NextResponse> {
  try {
    // Verify admin access
    if (!user.isAdmin) {
      return apiError('Access denied - Admin only', 403);
    }

    // Get connection pool statistics
    const poolStats = await DatabaseOptimizer.getPoolStats();
    
    // Health check
    const isHealthy = await DatabaseOptimizer.healthCheck();
    
    // Query performance metrics
    const startTime = Date.now();
    await prisma.user.count();
    const queryTime = Date.now() - startTime;
    
    // Database size information (approximate)
    const tableCounts = await Promise.all([
      prisma.user.count(),
      prisma.listing.count(),
      prisma.inventory.count(),
      prisma.wallet.count(),
      prisma.contract.count()
    ]);

    const [userCount, listingCount, inventoryCount, walletCount, contractCount] = tableCounts;

    const healthInfo = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      
      // Connection pool metrics
      connectionPool: {
        open: poolStats.connectionsOpen,
        idle: poolStats.connectionsIdle,
        busy: poolStats.connectionsUsed,
        utilization: poolStats.connectionsOpen > 0 ? 
          (poolStats.connectionsUsed / poolStats.connectionsOpen * 100).toFixed(2) + '%' : '0%'
      },
      
      // Performance metrics
      performance: {
        lastQueryTime: queryTime + 'ms',
        averageQueryTime: queryTime < 100 ? 'Fast' : queryTime < 500 ? 'Moderate' : 'Slow'
      },
      
      // Database size metrics
      dataMetrics: {
        totalUsers: userCount,
        activeListings: listingCount,
        inventoryItems: inventoryCount,
        wallets: walletCount,
        contracts: contractCount,
        totalRecords: userCount + listingCount + inventoryCount + walletCount + contractCount
      },
      
      // Cache information
      cacheInfo: {
        queryCacheEnabled: true,
        cacheHits: 'Tracked internally',
        cacheMisses: 'Tracked internally'
      }
    };

    return apiSuccess({
      health: healthInfo,
      recommendations: generateRecommendations(healthInfo)
    });

  } catch (error) {
    return handleApiError(error, 'Failed to get database health');
  }
}

function generateRecommendations(health: any): string[] {
  const recommendations: string[] = [];
  
  const utilization = parseFloat(health.connectionPool.utilization.replace('%', ''));
  
  if (utilization > 80) {
    recommendations.push('High connection pool utilization - consider increasing pool size');
  }
  
  if (utilization < 10) {
    recommendations.push('Low connection pool utilization - consider decreasing pool size');
  }
  
  if (health.performance.averageQueryTime === 'Slow') {
    recommendations.push('Slow query performance detected - review query optimization');
  }
  
  if (health.dataMetrics.totalRecords > 100000) {
    recommendations.push('Large dataset detected - consider data archiving strategy');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Database performance is optimal');
  }
  
  return recommendations;
}

async function clearDatabaseCache(request: NextRequest, user: AuthUser): Promise<NextResponse> {
  try {
    if (!user.isAdmin) {
      return apiError('Access denied - Admin only', 403);
    }

    // Clear all database caches
    DatabaseOptimizer.clearCache();
    
    return apiSuccess({
      message: 'Database cache cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error, 'Failed to clear database cache');
  }
}

// Export route handlers with auth wrapper
export const GET = withAuth(getDatabaseHealth);
export const DELETE = withAuth(clearDatabaseCache);