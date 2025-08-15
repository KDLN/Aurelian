'use client';

import { useState, useEffect } from 'react';
import { useUserData } from '@/hooks/useUserData';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  actionText: string;
  actionHref: string;
  icon: string;
  condition?: () => boolean;
}

export default function OnboardingTips() {
  const { user, wallet, inventory } = useUserData();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Aurelian!',
      description: 'You\'re now part of a thriving trading empire. Let\'s get you started with the basics.',
      actionText: 'Let\'s Begin',
      actionHref: '/creator',
      icon: '🌟'
    },
    {
      id: 'character',
      title: 'Create Your Character',
      description: 'Customize your trader\'s appearance in the Character Creator.',
      actionText: 'Create Character',
      actionHref: '/creator',
      icon: '👤'
    },
    {
      id: 'inventory',
      title: 'Get Starting Items',
      description: 'Visit your warehouse to get starter inventory and gold for trading.',
      actionText: 'Visit Warehouse',
      actionHref: '/warehouse',
      icon: '📦',
      condition: () => !inventory?.totalItems || inventory.totalItems === 0
    },
    {
      id: 'wallet',
      title: 'Create Your Wallet',
      description: 'You need a wallet to store your gold and make transactions.',
      actionText: 'Create Wallet',
      actionHref: '/warehouse',
      icon: '💰',
      condition: () => !wallet
    },
    {
      id: 'agents',
      title: 'Hire Your First Agent',
      description: 'Agents carry out missions for you. Hire at least one to start earning!',
      actionText: 'Hire Agents',
      actionHref: '/agents',
      icon: '👥'
    },
    {
      id: 'mission',
      title: 'Send Agent on Mission',
      description: 'Missions are a great way to earn gold and items. Start with a LOW risk mission.',
      actionText: 'Mission Control',
      actionHref: '/missions',
      icon: '🎯'
    },
    {
      id: 'trading',
      title: 'Try Trading',
      description: 'List an item for sale or buy something from the auction house.',
      actionText: 'Auction House',
      actionHref: '/auction',
      icon: '💱'
    },
    {
      id: 'guild',
      title: 'Consider Joining a Guild',
      description: 'Guilds provide shared resources, chat, and cooperative missions.',
      actionText: 'Browse Guilds',
      actionHref: '/guild/browse',
      icon: '🏛️'
    }
  ];

  // Check if user should see onboarding
  useEffect(() => {
    if (!user) return;

    // Load completed steps from localStorage
    const saved = localStorage.getItem(`onboarding_${user.id}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setCompletedSteps(parsed.completed || []);
      
      // Don't show if user has completed all steps
      if (parsed.completed?.length >= steps.length) {
        setIsVisible(false);
        return;
      }
    }

    // Show onboarding if this is a new user or incomplete
    setIsVisible(true);
    
    // Find the first incomplete step
    const nextStepIndex = steps.findIndex(step => {
      if (saved && JSON.parse(saved).completed?.includes(step.id)) {
        return false; // Skip completed steps
      }
      
      // Check condition if it exists
      if (step.condition && !step.condition()) {
        return false; // Skip if condition not met
      }
      
      return true; // This is the next step
    });
    
    setCurrentStep(Math.max(0, nextStepIndex));
  }, [user, wallet, inventory]);

  // Save progress
  const saveProgress = (stepId: string) => {
    if (!user) return;
    
    const newCompleted = [...completedSteps, stepId];
    setCompletedSteps(newCompleted);
    
    localStorage.setItem(`onboarding_${user.id}`, JSON.stringify({
      completed: newCompleted,
      lastUpdated: new Date().toISOString()
    }));
  };

  const nextStep = () => {
    const currentStepData = steps[currentStep];
    if (currentStepData) {
      saveProgress(currentStepData.id);
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsVisible(false);
    }
  };

  const dismissOnboarding = () => {
    setIsVisible(false);
    if (user) {
      localStorage.setItem(`onboarding_${user.id}`, JSON.stringify({
        completed: steps.map(s => s.id),
        dismissed: true,
        lastUpdated: new Date().toISOString()
      }));
    }
  };

  const restartOnboarding = () => {
    setCurrentStep(0);
    setCompletedSteps([]);
    setIsVisible(true);
    if (user) {
      localStorage.removeItem(`onboarding_${user.id}`);
    }
  };

  if (!isVisible || !user || currentStep >= steps.length) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <button
          onClick={restartOnboarding}
          className="game-btn game-btn-secondary"
          style={{ fontSize: '12px', padding: '4px 8px' }}
          title="Restart onboarding tutorial"
        >
          ❓ Tutorial
        </button>
      </div>
    );
  }

  const step = steps[currentStep];
  if (!step) return null;

  // Skip if condition is not met
  if (step.condition && !step.condition()) {
    // Auto-advance to next step
    setTimeout(() => nextStep(), 100);
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '320px',
      backgroundColor: '#1a1511',
      border: '2px solid #d4af37',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
      zIndex: 1000,
      fontFamily: 'monospace'
    }}>
      <div className="game-flex" style={{ alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <span style={{ fontSize: '24px' }}>{step.icon}</span>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, color: '#d4af37', fontSize: '14px' }}>
            {step.title}
          </h4>
          <div style={{ fontSize: '11px', color: '#9b8c70' }}>
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>
        <button
          onClick={dismissOnboarding}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9b8c70',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0'
          }}
        >
          ×
        </button>
      </div>

      <p style={{ 
        margin: '0 0 16px 0', 
        fontSize: '12px', 
        lineHeight: '1.4',
        color: '#f1e5c8'
      }}>
        {step.description}
      </p>

      <div className="game-flex" style={{ gap: '8px' }}>
        <a
          href={step.actionHref}
          className="game-btn game-btn-primary"
          style={{ flex: 1, fontSize: '12px', textAlign: 'center', textDecoration: 'none' }}
          onClick={() => {
            // Small delay to allow navigation, then mark as complete
            setTimeout(() => saveProgress(step.id), 1000);
          }}
        >
          {step.actionText}
        </a>
        
        {currentStep < steps.length - 1 && (
          <button
            onClick={nextStep}
            className="game-btn"
            style={{ fontSize: '12px' }}
          >
            Skip
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{
        marginTop: '12px',
        height: '4px',
        backgroundColor: '#533b2c',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          backgroundColor: '#d4af37',
          width: `${((currentStep + 1) / steps.length) * 100}%`,
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );
}