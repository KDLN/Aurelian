import { useEffect, useState } from 'react';
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

      // Fetch wallet and inventory in parallel
      const [walletResponse, inventoryResponse] = await Promise.all([
        fetch('/api/user/wallet', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch('/api/user/inventory?location=warehouse', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      if (!walletResponse.ok) {
        const walletError = await walletResponse.json();
        throw new Error(`Wallet fetch failed: ${walletError.error}`);
      }
      
      if (!inventoryResponse.ok) {
        const inventoryError = await inventoryResponse.json();
        throw new Error(`Inventory fetch failed: ${inventoryError.error}`);
      }

      const walletData = await walletResponse.json();
      const inventoryData = await inventoryResponse.json();

      console.log('useUserData: wallet response:', walletData);
      console.log('useUserData: inventory response:', inventoryData);
      console.log('useUserData: inventory.inventory array:', inventoryData?.inventory);
      console.log('useUserData: inventory total items:', inventoryData?.totalItems);

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