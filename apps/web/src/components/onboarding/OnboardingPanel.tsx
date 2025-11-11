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

  // Draggable window state
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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

  // Drag handlers for movable window
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return; // Don't drag when clicking buttons
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

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
        <div
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: 9999,
            width: '400px',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none'
          }}
          onMouseDown={handleMouseDown}
          className="game-card shadow-2xl"
        >
          {/* Minimized Button */}
          {isPanelMinimized ? (
            <button
              onClick={() => setIsPanelMinimized(false)}
              className="game-btn game-btn-secondary w-full flex items-center gap-3"
              style={{ cursor: 'pointer' }}
            >
              <span className="text-2xl">🎓</span>
              <div className="flex-1 text-left">
                <p className="font-bold">Tutorial Progress</p>
                <p className="game-small game-muted">
                  {session?.stepsCompleted}/{ONBOARDING_STEPS.length} Complete
                </p>
              </div>
              <span className="text-xl">↑</span>
            </button>
          ) : (
            <div className="game-flex-col" style={{ maxHeight: '80vh', overflow: 'hidden' }}>
              {/* Header */}
              <div className="game-space-between" style={{ borderBottom: '1px solid var(--game-border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                <div className="flex-1">
                  <h2 className="game-good">🎓 Tutorial Progress</h2>
                  <p className="game-muted game-small">
                    Drag to move • Complete steps to earn rewards
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPanelMinimized(true);
                    }}
                    className="game-btn game-btn-small"
                    style={{ cursor: 'pointer', padding: '0.25rem 0.5rem' }}
                    title="Minimize"
                  >
                    ↓
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss();
                    }}
                    className="game-btn game-btn-small"
                    style={{ cursor: 'pointer', padding: '0.25rem 0.5rem' }}
                    title="Dismiss (can resume later)"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 100px)' }} className="game-flex-col">
                {/* Progress Stats */}
                <div className="game-space-between game-small" style={{ marginBottom: '0.5rem' }}>
                  <span className="game-muted">Progress</span>
                  <span className="game-good">
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
                <div className="game-grid-2" style={{ marginBottom: '1rem' }}>
                  <div className="game-card-nested" style={{ textAlign: 'center' }}>
                    <p className="game-good">{session?.totalGoldEarned}g</p>
                    <p className="game-muted game-small">Gold Earned</p>
                  </div>
                  <div className="game-card-nested" style={{ textAlign: 'center' }}>
                    <p className="game-good">{session?.totalItemsEarned}</p>
                    <p className="game-muted game-small">Items Earned</p>
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
            </div>
          )}
        </div>
      )}
    </>
  );

  // Render using portal to document body for proper z-index layering
  return createPortal(content, document.body);
}
