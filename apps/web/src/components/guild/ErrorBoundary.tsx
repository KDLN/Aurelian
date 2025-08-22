'use client';

import React, { Component } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Guild component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="game-card">
          <div className="game-center game-bad">
            <h3>⚠️ Something went wrong</h3>
            <p>A guild component encountered an error.</p>
            {this.state.error && (
              <details style={{ marginTop: '16px' }}>
                <summary className="game-btn game-btn-small" style={{ cursor: 'pointer' }}>
                  Show Details
                </summary>
                <pre className="game-small" style={{ 
                  marginTop: '8px', 
                  padding: '8px', 
                  background: '#1a1511',
                  border: '1px solid #533b2c',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '200px'
                }}>
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <button 
              className="game-btn game-btn-primary"
              onClick={() => this.setState({ hasError: false, error: undefined })}
              style={{ marginTop: '16px' }}
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}