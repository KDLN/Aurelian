import { NextRequest, NextResponse } from 'next/server';
import { createRouteDispatcher } from '@/lib/api/route-dispatcher';
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

const { GET, POST, PUT, DELETE } = createRouteDispatcher(routes);

export { GET, POST, PUT, DELETE };