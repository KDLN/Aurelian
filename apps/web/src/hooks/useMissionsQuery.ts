import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { 
  missionsApi, 
  MissionsData, 
  StartMissionResponse, 
  CompleteMissionResponse,
  MissionsApiError 
} from '@/lib/api/missions';
import { usePageVisibility } from './usePageVisibility';

// Query keys for consistent cache management
export const missionKeys = {
  all: ['missions'] as const,
  missions: () => [...missionKeys.all, 'list'] as const,
  mission: (id: string) => [...missionKeys.all, 'detail', id] as const,
} as const;

interface UseMissionsOptions {
  refetchInterval?: number;
  enabled?: boolean;
}

export function useMissions(options: UseMissionsOptions = {}) {
  const { refetchInterval = 60000, enabled = true } = options; // Reduced from 30s to 60s
  const isPageVisible = usePageVisibility();
  
  const query = useQuery<MissionsData>({
    queryKey: missionKeys.missions(),
    queryFn: async () => {
      console.log('🌐 [useMissions] Fetching missions from API...');
      const startTime = performance.now();
      
      try {
        const data = await missionsApi.getMissions();
        const endTime = performance.now();
        console.log(`⚡ [useMissions] Client request completed in ${(endTime - startTime).toFixed(2)}ms`);
        
        if (data.performance) {
          console.log('📊 [useMissions] Server performance:', data.performance);
        }
        
        // Validate that we got real data, not fallback mock data
        if (data.missionDefs && data.missionDefs.length < 5) {
          console.warn('⚠️ [useMissions] Received potentially mock data (low mission count):', {
            missionDefs: data.missionDefs.length,
            hasPerformance: !!data.performance,
            debugTimestamp: data.debugTimestamp
          });
        }
        
        return data;
      } catch (error) {
        const endTime = performance.now();
        console.error(`❌ [useMissions] Request failed after ${(endTime - startTime).toFixed(2)}ms:`, error);
        
        // Re-throw auth errors to prevent fallback to stale data
        if (error instanceof MissionsApiError && error.status === 401) {
          console.error('🔐 [useMissions] Authentication failed - user may need to re-login');
        }
        
        throw error;
      }
    },
    enabled,
    refetchInterval: isPageVisible ? refetchInterval : false, // Only poll when page is visible
    refetchIntervalInBackground: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - much longer since we have real-time countdown
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false, // Disable aggressive refocusing
    refetchOnMount: 'always', // Always fetch fresh data on mount
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (error instanceof MissionsApiError && error.status === 401) {
        return false;
      }
      return failureCount < 2; // Reduced retries from 3 to 2
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Log query status changes (replaces onSuccess/onError)
  if (query.isSuccess && query.data) {
    console.log('✅ [useMissions] Query successful:', {
      missionDefs: query.data.missionDefs?.length,
      activeMissions: query.data.activeMissions?.length,
      debugTimestamp: query.data.debugTimestamp
    });
  }
  
  if (query.isError) {
    console.error('❌ [useMissions] Query failed:', query.error);
  }

  return query;
}

export function useStartMission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (missionId: string) => missionsApi.startMission(missionId),
    onMutate: async (missionId) => {
      console.log('🚀 [StartMission] Starting mutation for mission:', missionId);
      
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: missionKeys.missions() });
      
      // Snapshot the previous value
      const previousMissions = queryClient.getQueryData<MissionsData>(missionKeys.missions());
      
      return { previousMissions, missionId };
    },
    onSuccess: (data, missionId, context) => {
      console.log('✅ [StartMission] Mutation successful:', { 
        success: data.success, 
        missionId, 
        instanceId: data.missionInstance?.id 
      });
      
      if (data.success && data.missionInstance) {
        // Update the cache with the actual server response
        queryClient.setQueryData<MissionsData>(
          missionKeys.missions(),
          (oldData) => {
            if (!oldData) return oldData;
            
            console.log('📝 [StartMission] Updating cache with server response');
            return {
              ...oldData,
              activeMissions: [...oldData.activeMissions, data.missionInstance!],
            };
          }
        );
        
        // DO NOT invalidate immediately - let the optimistic update persist
        // Only invalidate after a short delay to allow UI to settle
        setTimeout(() => {
          console.log('🔄 [StartMission] Delayed cache invalidation');
          queryClient.invalidateQueries({ 
            queryKey: missionKeys.missions(),
            exact: true 
          });
        }, 2000); // 2 second delay
      }
    },
    onError: (error, missionId, context) => {
      console.error('❌ [StartMission] Mutation failed:', error);
      
      // On error, roll back to the previous state
      if (context?.previousMissions) {
        queryClient.setQueryData(missionKeys.missions(), context.previousMissions);
      }
    },
    onSettled: (data, error, missionId) => {
      console.log('🏁 [StartMission] Mutation settled:', { missionId, hasError: !!error });
    },
  });
}

export function useCompleteMission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (missionInstanceId: string) => {
      console.log('🎯 [CompleteMission] Starting completion for:', missionInstanceId);
      return missionsApi.completeMission(missionInstanceId);
    },
    onMutate: async (missionInstanceId) => {
      console.log('⚡ [CompleteMission] Applying optimistic update...');
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: missionKeys.missions() });
      
      // Snapshot previous state
      const previousMissions = queryClient.getQueryData<MissionsData>(missionKeys.missions());
      
      // Optimistically remove the mission immediately for instant UI feedback
      queryClient.setQueryData<MissionsData>(
        missionKeys.missions(),
        (oldData) => {
          if (!oldData) return oldData;
          
          console.log('💨 [CompleteMission] Optimistically removing mission from UI');
          return {
            ...oldData,
            activeMissions: oldData.activeMissions.filter(
              (mission) => mission.id !== missionInstanceId
            ),
          };
        }
      );
      
      return { previousMissions, missionInstanceId };
    },
    onSuccess: (data, missionInstanceId, context) => {
      console.log('✅ [CompleteMission] Mutation successful:', { 
        success: data.success,
        missionSuccess: data.missionSuccess,
        rewards: data.rewards
      });
      
      if (data.success) {
        // Mission was successfully completed - optimistic update was correct
        // Only invalidate wallet data since mission is already removed from UI
        setTimeout(() => {
          queryClient.invalidateQueries({ 
            queryKey: ['user', 'wallet'],
            exact: false
          });
        }, 1000); // Delay to prevent immediate refetch
      }
    },
    onError: (error, missionInstanceId, context) => {
      console.error('❌ [CompleteMission] Mutation failed:', error);
      
      // Revert the optimistic update on error
      if (context?.previousMissions) {
        console.log('🔄 [CompleteMission] Reverting optimistic update due to error');
        queryClient.setQueryData(missionKeys.missions(), context.previousMissions);
      }
    },
    onSettled: (data, error, missionInstanceId) => {
      console.log('🏁 [CompleteMission] Mutation settled:', { 
        missionInstanceId: missionInstanceId.substring(0, 8), 
        hasError: !!error,
        success: data?.success 
      });
      
      // Always refresh missions after a reasonable delay to ensure consistency
      setTimeout(() => {
        console.log('🔄 [CompleteMission] Final cache refresh');
        queryClient.invalidateQueries({ 
          queryKey: missionKeys.missions(),
          exact: true 
        });
      }, 3000);
    },
  });
}

// Helper hook for mission status calculations - memoized to prevent re-renders
export function useMissionHelpers() {
  const formatTimeRemaining = useCallback((endTime: string): string => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ready!';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, []);

  const getMissionProgress = useCallback((startTime: string, endTime: string): number => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
    return Math.floor(progress);
  }, []);

  const isReady = useCallback((endTime: string): boolean => {
    return new Date() >= new Date(endTime);
  }, []);

  const getRiskColor = useCallback((risk: string): string => {
    switch (risk) {
      case 'LOW': return 'good';
      case 'MEDIUM': return 'warn';
      case 'HIGH': return 'bad';
      default: return 'muted';
    }
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }, []);

  return useMemo(() => ({
    formatTimeRemaining,
    getMissionProgress,
    isReady,
    getRiskColor,
    formatDuration,
  }), [formatTimeRemaining, getMissionProgress, isReady, getRiskColor, formatDuration]);
}