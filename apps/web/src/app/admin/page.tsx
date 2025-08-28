'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ErrorMonitor from '@/components/admin/ErrorMonitor';
import SecurityMonitor from '@/components/admin/SecurityMonitor';
import EmergencyControls from '@/components/admin/EmergencyControls';

interface UserData {
  id: string;
  email: string | null;
  createdAt: string;
  profile?: {
    display: string;
    avatar?: any;
  };
  wallet?: {
    gold: number;
  };
  guildMembership?: {
    guild: {
      name: string;
      tag: string;
    };
    role: string;
  };
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'monitoring'>('dashboard');
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Check admin status via API
      const response = await fetch('/api/admin/check-access', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isAdmin) {
          setIsAdmin(true);
          await loadUsers();
        } else {
          setError('Access denied - Admin only');
          setLoading(false);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Access denied - Admin only');
        setLoading(false);
      }
    } catch (error) {
      // Admin access check failed
      setError('Failed to verify admin access');
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        setError('Failed to load users');
      }
    } catch (error) {
      // Failed to load users
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId: string, updates: { display?: string; gold?: number }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/update-user', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, ...updates })
      });

      if (response.ok) {
        await loadUsers(); // Refresh the list
        setEditingUser(null);
        alert('User updated successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to update user: ${errorData.error}`);
      }
    } catch (error) {
      alert('Failed to update user');
    }
  };

  const toggleMaintenanceMode = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: !maintenanceMode })
      });

      if (response.ok) {
        setMaintenanceMode(!maintenanceMode);
        alert(`Maintenance mode ${!maintenanceMode ? 'enabled' : 'disabled'}`);
      } else {
        alert('Failed to toggle maintenance mode');
      }
    } catch (error) {
      alert('Failed to toggle maintenance mode');
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user: ${userEmail}?\n\nThis will:\n- Remove from Supabase Auth\n- Delete profile and wallet\n- Convert messages to "Deleted User"\n- Remove from guilds\n\nThis action cannot be undone!`)) {
      return;
    }

    setDeletingUserId(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        await loadUsers(); // Refresh the list
        alert('User deleted successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete user: ${errorData.error}`);
      }
    } catch (error) {
      // Failed to delete user
      alert('Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Admin Dashboard</h1>
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-300 mt-4">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Admin Dashboard</h1>
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
              <p className="text-red-200">{error || 'Access denied'}</p>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Return to Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* System Overview */}
      <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
          System Status
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Total Users</span>
            <span className="text-white font-medium">{users.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Active Sessions</span>
            <span className="text-green-400 font-medium">24</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Server Load</span>
            <span className="text-yellow-400 font-medium">Medium</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Maintenance Mode</span>
            <span className={`font-medium ${maintenanceMode ? 'text-red-400' : 'text-green-400'}`}>
              {maintenanceMode ? 'ENABLED' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <button
            onClick={loadUsers}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm flex items-center justify-center"
            disabled={loading}
          >
            🔄 Refresh Data
          </button>
          <button
            onClick={() => window.location.href = '/admin/server-missions'}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm flex items-center justify-center"
          >
            🌍 Server Missions
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm flex items-center justify-center"
          >
            📊 View Monitoring
          </button>
          <button
            onClick={toggleMaintenanceMode}
            className={`w-full px-4 py-2 ${maintenanceMode ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white rounded-lg transition-colors text-sm flex items-center justify-center`}
          >
            {maintenanceMode ? '🚫 Disable Maintenance' : '⚠️ Enable Maintenance'}
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">User login</span>
            <span className="text-gray-400">2m ago</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">New guild created</span>
            <span className="text-gray-400">5m ago</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Trade completed</span>
            <span className="text-gray-400">8m ago</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">User Management ({users.length})</h2>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {users.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-8 text-center">
          <p className="text-gray-400">No users found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {users.map(user => (
            <div 
              key={user.id}
              className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-4 hover:bg-white/15 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-white">
                      {user.profile?.display || 'No Display Name'}
                    </h4>
                    {user.guildMembership && (
                      <span className="px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded">
                        {user.guildMembership.guild.tag}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">Email:</span>
                      <div className="text-gray-200 truncate">{user.email || 'No email'}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Gold:</span>
                      <div className="text-yellow-400 font-medium">{user.wallet?.gold?.toLocaleString() || '0'}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Joined:</span>
                      <div className="text-gray-200">{new Date(user.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">ID:</span>
                      <div className="text-gray-300 font-mono text-xs">{user.id.slice(0, 8)}...</div>
                    </div>
                  </div>
                  
                  {user.guildMembership && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-400">Guild:</span>
                      <span className="text-blue-300 ml-2">
                        {user.guildMembership.guild.name} - {user.guildMembership.role}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() => setEditingUser(user)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => deleteUser(user.id, user.email || user.profile?.display || user.id)}
                    disabled={deletingUserId === user.id}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
                  >
                    {deletingUserId === user.id ? '🔄 Deleting...' : '🗑️ Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* User Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg border border-white/20 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Edit User</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const display = formData.get('display') as string;
              const gold = parseInt(formData.get('gold') as string);
              updateUser(editingUser.id, { display, gold });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Display Name
                  </label>
                  <input
                    name="display"
                    type="text"
                    defaultValue={editingUser.profile?.display || ''}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter display name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Gold Amount
                  </label>
                  <input
                    name="gold"
                    type="number"
                    defaultValue={editingUser.wallet?.gold || 0}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter gold amount"
                    min="0"
                  />
                </div>
                <div className="pt-4 border-t border-slate-600">
                  <p className="text-xs text-gray-400 mb-3">
                    User ID: {editingUser.id}
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    Email: {editingUser.email || 'No email'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderMonitoring = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white mb-6">System Monitoring</h2>
      <ErrorMonitor isAdmin={isAdmin} />
      <SecurityMonitor isAdmin={isAdmin} />
      <EmergencyControls isAdmin={isAdmin} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">Manage users, monitor system health, and oversee operations</p>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            ← Return to Game
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-white/5 backdrop-blur-md rounded-lg p-1">
          {[
            { key: 'dashboard', label: '📊 Dashboard', icon: '📊' },
            { key: 'users', label: '👥 Users', icon: '👥' },
            { key: 'monitoring', label: '🔍 Monitoring', icon: '🔍' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-3 px-4 rounded-md transition-all font-medium ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'monitoring' && renderMonitoring()}
        </div>

        {/* Warning Notice (only show on users tab) */}
        {activeTab === 'users' && (
          <div className="mt-8 bg-red-500/10 backdrop-blur-md rounded-lg border border-red-500/30 p-4">
            <h4 className="text-red-400 font-semibold mb-2">⚠️ User Deletion Warning</h4>
            <p className="text-red-200 text-sm">
              User deletion is permanent and will remove the user from Supabase Auth, delete their profile and wallet data, 
              convert chat messages to "Deleted User", and remove guild memberships. Mail and transactions are preserved for record keeping.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}