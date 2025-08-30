import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
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

export function useUserData() {
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoaded(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user data when authenticated
  useEffect(() => {
    if (authLoaded && user) {
      fetchUserData();
    } else if (authLoaded && !user) {
      // Clear data when logged out
      setWallet(null);
      setInventory(null);
    }
  }, [user, authLoaded]);

  const fetchUserData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) {
        throw new Error('No access token available');
      }

      // Fetch wallet and inventory in parallel using v2 API
      const [walletResponse, inventoryResponse] = await Promise.all([
        api.user.getWallet(),
        api.user.getInventory('warehouse')
      ]);

      // Extract data from API response structure { success: true, data: {...} }
      const walletData = walletResponse.data || walletResponse;
      const inventoryData = inventoryResponse.data || inventoryResponse;

      logger.debug('User data loaded', {
        walletExists: !!walletData,
        inventoryItems: inventoryData?.totalItems || 0,
        inventoryArrayLength: inventoryData?.inventory?.length || 0,
        walletGold: walletData?.gold
      });

      setWallet(walletData);
      setInventory(inventoryData);
      
    } catch (err) {
      console.error('Failed to fetch user data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    if (user) {
      fetchUserData();
    }
  };

  return {
    user,
    authLoaded,
    wallet,
    inventory,
    isLoading,
    error,
    refreshData
  };
}