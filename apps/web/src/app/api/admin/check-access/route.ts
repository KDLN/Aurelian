import { NextRequest, NextResponse } from 'next/server';
import { authenticateUserAndCheckAdmin, createErrorResponse, createSuccessResponse } from '@/lib/apiUtils';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUserAndCheckAdmin(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }

    return createSuccessResponse({
      isAdmin: true,
      user: {
        id: authResult.user.id,
        email: authResult.user.email
      }
    });
  } catch (error) {
    console.error('Admin access check error:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to check admin access');
  }
}