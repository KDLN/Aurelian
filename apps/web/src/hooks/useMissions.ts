import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface MissionDef {
  id: string;
  name: string;
  description: string;
  fromHub: string;
  toHub: string;
  distance: number;
  baseDuration: number; // in seconds
  baseReward: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  itemRewards?: { itemKey: string; qty: number }[];
  isActive: boolean;
}

export interface MissionInstance {
  id: string;
  userId: string;
  missionId: string;
  status: 'active' | 'completed' | 'failed';
  startTime: string;
  endTime: string;
  actualReward?: number;
  itemsReceived?: { itemKey: string; qty: number }[];
  completedAt?: string;
  mission?: MissionDef;
}

interface UseMissionsReturn {
  missionDefs: MissionDef[];
  activeMissions: MissionInstance[];
  loading: boolean;
  error: string | null;
  startMission: (missionId: string) => Promise<boolean>;
  completeMission: (missionInstanceId: string) => Promise<{ success: boolean; rewards?: any }>;
  refreshMissions: () => Promise<void>;
}

export function useMissions(): UseMissionsReturn {
  const [missionDefs, setMissionDefs] = useState<MissionDef[]>([]);
  const [activeMissions, setActiveMissions] = useState<MissionInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMissions = async () => {
    try {
      setError(null);
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch('/api/missions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch missions: ${response.statusText}`);
      }

      const data = await response.json();
      setMissionDefs(data.missionDefs || []);
      setActiveMissions(data.activeMissions || []);
      
    } catch (err) {
      console.error('Error fetching missions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch missions');
    } finally {
      setLoading(false);
    }
  };

  const startMission = async (missionId: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return false;
      }

      const response = await fetch('/api/missions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ missionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start mission');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh missions to get updated state
        await fetchMissions();
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error starting mission:', err);
      setError(err instanceof Error ? err.message : 'Failed to start mission');
      return false;
    }
  };

  const completeMission = async (missionInstanceId: string): Promise<{ success: boolean; rewards?: any }> => {
    try {
      setError(null);
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return { success: false };
      }

      const response = await fetch('/api/missions/complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ missionInstanceId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete mission');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh missions to get updated state
        await fetchMissions();
        return {
          success: data.missionSuccess,
          rewards: data.rewards
        };
      }
      
      return { success: false };
    } catch (err) {
      console.error('Error completing mission:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete mission');
      return { success: false };
    }
  };

  const refreshMissions = async () => {
    setLoading(true);
    await fetchMissions();
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  return {
    missionDefs,
    activeMissions,
    loading,
    error,
    startMission,
    completeMission,
    refreshMissions
  };
}