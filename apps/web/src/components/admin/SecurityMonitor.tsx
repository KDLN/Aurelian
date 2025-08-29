'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface SecurityAlert {
  id: string;
  type: 'suspicious_login' | 'rate_limit_exceeded' | 'admin_access' | 'data_breach_attempt' | 'unusual_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  message: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  action?: string;
  acknowledged: boolean;
}

interface SecurityMonitorProps {
  isAdmin: boolean;
}

export default function SecurityMonitor({ isAdmin }: SecurityMonitorProps) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'critical'>('unacknowledged');

  useEffect(() => {
    if (!isAdmin) return;

    loadSecurityAlerts();
    
    // Check for new security alerts every 15 seconds
    const interval = setInterval(loadSecurityAlerts, 15000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const loadSecurityAlerts = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/security/alerts?filter=${filter}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const { data } = await response.json();
        setAlerts(data.alerts || []);
      } else {
        console.error('Failed to load security alerts');
        setAlerts([]);
      }
    } catch (error) {
      console.error('Error loading security alerts:', error);
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/security/alerts', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ alertId, acknowledged: true })
      });

      if (response.ok) {
        // Update local state optimistically
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true }
            : alert
        ));
      } else {
        console.error('Failed to acknowledge alert');
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  if (!isAdmin) return null;

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'critical') return alert.severity === 'critical';
    if (filter === 'unacknowledged') return !alert.acknowledged;
    return true;
  });

  const criticalCount = alerts.filter(alert => !alert.acknowledged && alert.severity === 'critical').length;
  const unacknowledgedCount = alerts.filter(alert => !alert.acknowledged).length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'low': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🔵';
      default: return '⚪';
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          🛡️ Security Monitor
        </h3>
        <div className="flex gap-3 items-center">
          {criticalCount > 0 && (
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
              {criticalCount} critical
            </span>
          )}
          {unacknowledgedCount > 0 && (
            <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">
              {unacknowledgedCount} unacknowledged
            </span>
          )}
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-slate-700 border border-slate-600 text-white px-3 py-1 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="unacknowledged">Unacknowledged</option>
            <option value="critical">Critical Only</option>
            <option value="all">All Alerts</option>
          </select>
          <button 
            onClick={loadSecurityAlerts}
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
            Loading security alerts...
          </p>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-300 mb-2">
              {filter === 'critical' ? '✅ No critical alerts' : 
               filter === 'unacknowledged' ? '✅ No unacknowledged alerts' : 
               '📊 No security alerts'}
            </p>
            <p className="text-sm text-gray-400">
              {filter === 'unacknowledged' 
                ? 'All security alerts have been acknowledged!'
                : 'Security monitoring is active and ready.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map(alert => (
              <div
                key={alert.id}
                className={`rounded-lg p-4 border ${
                  alert.acknowledged 
                    ? 'bg-slate-700/30 border-slate-600' 
                    : getSeverityColor(alert.severity)
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {getSeverityIcon(alert.severity)}
                      </span>
                      <span className={`font-bold text-sm ${
                        alert.acknowledged ? 'text-gray-400' : 
                        alert.severity === 'critical' ? 'text-red-400' :
                        alert.severity === 'high' ? 'text-orange-400' :
                        alert.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                      }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {alert.type.replace('_', ' ').toUpperCase()}
                      </span>
                      {alert.acknowledged && (
                        <span className="bg-green-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                          ACKNOWLEDGED
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                    >
                      ✓ Acknowledge
                    </button>
                  )}
                </div>

                <div className={`mb-3 ${alert.acknowledged ? 'text-gray-400' : 'text-gray-200'}`}>
                  {alert.message}
                </div>

                <div className="text-xs text-gray-400 bg-black/20 p-3 rounded border border-slate-600">
                  {alert.userId && (
                    <div className="mb-1">User: <span className="font-mono">{alert.userId}</span></div>
                  )}
                  {alert.ipAddress && (
                    <div className="mb-1">IP: <span className="font-mono">{alert.ipAddress}</span></div>
                  )}
                  {alert.userAgent && (
                    <div className="mb-1">User Agent: <span className="font-mono text-xs">{alert.userAgent}</span></div>
                  )}
                  {alert.action && (
                    <div>Action: <span className="font-mono">{alert.action}</span></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
        <h4 className="text-orange-400 text-sm font-semibold mb-2">🛡️ Security Monitoring Info</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Alerts are generated automatically for suspicious activities</li>
          <li>• Critical alerts require immediate attention and investigation</li>
          <li>• Acknowledge alerts after reviewing and taking appropriate action</li>
          <li>• Alert history is kept for 30 days for security auditing</li>
        </ul>
      </div>
    </div>
  );
}