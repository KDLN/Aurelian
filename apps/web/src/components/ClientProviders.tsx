'use client';

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query-client';
import { ErrorBoundary } from './ErrorBoundary';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  // Expose query client for debugging in development
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    (window as any).queryClient = queryClient;
  }

  const handleQueryError = (error: Error, errorInfo?: React.ErrorInfo) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('React Query Provider error:', error, errorInfo);
    }
    
    // TODO: Send to error tracking service
    // Example: Sentry.captureException(error, { tags: { component: 'QueryProvider' } });
  };

  return (
    <ErrorBoundary onError={handleQueryError}>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}