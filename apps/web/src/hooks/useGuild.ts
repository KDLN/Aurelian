import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  GuildInfo, 
  GuildInvitation, 
  ApiResponse, 
  LoadingState,
  TypedGuildActivity 
} from '@/types/guild';

interface UseGuildReturn extends LoadingState {
  guild: GuildInfo | null;
  invitations: GuildInvitation[];
  isInGuild: boolean;
  refresh: () => Promise<void>;
}

export function useGuild(): UseGuildReturn {
  const [guild, setGuild] = useState<GuildInfo | null>(null);
  const [invitations, setInvitations] = useState<GuildInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGuildData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Fetch guild info
      const guildResponse = await fetch('/api/guild/info', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!guildResponse.ok) {
        throw new Error(`Failed to fetch guild data: ${guildResponse.status}`);
      }

      const guildData: ApiResponse<{ inGuild: boolean; guild: GuildInfo | null }> = await guildResponse.json();
      
      if (guildData.success && guildData.data?.inGuild && guildData.data.guild) {
        setGuild(guildData.data.guild);
      } else {
        setGuild(null);
      }

      // Fetch invitations if not in guild
      if (!guildData.data?.inGuild) {
        const inviteResponse = await fetch('/api/guild/invite', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (inviteResponse.ok) {
          const inviteData: ApiResponse<{ invitations: GuildInvitation[] }> = await inviteResponse.json();
          setInvitations(inviteData.data?.invitations || []);
        } else {
          setInvitations([]);
        }
      } else {
        setInvitations([]);
      }

    } catch (err) {
      console.error('Error loading guild data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load guild data');
      setGuild(null);
      setInvitations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuildData();
  }, [fetchGuildData]);

  return {
    guild,
    invitations,
    isInGuild: guild !== null,
    isLoading,
    error,
    refresh: fetchGuildData
  };
}

// Hook for guild treasury operations
export function useGuildTreasury() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deposit = useCallback(async (amount: number): Promise<boolean> => {
    if (amount <= 0) {
      setError('Amount must be positive');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/guild/treasury/deposit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.details || 'Failed to deposit gold');
      }

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deposit gold';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const withdraw = useCallback(async (amount: number, reason?: string): Promise<boolean> => {
    if (amount <= 0) {
      setError('Amount must be positive');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/guild/treasury/withdraw', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount, reason: reason || 'Guild expenses' })
      });

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.details || 'Failed to withdraw gold');
      }

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw gold';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    deposit,
    withdraw,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}

// Hook for invitation management
export function useGuildInvitations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const respondToInvitation = useCallback(async (
    invitationId: string, 
    action: 'accept' | 'decline'
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/guild/invite/respond', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ invitationId, action })
      });

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.details || 'Failed to respond to invitation');
      }

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to respond to invitation';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    respondToInvitation,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}