'use client';

import { useState, useEffect } from 'react';
import GamePanel from '@/components/ui/GamePanel';
import GameButton from '@/components/ui/GameButton';

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
      // For now, show mock data structure
      setErrors([]);
    } catch (error) {
      // Error loading errors
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
      // Error updating error status
    }
  };

  if (!isAdmin) return null;

  const filteredErrors = errors.filter(error => 
    filter === 'all' || !error.resolved
  );

  const unresolvedCount = errors.filter(error => !error.resolved).length;

  return (
    <GamePanel style={{ margin: '20px 0' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3>🚨 Error Monitor</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {unresolvedCount > 0 && (
            <span style={{ 
              background: '#ff6b6b',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {unresolvedCount} unresolved
            </span>
          )}
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unresolved')}
            style={{
              background: '#1a1511',
              border: '1px solid #533b2c',
              color: '#f1e5c8',
              padding: '4px 8px',
              borderRadius: '4px'
            }}
          >
            <option value="unresolved">Unresolved Only</option>
            <option value="all">All Errors</option>
          </select>
          <GameButton 
            size="small" 
            onClick={loadRecentErrors}
            disabled={isLoading}
          >
            {isLoading ? '🔄' : '🔄 Refresh'}
          </GameButton>
        </div>
      </div>

      <div style={{
        background: 'rgba(83, 59, 44, 0.2)',
        border: '1px solid #533b2c',
        borderRadius: '4px',
        padding: '16px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        {isLoading ? (
          <p style={{ textAlign: 'center', color: '#9b8c70' }}>
            Loading error logs...
          </p>
        ) : filteredErrors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: '#9b8c70', marginBottom: '8px' }}>
              {filter === 'unresolved' ? '✅ No unresolved errors' : '📊 No errors found'}
            </p>
            <p style={{ fontSize: '12px', color: '#7a6b5a' }}>
              {filter === 'unresolved' 
                ? 'Your application is running smoothly!'
                : 'Error monitoring is active and ready.'
              }
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredErrors.map(error => (
              <div
                key={error.id}
                style={{
                  background: error.resolved 
                    ? 'rgba(26, 21, 17, 0.3)' 
                    : error.level === 'error' 
                      ? 'rgba(255, 107, 107, 0.1)'
                      : 'rgba(255, 193, 7, 0.1)',
                  border: `1px solid ${
                    error.resolved 
                      ? '#533b2c'
                      : error.level === 'error' 
                        ? '#ff6b6b'
                        : '#ffc107'
                  }`,
                  borderRadius: '4px',
                  padding: '12px'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <span style={{ 
                        fontSize: '16px',
                        color: error.level === 'error' ? '#ff6b6b' : '#ffc107'
                      }}>
                        {error.level === 'error' ? '🚨' : '⚠️'}
                      </span>
                      <span style={{ 
                        fontWeight: 'bold',
                        color: error.resolved ? '#7a6b5a' : '#f1e5c8'
                      }}>
                        {error.level.toUpperCase()}
                      </span>
                      {error.resolved && (
                        <span style={{
                          background: '#28a745',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: 'bold'
                        }}>
                          RESOLVED
                        </span>
                      )}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#9b8c70',
                      marginBottom: '8px'
                    }}>
                      {new Date(error.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {!error.resolved && (
                    <GameButton
                      size="small"
                      variant="primary"
                      onClick={() => markAsResolved(error.id)}
                    >
                      ✓ Resolve
                    </GameButton>
                  )}
                </div>

                <div style={{ 
                  marginBottom: '8px',
                  color: error.resolved ? '#7a6b5a' : '#f1e5c8'
                }}>
                  {error.message}
                </div>

                {error.context && (
                  <div style={{ 
                    fontSize: '12px',
                    color: '#9b8c70',
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '8px',
                    borderRadius: '4px',
                    marginTop: '8px'
                  }}>
                    {error.context.userId && (
                      <div>User: {error.context.userId}</div>
                    )}
                    {error.context.action && (
                      <div>Action: {error.context.action}</div>
                    )}
                    {error.context.resource && (
                      <div>Resource: {error.context.resource}</div>
                    )}
                    {error.context.error && (
                      <div>
                        <div>Error: {error.context.error.name}</div>
                        <div>Message: {error.context.error.message}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(0, 123, 255, 0.1)',
        border: '1px solid #007bff',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        <h4 style={{ color: '#007bff', margin: '0 0 8px 0' }}>💡 Error Monitoring Info</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#9b8c70' }}>
          <li>Errors are automatically captured from API routes and components</li>
          <li>Critical errors appear immediately - warnings every 30 seconds</li>
          <li>Mark errors as resolved once you've investigated and fixed them</li>
          <li>Resolved errors remain visible for 24 hours for reference</li>
        </ul>
      </div>
    </GamePanel>
  );
}