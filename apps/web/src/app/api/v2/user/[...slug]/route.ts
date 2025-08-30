import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const { slug } = params;
  const endpoint = '/' + (slug?.join('/') || '');
  
  console.log('🔍 V2 User API Debug:', {
    slug,
    endpoint,
    url: request.url
  });
  
  // Simple test for wallet endpoint
  if (endpoint === '/wallet') {
    return NextResponse.json({ 
      success: true, 
      data: { gold: 2500, userId: 'test-user' },
      message: 'Wallet endpoint working!'
    });
  }
  
  if (endpoint === '/inventory') {
    return NextResponse.json({ 
      success: true, 
      data: { inventory: [], totalItems: 0, location: 'warehouse' },
      message: 'Inventory endpoint working!'
    });
  }
  
  return NextResponse.json({ 
    message: 'V2 User API working!', 
    endpoint,
    slug,
    available: ['/wallet', '/inventory', '/profile']
  });
}