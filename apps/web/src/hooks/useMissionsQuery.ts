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
  const { refetchInterval = 30000, enabled = true } = options;
  const isPageVisible = usePageVisibility();
  
  const query = useQuery<MissionsData>({
    queryKey: missionKeys.missions(),
    queryFn: () => {
      console.log('🌐 [useMissions] Fetching missions from API...');
      return missionsApi.getMissions();
    },
    enabled,
    refetchInterval: isPageVisible ? refetchInterval : false, // Only poll when page is visible
    refetchIntervalInBackground: false,
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter for debugging
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (error instanceof MissionsApiError && error.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
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
    mutationFn: (missionInstanceId: string) => 
      missionsApi.completeMission(missionInstanceId),
    onSuccess: (data, missionInstanceId) => {
      if (data.success) {
        // Optimistically update the cache
        queryClient.setQueryData<MissionsData>(
          missionKeys.missions(),
          (oldData) => {
            if (!oldData) return oldData;
            
            return {
              ...oldData,
              activeMissions: oldData.activeMissions.filter(
                (mission) => mission.id !== missionInstanceId
              ),
            };
          }
        );
        
        // Invalidate more selectively to avoid unnecessary refetches
        queryClient.invalidateQueries({ 
          queryKey: missionKeys.missions(),
          exact: true 
        });
        // Only invalidate specific user data that might have changed
        queryClient.invalidateQueries({ 
          queryKey: ['user', 'wallet'],
          exact: false // Allow partial matches for user wallet queries
        });
      }
    },
    onError: (error) => {
      console.error('Failed to complete mission:', error);
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