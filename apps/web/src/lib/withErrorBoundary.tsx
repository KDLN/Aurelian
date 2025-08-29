import React from 'react';
import PageErrorBoundary from '@/components/PageErrorBoundary';

/**
 * Higher-order component to automatically wrap pages with error boundaries
 * Usage: export default withPageErrorBoundary(MyPage, 'Page Name');
 */
export function withPageErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  pageName?: string
) {
  const WithErrorBoundaryComponent = (props: P) => {
    // Auto-generate page name from component name if not provided
    const displayName = pageName || WrappedComponent.displayName || WrappedComponent.name || 'Page';
    
    return (
      <PageErrorBoundary pageName={displayName}>
        <WrappedComponent {...props} />
      </PageErrorBoundary>
    );
  };

  WithErrorBoundaryComponent.displayName = `withPageErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

/**
 * Hook to manually handle errors in components
 * Usage: const handleError = useErrorHandler(); handleError(error);
 */
export function useErrorHandler() {
  return React.useCallback((error: Error, context?: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error in ${context || 'component'}:`, error);
    }

    // TODO: Send to error tracking service
    // Example: Sentry.captureException(error, { tags: { context } });

    // Optionally show user-friendly error message
    // Could integrate with toast notifications here
  }, []);
}

/**
 * Async error wrapper for handling promises in components
 * Usage: const safeAsyncFn = withAsyncErrorHandler(asyncFn, 'Loading data');
 */
export function withAsyncErrorHandler<T extends any[], R>(
  asyncFn: (...args: T) => Promise<R>,
  context: string
): (...args: T) => Promise<R | undefined> {
  return async (...args: T) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Async error in ${context}:`, error);
      }

      // TODO: Send to error tracking service
      // Example: Sentry.captureException(error, { tags: { context, type: 'async' } });

      // Return undefined to indicate failure
      // Components should handle undefined returns gracefully
      return undefined;
    }
  };
}