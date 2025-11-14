'use client';

/**
 * OnboardingPanel Component
 *
 * Main container for the onboarding system. Orchestrates all modals and manages state.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ONBOARDING_STEPS, getStepByKey } from '@/lib/onboarding/steps';
import { supabase } from '@/lib/supabaseClient';
import WelcomeModal from './WelcomeModal';
import DraggableWindow from './DraggableWindow';
import TutorialStepCard from './TutorialStepCard';
import RewardClaimModal from './RewardClaimModal';
import EconomicTutorial from './EconomicTutorial';

type StepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

interface OnboardingStep {
  id: string;
  userId: string;
  stepKey: string;
  status: StepStatus;
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
  const router = useRouter();
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
  const [isClaimingReward, setIsClaimingReward] = useState(false);

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
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/onboarding/dismiss', {
        method: 'POST',
        headers
      });

      if (!res.ok) throw new Error('Failed to dismiss onboarding');

      // Update local state
      setShowWelcome(false);
      if (session) {
        setSession({ ...session, dismissed: true, dismissedAt: new Date().toISOString() });
      }
    } catch (error) {
      console.error('Failed to dismiss onboarding:', error);
      // Still hide the welcome modal even if API fails
      setShowWelcome(false);
    }
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
    const headers = await getAuthHeaders();
    const res = await fetch('/api/onboarding/claim-reward', {
      method: 'POST',
      headers,
      body: JSON.stringify({ stepKey })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to claim rewards');
    }

    // Refresh state
    await checkOnboardingStatus();
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
          onClose={async () => {
            // Prevent multiple simultaneous claims
            if (isClaimingReward) return;

            // Claim rewards BEFORE closing modal
            if (rewardStepKey) {
              try {
                setIsClaimingReward(true);
                await handleClaimReward(rewardStepKey);

                // Only close modal if claiming succeeded
                setShowRewardModal(false);
                setRewardStepKey(null);
              } catch (error) {
                console.error('Failed to claim rewards:', error);
                alert('Failed to claim rewards. Please try again.');
                // Keep modal open so user can retry
              } finally {
                setIsClaimingReward(false);
              }
            } else {
              // No reward to claim, just close
              setShowRewardModal(false);
              setRewardStepKey(null);
            }
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
          {/* Subtitle with progress */}
          <div style={{ textAlign: 'center', marginTop: '-0.5rem', marginBottom: '1rem' }}>
            <p className="game-muted game-small" style={{ margin: 0 }}>
              Drag to move • Step {session?.currentStep}/{ONBOARDING_STEPS.length}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="game-progress-bar" style={{ marginBottom: '1.5rem' }}>
            <div
              className="game-progress-fill"
              style={{
                width: `${((session?.stepsCompleted || 0) / ONBOARDING_STEPS.length) * 100}%`
              }}
            />
          </div>

          {/* Current Step Display */}
          {currentStep && (() => {
            const stepDef = getStepByKey(currentStep.stepKey);
            if (!stepDef) return null;

            return (
              <>
                {/* Step Header */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{stepDef.icon}</div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#f1e5c8', fontWeight: 'bold' }}>
                    {stepDef.title}
                  </h2>
                  <p style={{ color: '#f1e5c8', lineHeight: '1.6', marginBottom: '1rem' }}>
                    {stepDef.description}
                  </p>
                </div>

                {/* Help Text */}
                {stepDef.helpText && (
                  <div style={{
                    background: '#0d0a08',
                    border: '2px solid #8b7355',
                    borderRadius: '6px',
                    padding: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    <h3 style={{ marginBottom: '0.75rem', color: '#d4a574', fontWeight: 'bold', fontSize: '1rem' }}>
                      📋 What to do:
                    </h3>
                    <p style={{ margin: 0, color: '#f1e5c8', lineHeight: '1.8' }}>
                      {stepDef.helpText}
                    </p>
                  </div>
                )}

                {/* Rewards Preview */}
                <div style={{
                  background: '#0d0a08',
                  border: '2px solid #8b7355',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{ marginBottom: '0.75rem', color: '#d4a574', fontWeight: 'bold', fontSize: '1rem' }}>
                    🎁 Rewards:
                  </h3>
                  <div className="game-grid-2" style={{ fontSize: '0.9rem', color: '#f1e5c8', gap: '0.5rem' }}>
                    {stepDef.rewards.gold > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>💰</span> {stepDef.rewards.gold} Gold
                      </div>
                    )}
                    {stepDef.rewards.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>📦</span> {item.qty} {item.itemKey.replace(/_/g, ' ')}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                {stepDef.actionUrl ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        router.push(stepDef.actionUrl!);
                      }}
                      className="game-btn game-btn-secondary"
                      style={{ cursor: 'pointer', flex: 1, padding: '0.75rem', fontSize: '1rem' }}
                    >
                      {stepDef.actionLabel || 'Go to Page'} →
                    </button>
                    <button
                      onClick={() => handleValidateStep(stepDef.key)}
                      className="game-btn game-btn-primary"
                      style={{ cursor: 'pointer', flex: 1, padding: '0.75rem', fontSize: '1rem' }}
                    >
                      ✓ Complete
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleValidateStep(stepDef.key)}
                    className="game-btn game-btn-primary"
                    style={{ cursor: 'pointer', width: '100%', padding: '0.75rem', fontSize: '1rem' }}
                  >
                    ✓ Complete Step
                  </button>
                )}

                {/* Stats Footer */}
                <div className="game-grid-2" style={{ marginTop: '1.5rem', gap: '0.5rem' }}>
                  <div style={{
                    background: '#0d0a08',
                    border: '2px solid #8b7355',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    textAlign: 'center'
                  }}>
                    <p style={{ color: '#d4a574', fontWeight: 'bold', margin: 0, fontSize: '1rem' }}>
                      {session?.totalGoldEarned}g
                    </p>
                    <p className="game-small" style={{ color: '#b8a890', margin: 0, marginTop: '0.25rem' }}>
                      Total Gold
                    </p>
                  </div>
                  <div style={{
                    background: '#0d0a08',
                    border: '2px solid #8b7355',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    textAlign: 'center'
                  }}>
                    <p style={{ color: '#d4a574', fontWeight: 'bold', margin: 0, fontSize: '1rem' }}>
                      {session?.totalItemsEarned}
                    </p>
                    <p className="game-small" style={{ color: '#b8a890', margin: 0, marginTop: '0.25rem' }}>
                      Total Items
                    </p>
                  </div>
                </div>
              </>
            );
          })()}
        </DraggableWindow>
      )}
    </>
  );

  // Render using portal to document body for proper z-index layering
  return createPortal(content, document.body);
}
