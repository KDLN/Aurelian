'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import GameButton from '@/components/ui/GameButton';
import GamePanel from '@/components/ui/GamePanel';
import ErrorMonitor from '@/components/admin/ErrorMonitor';
import SecurityMonitor from '@/components/admin/SecurityMonitor';
import EmergencyControls from '@/components/admin/EmergencyControls';
import PageErrorBoundary from '@/components/PageErrorBoundary';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalErrors: number;
  criticalAlerts: number;
  serverUptime: string;
  lastUpdated: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalErrors: 0,
    criticalAlerts: 0,
    serverUptime: '0d 0h 0m',
    lastUpdated: new Date().toLocaleTimeString()
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadDashboardStats();
      
      // Refresh stats every 30 seconds
      const interval = setInterval(loadDashboardStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/check-access', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isAdmin) {
          setIsAdmin(true);
        } else {
          setError('Access denied - Admin only');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Access denied - Admin only');
      }
    } catch (error) {
      setError('Failed to verify admin access');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const { data: statsData } = await response.json();
        setStats({
          totalUsers: statsData.totalUsers,
          activeUsers: statsData.activeUsers,
          totalErrors: statsData.totalErrors,
          criticalAlerts: statsData.criticalAlerts,
          serverUptime: statsData.serverUptime,
          lastUpdated: new Date(statsData.lastUpdated).toLocaleTimeString()
        });
      } else {
        console.error('Failed to load dashboard stats');
        // Keep existing stats if API call fails
        setStats(prev => ({
          ...prev,
          lastUpdated: new Date().toLocaleTimeString()
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      // Keep existing stats if API call fails
      setStats(prev => ({
        ...prev,
        lastUpdated: new Date().toLocaleTimeString()
      }));
    }
  };

  if (loading) {
    return (
      <div className="game">
        <GamePanel style={{ margin: '20px auto', maxWidth: '800px' }}>
          <h1>Admin Dashboard</h1>
          <p>Loading...</p>
        </GamePanel>
      </div>
    );
  }

  if (error || !isAdmin) {
    return (
      <div className="game">
        <GamePanel style={{ margin: '20px auto', maxWidth: '800px' }}>
          <h1>Admin Dashboard</h1>
          <p style={{ color: '#ff6b6b' }}>{error || 'Access denied'}</p>
          <GameButton onClick={() => window.location.href = '/'}>
            Return to Game
          </GameButton>
        </GamePanel>
      </div>
    );
  }

  return (
    <PageErrorBoundary pageName="Admin Dashboard">
      <div className="game">
        <div style={{ maxWidth: '1400px', margin: '20px auto', padding: '0 20px' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h1 style={{ color: '#f1e5c8', margin: 0 }}>
            🛠️ Admin Dashboard
          </h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <GameButton onClick={() => window.location.href = '/admin'}>
              👥 User Management
            </GameButton>
            <GameButton onClick={() => window.location.href = '/admin/server-missions'}>
              🌍 Server Missions
            </GameButton>
            <GameButton onClick={() => window.location.href = '/'}>
              🎮 Return to Game
            </GameButton>
          </div>
        </div>

        {/* Quick Stats */}
        <GamePanel style={{ marginBottom: '20px' }}>
          <h3>📊 System Overview</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f1e5c8' }}>
                {stats.totalUsers.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#9b8c70' }}>Total Users</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                {stats.activeUsers.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#9b8c70' }}>Active Now</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: stats.totalErrors > 0 ? '#ffc107' : '#28a745' 
              }}>
                {stats.totalErrors}
              </div>
              <div style={{ fontSize: '12px', color: '#9b8c70' }}>Total Errors</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: stats.criticalAlerts > 0 ? '#dc3545' : '#28a745' 
              }}>
                {stats.criticalAlerts}
              </div>
              <div style={{ fontSize: '12px', color: '#9b8c70' }}>Critical Alerts</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f1e5c8' }}>
                {stats.serverUptime}
              </div>
              <div style={{ fontSize: '12px', color: '#9b8c70' }}>Server Uptime</div>
            </div>
          </div>
          <div style={{ 
            textAlign: 'center', 
            fontSize: '12px', 
            color: '#7a6b5a',
            borderTop: '1px solid #533b2c',
            paddingTop: '12px'
          }}>
            Last updated: {stats.lastUpdated} • 
            <button 
              onClick={loadDashboardStats}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#007bff', 
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '12px'
              }}
            >
              Refresh Now
            </button>
          </div>
        </GamePanel>

        {/* Emergency Controls */}
        <EmergencyControls isAdmin={isAdmin} />

        {/* Security Monitor */}
        <SecurityMonitor isAdmin={isAdmin} />

        {/* Error Monitor */}
        <ErrorMonitor isAdmin={isAdmin} />

        {/* Quick Actions */}
        <GamePanel>
          <h3>⚡ Quick Actions</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            <GameButton onClick={() => window.location.href = '/admin/items'}>
              📦 Item Management
            </GameButton>
            <GameButton onClick={() => window.location.href = '/admin/blueprints'}>
              🔧 Blueprint Editor
            </GameButton>
            <GameButton onClick={() => window.location.href = '/admin/missions'}>
              🎯 Mission Creator
            </GameButton>
            <GameButton onClick={() => window.location.href = '/admin/news'}>
              📰 News & Events
            </GameButton>
            <GameButton onClick={() => window.location.href = '/admin/hubs'}>
              🏘️ Hub Management
            </GameButton>
            <GameButton onClick={() => window.location.href = '/admin/equipment'}>
              ⚔️ Equipment Editor
            </GameButton>
          </div>
        </GamePanel>

        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          margin: '20px 0',
          fontSize: '12px',
          color: '#7a6b5a'
        }}>
          Aurelian Admin Dashboard • Use responsibly • All actions are logged
        </div>
      </div>
      </div>
    </PageErrorBoundary>
  );
}