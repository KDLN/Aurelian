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
import DraggableWindow from './DraggableWindow';
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

      // Show welcome modal ONLY if not started and not dismissed
      if (!data.hasStarted && !data.session?.dismissed) {
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

      const data = await res.json();

      // Handle case where onboarding already started
      if (!res.ok && data.error === 'Onboarding already started' && data.session) {
        setHasStarted(true);
        setSession(data.session);
        setShowWelcome(false);
        await checkOnboardingStatus();
        return;
      }

      if (!res.ok) throw new Error('Failed to start onboarding');

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

  // Don't render portal on server-side
  if (!mounted) {
    return null;
  }

  if (loading) {
    return createPortal(
      <div className="p-4 bg-[#231913] border border-[#8b7355] rounded-lg text-[#f1e5c8]">
        <p>Loading onboarding...</p>
      </div>,
      document.body
    );
  }

  // Don't show anything if dismissed or completed (but DO show welcome modal for new users)
  if (session?.dismissed || session?.completedAt) {
    return null;
  }

  // For users who haven't started, only show the welcome modal
  if (!hasStarted) {
    return showWelcome ? createPortal(
      <WelcomeModal onStart={handleStartOnboarding} onDismiss={handleDismiss} />,
      document.body
    ) : null;
  }

  const currentStep = steps.find((s) => s.status === 'IN_PROGRESS');
  const rewardStep = rewardStepKey ? getStepByKey(rewardStepKey) : null;

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

      {/* Onboarding Progress Panel - Draggable Floating Window */}
      {!showWelcome && (
        <DraggableWindow
          initialPosition={{ x: window.innerWidth - 420, y: 80 }}
          width="400px"
          maxWidth="400px"
          title="🎓 Tutorial Progress"
          onClose={handleDismiss}
          onMinimize={() => setIsPanelMinimized(true)}
          isMinimized={isPanelMinimized}
          minimizedContent={
            <button
              onClick={() => setIsPanelMinimized(false)}
              className="game-btn game-btn-secondary"
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                minWidth: '250px'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>🎓</span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={{ fontWeight: 'bold', margin: 0 }}>Tutorial Progress</p>
                <p className="game-small game-muted" style={{ margin: 0 }}>
                  {session?.stepsCompleted}/{ONBOARDING_STEPS.length} Complete
                </p>
              </div>
              <span style={{ fontSize: '1.25rem' }}>↑</span>
            </button>
          }
        >
          {/* Subtitle */}
          <p className="game-muted game-small" style={{ marginTop: '-0.5rem', marginBottom: '1rem', textAlign: 'center' }}>
            Drag to move • Complete steps to earn rewards
          </p>

          {/* Scrollable Content */}
          <div style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 120px)' }}>
            {/* Progress Stats */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
              fontSize: '0.95rem'
            }}>
              <span style={{ color: '#b8a890' }}>Progress</span>
              <span style={{ color: '#d4a574', fontWeight: 'bold' }}>
                {session?.stepsCompleted}/{ONBOARDING_STEPS.length}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="game-progress-bar" style={{ marginBottom: '1rem' }}>
              <div
                className="game-progress-fill"
                style={{
                  width: `${((session?.stepsCompleted || 0) / ONBOARDING_STEPS.length) * 100}%`
                }}
              />
            </div>

            {/* Compact Stats */}
            <div className="game-grid-2" style={{ marginBottom: '1rem', gap: '0.5rem' }}>
              <div style={{
                background: '#0d0a08',
                border: '2px solid #8b7355',
                borderRadius: '6px',
                padding: '0.75rem',
                textAlign: 'center'
              }}>
                <p style={{ color: '#d4a574', fontWeight: 'bold', margin: 0, fontSize: '1.1rem' }}>
                  {session?.totalGoldEarned}g
                </p>
                <p className="game-small" style={{ color: '#b8a890', margin: 0, marginTop: '0.25rem' }}>
                  Gold Earned
                </p>
              </div>
              <div style={{
                background: '#0d0a08',
                border: '2px solid #8b7355',
                borderRadius: '6px',
                padding: '0.75rem',
                textAlign: 'center'
              }}>
                <p style={{ color: '#d4a574', fontWeight: 'bold', margin: 0, fontSize: '1.1rem' }}>
                  {session?.totalItemsEarned}
                </p>
                <p className="game-small" style={{ color: '#b8a890', margin: 0, marginTop: '0.25rem' }}>
                  Items Earned
                </p>
              </div>
            </div>

            {/* Step Cards */}
            <div className="game-flex-col">
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
        </DraggableWindow>
      )}
    </>
  );

  // Render using portal to document body for proper z-index layering
  return createPortal(content, document.body);
}
