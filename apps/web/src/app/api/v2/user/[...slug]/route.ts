import { NextRequest, NextResponse } from 'next/server';
import {
  userGetWallet,
  userGetInventory,
  userGetProfile
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

export async function GET(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const { slug } = params;
  const endpoint = '/' + (slug?.join('/') || '');
  
  
  try {
    // Route to appropriate handler based on endpoint
    switch (endpoint) {
      case '/wallet':
        return await userGetWallet(request);
      
      case '/inventory':
        const location = new URL(request.url).searchParams.get('location') || 'warehouse';
        // Create a new request with location parameter for the service
        const inventoryRequest = new NextRequest(request.url, request);
        return await userGetInventory(inventoryRequest);
      
      case '/profile':
        return await userGetProfile(request);
      
      default:
        return NextResponse.json({ 
          message: 'V2 User API working!', 
          endpoint,
          available: ['/wallet', '/inventory', '/profile']
        });
    }
  } catch (error) {
    console.error('V2 User API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}