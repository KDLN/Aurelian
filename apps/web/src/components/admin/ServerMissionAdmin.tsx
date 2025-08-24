'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import GamePanel from '@/components/ui/GamePanel';
import GameButton from '@/components/ui/GameButton';
import MissionCreator from './MissionCreator';
import MissionDashboard from './MissionDashboard';
import ParticipantAnalytics from './ParticipantAnalytics';
import MissionTemplates from './MissionTemplates';

interface ServerMission {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  startedAt: string | null;
  endsAt: string;
  completedAt: string | null;
  createdAt: string;
  participantCount: number;
  globalProgress: any;
  globalRequirements: any;
  rewards: any;
  tiers: any;
}

export default function ServerMissionAdmin() {
  const [missions, setMissions] = useState<ServerMission[]>([]);
  const [selectedMission, setSelectedMission] = useState<ServerMission | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'templates' | 'analytics'>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMissions();
      fetchAnalytics();
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Admin authentication required');
        return;
      }

      // Check admin access
      const response = await fetch('/api/admin/check-access', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        setError('Admin access required');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setError('Authentication failed');
    }
  };

  const fetchMissions = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const response = await fetch('/api/server/missions/admin', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch missions');
      }

      const data = await response.json();
      setMissions(data.missions || []);

    } catch (err) {
      console.error('Error fetching missions:', err);
      setError('Failed to load missions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const response = await fetch('/api/server/missions/admin/analytics', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const handleMissionAction = async (action: string, missionId: string, data?: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      let url = `/api/server/missions/admin/${missionId}/${action}`;
      let method = 'POST';
      
      if (action === 'update') {
        url = `/api/server/missions/admin/${missionId}`;
        method = 'PATCH';
      } else if (action === 'delete') {
        url = `/api/server/missions/admin/${missionId}`;
        method = 'DELETE';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: data ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} mission`);
      }

      // Refresh missions list
      await fetchMissions();
      await fetchAnalytics();

      return await response.json();
    } catch (err) {
      console.error(`Error ${action} mission:`, err);
      throw err;
    }
  };

  const handleCreateMission = async (missionData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const response = await fetch('/api/server/missions/admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(missionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create mission');
      }

      // Refresh missions list
      await fetchMissions();
      await fetchAnalytics();
      
      // Switch back to dashboard
      setActiveTab('dashboard');

      return await response.json();
    } catch (err) {
      console.error('Error creating mission:', err);
      throw err;
    }
  };

  if (!isAuthenticated) {
    return (
      <GamePanel>
        <div className="text-center py-16">
          <div className="text-red-400 text-xl mb-4">⛔</div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-300 mb-4">
            {error || 'Administrator privileges required to access this panel'}
          </p>
        </div>
      </GamePanel>
    );
  }

  if (isLoading) {
    return (
      <GamePanel>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-300">Loading admin panel...</p>
          </div>
        </div>
      </GamePanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <GamePanel>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-yellow-400">Server Mission Control</h1>
              <p className="text-gray-300">Manage server-wide events and missions</p>
            </div>
            
            {analytics && (
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-yellow-400">{analytics.overview?.totalMissions || 0}</div>
                  <div className="text-xs text-gray-400">Total Missions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">{analytics.overview?.activeMissions || 0}</div>
                  <div className="text-xs text-gray-400">Active</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">{analytics.participation?.uniqueParticipants || 0}</div>
                  <div className="text-xs text-gray-400">Participants</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">{analytics.overview?.successRate || 0}%</div>
                  <div className="text-xs text-gray-400">Success Rate</div>
                </div>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-4 border-b border-gray-600">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`pb-2 px-1 ${
                activeTab === 'dashboard' 
                  ? 'border-b-2 border-yellow-400 text-yellow-400' 
                  : 'text-gray-300 hover:text-yellow-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`pb-2 px-1 ${
                activeTab === 'create' 
                  ? 'border-b-2 border-yellow-400 text-yellow-400' 
                  : 'text-gray-300 hover:text-yellow-300'
              }`}
            >
              Create Mission
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`pb-2 px-1 ${
                activeTab === 'templates' 
                  ? 'border-b-2 border-yellow-400 text-yellow-400' 
                  : 'text-gray-300 hover:text-yellow-300'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-2 px-1 ${
                activeTab === 'analytics' 
                  ? 'border-b-2 border-yellow-400 text-yellow-400' 
                  : 'text-gray-300 hover:text-yellow-300'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>
      </GamePanel>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <MissionDashboard 
          missions={missions}
          selectedMission={selectedMission}
          onSelectMission={setSelectedMission}
          onMissionAction={handleMissionAction}
          onRefresh={fetchMissions}
        />
      )}

      {activeTab === 'create' && (
        <MissionCreator
          onSubmit={handleCreateMission}
          onCancel={() => setActiveTab('dashboard')}
        />
      )}

      {activeTab === 'templates' && (
        <MissionTemplates
          onUseTemplate={(template) => {
            // Switch to create tab with template data
            setActiveTab('create');
          }}
        />
      )}

      {activeTab === 'analytics' && analytics && (
        <ParticipantAnalytics 
          analytics={analytics}
          missions={missions}
        />
      )}
    </div>
  );
}