'use client'

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />
      }
      
      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error?: Error
  resetError: () => void
}

function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
      <div className="rounded-lg bg-red-50 p-6 max-w-md">
        <div className="mb-4 text-red-600">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Something went wrong</h2>
        <p className="mb-4 text-sm text-gray-600">
          An unexpected error occurred. Please try refreshing the page.
        </p>
        
        {error && (
          <details className="mb-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Error details
            </summary>
            <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-32">
              {error.message}
            </pre>
          </details>
        )}
        
        <button
          onClick={resetError}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

// Specialized error boundaries for specific use cases
export function AdminErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={AdminErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Admin error:', error, errorInfo)
        // Could send to error reporting service
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

function AdminErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="rounded-lg bg-yellow-50 p-6 max-w-md border border-yellow-200">
        <div className="mb-4 text-yellow-600">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.19 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Admin Panel Error</h2>
        <p className="mb-4 text-sm text-gray-600">
          The admin panel encountered an error. This has been logged for review.
        </p>
        
        {error && (
          <details className="mb-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Technical details
            </summary>
            <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-32">
              {error.message}
              {error.stack && '\n' + error.stack.slice(0, 500)}
            </pre>
          </details>
        )}
        
        <div className="flex space-x-3">
          <button
            onClick={resetError}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
          <button
            onClick={() => window.location.href = '/admin'}
            className="flex-1 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700"
          >
            Back to Admin
          </button>
        </div>
      </div>
    </div>
  )
}

export function GameErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={GameErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Game error:', error, errorInfo)
        // Could send to error reporting service with game context
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

function GameErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#231913] text-[#f1e5c8]">
      <div className="rounded-lg bg-red-900/20 p-6 max-w-md border border-red-800/30">
        <div className="mb-4 text-red-400">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h2 className="mb-2 text-lg font-semibold">Game Error</h2>
        <p className="mb-4 text-sm opacity-80">
          The game encountered an error and needs to restart. Your progress has been saved.
        </p>
        
        <div className="flex space-x-3">
          <button
            onClick={resetError}
            className="flex-1 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-md hover:bg-blue-800"
          >
            Restart Game
          </button>
          <button
            onClick={() => window.location.href = '/lobby'}
            className="flex-1 px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-md hover:bg-gray-800"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    </div>
  )
}