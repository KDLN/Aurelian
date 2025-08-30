import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { api } from '@/lib/api/client';

interface WalletData {
  gold: number;
  userId: string;
}

interface InventoryItem {
  id: string;
  itemId: string;
  itemKey: string;
  itemName: string;
  rarity: string;
  quantity: number;
  location: string;
}

interface InventoryData {
  inventory: InventoryItem[];
  location: string;
  totalItems: number;
}

// Query keys
export const userKeys = {
  all: ['user'] as const,
  wallet: (userId: string) => [...userKeys.all, 'wallet', userId] as const,
  inventory: (userId: string, location?: string) => [
    ...userKeys.all, 
    'inventory', 
    userId, 
    location || 'all'
  ] as const,
} as const;

async function fetchUserWallet(): Promise<WalletData> {
  const response = await api.user.getWallet();
  // Extract data from API response structure { success: true, data: {...} }
  return response.data || response;
}

async function fetchUserInventory(location: string = 'warehouse'): Promise<InventoryData> {
  const response = await api.user.getInventory(location);
  // Extract data from API response structure { success: true, data: {...} }
  return response.data || response;
}

// Centralized auth query to avoid duplicates
function useAuth() {
  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user ?? null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}

export function useUserWallet() {
  const { data: user } = useAuth();

  return useQuery({
    queryKey: userKeys.wallet(user?.id || ''),
    queryFn: fetchUserWallet,
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds for wallet data to update more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute to catch live updates
  });
}

export function useUserInventory(location: string = 'warehouse') {
  const { data: user } = useAuth();

  return useQuery({
    queryKey: userKeys.inventory(user?.id || '', location),
    queryFn: () => fetchUserInventory(location),
    enabled: !!user,
    staleTime: 3 * 60 * 1000, // 3 minutes for inventory data
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Combined hook for backward compatibility
export function useUserDataQuery() {
  const authQuery = useAuth();
  const walletQuery = useUserWallet();
  const inventoryQuery = useUserInventory();

  return {
    user: authQuery.data,
    authLoaded: true, // Since React Query handles loading states
    wallet: walletQuery.data,
    inventory: inventoryQuery.data,
    isLoading: walletQuery.isLoading || inventoryQuery.isLoading,
    error: walletQuery.error || inventoryQuery.error,
    refreshData: () => {
      walletQuery.refetch();
      inventoryQuery.refetch();
    },
  };
}