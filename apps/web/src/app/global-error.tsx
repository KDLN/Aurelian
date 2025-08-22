'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#2a1f1a',
          color: '#f1e5c8',
          fontFamily: 'ui-monospace,Menlo,Consolas,monospace',
          padding: '20px'
        }}>
          <h1 style={{ fontSize: '2rem', margin: '0', color: '#d4af37' }}>
            Something went wrong!
          </h1>
          <p style={{ fontSize: '1rem', margin: '16px 0', textAlign: 'center' }}>
            An error occurred while rendering the page.
          </p>
          <button 
            onClick={reset}
            style={{
              marginTop: '24px',
              padding: '12px 24px',
              backgroundColor: '#6e462b',
              border: '2px solid #986540',
              borderRadius: '4px',
              color: '#f1e5c8',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}