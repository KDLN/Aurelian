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
   * User-related API calls (v2)
   */
  user = {
    getProfile: () =>
      this.get('/api/v2/user/profile'),
    
    updateProfile: (profileData: any) =>
      this.put('/api/v2/user/profile', profileData),
    
    updateAvatar: (avatarData: any) =>
      this.put('/api/v2/user/avatar', avatarData),
    
    getInventory: (location?: string) =>
      this.get(location ? `/api/v2/user/inventory?location=${location}` : '/api/v2/user/inventory'),
    
    getWallet: () =>
      this.get('/api/v2/user/wallet'),
    
    createWallet: () =>
      this.post('/api/v2/user/wallet'),
    
    getStats: (period?: string) =>
      this.get(period ? `/api/v2/user/stats?period=${period}` : '/api/v2/user/stats'),
    
    searchUsers: (query: string, limit?: number) =>
      this.get(`/api/v2/user/search?q=${encodeURIComponent(query)}${limit ? `&limit=${limit}` : ''}`),
    
    populateStarter: () =>
      this.post('/api/v2/user/populate-starter'),
    
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
   * Trading API calls (v2 - consolidated)
   */
  trading = {
    // Auction listings
    getListings: (params?: { page?: number; limit?: number; itemType?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) searchParams.append(key, String(value));
        });
      }
      return this.get(`/api/v2/trading/listings${searchParams.toString() ? `?${searchParams}` : ''}`);
    },
    
    createListing: (listing: { itemIds: string[]; pricePerUnit: number; duration?: string }) =>
      this.post('/api/v2/trading/listings', listing),
    
    // Purchase items
    buyItem: (purchase: { listingId: string; quantity: number }) =>
      this.post('/api/v2/trading/buy', purchase),
    
    // Market data
    getMarketSummary: () =>
      this.get('/api/v2/trading/market'),
    
    // Contracts
    getContracts: (type?: 'PURCHASE' | 'SALE', status?: string) => {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (status) params.append('status', status);
      return this.get(`/api/v2/trading/contracts${params.toString() ? `?${params}` : ''}`);
    },
    
    createContract: (contract: { type: 'PURCHASE' | 'SALE'; itemDefId: string; quantity: number; pricePerUnit: number; expiresAt: string }) =>
      this.post('/api/v2/trading/contracts', contract),
  };

  /**
   * @deprecated Use trading.getContracts() instead
   */
  contracts = {
    list: () =>
      this.trading.getContracts(),
    
    create: (contract: any) =>
      this.trading.createContract(contract),
  };

  /**
   * @deprecated Use trading methods instead
   */
  auction = {
    list: (itemKey: string, quantity: number, pricePerUnit: number) =>
      this.trading.createListing({ itemIds: [itemKey], pricePerUnit, duration: '24h' }),
    
    buy: (listingId: string) =>
      this.trading.buyItem({ listingId, quantity: 1 }),
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
   * Admin API calls (v2 - consolidated)
   */
  admin = {
    // Access control
    checkAccess: () =>
      this.get('/api/v2/admin/check-access'),
    
    // Dashboard stats
    getStats: () =>
      this.get('/api/v2/admin/stats'),
    
    // User management
    getUsers: (params?: { page?: number; limit?: number; filter?: string }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) searchParams.append(key, String(value));
        });
      }
      return this.get(`/api/v2/admin/users${searchParams.toString() ? `?${searchParams}` : ''}`);
    },
    
    deleteUser: (userId: string, reason?: string) =>
      this.post('/api/v2/admin/delete-user', { userId, reason }),
    
    // Emergency actions
    emergency: (action: string, params?: any) =>
      this.post('/api/v2/admin/emergency', { action, ...params }),
    
    // Security monitoring
    getSecurityAlerts: (filter?: 'all' | 'unacknowledged' | 'critical', limit?: number) => {
      const params = new URLSearchParams();
      if (filter) params.append('filter', filter);
      if (limit) params.append('limit', String(limit));
      return this.get(`/api/v2/admin/security/alerts${params.toString() ? `?${params}` : ''}`);
    },
    
    acknowledgeSecurityAlert: (alertId: string) =>
      this.put('/api/v2/admin/security/alerts', { alertId, acknowledged: true }),
  };

  /**
   * Inventory API calls
   */
  inventory = {
    list: () =>
      this.get('/api/inventory'),
    
    populateStarter: () =>
      this.post('/api/v2/user/populate-starter'),
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