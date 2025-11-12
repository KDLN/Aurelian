/**
 * Hook to automatically track and complete onboarding steps
 * when users perform actions
 */

import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Automatically tracks and validates an onboarding step when the component mounts
 */
export function useOnboardingTracker(stepKey: string) {
  useEffect(() => {
    const trackStepCompletion = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        // Call validate-step endpoint to check and complete the step
        const headers = {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        };

        await fetch('/api/onboarding/validate-step', {
          method: 'POST',
          headers,
          body: JSON.stringify({ stepKey })
        });
      } catch (error) {
        // Silently fail - this is a background tracking operation
        console.debug('Onboarding tracking error:', error);
      }
    };

    trackStepCompletion();
  }, [stepKey]);
}

/**
 * Returns a function to manually trigger onboarding step validation
 * Use this after user actions like hiring an agent, completing a mission, etc.
 */
export function useOnboardingAction() {
  return useCallback(async (stepKey: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.debug('[Onboarding] No session token, skipping tracking');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      console.log(`[Onboarding] Tracking action: ${stepKey}`);
      const response = await fetch('/api/onboarding/validate-step', {
        method: 'POST',
        headers,
        body: JSON.stringify({ stepKey })
      });

      if (!response.ok) {
        const error = await response.json();
        console.warn('[Onboarding] Validation failed:', error);
      } else {
        const result = await response.json();
        console.log('[Onboarding] Validation result:', result);
      }
    } catch (error) {
      console.debug('[Onboarding] Action tracking error:', error);
    }
  }, []);
}
