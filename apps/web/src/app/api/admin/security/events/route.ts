import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api/server-utils';
import { SecurityAudit } from '@/lib/api/middleware/validation';
import { handleApiError } from '@/lib/api/error-handler';
import type { AuthUser } from '@/types/api';

/**
 * Security Events Monitoring API
 * GET /api/admin/security/events
 * 
 * Provides security audit logs and threat monitoring
 * Admin only access
 */

async function getSecurityEvents(request: NextRequest, user: AuthUser): Promise<NextResponse> {
  try {
    // Verify admin access
    if (!user.isAdmin) {
      return apiError('Access denied - Admin only', 403);
    }

    const url = new URL(request.url);
    const hours = parseInt(url.searchParams.get('hours') || '24');
    const severity = url.searchParams.get('severity') as 'low' | 'medium' | 'high' | 'critical' | null;
    const type = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit') || '100');

    // Get recent security events
    let events = SecurityAudit.getRecentEvents(hours);

    // Filter by severity if specified
    if (severity) {
      events = events.filter(event => event.severity === severity);
    }

    // Filter by type if specified
    if (type) {
      events = events.filter(event => event.type === type);
    }

    // Limit results
    events = events.slice(0, limit);

    // Get summary statistics
    const summary = {
      totalEvents: SecurityAudit.getRecentEvents(hours).length,
      criticalEvents: SecurityAudit.getSeverityCount('critical', hours),
      highSeverityEvents: SecurityAudit.getSeverityCount('high', hours),
      mediumSeverityEvents: SecurityAudit.getSeverityCount('medium', hours),
      lowSeverityEvents: SecurityAudit.getSeverityCount('low', hours),
      
      eventTypes: {
        securityViolations: SecurityAudit.getEventsByType('security_violation', hours).length,
        validationFailures: SecurityAudit.getEventsByType('validation_failure', hours).length,
        rateLimitHits: SecurityAudit.getEventsByType('rate_limit_exceeded', hours).length,
        authFailures: SecurityAudit.getEventsByType('auth_failure', hours).length,
        handlerErrors: SecurityAudit.getEventsByType('handler_error', hours).length
      }
    };

    // Security recommendations
    const recommendations = generateSecurityRecommendations(summary);

    return apiSuccess({
      events: events.map(event => ({
        ...event,
        timestamp: event.timestamp.toISOString()
      })),
      summary,
      recommendations,
      filters: { hours, severity, type, limit }
    });

  } catch (error) {
    return handleApiError(error, 'Failed to fetch security events');
  }
}

function generateSecurityRecommendations(summary: any): string[] {
  const recommendations: string[] = [];
  
  if (summary.criticalEvents > 0) {
    recommendations.push('🚨 Critical security events detected - immediate review required');
  }
  
  if (summary.eventTypes.securityViolations > 10) {
    recommendations.push('⚠️ High number of security violations - consider IP blocking');
  }
  
  if (summary.eventTypes.rateLimitHits > 50) {
    recommendations.push('📊 Frequent rate limiting - consider adjusting limits or adding CAPTCHA');
  }
  
  if (summary.eventTypes.authFailures > 20) {
    recommendations.push('🔐 Multiple authentication failures - monitor for brute force attacks');
  }
  
  if (summary.eventTypes.validationFailures > 100) {
    recommendations.push('🛡️ Many validation failures - possible automated attack attempts');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ Security metrics are within normal ranges');
  }
  
  return recommendations;
}

async function clearSecurityEvents(request: NextRequest, user: AuthUser): Promise<NextResponse> {
  try {
    if (!user.isAdmin) {
      return apiError('Access denied - Admin only', 403);
    }

    // Clear security audit log
    SecurityAudit.securityEvents.length = 0;
    
    return apiSuccess({
      message: 'Security audit log cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error, 'Failed to clear security events');
  }
}

// Export route handlers with auth wrapper
export const GET = withAuth(getSecurityEvents);
export const DELETE = withAuth(clearSecurityEvents);