/**
 * Production-safe logging utility for Realtime Server
 * - Only logs errors in production
 * - Sanitizes sensitive data
 * - Provides structured logging for debugging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  roomId?: string;
  userId?: string;
  sessionId?: string;
  action?: string;
  clientCount?: number;
  [key: string]: unknown;
}

class RealtimeLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isDebugEnabled = process.env.ENABLE_DEBUG_LOGS === 'true';

  private sanitizeData(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data as Record<string, unknown> };
    
    // Remove sensitive fields
    const sensitiveFields = [
      'token', 'secret', 'key', 'auth', 'authorization',
      'jwt', 'access_token', 'password', 'displayName'
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    // In production, only log warnings and errors
    if (!this.isDevelopment && !['warn', 'error'].includes(level)) {
      return;
    }

    // In development, respect debug flag for debug logs
    if (!this.isDevelopment && level === 'debug' && !this.isDebugEnabled) {
      return;
    }

    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? this.sanitizeData(context) : undefined;

    const logEntry = {
      timestamp,
      level,
      message,
      service: 'realtime',
      context: sanitizedContext,
      env: process.env.NODE_ENV
    };

    switch (level) {
      case 'error':
        console.error(JSON.stringify(logEntry));
        break;
      case 'warn':
        console.warn(JSON.stringify(logEntry));
        break;
      case 'info':
        if (this.isDevelopment) console.info(JSON.stringify(logEntry));
        break;
      case 'debug':
        if (this.isDevelopment || this.isDebugEnabled) {
          console.debug(JSON.stringify(logEntry));
        }
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined
      } : error
    };
    
    this.log('error', message, errorContext);
  }

  // Specialized logging methods for realtime events
  room(message: string, context?: Omit<LogContext, 'action'>) {
    this.log('debug', message, { ...context, action: 'room' });
  }

  auth(message: string, context?: Omit<LogContext, 'action'>) {
    this.log('info', message, { ...context, action: 'auth' });
  }

  connection(message: string, context?: Omit<LogContext, 'action'>) {
    this.log('debug', message, { ...context, action: 'connection' });
  }

  security(message: string, context?: Omit<LogContext, 'action'>) {
    this.log('warn', message, { ...context, action: 'security' });
  }

  rateLimit(message: string, context?: Omit<LogContext, 'action'>) {
    this.log('warn', message, { ...context, action: 'rate_limit' });
  }
}

export const logger = new RealtimeLogger();