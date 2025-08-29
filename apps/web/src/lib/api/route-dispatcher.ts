import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from './error-handler';

/**
 * API Route Dispatcher
 * Consolidates multiple endpoints into single service handlers
 * This reduces memory usage and improves performance by eliminating duplicate route files
 */

export interface RouteHandler {
  (request: NextRequest, ...args: any[]): Promise<NextResponse>;
}

export interface RouteMap {
  [method: string]: {
    [path: string]: RouteHandler;
  };
}

/**
 * Creates a consolidated route handler that can handle multiple endpoints
 */
export function createRouteDispatcher(routes: RouteMap) {
  return {
    GET: async (request: NextRequest, context?: { params: any }) => {
      return handleRequest(request, 'GET', routes, context);
    },
    POST: async (request: NextRequest, context?: { params: any }) => {
      return handleRequest(request, 'POST', routes, context);
    },
    PUT: async (request: NextRequest, context?: { params: any }) => {
      return handleRequest(request, 'PUT', routes, context);
    },
    DELETE: async (request: NextRequest, context?: { params: any }) => {
      return handleRequest(request, 'DELETE', routes, context);
    },
    PATCH: async (request: NextRequest, context?: { params: any }) => {
      return handleRequest(request, 'PATCH', routes, context);
    }
  };
}

/**
 * Handle incoming request by routing to appropriate handler
 */
async function handleRequest(
  request: NextRequest,
  method: string,
  routes: RouteMap,
  context?: { params: any }
): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Extract the endpoint path from the URL
    // This handles both direct routes and parameterized routes
    const routePath = extractRoutePath(pathname);
    
    // Find matching handler
    const methodRoutes = routes[method];
    if (!methodRoutes) {
      return NextResponse.json(
        { error: `Method ${method} not allowed` },
        { status: 405 }
      );
    }

    // Try exact match first
    let handler = methodRoutes[routePath];
    
    // If no exact match, try pattern matching for parameterized routes
    if (!handler) {
      for (const [pattern, patternHandler] of Object.entries(methodRoutes)) {
        if (matchesPattern(routePath, pattern)) {
          handler = patternHandler;
          break;
        }
      }
    }

    if (!handler) {
      return NextResponse.json(
        { error: 'Endpoint not found' },
        { status: 404 }
      );
    }

    // Call the handler with context
    return await handler(request, context);

  } catch (error) {
    return handleApiError(error, 'Route dispatcher error');
  }
}

/**
 * Extract route path from full pathname
 * /api/admin/users -> /users
 * /api/user/profile -> /profile
 */
function extractRoutePath(pathname: string): string {
  // Remove /api prefix and service prefix
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'api' && parts.length > 2) {
    // Return the path after /api/{service}/
    return '/' + parts.slice(2).join('/');
  }
  return pathname;
}

/**
 * Check if a route path matches a pattern
 * /user/123 matches /user/[id]
 */
function matchesPattern(path: string, pattern: string): boolean {
  const pathParts = path.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);
  
  if (pathParts.length !== patternParts.length) {
    return false;
  }
  
  for (let i = 0; i < pathParts.length; i++) {
    const pathPart = pathParts[i];
    const patternPart = patternParts[i];
    
    // Skip dynamic segments (enclosed in brackets)
    if (patternPart.startsWith('[') && patternPart.endsWith(']')) {
      continue;
    }
    
    // Must match exactly for static segments
    if (pathPart !== patternPart) {
      return false;
    }
  }
  
  return true;
}

/**
 * Extract parameters from a route path using a pattern
 * extractParams('/user/123', '/user/[id]') -> { id: '123' }
 */
export function extractRouteParams(path: string, pattern: string): Record<string, string> {
  const params: Record<string, string> = {};
  const pathParts = path.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);
  
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    
    if (patternPart.startsWith('[') && patternPart.endsWith(']')) {
      const paramName = patternPart.slice(1, -1);
      params[paramName] = pathParts[i];
    }
  }
  
  return params;
}

/**
 * Utility to create a simple GET/POST route handler
 */
export function createSimpleRoute(
  getHandler?: RouteHandler,
  postHandler?: RouteHandler,
  putHandler?: RouteHandler,
  deleteHandler?: RouteHandler
) {
  return {
    ...(getHandler && { GET: getHandler }),
    ...(postHandler && { POST: postHandler }),
    ...(putHandler && { PUT: putHandler }),
    ...(deleteHandler && { DELETE: deleteHandler })
  };
}