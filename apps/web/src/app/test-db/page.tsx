'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';

export default function TestDBPage() {
  const { user, authLoaded, wallet, inventory, isLoading, error } = useUserData();
  const [session, setSession] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>({});
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const runTests = async () => {
    setTesting(true);
    const results: any = {};

    // Test 1: Check environment variables
    results.envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      DATABASE_URL: '🔒 Server-side only (check API response)',
    };

    // Test 2: Check authentication
    results.auth = {
      session: session ? '✅ Active' : '❌ No session',
      userId: session?.user?.id || 'Not logged in',
      email: session?.user?.email || 'Not logged in',
    };

    // Test 3: Test API endpoints
    if (session?.access_token) {
      try {
        // Test wallet API
        const walletStart = Date.now();
        const walletRes = await fetch('/api/user/wallet', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        const walletTime = Date.now() - walletStart;
        const walletData = await walletRes.json();
        
        results.walletAPI = {
          status: walletRes.ok ? '✅ Success' : `❌ Failed (${walletRes.status})`,
          responseTime: `${walletTime}ms`,
          data: walletData,
          hasDatabase: walletData.error ? '❌ No DB connection' : '✅ DB connected',
        };

        // Test inventory API
        const invStart = Date.now();
        const invRes = await fetch('/api/user/inventory?location=warehouse', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        const invTime = Date.now() - invStart;
        const invData = await invRes.json();
        
        results.inventoryAPI = {
          status: invRes.ok ? '✅ Success' : `❌ Failed (${invRes.status})`,
          responseTime: `${invTime}ms`,
          itemCount: invData.inventory?.length || 0,
          totalItems: invData.totalItems || 0,
          hasDatabase: invData.error ? '❌ No DB connection' : '✅ DB connected',
        };
      } catch (err) {
        results.apiError = err instanceof Error ? err.message : 'Unknown error';
      }
    } else {
      results.apiTest = '⚠️ Not logged in - cannot test APIs';
    }

    // Test 4: Check Supabase connection
    try {
      const { data, error } = await supabase
        .from('User')
        .select('id')
        .limit(1);
      
      results.supabaseDB = {
        status: error ? `❌ Error: ${error.message}` : '✅ Connected',
        canQueryDB: !error,
      };
    } catch (err) {
      results.supabaseDB = {
        status: '❌ Failed to connect',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }

    setTestResults(results);
    setTesting(false);
  };

  const loginWithMagicLink = async () => {
    const email = prompt('Enter your email for magic link:');
    if (!email) return;

    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      alert('Check your email for the magic link!');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', background: '#1a1a1a', color: '#f0f0f0', minHeight: '100vh' }}>
      <h1>🔧 Database Connection Test Page</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', background: '#2a2a2a', borderRadius: '5px' }}>
        <h2>Authentication Status</h2>
        <p>Logged in: {session ? '✅ Yes' : '❌ No'}</p>
        {session && (
          <>
            <p>User ID: {session.user.id}</p>
            <p>Email: {session.user.email}</p>
          </>
        )}
        {!session && (
          <button 
            onClick={loginWithMagicLink}
            style={{ 
              padding: '10px 20px', 
              background: '#4CAF50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Login with Magic Link
          </button>
        )}
        {session && (
          <button 
            onClick={() => supabase.auth.signOut()}
            style={{ 
              padding: '10px 20px', 
              background: '#f44336', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px',
              marginLeft: '10px'
            }}
          >
            Sign Out
          </button>
        )}
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', background: '#2a2a2a', borderRadius: '5px' }}>
        <h2>useUserData Hook Status</h2>
        <p>Auth Loaded: {authLoaded ? '✅' : '⏳'}</p>
        <p>Loading: {isLoading ? '⏳ Yes' : '✅ No'}</p>
        <p>Error: {error || '✅ None'}</p>
        <p>Wallet Gold: {wallet?.gold ?? 'Not loaded'}</p>
        <p>Inventory Items: {inventory?.totalItems ?? 'Not loaded'}</p>
      </div>

      <button 
        onClick={runTests}
        disabled={testing}
        style={{ 
          padding: '10px 20px', 
          background: testing ? '#666' : '#2196F3', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px',
          cursor: testing ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {testing ? 'Running Tests...' : 'Run Connection Tests'}
      </button>

      {Object.keys(testResults).length > 0 && (
        <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '5px' }}>
          <h2>Test Results</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '10px', background: '#2a2a2a', borderRadius: '5px' }}>
        <h2>📝 Notes</h2>
        <ul>
          <li>This page tests database connectivity and API endpoints</li>
          <li>If DATABASE_URL is not set in Vercel, APIs will return fallback data</li>
          <li>Gold should show as 1000 (from database or fallback)</li>
          <li>Inventory should show 8 items with 100 quantity each</li>
          <li>Check the browser console for additional debug information</li>
        </ul>
      </div>

      <div style={{ marginTop: '20px', padding: '10px', background: '#2a2a2a', borderRadius: '5px' }}>
        <h2>🔗 Quick Links</h2>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <a href="/warehouse" style={{ color: '#4CAF50' }}>Warehouse Page</a>
          <a href="/profile" style={{ color: '#4CAF50' }}>Profile Page</a>
          <a href="/" style={{ color: '#4CAF50' }}>Home</a>
        </div>
      </div>
    </div>
  );
}