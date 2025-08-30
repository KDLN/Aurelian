import { NextRequest, NextResponse } from 'next/server';
import { createRouteDispatcher } from '@/lib/api/route-dispatcher';
import { securityMiddleware } from '@/lib/api/middleware/security';
import {
  tradingGetListings,
  tradingCreateListing,
  tradingBuyItem,
  tradingGetMarketSummary,
  tradingGetContracts,
  tradingCreateContract
} from '@/lib/api/services/trading.service';

/**
 * Consolidated Trading API v2
 * Combines auction, market, and contract endpoints
 * 
 * This replaces:
 * - /api/auction/listings
 * - /api/auction/list
 * - /api/auction/buy
 * - /api/market/summary
 * - /api/market/trends
 * - /api/contracts
 * 
 * Routes:
 * GET  /api/v2/trading/listings
 * POST /api/v2/trading/listings
 * POST /api/v2/trading/buy
 * GET  /api/v2/trading/market
 * GET  /api/v2/trading/contracts
 * POST /api/v2/trading/contracts
 */

export const dynamic = 'force-dynamic';

const routes = {
  GET: {
    '/listings': tradingGetListings,
    '/market': tradingGetMarketSummary,
    '/contracts': tradingGetContracts
  },
  POST: {
    '/listings': tradingCreateListing,
    '/buy': tradingBuyItem,
    '/contracts': tradingCreateContract
  }
};

const { GET: _GET, POST: _POST, PUT: _PUT, DELETE: _DELETE } = createRouteDispatcher(routes);

// Apply trading security middleware to all routes
export const GET = securityMiddleware.trading(_GET);
export const POST = securityMiddleware.trading(_POST);
export const PUT = securityMiddleware.trading(_PUT);
export const DELETE = securityMiddleware.trading(_DELETE);