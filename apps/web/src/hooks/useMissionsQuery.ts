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
  
  return useQuery({
    queryKey: missionKeys.missions(),
    queryFn: () => missionsApi.getMissions(),
    enabled,
    refetchInterval: isPageVisible ? refetchInterval : false, // Only poll when page is visible
    refetchIntervalInBackground: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (error instanceof MissionsApiError && error.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useStartMission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (missionId: string) => missionsApi.startMission(missionId),
    onSuccess: (data) => {
      if (data.success) {
        // Optimistically update the cache
        queryClient.setQueryData<MissionsData>(
          missionKeys.missions(),
          (oldData) => {
            if (!oldData || !data.missionInstance) return oldData;
            
            return {
              ...oldData,
              activeMissions: [...oldData.activeMissions, data.missionInstance],
            };
          }
        );
        
        // Invalidate more selectively to avoid unnecessary refetches
        queryClient.invalidateQueries({ 
          queryKey: missionKeys.missions(),
          exact: true 
        });
      }
    },
    onError: (error) => {
      console.error('Failed to start mission:', error);
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