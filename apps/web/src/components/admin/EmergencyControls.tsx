'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';

interface EmergencyControlsProps {
  isAdmin: boolean;
}

export default function EmergencyControls({ isAdmin }: EmergencyControlsProps) {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState({
    activeSessions: 0,
    serverLoad: 'unknown',
    lastAction: 'None'
  });

  useEffect(() => {
    if (isAdmin) {
      loadSystemStatus();
    }
  }, [isAdmin]);

  const loadSystemStatus = async () => {
    try {
      const response = await api.admin.emergency('get_status');
      // Extract data from API response structure { success: true, data: {...} }
      const data = response.data || response;
      setIsMaintenanceMode(data.maintenanceMode || false);
      setSystemStatus({
        activeSessions: data.activeSessions || 0,
        serverLoad: data.serverLoad || 'unknown',
        lastAction: data.lastEmergencyAction || 'None'
      });
    } catch (error) {
      console.error('Error loading system status:', error);
    }
  };

  const executeEmergencyAction = async (action: string, params?: any) => {
    if (!isAdmin) return;
    
    setIsLoading(true);
    try {
      const response = await api.admin.emergency(action, params);
      // Extract data from API response structure { success: true, data: {...} }
      const data = response.data || response;
      
      // Update local state based on action
      if (action === 'maintenance_mode') {
        setIsMaintenanceMode(data.result?.maintenanceMode);
      }
      
      alert(`Emergency action "${action}" executed successfully`);
      
      // Refresh system status
      loadSystemStatus();
      setConfirmAction(null);
    } catch (error: any) {
      console.error('Emergency action failed:', error);
      alert(`Emergency action failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmEmergencyAction = (action: string, message: string, callback: () => void) => {
    if (confirm(`⚠️ EMERGENCY ACTION CONFIRMATION\n\n${message}\n\nThis action cannot be undone. Are you sure you want to proceed?`)) {
      callback();
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-lg border border-red-500/30 p-6">
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          🚨 Emergency Controls
        </h3>
        <span className="ml-3 bg-red-500/20 text-red-300 px-2 py-1 rounded-full text-xs font-bold">
          ADMIN ONLY
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Maintenance Mode */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
          <h4 className="text-white font-medium mb-2 flex items-center">
            🔧 Maintenance Mode
            {isMaintenanceMode && (
              <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs animate-pulse">
                ACTIVE
              </span>
            )}
          </h4>
          <p className="text-sm text-gray-400 mb-3">
            Prevent new user connections for system maintenance
          </p>
          <button
            onClick={() => confirmEmergencyAction(
              'maintenance_mode',
              `${isMaintenanceMode ? 'DISABLE' : 'ENABLE'} maintenance mode?\n\nThis will ${isMaintenanceMode ? 'allow' : 'prevent'} new user connections.`,
              () => executeEmergencyAction('maintenance_mode')
            )}
            disabled={isLoading}
            className={`w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              isMaintenanceMode
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            } disabled:opacity-50`}
          >
            {isLoading ? '🔄 Processing...' : (isMaintenanceMode ? '✅ Disable Maintenance' : '⚠️ Enable Maintenance')}
          </button>
        </div>

        {/* Emergency User Ban */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
          <h4 className="text-white font-medium mb-2">🚫 Emergency User Ban</h4>
          <p className="text-sm text-gray-400 mb-3">
            Immediately ban a user and terminate their sessions
          </p>
          <input
            type="text"
            placeholder="Enter user ID or email"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm mb-3 focus:outline-none focus:border-red-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const userId = (e.target as HTMLInputElement).value.trim();
                if (userId) {
                  confirmEmergencyAction(
                    'emergency_ban',
                    `BAN USER: ${userId}\n\nThis will immediately ban the user and terminate all their active sessions.`,
                    () => executeEmergencyAction('emergency_ban', { userId })
                  );
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
          />
          <div className="text-xs text-gray-500">
            Enter user ID/email and press Enter
          </div>
        </div>

        {/* Session Flush */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
          <h4 className="text-white font-medium mb-2">🔄 Flush All Sessions</h4>
          <p className="text-sm text-gray-400 mb-3">
            Force logout all users and clear active sessions
          </p>
          <button
            onClick={() => confirmEmergencyAction(
              'flush_sessions',
              'FLUSH ALL USER SESSIONS?\n\nThis will force logout ALL users currently connected to the system.',
              () => executeEmergencyAction('flush_sessions')
            )}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {isLoading ? '🔄 Processing...' : '🔄 Flush Sessions'}
          </button>
        </div>

        {/* Transaction Rollback */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
          <h4 className="text-white font-medium mb-2">💰 Gold Transaction Rollback</h4>
          <p className="text-sm text-gray-400 mb-3">
            Rollback gold transactions from the last hour
          </p>
          <button
            onClick={() => confirmEmergencyAction(
              'rollback_transactions',
              'ROLLBACK RECENT GOLD TRANSACTIONS?\n\nThis will reverse all gold transactions from the last hour. This action cannot be undone.',
              () => executeEmergencyAction('rollback_transactions')
            )}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {isLoading ? '🔄 Processing...' : '💰 Rollback Transactions'}
          </button>
        </div>

        {/* Emergency Broadcast */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600 md:col-span-2">
          <h4 className="text-white font-medium mb-2">📢 Emergency Broadcast</h4>
          <p className="text-sm text-gray-400 mb-3">
            Send an urgent message to all connected users
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter emergency message..."
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const message = (e.target as HTMLInputElement).value.trim();
                  if (message) {
                    confirmEmergencyAction(
                      'emergency_broadcast',
                      `SEND EMERGENCY BROADCAST?\n\nMessage: "${message}"\n\nThis will be sent to ALL connected users immediately.`,
                      () => executeEmergencyAction('emergency_broadcast', { message })
                    );
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.querySelector('input[placeholder="Enter emergency message..."]') as HTMLInputElement;
                const message = input?.value.trim();
                if (message) {
                  confirmEmergencyAction(
                    'emergency_broadcast',
                    `SEND EMERGENCY BROADCAST?\n\nMessage: "${message}"\n\nThis will be sent to ALL connected users immediately.`,
                    () => executeEmergencyAction('emergency_broadcast', { message })
                  );
                  input.value = '';
                }
              }}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
            >
              📢 Broadcast
            </button>
          </div>
        </div>
      </div>

      {/* Warning Notice */}
      <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <h4 className="text-red-400 text-sm font-semibold mb-2">⚠️ Emergency Controls Warning</h4>
        <ul className="text-xs text-red-200 space-y-1">
          <li>• These controls are for emergency situations only</li>
          <li>• All actions are logged and auditable</li>
          <li>• Some actions cannot be undone - use with extreme caution</li>
          <li>• Contact system administrators before using in production</li>
        </ul>
      </div>

      {/* System Status */}
      <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
        <h4 className="text-gray-300 text-sm font-semibold mb-2">📊 Current System Status</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="text-center">
            <div className="text-gray-400">Maintenance</div>
            <div className={`font-bold ${isMaintenanceMode ? 'text-red-400' : 'text-green-400'}`}>
              {isMaintenanceMode ? 'ENABLED' : 'Disabled'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">Active Sessions</div>
            <div className="text-blue-400 font-bold">{systemStatus.activeSessions}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">Server Load</div>
            <div className={`font-bold ${
              systemStatus.serverLoad === 'high' ? 'text-red-400' :
              systemStatus.serverLoad === 'medium' ? 'text-yellow-400' : 'text-green-400'
            }`}>{systemStatus.serverLoad}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">Last Action</div>
            <div className="text-gray-400 font-bold">{systemStatus.lastAction}</div>
          </div>
        </div>
      </div>
    </div>
  );
}