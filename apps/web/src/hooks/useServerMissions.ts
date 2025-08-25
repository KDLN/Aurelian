'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface ServerMission {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  startedAt: string | null;
  endsAt: string;
  globalProgress: any;
  globalRequirements: any;
  userParticipation: any;
  participantCount: number;
}

interface UseServerMissionsResult {
  missions: ServerMission[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useServerMissions(): UseServerMissionsResult {
  const [missions, setMissions] = useState<ServerMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        const response = await fetch('/api/server/missions?status=active', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });
        
        if (response.ok) {
          const result = await response.json();
          const fetchedMissions = result.missions || [];
          
          // Debug log to track updates
          if (fetchedMissions.length > 0) {
            console.log('🎯 Server missions updated via hook:', {
              mission: fetchedMissions[0]?.name,
              progress: fetchedMissions[0]?.globalProgress,
              participants: fetchedMissions[0]?.participantCount,
              timestamp: new Date().toISOString()
            });
          }
          
          setMissions(fetchedMissions);
        } else {
          throw new Error('Failed to fetch missions');
        }
      }
    } catch (err) {
      console.error('Error fetching server missions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch missions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMissions();
    
    // Refetch every 10 seconds for real-time updates
    const interval = setInterval(fetchMissions, 10000);
    return () => clearInterval(interval);
  }, [fetchMissions]);

  return {
    missions,
    loading,
    error,
    refetch: fetchMissions
  };
}

// Global refetch function for manual triggers
let globalRefetchFn: (() => Promise<void>) | null = null;

export function setGlobalServerMissionsRefetch(refetch: () => Promise<void>) {
  globalRefetchFn = refetch;
}

export function triggerGlobalServerMissionsRefresh() {
  if (globalRefetchFn) {
    console.log('🔄 Triggering global server missions refresh');
    globalRefetchFn();
  }
}