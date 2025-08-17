import { useState, useEffect } from 'react';
import { api, APIError } from '@/lib/api/client';

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
  startMission: (missionId: string, agentId: string) => Promise<boolean>;
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
      
      const data = await api.missions.list();
      console.log('🔍 Missions API response:', data);
      setMissionDefs(data.missionDefs || []);
      setActiveMissions(data.activeMissions || []);
      console.log('🎯 Set active missions:', data.activeMissions || []);
      
    } catch (err) {
      console.error('Error fetching missions:', err);
      if (err instanceof APIError) {
        setError(`${err.message} (${err.status})`);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch missions');
      }
    } finally {
      setLoading(false);
    }
  };

  const startMission = async (missionId: string, agentId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const data = await api.missions.start(missionId, agentId);
      console.log('🚀 Mission start response:', data);
      
      if (data.success) {
        // Refresh missions to get updated state
        console.log('🔄 Refreshing missions after successful start');
        await fetchMissions();
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error starting mission:', err);
      if (err instanceof APIError) {
        setError(`${err.message} (${err.status})`);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to start mission');
      }
      return false;
    }
  };

  const completeMission = async (missionInstanceId: string): Promise<{ success: boolean; rewards?: any }> => {
    try {
      setError(null);
      
      const data = await api.missions.complete(missionInstanceId);
      
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
      if (err instanceof APIError) {
        setError(`${err.message} (${err.status})`);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to complete mission');
      }
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