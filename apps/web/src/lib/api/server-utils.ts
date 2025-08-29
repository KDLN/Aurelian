import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { webEnv } from '@/lib/env';
import type { ApiResponse, ApiError, AuthUser } from '@/types/api';

const supabase = createClient(
  webEnv.NEXT_PUBLIC_SUPABASE_URL,
  webEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Response helpers
export function apiSuccess<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
  });
}

export function apiError(error: string, status = 500, details?: string): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error,
      details,
      status,
    },
    { status }
  );
}

// Authentication helper
export async function authenticateRequest(request: NextRequest): Promise<AuthUser | null> {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// Request body validation helper
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse<ApiError> }> {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    return { data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: apiError(
          'Invalid request data',
          400,
          error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        )
      };
    }
    return {
      error: apiError('Invalid request format', 400)
    };
  }
}

// Wrapper for authenticated API routes
export function withAuth<T>(
  handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T | ApiError>> => {
    try {
      const user = await authenticateRequest(request);
      
      if (!user) {
        return apiError('Authentication required', 401);
      }

      return handler(request, user);
    } catch (error) {
      console.error('API handler error:', error);
      return apiError('Internal server error', 500);
    }
  };
}

// Wrapper for API routes with error handling
export function withErrorHandler<T>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T | ApiError>> => {
    try {
      return handler(request);
    } catch (error) {
      console.error('API handler error:', error);
      return apiError('Internal server error', 500);
    }
  };
}

// Query parameter helpers
export function getQueryParam(request: NextRequest, key: string, defaultValue?: string): string | undefined {
  const url = new URL(request.url);
  return url.searchParams.get(key) || defaultValue;
}

export function getQueryParamAsNumber(request: NextRequest, key: string, defaultValue?: number): number | undefined {
  const value = getQueryParam(request, key);
  if (value === undefined) return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

export function getQueryParamAsBoolean(request: NextRequest, key: string, defaultValue?: boolean): boolean | undefined {
  const value = getQueryParam(request, key);
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}