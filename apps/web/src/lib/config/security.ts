/**
 * Security configuration for production deployment
 * Centralizes all security settings and policies
 */

export const SecurityConfig = {
  // Rate limiting configuration
  rateLimiting: {
    // General API endpoints
    general: {
      windowMs: 60 * 1000,      // 1 minute
      maxRequests: 100,         // 100 requests per minute
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
    
    // Authentication endpoints
    auth: {
      windowMs: 5 * 60 * 1000,  // 5 minutes
      maxRequests: 10,          // 10 attempts per 5 minutes
      skipSuccessfulRequests: true,
      skipFailedRequests: false,
    },
    
    // Admin endpoints
    admin: {
      windowMs: 60 * 1000,      // 1 minute
      maxRequests: 50,          // 50 requests per minute
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
    
    // Trading endpoints (higher limit for active trading)
    trading: {
      windowMs: 60 * 1000,      // 1 minute
      maxRequests: 200,         // 200 requests per minute
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
    
    // Public endpoints
    public: {
      windowMs: 60 * 1000,      // 1 minute
      maxRequests: 30,          // 30 requests per minute
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    }
  },

  // Request size limits
  requestLimits: {
    general: 10 * 1024 * 1024,   // 10MB general
    admin: 5 * 1024 * 1024,      // 5MB admin
    auth: 1 * 1024 * 1024,       // 1MB auth
    trading: 512 * 1024,         // 512KB trading
    public: 256 * 1024,          // 256KB public
  },

  // CORS configuration
  cors: {
    production: [
      'https://aurelian.app',
      'https://www.aurelian.app',
      'https://api.aurelian.app'
    ],
    development: [
      'http://localhost:3000',
      'https://localhost:3000',
      'http://127.0.0.1:3000'
    ],
    staging: [
      'https://staging.aurelian.app',
      'https://preview.aurelian.app'
    ]
  },

  // Security headers
  headers: {
    // Strict Transport Security (HTTPS only)
    hsts: 'max-age=31536000; includeSubDomains; preload',
    
    // Content Security Policy
    csp: {
      production: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' wss: https: ws://localhost:8787",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; '),
      
      development: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss: http: https:",
        "frame-ancestors 'none'"
      ].join('; ')
    },
    
    // Permissions Policy
    permissions: [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'screen-wake-lock=()'
    ].join(', ')
  },

  // Input validation patterns
  validation: {
    // Blocked patterns for security
    sqlInjection: [
      'union select',
      'drop table',
      'delete from',
      'insert into',
      'update set',
      'create table',
      'alter table',
      'exec(',
      'execute(',
      'sp_',
      'xp_',
      '--',
      '/*',
      '*/'
    ],
    
    xss: [
      '<script',
      '</script>',
      'javascript:',
      'vbscript:',
      'onload=',
      'onerror=',
      'onclick=',
      'onmouseover=',
      'onfocus=',
      'eval(',
      'setTimeout(',
      'setInterval(',
      'Function(',
      'alert(',
      'confirm(',
      'prompt('
    ],
    
    // File upload restrictions
    allowedFileTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/csv',
      'application/json'
    ],
    
    maxFileSize: 5 * 1024 * 1024, // 5MB
    
    // Path traversal protection
    pathTraversal: [
      '../',
      '..\\',
      './',
      '.\\',
      '~/',
      '%2e%2e',
      '%2f',
      '%5c'
    ]
  },

  // API key validation
  apiKeys: {
    minLength: 32,
    maxLength: 512,
    allowedChars: /^[a-zA-Z0-9_-]+$/,
    rotationInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
  },

  // Session security
  session: {
    maxAge: 24 * 60 * 60 * 1000,     // 24 hours
    renewThreshold: 60 * 60 * 1000,  // Renew if < 1 hour left
    maxConcurrent: 5,                // Max concurrent sessions per user
    ipBinding: true,                 // Bind session to IP
  },

  // Audit logging
  audit: {
    enabled: true,
    logSuccess: false,          // Don't log successful requests
    logErrors: true,            // Log all errors
    logSecurity: true,          // Log security events
    logAdmin: true,             // Log all admin actions
    retentionDays: 90,          // Keep logs for 90 days
    sensitiveFields: [          // Fields to redact in logs
      'password',
      'token',
      'secret',
      'key',
      'authorization'
    ]
  }
};

/**
 * Get security configuration based on environment
 */
export function getSecurityConfig() {
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';
  
  return {
    ...SecurityConfig,
    
    // Adjust settings based on environment
    rateLimiting: {
      ...SecurityConfig.rateLimiting,
      // More restrictive in production
      general: {
        ...SecurityConfig.rateLimiting.general,
        maxRequests: isProduction ? 50 : 100
      }
    },
    
    headers: {
      ...SecurityConfig.headers,
      csp: isProduction 
        ? SecurityConfig.headers.csp.production 
        : SecurityConfig.headers.csp.development
    },
    
    cors: {
      allowedOrigins: isProduction 
        ? SecurityConfig.cors.production
        : SecurityConfig.cors.development
    }
  };
}

/**
 * Security event types for audit logging
 */
export const SecurityEventTypes = {
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  XSS_ATTEMPT: 'xss_attempt',
  PATH_TRAVERSAL_ATTEMPT: 'path_traversal_attempt',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  INVALID_AUTH_TOKEN: 'invalid_auth_token',
  ADMIN_ACCESS_DENIED: 'admin_access_denied',
  SUSPICIOUS_REQUEST: 'suspicious_request',
  LARGE_REQUEST_BLOCKED: 'large_request_blocked',
  INVALID_CONTENT_TYPE: 'invalid_content_type',
  CORS_VIOLATION: 'cors_violation'
} as const;

export type SecurityEventType = typeof SecurityEventTypes[keyof typeof SecurityEventTypes];