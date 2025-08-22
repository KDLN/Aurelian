'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query-client';
import React from 'react';

interface QueryProviderProps {
  children: React.ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  // Expose query client for debugging in development
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    (window as any).queryClient = queryClient;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children as any}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}