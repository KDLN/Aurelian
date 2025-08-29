'use client';

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import Link from 'next/link';

interface PageErrorBoundaryProps {
  children: React.ReactNode;
  pageName?: string;
}

export default function PageErrorBoundary({ children, pageName }: PageErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log error with page context
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error in ${pageName || 'page'}:`, error, errorInfo);
    }

    // TODO: Send to error tracking with page context
    // Example: Sentry.captureException(error, {
    //   tags: { page: pageName },
    //   contexts: { react: errorInfo }
    // });
  };

  const fallback = (
    <div style={{
      minHeight: '400px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
      backgroundColor: '#1a1511',
      color: '#f1e5c8',
      borderRadius: '8px',
      margin: '20px',
      border: '2px solid #533b2c'
    }}>
      <div style={{
        fontSize: '48px',
        marginBottom: '20px'
      }}>
        ⚠️
      </div>
      
      <h1 style={{
        fontSize: '24px',
        color: '#f1e5c8',
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        {pageName ? `${pageName} Encountered an Error` : 'Page Error'}
      </h1>
      
      <p style={{
        fontSize: '16px',
        color: '#c7b99c',
        textAlign: 'center',
        marginBottom: '32px',
        maxWidth: '500px',
        lineHeight: '1.5'
      }}>
        Something went wrong while loading this page. The error has been logged and our team will investigate.
      </p>

      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            backgroundColor: '#68b06e',
            color: '#1a1511',
            border: 'none',
            borderRadius: '6px',
            fontFamily: 'inherit',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Try Again
        </button>
        
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#533b2c',
            color: '#f1e5c8',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          Go Home
        </Link>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: '#231913',
          border: '1px solid #533b2c',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#c7b99c'
        }}>
          <strong>Development Mode:</strong> Check browser console for detailed error information
        </div>
      )}
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
}