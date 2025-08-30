import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const { slug } = params;
  const endpoint = '/' + (slug?.join('/') || '');
  
  
  try {
    // Route to appropriate handler based on endpoint
    switch (endpoint) {
      case '/listings':
        return await tradingGetListings(request);
      
      case '/market':
        return await tradingGetMarketSummary(request);
      
      case '/contracts':
        return await tradingGetContracts(request);
      
      default:
        return NextResponse.json({ 
          message: 'V2 Trading API working!', 
          endpoint,
          available: ['/listings', '/market', '/contracts']
        });
    }
  } catch (error) {
    console.error('V2 Trading API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const { slug } = params;
  const endpoint = '/' + (slug?.join('/') || '');
  
  
  try {
    // Route to appropriate handler based on endpoint
    switch (endpoint) {
      case '/listings':
        return await tradingCreateListing(request);
      
      case '/buy':
        return await tradingBuyItem(request);
      
      case '/contracts':
        return await tradingCreateContract(request);
      
      default:
        return NextResponse.json({ 
          error: 'POST endpoint not found',
          endpoint,
          available: ['/listings', '/buy', '/contracts']
        }, { status: 404 });
    }
  } catch (error) {
    console.error('V2 Trading API POST Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply trading security middleware to all routes
// Note: Security middleware is applied through the service functions directly