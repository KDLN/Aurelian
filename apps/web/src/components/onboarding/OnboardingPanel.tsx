'use client';

/**
 * OnboardingPanel Component
 *
 * Main container for the onboarding system. Orchestrates all modals and manages state.
 */

import { useEffect, useState } from 'react';
import { ONBOARDING_STEPS, getStepByKey } from '@/lib/onboarding/steps';
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

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  async function checkOnboardingStatus() {
    try {
      const res = await fetch('/api/onboarding/start');
      const data = await res.json();

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
      const res = await fetch('/api/onboarding/start', { method: 'POST' });
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

      const res = await fetch('/api/onboarding/validate-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch('/api/onboarding/claim-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch('/api/onboarding/validate-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Don't show anything if dismissed or completed
  if (!hasStarted || session?.dismissed || session?.completedAt) {
    return null;
  }

  const currentStep = steps.find((s) => s.status === 'IN_PROGRESS');
  const rewardStep = rewardStepKey ? getStepByKey(rewardStepKey) : null;

  return (
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

      {/* Onboarding Progress Panel */}
      {!showWelcome && (
        <div className="mb-6 bg-[#231913] border-2 border-[#8b7355] rounded-lg p-6 text-[#f1e5c8]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">🎓 Tutorial Progress</h2>
              <p className="text-[#d4c5a9] text-sm">
                Complete steps to earn rewards and master the game
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-yellow-400">
                {session?.stepsCompleted}/{ONBOARDING_STEPS.length}
              </p>
              <p className="text-sm text-[#d4c5a9]">Steps Complete</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="w-full bg-[#1a1410] rounded-full h-3 border border-[#8b7355]">
              <div
                className="bg-gradient-to-r from-yellow-600 to-orange-600 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${((session?.stepsCompleted || 0) / ONBOARDING_STEPS.length) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#1a1410] border border-yellow-600 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-400">{session?.totalGoldEarned}g</p>
              <p className="text-xs text-[#d4c5a9]">Gold Earned</p>
            </div>
            <div className="bg-[#1a1410] border border-blue-600 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">{session?.totalItemsEarned}</p>
              <p className="text-xs text-[#d4c5a9]">Items Earned</p>
            </div>
            <div className="bg-[#1a1410] border border-green-600 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-400">
                {Math.round(((session?.stepsCompleted || 0) / ONBOARDING_STEPS.length) * 100)}%
              </p>
              <p className="text-xs text-[#d4c5a9]">Complete</p>
            </div>
          </div>

          {/* Step Cards */}
          <div className="space-y-4">
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
      )}
    </>
  );
}
