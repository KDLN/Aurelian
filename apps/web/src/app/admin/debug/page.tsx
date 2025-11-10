'use client';

import React, { useState } from 'react';

export default function DebugPage() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mission Speed-Up Debug
  const handleMissionSpeedUp = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error('Authentication failed');
      }

      const response = await fetch('/api/missions/debug-speedup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setMessage(`✅ Success! ${data.updated || 0} missions sped up to 2 seconds`);
    } catch (error) {
      console.error('Mission speedup error:', error);
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Crafting 2s Debug
  const handleDebugCraft = async (blueprintId?: string, quantity: number = 1) => {
    setIsLoading(true);
    setMessage('');

    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage('❌ Authentication failed');
        return;
      }

      const response = await fetch('/api/crafting/debug-start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          blueprintId: blueprintId || 'default',
          quantity
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to start debug craft');
      }

      const data = await response.json();
      setMessage(`✅ Debug craft started! Job ID: ${data.jobId || 'N/A'}`);
    } catch (error) {
      console.error('Debug craft error:', error);
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Populate Starter Recipes
  const handlePopulateBlueprints = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage('❌ Authentication failed');
        return;
      }

      const response = await fetch('/api/blueprints/populate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to populate blueprints');
      }

      const data = await response.json();
      setMessage(`✅ Success! ${data.count || 0} recipes added to database`);
    } catch (error) {
      console.error('Populate blueprints error:', error);
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Debug Tools - Admin Only
            </h3>
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
              <p>These tools are for testing and development purposes only. Use with caution as they can affect game balance and economy.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`rounded-lg p-4 ${
          message.startsWith('✅')
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Mission Debug Tools */}
      <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          🚛 Mission Debug Tools
        </h2>
        <div className="space-y-4">
          <div>
            <button
              onClick={handleMissionSpeedUp}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '⏳ Processing...' : '🚀 Speed Up All Active Missions'}
            </button>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Sets all active missions to complete in 2 seconds. Useful for testing mission completion flow.
            </p>
          </div>
        </div>
      </div>

      {/* Crafting Debug Tools */}
      <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          ⚒️ Crafting Debug Tools
        </h2>
        <div className="space-y-4">
          <div>
            <button
              onClick={() => handleDebugCraft()}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '⏳ Processing...' : '🚀 Start 2-Second Test Craft'}
            </button>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Starts a crafting job that completes in 2 seconds. Useful for testing craft completion flow.
            </p>
          </div>
        </div>
      </div>

      {/* Database Population Tools */}
      <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          📦 Database Population Tools
        </h2>
        <div className="space-y-4">
          <div>
            <button
              onClick={handlePopulateBlueprints}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '⏳ Populating...' : '📜 Add Starter Recipes'}
            </button>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Populates the database with starter crafting recipes. Only needed for new installations or after database reset.
            </p>
          </div>
        </div>
      </div>

      {/* Additional Debug Info */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-3">
          📝 Debug Guidelines
        </h3>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>These tools bypass normal game timing and progression mechanics</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Use on test accounts only to avoid breaking the game economy</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Always verify changes in the regular player UI after using debug tools</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>This page is only accessible to authenticated admin users</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
