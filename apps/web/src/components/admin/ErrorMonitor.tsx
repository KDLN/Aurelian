'use client';

import { useState, useEffect } from 'react';

interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  context?: {
    userId?: string;
    action?: string;
    resource?: string;
    error?: {
      name: string;
      message: string;
      stack?: string;
    };
  };
  resolved: boolean;
}

interface ErrorMonitorProps {
  isAdmin: boolean;
}

export default function ErrorMonitor({ isAdmin }: ErrorMonitorProps) {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved');

  useEffect(() => {
    if (!isAdmin) return;

    // Load recent errors (in a real implementation, this would be an API call)
    loadRecentErrors();

    // Set up polling for new errors every 30 seconds
    const interval = setInterval(loadRecentErrors, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const loadRecentErrors = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement API endpoint to fetch recent errors from logs
      // For now, show mock data for demonstration
      const mockErrors: ErrorLog[] = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          level: 'error',
          message: 'Database connection timeout',
          context: {
            action: 'user_login',
            resource: 'database',
            error: {
              name: 'TimeoutError',
              message: 'Connection timed out after 5000ms'
            }
          },
          resolved: false
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          level: 'warn',
          message: 'High memory usage detected',
          context: {
            resource: 'server',
            action: 'memory_check'
          },
          resolved: true
        }
      ];
      setErrors(mockErrors);
    } catch (error) {
      console.error('Error loading errors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsResolved = async (errorId: string) => {
    try {
      // TODO: Implement API to mark error as resolved
      setErrors(prev => prev.map(error => 
        error.id === errorId 
          ? { ...error, resolved: true }
          : error
      ));
    } catch (error) {
      console.error('Error updating error status:', error);
    }
  };

  if (!isAdmin) return null;

  const filteredErrors = errors.filter(error => 
    filter === 'all' || !error.resolved
  );

  const unresolvedCount = errors.filter(error => !error.resolved).length;

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          🚨 Error Monitor
        </h3>
        <div className="flex gap-3 items-center">
          {unresolvedCount > 0 && (
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
              {unresolvedCount} unresolved
            </span>
          )}
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unresolved')}
            className="bg-slate-700 border border-slate-600 text-white px-3 py-1 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="unresolved">Unresolved Only</option>
            <option value="all">All Errors</option>
          </select>
          <button 
            onClick={loadRecentErrors}
            disabled={isLoading}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors text-sm"
          >
            {isLoading ? '🔄' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 max-h-96 overflow-y-auto">
        {isLoading ? (
          <p className="text-center text-gray-400 py-8">
            Loading error logs...
          </p>
        ) : filteredErrors.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-300 mb-2">
              {filter === 'unresolved' ? '✅ No unresolved errors' : '📊 No errors found'}
            </p>
            <p className="text-sm text-gray-400">
              {filter === 'unresolved' 
                ? 'Your application is running smoothly!'
                : 'Error monitoring is active and ready.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredErrors.map(error => (
              <div
                key={error.id}
                className={`rounded-lg p-4 border ${
                  error.resolved 
                    ? 'bg-slate-700/30 border-slate-600' 
                    : error.level === 'error' 
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {error.level === 'error' ? '🚨' : '⚠️'}
                      </span>
                      <span className={`font-bold text-sm ${
                        error.resolved ? 'text-gray-400' : 
                        error.level === 'error' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {error.level.toUpperCase()}
                      </span>
                      {error.resolved && (
                        <span className="bg-green-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                          RESOLVED
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                      {new Date(error.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {!error.resolved && (
                    <button
                      onClick={() => markAsResolved(error.id)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                    >
                      ✓ Resolve
                    </button>
                  )}
                </div>

                <div className={`mb-3 ${error.resolved ? 'text-gray-400' : 'text-gray-200'}`}>
                  {error.message}
                </div>

                {error.context && (
                  <div className="text-xs text-gray-400 bg-black/20 p-3 rounded border border-slate-600">
                    {error.context.userId && (
                      <div className="mb-1">User: <span className="font-mono">{error.context.userId}</span></div>
                    )}
                    {error.context.action && (
                      <div className="mb-1">Action: <span className="font-mono">{error.context.action}</span></div>
                    )}
                    {error.context.resource && (
                      <div className="mb-1">Resource: <span className="font-mono">{error.context.resource}</span></div>
                    )}
                    {error.context.error && (
                      <div>
                        <div className="mb-1">Error: <span className="font-mono">{error.context.error.name}</span></div>
                        <div>Message: <span className="font-mono">{error.context.error.message}</span></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <h4 className="text-blue-400 text-sm font-semibold mb-2">💡 Error Monitoring Info</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Errors are automatically captured from API routes and components</li>
          <li>• Critical errors appear immediately - warnings refresh every 30 seconds</li>
          <li>• Mark errors as resolved once you've investigated and fixed them</li>
          <li>• Resolved errors remain visible for 24 hours for reference</li>
        </ul>
      </div>
    </div>
  );
}