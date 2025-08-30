import { NextRequest, NextResponse } from 'next/server';
import { createRouteDispatcher } from '@/lib/api/route-dispatcher';
import { securityMiddleware } from '@/lib/api/middleware/security';
import {
  userGetProfile,
  userUpdateProfile,
  userUpdateAvatar,
  userGetInventory,
  userGetWallet,
  userCreateWallet,
  userGetStats,
  userPopulateStarterInventory,
  userSearchUsers
} from '@/lib/api/services/user.service';

/**
 * Consolidated User API v2
 * Combines multiple user endpoints into a single route handler
 * 
 * This replaces:
 * - /api/user/profile
 * - /api/user/avatar
 * - /api/user/inventory
 * - /api/user/wallet
 * - /api/user/stats
 * - /api/user/search
 * - /api/user/inventory/populate-starter
 * 
 * Routes:
 * GET  /api/v2/user/profile
 * PUT  /api/v2/user/profile
 * PUT  /api/v2/user/avatar
 * GET  /api/v2/user/inventory
 * GET  /api/v2/user/wallet
 * POST /api/v2/user/wallet
 * GET  /api/v2/user/stats
 * POST /api/v2/user/populate-starter
 * GET  /api/v2/user/search
 */

export const dynamic = 'force-dynamic';

const routes = {
  GET: {
    '/profile': userGetProfile,
    '/inventory': userGetInventory,
    '/wallet': userGetWallet,
    '/stats': userGetStats,
    '/search': userSearchUsers
  },
  POST: {
    '/wallet': userCreateWallet,
    '/populate-starter': userPopulateStarterInventory
  },
  PUT: {
    '/profile': userUpdateProfile,
    '/avatar': userUpdateAvatar
  }
};

const { GET: _GET, POST: _POST, PUT: _PUT, DELETE: _DELETE } = createRouteDispatcher(routes);

// Apply standard security middleware to all routes
export const GET = securityMiddleware.standard(_GET);
export const POST = securityMiddleware.standard(_POST);
export const PUT = securityMiddleware.standard(_PUT);
export const DELETE = securityMiddleware.standard(_DELETE);