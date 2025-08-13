import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useUserSync() {
  const [user, setUser] = useState<any>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get initial auth state and set up listener
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

  useEffect(() => {
    if (authLoaded && user && !isSynced && !isLoading) {
      syncUser();
    }
  }, [user, authLoaded, isSynced, isLoading]);

  const syncUser = async () => {
    if (!user || isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Get the user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const result = await response.json();
      
      if (result.success) {
        console.log('User synced successfully:', result.message);
        setIsSynced(true);
      } else {
        console.error('Sync failed:', result.error);
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { user, authLoaded, isSynced, isLoading, syncUser };
}