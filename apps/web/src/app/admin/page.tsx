'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import GameButton from '@/components/ui/GameButton';
import GamePanel from '@/components/ui/GamePanel';

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
      console.error('Admin check failed:', error);
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
      console.error('Failed to load users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
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
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="game">
        <GamePanel style={{ margin: '20px auto', maxWidth: '800px' }}>
          <h1>Admin Panel</h1>
          <p>Loading...</p>
        </GamePanel>
      </div>
    );
  }

  if (error || !isAdmin) {
    return (
      <div className="game">
        <GamePanel style={{ margin: '20px auto', maxWidth: '800px' }}>
          <h1>Admin Panel</h1>
          <p style={{ color: '#ff6b6b' }}>{error || 'Access denied'}</p>
          <GameButton onClick={() => window.location.href = '/'}>
            Return to Game
          </GameButton>
        </GamePanel>
      </div>
    );
  }

  return (
    <div className="game">
      <GamePanel style={{ margin: '20px auto', maxWidth: '1000px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Admin Panel - User Management</h1>
          <GameButton onClick={() => window.location.href = '/'}>
            Return to Game
          </GameButton>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <GameButton onClick={loadUsers} disabled={loading}>
            🔄 Refresh Users
          </GameButton>
        </div>

        <div style={{ 
          background: 'rgba(83, 59, 44, 0.2)',
          border: '1px solid #533b2c',
          borderRadius: '4px',
          padding: '16px'
        }}>
          <h3>Users ({users.length})</h3>
          
          {users.length === 0 ? (
            <p>No users found</p>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {users.map(user => (
                <div 
                  key={user.id}
                  style={{
                    background: 'rgba(26, 21, 17, 0.5)',
                    border: '1px solid #533b2c',
                    borderRadius: '4px',
                    padding: '12px',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '12px',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      {user.profile?.display || 'No Display Name'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9b8c70', marginBottom: '8px' }}>
                      Email: {user.email || 'No email'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9b8c70', marginBottom: '4px' }}>
                      ID: {user.id}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9b8c70', marginBottom: '4px' }}>
                      Joined: {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9b8c70', marginBottom: '4px' }}>
                      Gold: {user.wallet?.gold?.toLocaleString() || '0'}
                    </div>
                    {user.guildMembership && (
                      <div style={{ fontSize: '12px', color: '#9b8c70' }}>
                        Guild: {user.guildMembership.guild.name} [{user.guildMembership.guild.tag}] - {user.guildMembership.role}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <GameButton
                      variant="danger"
                      size="small"
                      onClick={() => deleteUser(user.id, user.email || user.profile?.display || user.id)}
                      disabled={deletingUserId === user.id}
                    >
                      {deletingUserId === user.id ? '🔄 Deleting...' : '🗑️ Delete User'}
                    </GameButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ 
          background: 'rgba(255, 107, 107, 0.1)',
          border: '1px solid #ff6b6b',
          borderRadius: '4px',
          padding: '12px',
          marginTop: '20px'
        }}>
          <h4 style={{ color: '#ff6b6b', marginBottom: '8px' }}>⚠️ Warning</h4>
          <p style={{ fontSize: '12px', margin: 0 }}>
            User deletion is permanent and will:
            <br />• Remove user from Supabase Auth
            <br />• Delete profile, wallet, and personal data
            <br />• Convert chat messages to "Deleted User"
            <br />• Remove from guilds and clear memberships
            <br />• Preserve mail/transactions for record keeping
          </p>
        </div>
      </GamePanel>
    </div>
  );
}