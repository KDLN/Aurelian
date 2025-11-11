import { NextRequest } from 'next/server'
import { logAdminAction } from './admin-logger'

export interface AdminRequestContext {
  adminUserId: string
  ipAddress: string
  userAgent: string
}

/**
 * Extract admin context from request
 */
export function getAdminContext(request: NextRequest): AdminRequestContext | null {
  // This would typically extract from JWT or session
  // For now, we'll use a simple header-based approach
  const adminUserId = request.headers.get('x-admin-user-id')
  
  if (!adminUserId) {
    return null
  }

  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
  
  const userAgent = request.headers.get('user-agent') || 'unknown'

  return {
    adminUserId,
    ipAddress,
    userAgent
  }
}

/**
 * Log admin API access
 */
export async function logAdminAccess(
  context: AdminRequestContext,
  method: string,
  path: string,
  body?: any
) {
  const resourceType = extractResourceType(path)
  const action = mapMethodToAction(method)
  
  return logAdminAction.access(
    context.adminUserId,
    resourceType,
    {
      method,
      path,
      bodySize: body ? JSON.stringify(body).length : 0
    },
    {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    }
  )
}

/**
 * Log admin resource operations
 */
export async function logResourceOperation(
  context: AdminRequestContext,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  resourceType: string,
  resourceId?: string,
  changes?: any
) {
  switch (action) {
    case 'CREATE':
      return logAdminAction.create(
        context.adminUserId,
        resourceType,
        resourceId || 'unknown',
        changes,
        {
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        }
      )
    case 'UPDATE':
      return logAdminAction.update(
        context.adminUserId,
        resourceType,
        resourceId || 'unknown',
        changes,
        {
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        }
      )
    case 'DELETE':
      return logAdminAction.delete(
        context.adminUserId,
        resourceType,
        resourceId || 'unknown',
        changes,
        {
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        }
      )
  }
}

/**
 * Extract resource type from API path
 */
function extractResourceType(path: string): string {
  const segments = path.split('/').filter(Boolean)
  
  // Handle /api/admin/[resource] patterns
  if (segments[0] === 'api' && segments[1] === 'admin' && segments[2]) {
    return segments[2].toUpperCase()
  }
  
  return 'UNKNOWN'
}

/**
 * Map HTTP method to action
 */
function mapMethodToAction(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'VIEW'
    case 'POST':
      return 'CREATE'
    case 'PUT':
    case 'PATCH':
      return 'UPDATE'
    case 'DELETE':
      return 'DELETE'
    default:
      return method.toUpperCase()
  }
}

/**
 * Wrapper for admin API handlers that automatically logs actions
 */
export function withAdminLogging<T extends (...args: any[]) => any>(
  handler: T,
  resourceType?: string
): T {
  return (async (...args: Parameters<T>) => {
    const request = args[0] as NextRequest
    const context = getAdminContext(request)
    
    if (context) {
      // Log the access
      await logAdminAccess(
        context,
        request.method,
        request.nextUrl.pathname,
        request.body
      )
    }
    
    // Call the original handler
    const result = await handler(...args)
    
    // If it's a mutation and we have context, log the operation
    if (context && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const action = mapMethodToAction(request.method) as 'CREATE' | 'UPDATE' | 'DELETE'
      const resource = resourceType || extractResourceType(request.nextUrl.pathname)
      
      // Try to extract resource ID from the result or path
      const resourceId = extractResourceId(request.nextUrl.pathname, result)
      
      await logResourceOperation(
        context,
        action,
        resource,
        resourceId,
        { method: request.method, path: request.nextUrl.pathname }
      )
    }
    
    return result
  }) as T
}

/**
 * Extract resource ID from path or response
 */
function extractResourceId(path: string, response?: any): string | undefined {
  const segments = path.split('/').filter(Boolean)
  
  // Look for ID in path (e.g., /api/admin/items/123)
  const lastSegment = segments[segments.length - 1]
  if (lastSegment && !isNaN(Number(lastSegment))) {
    return lastSegment
  }
  
  // Look for ID in response
  if (response && typeof response === 'object' && response.id) {
    return String(response.id)
  }
  
  return undefined
}