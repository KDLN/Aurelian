import { NextRequest, NextResponse } from 'next/server';

/**
 * Security middleware for API routes
 * Implements security headers, request validation, and protection against common attacks
 */

export interface SecurityConfig {
  enableCORS?: boolean;
  enableCSP?: boolean;
  enableRateLimit?: boolean;
  maxRequestSize?: number;
  allowedOrigins?: string[];
}

const defaultConfig: SecurityConfig = {
  enableCORS: true,
  enableCSP: true,
  enableRateLimit: true,
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  allowedOrigins: process.env.NODE_ENV === 'production' 
    ? [process.env.NEXT_PUBLIC_APP_URL || 'https://aurelian.app'] 
    : ['http://localhost:3000', 'https://localhost:3000']
};

/**
 * Apply security headers to API responses
 */
export function applySecurityHeaders(response: NextResponse, config: SecurityConfig = {}): NextResponse {
  const finalConfig = { ...defaultConfig, ...config };
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Remove server information
  response.headers.set('Server', 'Aurelian-API');
  response.headers.delete('X-Powered-By');

  // Content Security Policy
  if (finalConfig.enableCSP) {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:; frame-ancestors 'none';"
    );
  }

  // CORS headers
  if (finalConfig.enableCORS && finalConfig.allowedOrigins) {
    const origin = response.headers.get('origin');
    if (origin && finalConfig.allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else if (finalConfig.allowedOrigins.length === 1) {
      response.headers.set('Access-Control-Allow-Origin', finalConfig.allowedOrigins[0]);
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }

  return response;
}

/**
 * Validate request security constraints
 */
export function validateRequestSecurity(request: NextRequest, config: SecurityConfig = {}): string | null {
  const finalConfig = { ...defaultConfig, ...config };
  
  // Check request size
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > (finalConfig.maxRequestSize || 10485760)) {
    return 'Request too large';
  }

  // Validate Content-Type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
      return 'Invalid content type';
    }
  }

  // Check for suspicious headers or values
  const userAgent = request.headers.get('user-agent');
  if (userAgent && userAgent.length > 500) {
    return 'Suspicious user agent';
  }

  // Check for SQL injection patterns in URL
  const url = request.url.toLowerCase();
  const sqlPatterns = ['union select', 'drop table', 'delete from', 'insert into', '--', '/*', '*/', 'xp_cmdshell'];
  for (const pattern of sqlPatterns) {
    if (url.includes(pattern)) {
      return 'Potential SQL injection attempt';
    }
  }

  // Check for XSS patterns in URL
  const xssPatterns = ['<script', 'javascript:', 'onerror=', 'onload=', 'eval('];
  for (const pattern of xssPatterns) {
    if (url.includes(pattern)) {
      return 'Potential XSS attempt';
    }
  }

  return null; // No security issues found
}

/**
 * Rate limiting implementation (in-memory for simplicity)
 */
class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let record = this.requests.get(identifier);
    
    // Reset if window has passed
    if (!record || record.resetTime <= now) {
      record = { count: 0, resetTime: now + this.windowMs };
      this.requests.set(identifier, record);
    }

    // Check if limit exceeded
    if (record.count >= this.maxRequests) {
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: record.resetTime 
      };
    }

    // Increment count and allow
    record.count++;
    return { 
      allowed: true, 
      remaining: this.maxRequests - record.count, 
      resetTime: record.resetTime 
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (record.resetTime <= now) {
        this.requests.delete(key);
      }
    }
  }
}

// Global rate limiters for different endpoint types
export const rateLimiters = {
  general: new RateLimiter(60000, 100),      // 100 requests per minute
  auth: new RateLimiter(300000, 10),         // 10 requests per 5 minutes for auth
  admin: new RateLimiter(60000, 50),         // 50 requests per minute for admin
  trading: new RateLimiter(60000, 200),      // 200 requests per minute for trading
};

/**
 * Get client identifier for rate limiting
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from various headers (for proxy/load balancer scenarios)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-remote-addr');
  
  const ip = forwarded?.split(',')[0]?.trim() || realIp || remoteAddr || 'unknown';
  
  // Include user agent for additional uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const shortUA = userAgent.substring(0, 50);
  
  return `${ip}-${shortUA}`;
}

/**
 * Security middleware wrapper for API routes
 */
export function withSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: SecurityConfig = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Security validation
      const securityError = validateRequestSecurity(request, config);
      if (securityError) {
        const errorResponse = NextResponse.json(
          { error: 'Security validation failed', details: securityError },
          { status: 400 }
        );
        return applySecurityHeaders(errorResponse, config);
      }

      // Rate limiting
      if (config.enableRateLimit !== false) {
        const clientId = getClientIdentifier(request);
        const limiter = rateLimiters.general;
        const result = limiter.check(clientId);
        
        if (!result.allowed) {
          const errorResponse = NextResponse.json(
            { 
              error: 'Rate limit exceeded', 
              details: 'Too many requests',
              retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
            },
            { status: 429 }
          );
          
          errorResponse.headers.set('Retry-After', String(Math.ceil((result.resetTime - Date.now()) / 1000)));
          errorResponse.headers.set('X-RateLimit-Limit', String(100));
          errorResponse.headers.set('X-RateLimit-Remaining', String(result.remaining));
          errorResponse.headers.set('X-RateLimit-Reset', String(result.resetTime));
          
          return applySecurityHeaders(errorResponse, config);
        }

        // Add rate limit headers to successful responses
        const response = await handler(request);
        response.headers.set('X-RateLimit-Limit', String(100));
        response.headers.set('X-RateLimit-Remaining', String(result.remaining));
        response.headers.set('X-RateLimit-Reset', String(result.resetTime));
        
        return applySecurityHeaders(response, config);
      }

      // Apply security headers to successful responses
      const response = await handler(request);
      return applySecurityHeaders(response, config);

    } catch (error) {
      // Apply security headers even to error responses
      const errorResponse = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
      return applySecurityHeaders(errorResponse, config);
    }
  };
}

/**
 * Specialized middleware for different API types
 */
export const securityMiddleware = {
  standard: (handler: any) => withSecurity(handler),
  
  admin: (handler: any) => withSecurity(handler, {
    maxRequestSize: 5 * 1024 * 1024, // 5MB for admin
    enableRateLimit: true
  }),
  
  auth: (handler: any) => withSecurity(handler, {
    maxRequestSize: 1024 * 1024, // 1MB for auth
    enableRateLimit: true
  }),
  
  trading: (handler: any) => withSecurity(handler, {
    maxRequestSize: 512 * 1024, // 512KB for trading
    enableRateLimit: true
  }),
  
  public: (handler: any) => withSecurity(handler, {
    maxRequestSize: 256 * 1024, // 256KB for public endpoints
    enableRateLimit: true
  })
};