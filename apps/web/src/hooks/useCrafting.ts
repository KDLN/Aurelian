import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Blueprint {
  id: string;
  key: string;
  outputId: string;
  outputQty: number;
  timeMin: number;
  category: string;
  requiredLevel: number;
  xpReward: number;
  description?: string;
  isUnlocked: boolean;
  canCraft: boolean;
  output: {
    id: string;
    key: string;
    name: string;
    rarity: string;
  };
  inputs: Array<{
    itemId: string;
    qty: number;
    item: {
      id: string;
      key: string;
      name: string;
      rarity: string;
    };
  }>;
}

interface CraftJob {
  id: string;
  qty: number;
  status: string;
  quality: string;
  startedAt: string;
  eta: string;
  progress: number;
  timeRemainingMs: number;
  timeRemainingMinutes: number;
  isComplete: boolean;
  canComplete: boolean;
  blueprint: {
    output: {
      id: string;
      key: string;
      name: string;
      rarity: string;
    };
  };
}

interface CraftingStats {
  level: number;
  xp: number;
  xpNext: number;
}

export function useCrafting() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [activeJobs, setActiveJobs] = useState<CraftJob[]>([]);
  const [completedJobs, setCompletedJobs] = useState<CraftJob[]>([]);
  const [userStats, setUserStats] = useState<CraftingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBlueprints = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/crafting/blueprints', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch blueprints');
      
      const data = await response.json();
      setBlueprints(data.blueprints);
      setUserStats(data.userStats);
    } catch (err) {
      console.error('Failed to fetch blueprints:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const fetchJobs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/crafting/jobs', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch jobs');
      
      const data = await response.json();
      setActiveJobs(data.activeJobs);
      setCompletedJobs(data.completedJobs);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const startCrafting = async (blueprintId: string, quantity: number = 1) => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch('/api/crafting/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ blueprintId, quantity })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to start crafting');
      }

      const result = await response.json();
      
      // Refresh jobs after starting
      await fetchJobs();
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const completeCrafting = async (jobId: string) => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch('/api/crafting/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ jobId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to complete crafting');
      }

      const result = await response.json();
      
      // Refresh data after completion
      await Promise.all([fetchJobs(), fetchBlueprints()]);
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    Promise.all([fetchBlueprints(), fetchJobs()]);
  };

  useEffect(() => {
    fetchBlueprints();
    fetchJobs();

    // Set up periodic refresh for job progress
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    blueprints,
    activeJobs,
    completedJobs,
    userStats,
    isLoading,
    error,
    startCrafting,
    completeCrafting,
    refreshData,
    clearError: () => setError(null)
  };
}