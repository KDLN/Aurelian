import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
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