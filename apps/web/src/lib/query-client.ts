import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';

// Global error handler for React Query
const globalErrorHandler = (error: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('React Query Error:', error);
  }

  // TODO: Send to error tracking service
  // Example: Sentry.captureException(error, { tags: { source: 'react-query' } });

  // Handle specific error types
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as any).status;
    
    if (status === 401) {
      // Redirect to login or refresh token
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
  }
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: globalErrorHandler,
  }),
  mutationCache: new MutationCache({
    onError: globalErrorHandler,
  }),
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes - shorter for more responsive updates
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Fewer retries to avoid blocking
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 5000), // Faster retry delays
      refetchOnWindowFocus: 'always', // Always refetch when user returns to tab
      refetchOnMount: true, // Only refetch if stale
      refetchOnReconnect: true, // Refetch when network reconnects
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 1; // Only retry once
      },
      retryDelay: 1000, // Quick retry for mutations
    },
  },
});