import { NextRequest, NextResponse } from 'next/server';
import { createRouteDispatcher } from '@/lib/api/route-dispatcher';
import { 
  adminCheckAccess,
  adminDashboardStats,
  adminEmergencyAction,
  adminDeleteUser,
  adminGetUsers
} from '@/lib/api/services/admin.service';

/**
 * Consolidated Admin API v2
 * Combines multiple admin endpoints into a single route handler
 * 
 * This replaces:
 * - /api/admin/check-access
 * - /api/admin/dashboard/stats  
 * - /api/admin/emergency
 * - /api/admin/delete-user
 * - /api/admin/users
 * 
 * Routes:
 * GET  /api/v2/admin/check-access
 * GET  /api/v2/admin/stats
 * POST /api/v2/admin/emergency
 * POST /api/v2/admin/delete-user
 * GET  /api/v2/admin/users
 */

export const dynamic = 'force-dynamic';

const routes = {
  GET: {
    '/check-access': adminCheckAccess,
    '/stats': adminDashboardStats,
    '/users': adminGetUsers
  },
  POST: {
    '/emergency': adminEmergencyAction,
    '/delete-user': adminDeleteUser
  }
};

const { GET, POST, PUT, DELETE } = createRouteDispatcher(routes);

export { GET, POST, PUT, DELETE };