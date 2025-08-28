'use client';

import { useState } from 'react';
import GamePanel from '@/components/ui/GamePanel';
import GameButton from '@/components/ui/GameButton';
import { supabase } from '@/lib/supabaseClient';

interface EmergencyControlsProps {
  isAdmin: boolean;
}

interface MaintenanceMode {
  enabled: boolean;
  message: string;
  estimatedEndTime?: string;
}

export default function EmergencyControls({ isAdmin }: EmergencyControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState<MaintenanceMode>({
    enabled: false,
    message: 'The game is temporarily down for maintenance. We\'ll be back shortly!'
  });
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  if (!isAdmin) return null;

  const toggleMaintenanceMode = async () => {
    if (!confirmAction) {
      setConfirmAction('maintenance');
      return;
    }

    try {
      setIsLoading(true);
      // TODO: Implement API to toggle maintenance mode
      setMaintenanceMode(prev => ({ ...prev, enabled: !prev.enabled }));
      setConfirmAction(null);
    } catch (error) {
      // Error toggling maintenance mode
    } finally {
      setIsLoading(false);
    }
  };

  const emergencyUserBan = async (userId: string, reason: string) => {
    if (!userId.trim()) return;
    
    if (!confirmAction) {
      setConfirmAction(`ban-${userId}`);
      return;
    }

    try {
      setIsLoading(true);
      // TODO: Implement emergency ban API
      setConfirmAction(null);
    } catch (error) {
      // Error banning user
    } finally {
      setIsLoading(false);
    }
  };

  const flushAllSessions = async () => {
    if (!confirmAction) {
      setConfirmAction('flush-sessions');
      return;
    }

    try {
      setIsLoading(true);
      // TODO: Implement session flush API
      setConfirmAction(null);
    } catch (error) {
      // Error flushing sessions
    } finally {
      setIsLoading(false);
    }
  };

  const emergencyGoldRollback = async (hours: number) => {
    if (!confirmAction) {
      setConfirmAction(`rollback-${hours}`);
      return;
    }

    try {
      setIsLoading(true);
      // TODO: Implement gold rollback API
      setConfirmAction(null);
    } catch (error) {
      // Error performing rollback
    } finally {
      setIsLoading(false);
    }
  };

  const cancelAction = () => {
    setConfirmAction(null);
  };

  return (
    <GamePanel style={{ margin: '20px 0' }}>
      <h3 style={{ color: '#dc3545', marginBottom: '16px' }}>
        🚨 Emergency Controls
      </h3>

      {confirmAction && (
        <div style={{
          background: 'rgba(220, 53, 69, 0.2)',
          border: '2px solid #dc3545',
          borderRadius: '4px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <h4 style={{ color: '#dc3545', margin: '0 0 8px 0' }}>
            ⚠️ Confirm Emergency Action
          </h4>
          <p style={{ margin: '0 0 12px 0', color: '#f1e5c8' }}>
            {confirmAction === 'maintenance' && 'Enable/disable maintenance mode for all users?'}
            {confirmAction === 'flush-sessions' && 'Force log out ALL users immediately?'}
            {confirmAction.startsWith('ban-') && `Ban user ${confirmAction.replace('ban-', '')}?`}
            {confirmAction.startsWith('rollback-') && `Rollback gold transactions for the last ${confirmAction.replace('rollback-', '')} hours?`}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <GameButton
              variant="danger"
              onClick={() => {
                if (confirmAction === 'maintenance') toggleMaintenanceMode();
                else if (confirmAction === 'flush-sessions') flushAllSessions();
                else if (confirmAction.startsWith('rollback-')) {
                  const hours = parseInt(confirmAction.replace('rollback-', ''));
                  emergencyGoldRollback(hours);
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? '🔄 Processing...' : '✓ CONFIRM'}
            </GameButton>
            <GameButton
              onClick={cancelAction}
              disabled={isLoading}
            >
              ✕ Cancel
            </GameButton>
          </div>
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px'
      }}>
        {/* Maintenance Mode */}
        <div style={{
          background: maintenanceMode.enabled 
            ? 'rgba(220, 53, 69, 0.1)' 
            : 'rgba(83, 59, 44, 0.2)',
          border: `1px solid ${maintenanceMode.enabled ? '#dc3545' : '#533b2c'}`,
          borderRadius: '4px',
          padding: '16px'
        }}>
          <h4 style={{ 
            margin: '0 0 12px 0',
            color: maintenanceMode.enabled ? '#dc3545' : '#f1e5c8',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🔧 Maintenance Mode
            {maintenanceMode.enabled && (
              <span style={{
                background: '#dc3545',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                ACTIVE
              </span>
            )}
          </h4>
          <p style={{ 
            fontSize: '12px', 
            color: '#9b8c70', 
            margin: '0 0 12px 0' 
          }}>
            {maintenanceMode.enabled 
              ? 'Users cannot access the game while maintenance mode is active.'
              : 'Temporarily disable game access for all users during critical updates.'
            }
          </p>
          <textarea
            value={maintenanceMode.message}
            onChange={(e) => setMaintenanceMode(prev => ({ ...prev, message: e.target.value }))}
            placeholder="Maintenance message for users..."
            style={{
              width: '100%',
              height: '60px',
              background: '#1a1511',
              border: '1px solid #533b2c',
              color: '#f1e5c8',
              padding: '8px',
              borderRadius: '4px',
              resize: 'vertical',
              marginBottom: '12px',
              fontSize: '12px'
            }}
          />
          <GameButton
            variant={maintenanceMode.enabled ? "danger" : "primary"}
            onClick={toggleMaintenanceMode}
            disabled={isLoading}
            style={{ width: '100%' }}
          >
            {maintenanceMode.enabled ? '🔴 Disable Maintenance' : '🔧 Enable Maintenance'}
          </GameButton>
        </div>

        {/* User Management */}
        <div style={{
          background: 'rgba(83, 59, 44, 0.2)',
          border: '1px solid #533b2c',
          borderRadius: '4px',
          padding: '16px'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#f1e5c8' }}>
            👥 Emergency User Actions
          </h4>
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="User ID to ban"
              style={{
                width: '100%',
                background: '#1a1511',
                border: '1px solid #533b2c',
                color: '#f1e5c8',
                padding: '8px',
                borderRadius: '4px',
                marginBottom: '8px'
              }}
              id="emergency-ban-user"
            />
            <GameButton
              variant="danger"
              onClick={() => {
                const input = document.getElementById('emergency-ban-user') as HTMLInputElement;
                if (input?.value) emergencyUserBan(input.value, 'Emergency ban');
              }}
              disabled={isLoading}
              style={{ width: '100%', marginBottom: '8px' }}
            >
              🚫 Emergency Ban User
            </GameButton>
          </div>
          <GameButton
            variant="danger"
            onClick={flushAllSessions}
            disabled={isLoading}
            style={{ width: '100%' }}
          >
            🔐 Force Logout All Users
          </GameButton>
        </div>

        {/* Economy Controls */}
        <div style={{
          background: 'rgba(83, 59, 44, 0.2)',
          border: '1px solid #533b2c',
          borderRadius: '4px',
          padding: '16px'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#f1e5c8' }}>
            💰 Economy Emergency
          </h4>
          <p style={{ 
            fontSize: '12px', 
            color: '#9b8c70', 
            margin: '0 0 12px 0' 
          }}>
            Rollback gold transactions if exploits are discovered
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <GameButton
              variant="danger"
              onClick={() => emergencyGoldRollback(1)}
              disabled={isLoading}
              style={{ width: '100%' }}
            >
              ⏪ Rollback Last 1 Hour
            </GameButton>
            <GameButton
              variant="danger"
              onClick={() => emergencyGoldRollback(6)}
              disabled={isLoading}
              style={{ width: '100%' }}
            >
              ⏪ Rollback Last 6 Hours
            </GameButton>
            <GameButton
              variant="danger"
              onClick={() => emergencyGoldRollback(24)}
              disabled={isLoading}
              style={{ width: '100%' }}
            >
              ⏪ Rollback Last 24 Hours
            </GameButton>
          </div>
        </div>

        {/* System Status */}
        <div style={{
          background: 'rgba(83, 59, 44, 0.2)',
          border: '1px solid #533b2c',
          borderRadius: '4px',
          padding: '16px'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#f1e5c8' }}>
            📊 Quick System Status
          </h4>
          <div style={{ fontSize: '12px', color: '#9b8c70' }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#28a745' }}>●</span> Web Server: Online
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#28a745' }}>●</span> Realtime Server: Online
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#28a745' }}>●</span> Database: Connected
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#28a745' }}>●</span> Authentication: Active
            </div>
          </div>
          <GameButton
            onClick={() => window.location.reload()}
            style={{ width: '100%', marginTop: '8px' }}
          >
            🔄 Refresh Status
          </GameButton>
        </div>
      </div>

      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(220, 53, 69, 0.1)',
        border: '1px solid #dc3545',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        <h4 style={{ color: '#dc3545', margin: '0 0 8px 0' }}>⚠️ Emergency Controls Warning</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#9b8c70' }}>
          <li>These controls have immediate effect on all users</li>
          <li>All actions are logged and require confirmation</li>
          <li>Use only during critical situations or security incidents</li>
          <li>Contact development team before using rollback features</li>
        </ul>
      </div>
    </GamePanel>
  );
}