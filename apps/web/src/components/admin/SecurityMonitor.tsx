'use client';

import { useState, useEffect } from 'react';
import GamePanel from '@/components/ui/GamePanel';
import GameButton from '@/components/ui/GameButton';

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
      // TODO: Implement API endpoint for security alerts
      // For now, show the structure needed
      setAlerts([]);
    } catch (error) {
      // Error loading security alerts
    } finally {
      setIsLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true }
          : alert
      ));
    } catch (error) {
      // Error acknowledging alert
    }
  };

  const acknowledgeAll = async () => {
    try {
      setAlerts(prev => prev.map(alert => ({ ...alert, acknowledged: true })));
    } catch (error) {
      // Error acknowledging all alerts
    }
  };

  if (!isAdmin) return null;

  const filteredAlerts = alerts.filter(alert => {
    switch (filter) {
      case 'unacknowledged':
        return !alert.acknowledged;
      case 'critical':
        return alert.severity === 'critical';
      case 'all':
      default:
        return true;
    }
  });

  const criticalCount = alerts.filter(alert => !alert.acknowledged && alert.severity === 'critical').length;
  const unacknowledgedCount = alerts.filter(alert => !alert.acknowledged).length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'suspicious_login': return '🔐';
      case 'rate_limit_exceeded': return '⚡';
      case 'admin_access': return '👑';
      case 'data_breach_attempt': return '🛡️';
      case 'unusual_activity': return '👀';
      default: return '⚠️';
    }
  };

  return (
    <GamePanel style={{ margin: '20px 0' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3>🔒 Security Monitor</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {criticalCount > 0 && (
            <span style={{ 
              background: '#dc3545',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
              animation: 'pulse 2s infinite'
            }}>
              {criticalCount} CRITICAL
            </span>
          )}
          {unacknowledgedCount > 0 && (
            <span style={{ 
              background: '#ffc107',
              color: '#000',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {unacknowledgedCount} new
            </span>
          )}
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            style={{
              background: '#1a1511',
              border: '1px solid #533b2c',
              color: '#f1e5c8',
              padding: '4px 8px',
              borderRadius: '4px'
            }}
          >
            <option value="unacknowledged">New Alerts</option>
            <option value="critical">Critical Only</option>
            <option value="all">All Alerts</option>
          </select>
          {unacknowledgedCount > 0 && (
            <GameButton 
              size="small" 
              variant="primary"
              onClick={acknowledgeAll}
            >
              ✓ Ack All
            </GameButton>
          )}
          <GameButton 
            size="small" 
            onClick={loadSecurityAlerts}
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
        maxHeight: '500px',
        overflowY: 'auto'
      }}>
        {isLoading ? (
          <p style={{ textAlign: 'center', color: '#9b8c70' }}>
            Loading security alerts...
          </p>
        ) : filteredAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: '#28a745', marginBottom: '8px', fontSize: '18px' }}>
              🛡️ All Secure
            </p>
            <p style={{ color: '#9b8c70', marginBottom: '8px' }}>
              {filter === 'unacknowledged' 
                ? 'No new security alerts'
                : filter === 'critical'
                  ? 'No critical security issues'
                  : 'No security alerts found'
              }
            </p>
            <p style={{ fontSize: '12px', color: '#7a6b5a' }}>
              Security monitoring is active and protecting your application.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredAlerts.map(alert => (
              <div
                key={alert.id}
                style={{
                  background: alert.acknowledged 
                    ? 'rgba(26, 21, 17, 0.3)' 
                    : alert.severity === 'critical'
                      ? 'rgba(220, 53, 69, 0.1)'
                      : alert.severity === 'high'
                        ? 'rgba(253, 126, 20, 0.1)'
                        : 'rgba(255, 193, 7, 0.1)',
                  border: `2px solid ${
                    alert.acknowledged 
                      ? '#533b2c'
                      : getSeverityColor(alert.severity)
                  }`,
                  borderRadius: '4px',
                  padding: '12px',
                  ...(alert.severity === 'critical' && !alert.acknowledged && {
                    boxShadow: `0 0 10px ${getSeverityColor(alert.severity)}40`
                  })
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>
                      {getTypeIcon(alert.type)}
                    </span>
                    <span style={{ fontSize: '16px' }}>
                      {getSeverityIcon(alert.severity)}
                    </span>
                    <span style={{ 
                      fontWeight: 'bold',
                      color: alert.acknowledged ? '#7a6b5a' : getSeverityColor(alert.severity)
                    }}>
                      {alert.severity.toUpperCase()}
                    </span>
                    {alert.acknowledged && (
                      <span style={{
                        background: '#28a745',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}>
                        ACKNOWLEDGED
                      </span>
                    )}
                  </div>
                  {!alert.acknowledged && (
                    <GameButton
                      size="small"
                      variant="primary"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      ✓ Acknowledge
                    </GameButton>
                  )}
                </div>

                <div style={{ 
                  fontSize: '12px', 
                  color: '#9b8c70',
                  marginBottom: '8px'
                }}>
                  {new Date(alert.timestamp).toLocaleString()} • {alert.type.replace('_', ' ')}
                </div>

                <div style={{ 
                  marginBottom: '8px',
                  color: alert.acknowledged ? '#7a6b5a' : '#f1e5c8',
                  fontWeight: alert.severity === 'critical' ? 'bold' : 'normal'
                }}>
                  {alert.message}
                </div>

                {(alert.userId || alert.ipAddress || alert.userAgent) && (
                  <div style={{ 
                    fontSize: '12px',
                    color: '#9b8c70',
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '8px',
                    borderRadius: '4px',
                    marginTop: '8px'
                  }}>
                    {alert.userId && <div>User ID: {alert.userId}</div>}
                    {alert.ipAddress && <div>IP: {alert.ipAddress}</div>}
                    {alert.userAgent && <div>User Agent: {alert.userAgent.substring(0, 50)}...</div>}
                    {alert.action && <div>Action: {alert.action}</div>}
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
        background: 'rgba(220, 53, 69, 0.1)',
        border: '1px solid #dc3545',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        <h4 style={{ color: '#dc3545', margin: '0 0 8px 0' }}>🚨 Security Alert Types</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', color: '#9b8c70' }}>
          <div>🔐 Suspicious Logins</div>
          <div>⚡ Rate Limit Violations</div>
          <div>👑 Admin Access Attempts</div>
          <div>🛡️ Data Breach Attempts</div>
          <div>👀 Unusual User Activity</div>
        </div>
        <p style={{ margin: '8px 0 0 0', color: '#9b8c70', fontSize: '11px' }}>
          Critical alerts require immediate attention. Acknowledge alerts once investigated.
        </p>
      </div>
    </GamePanel>
  );
}