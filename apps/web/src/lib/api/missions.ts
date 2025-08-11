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
  performance?: {
    totalMs: number;
    authMs: number;
    dbMs: number;
    usedCache: boolean;
    cacheAgeSeconds?: number | null;
  };
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
  console.log('🔐 [getAuthToken] Getting auth session...');
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('❌ [getAuthToken] Supabase session error:', error);
    throw new MissionsApiError('Authentication error', 401, error);
  }
  
  if (!session) {
    console.error('❌ [getAuthToken] No session found');
    throw new MissionsApiError('No session found', 401);
  }
  
  if (!session.access_token) {
    console.error('❌ [getAuthToken] No access token in session');
    throw new MissionsApiError('No access token', 401);
  }
  
  // Validate token format
  const tokenParts = session.access_token.split('.');
  if (tokenParts.length !== 3) {
    console.error('❌ [getAuthToken] Invalid JWT token format:', {
      parts: tokenParts.length,
      tokenStart: session.access_token.substring(0, 20) + '...'
    });
    
    // Try to refresh the session
    console.log('🔄 [getAuthToken] Attempting to refresh session...');
    const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError || !newSession?.access_token) {
      console.error('❌ [getAuthToken] Session refresh failed:', refreshError);
      throw new MissionsApiError('Token refresh failed', 401, refreshError);
    }
    
    console.log('✅ [getAuthToken] Session refreshed successfully');
    return newSession.access_token;
  }
  
  console.log('✅ [getAuthToken] Valid token obtained');
  return session.access_token;
}

async function makeApiRequest<T>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  const startTime = performance.now();
  console.log(`🌐 [makeApiRequest] Starting ${options.method || 'GET'} ${url}`);
  
  let token;
  try {
    token = await getAuthToken();
  } catch (error) {
    console.error('❌ [makeApiRequest] Failed to get auth token:', error);
    throw error;
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const endTime = performance.now();
  console.log(`⚡ [makeApiRequest] ${url} completed in ${(endTime - startTime).toFixed(2)}ms (status: ${response.status})`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(`❌ [makeApiRequest] API error ${response.status}:`, {
      url,
      status: response.status,
      statusText: response.statusText,
      error: errorData.error,
      details: errorData
    });
    
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