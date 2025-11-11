'use client';

/**
 * TutorialStepCard Component
 *
 * Displays an individual onboarding step with progress, rewards, and actions.
 */

import { useState } from 'react';
import type { OnboardingStepDefinition } from '@/lib/onboarding/steps';

interface TutorialStepCardProps {
  step: OnboardingStepDefinition;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  rewardsClaimed: boolean;
  isActive: boolean;
  onValidate?: () => void;
  onClaimReward?: () => void;
  onSkip?: () => void;
}

export default function TutorialStepCard({
  step,
  status,
  rewardsClaimed,
  isActive,
  onValidate,
  onClaimReward,
  onSkip
}: TutorialStepCardProps) {
  const [validating, setValidating] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const handleValidate = async () => {
    if (!onValidate) return;
    setValidating(true);
    try {
      await onValidate();
    } finally {
      setValidating(false);
    }
  };

  const handleClaimReward = async () => {
    if (!onClaimReward) return;
    setClaiming(true);
    try {
      await onClaimReward();
    } finally {
      setClaiming(false);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'COMPLETED':
        return 'border-green-600 bg-green-900 bg-opacity-20';
      case 'IN_PROGRESS':
        return 'border-blue-600 bg-blue-900 bg-opacity-20';
      case 'SKIPPED':
        return 'border-gray-600 bg-gray-900 bg-opacity-20';
      default:
        return 'border-[#8b7355] bg-[#1a1410]';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'COMPLETED':
        return '✅';
      case 'IN_PROGRESS':
        return '▶️';
      case 'SKIPPED':
        return '⏭️';
      default:
        return '⭕';
    }
  };

  return (
    <div
      className={`border-2 rounded-lg p-4 transition-all ${getStatusColor()} ${
        isActive ? 'ring-2 ring-yellow-500' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-3xl">{step.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg text-[#f1e5c8]">{step.title}</h3>
              <span className="text-sm">{getStatusIcon()}</span>
              {isActive && (
                <span className="text-xs px-2 py-1 bg-yellow-600 rounded text-black font-bold">
                  CURRENT
                </span>
              )}
            </div>
            <p className="text-sm text-[#d4c5a9] mb-2">{step.description}</p>
            <div className="flex items-center gap-4 text-xs text-[#d4c5a9]">
              <span>⏱️ {step.estimatedTime}</span>
              <span className="px-2 py-1 bg-[#231913] border border-[#8b7355] rounded">
                {step.phase}
              </span>
              {!step.skippable && (
                <span className="text-red-400 font-bold">Required</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-2xl font-bold text-[#8b7355]">#{step.order}</div>
      </div>

      {/* Help Text */}
      {step.helpText && status === 'IN_PROGRESS' && (
        <div className="mb-3 p-3 bg-[#231913] border border-blue-600 rounded text-sm">
          <p className="text-blue-300">💡 {step.helpText}</p>
        </div>
      )}

      {/* Rewards Preview */}
      {status !== 'SKIPPED' && (
        <div className="mb-3 p-3 bg-[#231913] border border-[#8b7355] rounded">
          <h4 className="text-sm font-bold mb-2 text-[#f1e5c8]">🎁 Rewards:</h4>
          <div className="flex flex-wrap gap-2 text-sm">
            {step.rewards.gold > 0 && (
              <span className="px-2 py-1 bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded">
                💰 {step.rewards.gold}g
              </span>
            )}
            {step.rewards.items.map((item, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-blue-900 bg-opacity-30 border border-blue-600 rounded"
              >
                {item.qty}× {item.itemKey.replace(/_/g, ' ')}
              </span>
            ))}
            {step.rewards.bonuses?.map((bonus, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-purple-900 bg-opacity-30 border border-purple-600 rounded text-purple-300"
              >
                ✨ {bonus.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {status === 'IN_PROGRESS' && onValidate && (
          <button
            onClick={handleValidate}
            disabled={validating}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            {validating ? 'Checking...' : 'Check Progress'}
          </button>
        )}

        {status === 'COMPLETED' && !rewardsClaimed && onClaimReward && (
          <button
            onClick={handleClaimReward}
            disabled={claiming}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors animate-pulse"
          >
            {claiming ? 'Claiming...' : '🎁 Claim Rewards'}
          </button>
        )}

        {status === 'COMPLETED' && rewardsClaimed && (
          <div className="flex-1 bg-green-900 bg-opacity-30 border border-green-600 text-green-300 font-bold py-2 px-4 rounded text-center">
            ✅ Rewards Claimed
          </div>
        )}

        {status === 'SKIPPED' && (
          <div className="flex-1 bg-gray-900 bg-opacity-30 border border-gray-600 text-gray-400 font-bold py-2 px-4 rounded text-center">
            ⏭️ Skipped
          </div>
        )}

        {status === 'NOT_STARTED' && (
          <div className="flex-1 bg-[#1a1410] border border-[#8b7355] text-[#d4c5a9] font-bold py-2 px-4 rounded text-center">
            Locked
          </div>
        )}

        {status === 'IN_PROGRESS' && step.skippable && onSkip && (
          <button
            onClick={onSkip}
            className="px-4 py-2 border border-[#8b7355] hover:bg-[#1a1410] rounded transition-colors text-[#d4c5a9]"
          >
            Skip
          </button>
        )}
      </div>

      {/* Video Tutorial Link */}
      {step.videoUrl && (
        <div className="mt-3">
          <a
            href={step.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            🎥 Watch video tutorial
          </a>
        </div>
      )}
    </div>
  );
}
