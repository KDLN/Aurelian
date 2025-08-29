import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Standard error response format
 */
export interface ApiError {
  error: string;
  details?: string;
  code?: string;
  timestamp?: string;
  requestId?: string;
}

/**
 * Standard success response format  
 */
export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  timestamp?: string;
  requestId?: string;
}

/**
 * Centralized API error handler
 * Converts various error types into consistent API responses
 */
export function handleApiError(
  error: unknown, 
  defaultMessage: string = 'Internal server error',
  statusCode: number = 500
): NextResponse<ApiError> {
  const timestamp = new Date().toISOString();
  const requestId = generateRequestId();

  // Log error details for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp,
      requestId
    });
  }

  // TODO: Send to error tracking service in production
  // Example: Sentry.captureException(error, { tags: { api: true }, extra: { requestId } });

  // Handle different error types
  if (error instanceof ZodError) {
    return NextResponse.json({
      error: 'Validation failed',
      details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      code: 'VALIDATION_ERROR',
      timestamp,
      requestId
    }, { status: 400 });
  }

  if (error instanceof Error) {
    // Known error types
    if (error.message.includes('Unauthorized') || error.message.includes('Access denied')) {
      return NextResponse.json({
        error: 'Access denied',
        details: error.message,
        code: 'UNAUTHORIZED',
        timestamp,
        requestId
      }, { status: 403 });
    }

    if (error.message.includes('Not found')) {
      return NextResponse.json({
        error: 'Resource not found',
        details: error.message,
        code: 'NOT_FOUND',
        timestamp,
        requestId
      }, { status: 404 });
    }

    if (error.message.includes('Database') || error.message.includes('Prisma')) {
      return NextResponse.json({
        error: 'Database operation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Database error occurred',
        code: 'DATABASE_ERROR',
        timestamp,
        requestId
      }, { status: 500 });
    }

    // Generic error handling
    return NextResponse.json({
      error: error.message || defaultMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: 'UNKNOWN_ERROR',
      timestamp,
      requestId
    }, { status: statusCode });
  }

  // Fallback for unknown error types
  return NextResponse.json({
    error: defaultMessage,
    details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    code: 'UNKNOWN_ERROR',
    timestamp,
    requestId
  }, { status: statusCode });
}

/**
 * Create success response
 */
export function createApiSuccess<T>(
  data: T, 
  statusCode: number = 200
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  }, { status: statusCode });
}

/**
 * Async error handler wrapper for API routes
 */
export function withApiErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse<ApiError>> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate required environment variables
 */
export function validateRequiredEnv(vars: string[]): void {
  const missing = vars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Rate limiting helper (simple in-memory implementation)
 * TODO: Replace with Redis or proper rate limiting service for production
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `${identifier}_${Math.floor(now / windowMs)}`;
  
  const current = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };
  
  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }
  
  current.count++;
  rateLimitStore.set(key, current);
  
  // Clean up old entries
  if (rateLimitStore.size > 1000) {
    const cutoff = now - windowMs * 2;
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < cutoff) {
        rateLimitStore.delete(key);
      }
    }
  }
  
  return { 
    allowed: true, 
    remaining: maxRequests - current.count, 
    resetTime: current.resetTime 
  };
}