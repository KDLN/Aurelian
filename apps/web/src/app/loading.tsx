import React from 'react';

export default function Loading() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#2a1f1a',
      color: '#f1e5c8',
      fontFamily: 'ui-monospace,Menlo,Consolas,monospace'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⚡</div>
        <div>Loading Aurelian...</div>
      </div>
    </div>
  );
}