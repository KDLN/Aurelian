import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

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
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/user/wallet', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch wallet');
  }

  return response.json();
}

async function fetchUserInventory(location: string = 'warehouse'): Promise<InventoryData> {
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`/api/user/inventory?location=${location}`, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch inventory');
  }

  return response.json();
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
    staleTime: 2 * 60 * 1000, // 2 minutes for wallet data
    gcTime: 5 * 60 * 1000, // 5 minutes
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