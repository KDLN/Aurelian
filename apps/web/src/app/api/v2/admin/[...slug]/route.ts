import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from '@/lib/api/middleware/security';
import { 
  adminCheckAccess,
  adminDashboardStats,
  adminEmergencyAction,
  adminDeleteUser,
  adminGetUsers,
  adminGetSecurityAlerts,
  adminAcknowledgeSecurityAlert
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
 * - /api/admin/security/alerts
 * 
 * Routes:
 * GET  /api/v2/admin/check-access
 * GET  /api/v2/admin/stats
 * POST /api/v2/admin/emergency
 * POST /api/v2/admin/delete-user
 * GET  /api/v2/admin/users
 * GET  /api/v2/admin/security/alerts
 * PUT  /api/v2/admin/security/alerts
 */

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const { slug } = params;
  const endpoint = '/' + (slug?.join('/') || '');
  
  
  try {
    // Route to appropriate handler based on endpoint
    switch (endpoint) {
      case '/check-access':
        return await adminCheckAccess(request);
      
      case '/stats':
        return await adminDashboardStats(request);
      
      case '/users':
        return await adminGetUsers(request);
      
      case '/security/alerts':
        return await adminGetSecurityAlerts(request);
      
      default:
        return NextResponse.json({ 
          message: 'V2 Admin API working!', 
          endpoint,
          available: ['/check-access', '/stats', '/users', '/security/alerts']
        });
    }
  } catch (error) {
    console.error('V2 Admin API Error:', error);
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
      case '/emergency':
        return await adminEmergencyAction(request);
      
      case '/delete-user':
        return await adminDeleteUser(request);
      
      default:
        return NextResponse.json({ 
          error: 'POST endpoint not found',
          endpoint,
          available: ['/emergency', '/delete-user']
        }, { status: 404 });
    }
  } catch (error) {
    console.error('V2 Admin API POST Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const { slug } = params;
  const endpoint = '/' + (slug?.join('/') || '');
  
  
  try {
    // Route to appropriate handler based on endpoint
    switch (endpoint) {
      case '/security/alerts':
        return await adminAcknowledgeSecurityAlert(request);
      
      default:
        return NextResponse.json({ 
          error: 'PUT endpoint not found',
          endpoint,
          available: ['/security/alerts']
        }, { status: 404 });
    }
  } catch (error) {
    console.error('V2 Admin API PUT Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply admin security middleware to all routes
// Note: Security middleware is applied through the service functions directly