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

export interface MissionsData {
  missionDefs: MissionDef[];
  activeMissions: MissionInstance[];
  debugTimestamp?: string;
}

export interface StartMissionResponse {
  success: boolean;
  missionInstance?: MissionInstance;
  error?: string;
}

export interface CompleteMissionResponse {
  success: boolean;
  missionSuccess?: boolean;
  outcomeType?: string;
  outcomeRoll?: number;
  outcomeDescription?: string;
  rewards?: {
    gold: number;
    items: { itemKey: string; qty: number }[];
  };
  breakdown?: any;
  details?: any;
  completedMission?: MissionInstance;
  error?: string;
}

class MissionsApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'MissionsApiError';
  }
}

async function getAuthToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    throw new MissionsApiError('Authentication error', 401, error);
  }
  
  if (!session?.access_token) {
    throw new MissionsApiError('Not authenticated', 401);
  }
  
  return session.access_token;
}

async function makeApiRequest<T>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new MissionsApiError(
      errorData.error || `API request failed: ${response.statusText}`,
      response.status,
      errorData
    );
  }

  return response.json();
}

export const missionsApi = {
  // Fetch all missions and active missions
  async getMissions(): Promise<MissionsData> {
    return makeApiRequest<MissionsData>('/api/missions');
  },

  // Start a new mission
  async startMission(missionId: string): Promise<StartMissionResponse> {
    return makeApiRequest<StartMissionResponse>('/api/missions', {
      method: 'POST',
      body: JSON.stringify({ missionId }),
    });
  },

  // Complete a mission
  async completeMission(missionInstanceId: string): Promise<CompleteMissionResponse> {
    return makeApiRequest<CompleteMissionResponse>('/api/missions/complete', {
      method: 'POST',
      body: JSON.stringify({ missionInstanceId }),
    });
  },
};

export { MissionsApiError };