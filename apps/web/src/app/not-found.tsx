import React from 'react';

export default function NotFound() {
  return (
    <div style={{
      margin: 0,
      padding: 0,
      fontFamily: 'ui-monospace,Menlo,Consolas,monospace',
      backgroundColor: '#2a1f1a',
      color: '#f1e5c8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh'
    }}>
      <h1 style={{ fontSize: '4rem', margin: '0', color: '#d4af37' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', margin: '16px 0', textAlign: 'center' }}>
        Page Not Found
      </h2>
      <p style={{ fontSize: '1rem', margin: '16px 0', textAlign: 'center', maxWidth: '600px' }}>
        The page you are looking for does not exist in the Aurelian trading realm.
      </p>
      <a 
        href="/" 
        style={{
          display: 'inline-block',
          marginTop: '24px',
          padding: '12px 24px',
          backgroundColor: '#6e462b',
          border: '2px solid #986540',
          borderRadius: '4px',
          color: '#f1e5c8',
          textDecoration: 'none',
          fontWeight: 'bold'
        }}
      >
        Return to Hub
      </a>
    </div>
  );
}