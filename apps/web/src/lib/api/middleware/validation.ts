import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Input validation and sanitization middleware
 * Protects against malicious input and ensures data integrity
 */

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  // Basic field validation
  id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format'),
  email: z.string().email().max(255),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s\-_\.]+$/, 'Invalid name format'),
  
  // Numeric validation
  positiveInt: z.number().int().min(1),
  positiveFloat: z.number().min(0.01),
  percentage: z.number().min(0).max(100),
  
  // Pagination
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20)
  }),
  
  // Date validation
  dateString: z.string().datetime(),
  
  // Text content validation
  shortText: z.string().min(1).max(255),
  mediumText: z.string().min(1).max(1000),
  longText: z.string().min(1).max(5000),
  
  // API key validation
  apiKey: z.string().min(20).max(200).regex(/^[a-zA-Z0-9_-]+$/)
};

/**
 * Sanitization functions
 */
export class InputSanitizer {
  /**
   * Remove potentially dangerous characters from strings
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/[<>\"']/g, '') // Remove HTML/script chars
      .replace(/[{}[\]]/g, '') // Remove object notation
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .trim()
      .substring(0, 1000); // Limit length
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key names
        const cleanKey = this.sanitizeString(key);
        if (cleanKey.length > 0) {
          sanitized[cleanKey] = this.sanitizeObject(value);
        }
      }
      return sanitized;
    }
    
    return obj;
  }

  /**
   * Validate and sanitize SQL query parameters
   */
  static sanitizeQueryParams(request: NextRequest): Record<string, string> {
    const params: Record<string, string> = {};
    const url = new URL(request.url);
    
    for (const [key, value] of url.searchParams.entries()) {
      const cleanKey = this.sanitizeString(key);
      const cleanValue = this.sanitizeString(value);
      
      if (cleanKey.length > 0 && cleanValue.length > 0) {
        params[cleanKey] = cleanValue;
      }
    }
    
    return params;
  }
}

/**
 * Request validation middleware
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  options: {
    sanitize?: boolean;
    source?: 'body' | 'query' | 'params';
  } = {}
) {
  const { sanitize = true, source = 'body' } = options;

  return async (request: NextRequest): Promise<{ data: T } | { error: NextResponse }> => {
    try {
      let rawData: any;

      // Extract data based on source
      switch (source) {
        case 'body':
          try {
            rawData = await request.json();
          } catch {
            return {
              error: NextResponse.json(
                { error: 'Invalid JSON in request body' },
                { status: 400 }
              )
            };
          }
          break;
          
        case 'query':
          rawData = InputSanitizer.sanitizeQueryParams(request);
          break;
          
        case 'params':
          // Extract from URL path parameters (would need router context)
          rawData = {};
          break;
          
        default:
          return {
            error: NextResponse.json(
              { error: 'Invalid validation source' },
              { status: 500 }
            )
          };
      }

      // Sanitize input if enabled
      if (sanitize) {
        rawData = InputSanitizer.sanitizeObject(rawData);
      }

      // Validate with schema
      const result = schema.safeParse(rawData);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return {
          error: NextResponse.json(
            { 
              error: 'Validation failed', 
              details: errors,
              received: Object.keys(rawData)
            },
            { status: 400 }
          )
        };
      }

      return { data: result.data };

    } catch (error) {
      return {
        error: NextResponse.json(
          { error: 'Request validation error' },
          { status: 400 }
        )
      };
    }
  };
}

/**
 * Security audit log
 */
export class SecurityAudit {
  static securityEvents: Array<{
    timestamp: Date;
    type: string;
    clientId: string;
    details: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [];

  static log(type: string, clientId: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'low') {
    this.securityEvents.push({
      timestamp: new Date(),
      type,
      clientId,
      details,
      severity
    });

    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    // Log critical events immediately
    if (severity === 'critical' || severity === 'high') {
      console.warn(`[SECURITY] ${severity.toUpperCase()}: ${type}`, {
        clientId,
        details,
        timestamp: new Date().toISOString()
      });
    }
  }

  static getRecentEvents(hours: number = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.securityEvents.filter(event => event.timestamp > cutoff);
  }

  static getEventsByType(type: string, hours: number = 24) {
    return this.getRecentEvents(hours).filter(event => event.type === type);
  }

  static getSeverityCount(severity: 'low' | 'medium' | 'high' | 'critical', hours: number = 24) {
    return this.getRecentEvents(hours).filter(event => event.severity === severity).length;
  }
}

/**
 * Combined security and validation middleware
 */
export function withSecurityValidation<T>(
  handler: (request: NextRequest, validatedData: T) => Promise<NextResponse>,
  schema: z.ZodSchema<T>,
  config: SecurityConfig & { source?: 'body' | 'query' | 'params' } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const clientId = getClientIdentifier(request);
    
    // Security validation
    const securityError = validateRequestSecurity(request, config);
    if (securityError) {
      SecurityAudit.log('security_violation', clientId, { error: securityError }, 'medium');
      
      const errorResponse = NextResponse.json(
        { error: 'Security validation failed' },
        { status: 400 }
      );
      return applySecurityHeaders(errorResponse, config);
    }

    // Input validation
    const validator = validateRequest(schema, { source: config.source });
    const validationResult = await validator(request);
    
    if ('error' in validationResult) {
      SecurityAudit.log('validation_failure', clientId, { schema: schema.constructor.name }, 'low');
      return applySecurityHeaders(validationResult.error, config);
    }

    try {
      // Execute handler with validated data
      const response = await handler(request, validationResult.data);
      return applySecurityHeaders(response, config);
      
    } catch (error) {
      SecurityAudit.log('handler_error', clientId, { error: error instanceof Error ? error.message : 'Unknown' }, 'medium');
      
      const errorResponse = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
      return applySecurityHeaders(errorResponse, config);
    }
  };
}

/**
 * Get client identifier for rate limiting (moved from security for import)
 */
function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-remote-addr');
  
  const ip = forwarded?.split(',')[0]?.trim() || realIp || remoteAddr || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const shortUA = userAgent.substring(0, 50);
  
  return `${ip}-${shortUA}`;
}