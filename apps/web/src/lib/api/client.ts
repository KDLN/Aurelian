import { supabase } from '@/lib/supabaseClient';

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Standard API response format
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Request configuration options
 */
interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  skipAuth?: boolean;
  timeout?: number;
}

/**
 * Centralized API client for all frontend API calls
 */
class APIClient {
  private baseUrl: string;
  private defaultTimeout: number = 30000; // 30 seconds

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Core request method with auth, error handling, and timeout
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      body,
      skipAuth = false,
      timeout = this.defaultTimeout,
      ...fetchOptions
    } = options;

    // Get auth token unless explicitly skipped
    let headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    if (!skipAuth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else if (!options.skipAuth) {
        throw new APIError('Not authenticated', 401);
      }
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchOptions,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const contentType = response.headers.get('content-type');
      let responseData: any;

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Handle errors
      if (!response.ok) {
        const errorMessage = responseData?.error || responseData?.message || 'Request failed';
        const errorDetails = responseData?.details;
        throw new APIError(errorMessage, response.status, errorDetails);
      }

      return responseData;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new APIError('Request timeout', 408);
        }
        throw new APIError(error.message, 500);
      }

      throw new APIError('Unknown error occurred', 500);
    }
  }

  /**
   * GET request helper
   */
  async get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request helper
   */
  async post<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request helper
   */
  async put<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request helper
   */
  async delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH request helper
   */
  async patch<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  // ============================================
  // API Endpoint Methods - Organized by domain
  // ============================================

  /**
   * Mission-related API calls
   */
  missions = {
    list: () => 
      this.get('/api/missions'),
    
    start: (missionId: string, agentId: string) => 
      this.post('/api/missions', { missionId, agentId }),
    
    complete: (missionInstanceId: string) =>
      this.post('/api/missions/complete', { missionInstanceId }),
    
    getStats: () =>
      this.get('/api/missions/stats'),
    
    getLeaderboard: () =>
      this.get('/api/missions/leaderboard'),
  };

  /**
   * User-related API calls
   */
  user = {
    getProfile: () =>
      this.get('/api/user/profile'),
    
    updateAvatar: (avatarData: any) =>
      this.post('/api/user/avatar', avatarData),
    
    getInventory: () =>
      this.get('/api/user/inventory'),
    
    getWallet: () =>
      this.get('/api/user/wallet'),
    
    createWallet: () =>
      this.post('/api/user/wallet/create'),
    
    updateOnboarding: (step: string) =>
      this.post('/api/user/onboarding', { step }),
    
    syncUser: () =>
      this.post('/api/auth/sync-user'),
  };

  /**
   * Agent-related API calls
   */
  agents = {
    list: () =>
      this.get('/api/agents'),
    
    equip: (agentId: string, equipmentId: string, slot: string) =>
      this.post(`/api/agents/${agentId}/equip`, { equipmentId, slot }),
    
    levelUp: (agentId: string, statToUpgrade: string) =>
      this.post(`/api/agents/${agentId}/level-up`, { statToUpgrade }),
    
    getStarterGear: () =>
      this.post('/api/agents/starter-gear'),
  };

  /**
   * Guild-related API calls
   */
  guild = {
    browse: () =>
      this.get('/api/guild/browse'),
    
    getWarehouse: () =>
      this.get('/api/guild/warehouse'),
    
    getTreasury: () =>
      this.get('/api/guild/treasury'),
    
    inviteRespond: (inviteId: string, accept: boolean) =>
      this.post('/api/guild/invite/respond', { inviteId, accept }),
    
    alliance: {
      list: () =>
        this.get('/api/guild/alliance/list'),
      
      propose: (targetGuildId: string, message?: string) =>
        this.post('/api/guild/alliance/propose', { targetGuildId, message }),
      
      respond: (proposalId: string, accept: boolean) =>
        this.post('/api/guild/alliance/respond', { proposalId, accept }),
      
      break: (allianceId: string) =>
        this.post('/api/guild/alliance/break', { allianceId }),
      
      missions: {
        list: () =>
          this.get('/api/guild/alliance/missions'),
        
        join: (missionId: string) =>
          this.post('/api/guild/alliance/missions/join', { missionId }),
        
        complete: (missionId: string) =>
          this.post('/api/guild/alliance/missions/complete', { missionId }),
      },
    },
  };

  /**
   * Auction/Trading API calls
   */
  auction = {
    list: (itemKey: string, quantity: number, pricePerUnit: number) =>
      this.post('/api/auction/list', { itemKey, quantity, pricePerUnit }),
    
    buy: (listingId: string) =>
      this.post('/api/auction/buy', { listingId }),
  };

  /**
   * Contract API calls
   */
  contracts = {
    list: () =>
      this.get('/api/contracts'),
    
    create: (contract: any) =>
      this.post('/api/contracts', contract),
  };

  /**
   * Crafting API calls
   */
  crafting = {
    getBlueprints: () =>
      this.get('/api/crafting/blueprints'),
    
    populateStarter: () =>
      this.post('/api/crafting/blueprints/populate-starter'),
  };

  /**
   * Equipment API calls
   */
  equipment = {
    list: () =>
      this.get('/api/equipment'),
  };

  /**
   * Travel API calls
   */
  travel = {
    calculate: (fromHub: string, toHub: string) =>
      this.post('/api/travel/calculate', { fromHub, toHub }),
    
    execute: (fromHub: string, toHub: string) =>
      this.post('/api/travel/execute', { fromHub, toHub }),
  };

  /**
   * Inventory API calls
   */
  inventory = {
    list: () =>
      this.get('/api/inventory'),
    
    populateStarter: () =>
      this.post('/api/user/inventory/populate-starter'),
  };

  /**
   * Profile API calls
   */
  profile = {
    get: () =>
      this.get('/api/profile'),
  };
}

// Export singleton instance
export const api = new APIClient();

// Export for testing or custom instances
export default APIClient;