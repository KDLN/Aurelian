'use client';

import { useState } from 'react';

export default function AdminCleanupPage() {
  const [email, setEmail] = useState('colinjohnsonw@gmail.com');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const deleteUser = async () => {
    if (!email) {
      setResult('Please enter an email');
      return;
    }

    setLoading(true);
    setResult('Deleting user...');

    try {
      const response = await fetch(`/api/admin/delete-user?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setResult(`✅ Success: ${data.message}\n\nDeleted:\n- ${data.deletedCounts.missions} missions\n- ${data.deletedCounts.inventory} inventory items\n- ${data.deletedCounts.wallets} wallets\n- ${data.deletedCounts.profiles} profiles\n- ${data.deletedCounts.users} users`);
      } else {
        setResult(`❌ Error: ${data.error}\n\nDetails: ${data.details || 'No additional details'}`);
      }
    } catch (error) {
      setResult(`❌ Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const listUsers = async () => {
    setLoading(true);
    setResult('Loading users...');

    try {
      const response = await fetch('/api/admin/delete-user');
      const data = await response.json();

      if (response.ok) {
        const userList = data.users.map((u: any) => 
          `${u.email} (${u.profile?.display || 'No username'}) - Created: ${new Date(u.createdAt).toLocaleDateString()}`
        ).join('\n');
        
        setResult(`📋 Found ${data.total} users:\n\n${userList}`);
      } else {
        setResult(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setResult(`❌ Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🛠️ Admin User Cleanup</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>
          Email to delete:
          <br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px', 
              marginTop: '5px',
              fontSize: '16px',
              border: '1px solid #ccc'
            }}
            placeholder="user@example.com"
          />
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={deleteUser}
          disabled={loading}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? '⏳ Working...' : '🗑️ Delete User'}
        </button>

        <button
          onClick={listUsers}
          disabled={loading}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Loading...' : '📋 List Users'}
        </button>
      </div>

      {result && (
        <div style={{
          backgroundColor: result.includes('✅') ? '#d4edda' : result.includes('❌') ? '#f8d7da' : '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '5px',
          padding: '15px',
          whiteSpace: 'pre-wrap',
          fontSize: '14px',
          fontFamily: 'monospace'
        }}>
          {result}
        </div>
      )}

      <div style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Click "List Users" to see all existing users</li>
          <li>Enter the email address you want to delete</li>
          <li>Click "Delete User" to remove the user and all their data</li>
          <li>Try creating a new account afterward</li>
        </ol>
      </div>
    </div>
  );
}