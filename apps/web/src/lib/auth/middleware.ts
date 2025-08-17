import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { createErrorResponse } from '@/lib/apiUtils';
import { ensureUserExistsOptimized } from '@/lib/auth/auto-sync';
import type { User } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends NextRequest {
  user?: User;
}

/**
 * Higher-order function for protected API routes
 * Handles authentication and user sync automatically
 */
export async function withAuth<T = any>(
  request: NextRequest,
  handler: (user: User, request: NextRequest) => Promise<NextResponse<T>>
): Promise<NextResponse> {
  try {
    // Extract token from Authorization header
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return createErrorResponse('NO_TOKEN');
    }

    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('[Auth Middleware] Auth error:', authError);
      return createErrorResponse('INVALID_TOKEN', authError.message);
    }
    
    if (!user) {
      return createErrorResponse('INVALID_TOKEN', 'No user found for token');
    }

    // Auto-sync user to database if needed (optimized to check first)
    await ensureUserExistsOptimized(user);

    // Call the handler with authenticated user
    return await handler(user, request);
  } catch (error) {
    console.error('[Auth Middleware] Unexpected error:', error);
    return createErrorResponse('INTERNAL_ERROR', 
      error instanceof Error ? error.message : 'Authentication failed'
    );
  }
}

/**
 * Lighter weight auth check without user sync
 * Use for read-only operations where user definitely exists
 */
export async function withAuthLight<T = any>(
  request: NextRequest,
  handler: (user: User, request: NextRequest) => Promise<NextResponse<T>>
): Promise<NextResponse> {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return createErrorResponse('NO_TOKEN');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return createErrorResponse('INVALID_TOKEN', authError?.message);
    }

    return await handler(user, request);
  } catch (error) {
    console.error('[Auth Middleware Light] Error:', error);
    return createErrorResponse('INTERNAL_ERROR');
  }
}

/**
 * Auth with guild membership check
 * Ensures user is in a guild before proceeding
 */
export async function withGuildAuth<T = any>(
  request: NextRequest,
  handler: (user: User, guildId: string, request: NextRequest) => Promise<NextResponse<T>>,
  requiredRoles?: string[]
): Promise<NextResponse> {
  return withAuth(request, async (user, req) => {
    try {
      const { getUserGuildMembership, checkRolePermissions } = await import('@/lib/apiUtils');
      
      const { membership, error } = await getUserGuildMembership(user.id);
      
      if (error || !membership) {
        return createErrorResponse('NOT_IN_GUILD');
      }

      // Check role permissions if required
      if (requiredRoles && requiredRoles.length > 0) {
        if (!checkRolePermissions(membership.role, requiredRoles)) {
          return createErrorResponse('INSUFFICIENT_PERMISSIONS', 
            `Required role: ${requiredRoles.join(' or ')}`
          );
        }
      }

      return await handler(user, membership.guildId, req);
    } catch (error) {
      console.error('[Guild Auth Middleware] Error:', error);
      return createErrorResponse('INTERNAL_ERROR');
    }
  });
}

/**
 * Extract and validate request body with type safety
 */
export async function getRequestBody<T>(
  request: NextRequest,
  validator?: (body: any) => T | null
): Promise<T | null> {
  try {
    const body = await request.json();
    
    if (validator) {
      return validator(body);
    }
    
    return body as T;
  } catch (error) {
    console.error('[Request Body] Parse error:', error);
    return null;
  }
}

/**
 * Rate limiting middleware wrapper
 * Can be composed with auth middleware
 */
export async function withRateLimit<T = any>(
  request: NextRequest,
  identifier: string,
  handler: () => Promise<NextResponse<T>>,
  options?: {
    windowMs?: number;
    maxRequests?: number;
  }
): Promise<NextResponse> {
  const { checkRateLimit } = await import('@/lib/apiUtils');
  
  const { allowed, resetTime } = checkRateLimit(
    identifier,
    options?.windowMs,
    options?.maxRequests
  );

  if (!allowed) {
    const response = NextResponse.json(
      { error: 'Too many requests', resetTime },
      { status: 429 }
    );
    
    if (resetTime) {
      response.headers.set('X-RateLimit-Reset', resetTime.toString());
    }
    
    return response;
  }

  return handler();
}

/**
 * Compose multiple middleware functions
 * Usage: compose(withAuth, withRateLimit)(request, handler)
 */
export function compose(...middlewares: Function[]) {
  return (request: NextRequest, handler: Function) => {
    return middlewares.reduceRight(
      (next, middleware) => () => middleware(request, next),
      handler
    )();
  };
}