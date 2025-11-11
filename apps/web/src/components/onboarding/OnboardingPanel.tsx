'use client';

/**
 * OnboardingPanel Component
 *
 * Main container for the onboarding system. Orchestrates all modals and manages state.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ONBOARDING_STEPS, getStepByKey } from '@/lib/onboarding/steps';
import { supabase } from '@/lib/supabaseClient';
import WelcomeModal from './WelcomeModal';
import TutorialStepCard from './TutorialStepCard';
import RewardClaimModal from './RewardClaimModal';
import EconomicTutorial from './EconomicTutorial';

interface OnboardingStep {
  id: string;
  userId: string;
  stepKey: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  rewardsClaimed: boolean;
  completedAt?: string;
}

interface OnboardingSession {
  id: string;
  userId: string;
  currentStep: number;
  stepsCompleted: number;
  totalGoldEarned: number;
  totalItemsEarned: number;
  completedAt?: string;
  dismissed: boolean;
}

export default function OnboardingPanel() {
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardStepKey, setRewardStepKey] = useState<string | null>(null);
  const [showEconomicTutorial, setShowEconomicTutorial] = useState(false);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkOnboardingStatus();
  }, []);

  async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No auth session');
    }
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  }

  async function checkOnboardingStatus() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/onboarding/start', { headers });
      const data = await res.json();

      if (data.error) {
        console.error('Onboarding status error:', data.error);
        setLoading(false);
        return;
      }

      setHasStarted(data.hasStarted);
      setSession(data.session);
      setSteps(data.steps || []);

      // Show welcome modal if not started and not dismissed
      if (!data.hasStarted || (!data.session?.dismissed && data.session?.currentStep === 1)) {
        setShowWelcome(true);
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartOnboarding() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/onboarding/start', {
        method: 'POST',
        headers
      });
      if (!res.ok) throw new Error('Failed to start onboarding');

      const data = await res.json();
      setHasStarted(true);
      setSession(data.session);
      setShowWelcome(false);

      // Refresh to get step records
      await checkOnboardingStatus();
    } catch (error) {
      console.error('Failed to start onboarding:', error);
    }
  }

  async function handleDismiss() {
    // TODO: Add API endpoint to mark session as dismissed
    setShowWelcome(false);
  }

  async function handleValidateStep(stepKey: string) {
    try {
      // Special handling for economic tutorial step
      if (stepKey === 'economic_tutorial') {
        setShowEconomicTutorial(true);
        return;
      }

      const headers = await getAuthHeaders();
      const res = await fetch('/api/onboarding/validate-step', {
        method: 'POST',
        headers,
        body: JSON.stringify({ stepKey })
      });

      const data = await res.json();

      if (data.success && data.valid) {
        // Step completed, show reward modal
        setRewardStepKey(stepKey);
        setShowRewardModal(true);

        // Refresh state
        await checkOnboardingStatus();
      } else {
        // Show validation message
        alert(data.message || 'Step not yet completed. Please complete the requirements.');
      }
    } catch (error) {
      console.error('Failed to validate step:', error);
      alert('Failed to validate step. Please try again.');
    }
  }

  async function handleClaimReward(stepKey: string) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/onboarding/claim-reward', {
        method: 'POST',
        headers,
        body: JSON.stringify({ stepKey })
      });

      if (!res.ok) throw new Error('Failed to claim rewards');

      // Refresh state
      await checkOnboardingStatus();
    } catch (error) {
      console.error('Failed to claim rewards:', error);
      alert('Failed to claim rewards. Please try again.');
    }
  }

  async function handleCompleteEconomicTutorial() {
    try {
      // Mark tutorial as read
      const headers = await getAuthHeaders();
      const res = await fetch('/api/onboarding/validate-step', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          stepKey: 'economic_tutorial',
          metadata: { hasReadTutorial: true }
        })
      });

      const data = await res.json();

      if (data.success && data.valid) {
        setShowEconomicTutorial(false);
        setRewardStepKey('economic_tutorial');
        setShowRewardModal(true);
        await checkOnboardingStatus();
      }
    } catch (error) {
      console.error('Failed to complete tutorial:', error);
    }
  }

  if (loading) {
    return (
      <div className="p-4 bg-[#231913] border border-[#8b7355] rounded-lg text-[#f1e5c8]">
        <p>Loading onboarding...</p>
      </div>
    );
  }

  // Don't show anything if dismissed or completed (but DO show welcome modal for new users)
  if (session?.dismissed || session?.completedAt) {
    return null;
  }

  // For users who haven't started, only show the welcome modal
  if (!hasStarted) {
    return showWelcome ? <WelcomeModal onStart={handleStartOnboarding} onDismiss={handleDismiss} /> : null;
  }

  const currentStep = steps.find((s) => s.status === 'IN_PROGRESS');
  const rewardStep = rewardStepKey ? getStepByKey(rewardStepKey) : null;

  // Don't render portal on server-side
  if (!mounted) {
    return null;
  }

  const content = (
    <>
      {/* Welcome Modal */}
      {showWelcome && (
        <WelcomeModal onStart={handleStartOnboarding} onDismiss={handleDismiss} />
      )}

      {/* Economic Tutorial Modal */}
      {showEconomicTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-w-4xl w-full">
            <EconomicTutorial onComplete={handleCompleteEconomicTutorial} />
          </div>
        </div>
      )}

      {/* Reward Claim Modal */}
      {showRewardModal && rewardStep && (
        <RewardClaimModal
          isOpen={showRewardModal}
          stepTitle={rewardStep.title}
          stepIcon={rewardStep.icon}
          rewards={rewardStep.rewards}
          onClose={() => {
            setShowRewardModal(false);
            setRewardStepKey(null);
          }}
        />
      )}

      {/* Onboarding Progress Panel - Floating Modal */}
      {!showWelcome && (
        <div className="fixed bottom-4 right-4 z-40 max-w-md w-full">
          {/* Minimized Button */}
          {isPanelMinimized ? (
            <button
              onClick={() => setIsPanelMinimized(false)}
              className="bg-[#231913] border-2 border-[#8b7355] rounded-lg p-4 text-[#f1e5c8] hover:bg-[#2a1f17] transition-colors shadow-lg flex items-center gap-3 w-full"
            >
              <span className="text-2xl">🎓</span>
              <div className="flex-1 text-left">
                <p className="font-bold">Tutorial Progress</p>
                <p className="text-sm text-[#d4c5a9]">
                  {session?.stepsCompleted}/{ONBOARDING_STEPS.length} Complete
                </p>
              </div>
              <span className="text-xl">↑</span>
            </button>
          ) : (
            <div className="bg-[#231913] border-2 border-[#8b7355] rounded-lg shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#8b7355]">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-[#f1e5c8]">🎓 Tutorial Progress</h2>
                  <p className="text-[#d4c5a9] text-xs">
                    Complete steps to earn rewards
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsPanelMinimized(true)}
                    className="text-[#d4c5a9] hover:text-[#f1e5c8] transition-colors px-2"
                    title="Minimize"
                  >
                    ↓
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="text-[#d4c5a9] hover:text-[#f1e5c8] transition-colors px-2"
                    title="Dismiss (can resume later)"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto p-4 text-[#f1e5c8]">
                {/* Progress Stats */}
                <div className="flex items-center justify-between mb-3 text-sm">
                  <span className="text-[#d4c5a9]">Progress</span>
                  <span className="font-bold text-yellow-400">
                    {session?.stepsCompleted}/{ONBOARDING_STEPS.length}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="w-full bg-[#1a1410] rounded-full h-2 border border-[#8b7355]">
                    <div
                      className="bg-gradient-to-r from-yellow-600 to-orange-600 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${((session?.stepsCompleted || 0) / ONBOARDING_STEPS.length) * 100}%`
                      }}
                    />
                  </div>
                </div>

                {/* Compact Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                  <div className="bg-[#1a1410] border border-yellow-600 rounded p-2 text-center">
                    <p className="font-bold text-yellow-400">{session?.totalGoldEarned}g</p>
                    <p className="text-[#d4c5a9]">Gold Earned</p>
                  </div>
                  <div className="bg-[#1a1410] border border-blue-600 rounded p-2 text-center">
                    <p className="font-bold text-blue-400">{session?.totalItemsEarned}</p>
                    <p className="text-[#d4c5a9]">Items Earned</p>
                  </div>
                </div>

                {/* Step Cards */}
                <div className="space-y-3">
                  {ONBOARDING_STEPS.map((stepDef) => {
                    const stepRecord = steps.find((s) => s.stepKey === stepDef.key);
                    if (!stepRecord) return null;

                    const isActive = currentStep?.stepKey === stepDef.key;

                    return (
                      <TutorialStepCard
                        key={stepDef.key}
                        step={stepDef}
                        status={stepRecord.status}
                        rewardsClaimed={stepRecord.rewardsClaimed}
                        isActive={isActive}
                        onValidate={() => handleValidateStep(stepDef.key)}
                        onClaimReward={() => handleClaimReward(stepDef.key)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  // Render using portal to document body for proper z-index layering
  return createPortal(content, document.body);
}
