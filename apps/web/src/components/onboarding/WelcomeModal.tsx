'use client';

/**
 * WelcomeModal Component
 *
 * First modal shown to new users. Introduces the game and starts the onboarding flow.
 */

import { useState } from 'react';
import { ONBOARDING_STEPS } from '@/lib/onboarding/steps';

interface WelcomeModalProps {
  onStart: () => void;
  onDismiss: () => void;
}

export default function WelcomeModal({ onStart, onDismiss }: WelcomeModalProps) {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await onStart();
    } catch (error) {
      console.error('Failed to start onboarding:', error);
      setLoading(false);
    }
  };

  const firstStep = ONBOARDING_STEPS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-[#231913] border-2 border-[#8b7355] rounded-lg max-w-2xl w-full mx-4 p-8 text-[#f1e5c8]">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-2">🎉 Welcome to The Exchange!</h1>
          <p className="text-xl text-[#d4c5a9]">Your trading adventure begins here</p>
        </div>

        {/* Introduction */}
        <div className="mb-6 space-y-4">
          <p className="text-lg">
            You've arrived at a bustling trade hub where fortunes are made through cunning trading,
            strategic crafting, and bold expeditions.
          </p>
          <p className="text-lg">
            This quick tutorial will teach you everything you need to become a master trader:
          </p>
        </div>

        {/* Features List */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <h3 className="font-bold">Manage Your Warehouse</h3>
              <p className="text-sm text-[#d4c5a9]">Store and organize your trading goods</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">👤</span>
            <div>
              <h3 className="font-bold">Hire Agents</h3>
              <p className="text-sm text-[#d4c5a9]">Send them on missions to gather resources</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔨</span>
            <div>
              <h3 className="font-bold">Craft Items</h3>
              <p className="text-sm text-[#d4c5a9]">Transform raw materials into valuable goods</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🏪</span>
            <div>
              <h3 className="font-bold">Trade on Market</h3>
              <p className="text-sm text-[#d4c5a9]">Buy low, sell high, build your empire</p>
            </div>
          </div>
        </div>

        {/* Starter Package */}
        <div className="mb-6 bg-[#1a1410] border border-[#8b7355] rounded-lg p-4">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <span>🎁</span> Starter Package Awaiting!
          </h3>
          <p className="mb-3">Complete the tutorial to unlock your starter package:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span>💰</span> {firstStep.rewards.gold} Gold
            </div>
            <div className="flex items-center gap-2">
              <span>⚒️</span> {firstStep.rewards.items.find(i => i.itemKey === 'iron_ore')?.qty} Iron Ore
            </div>
            <div className="flex items-center gap-2">
              <span>🌿</span> {firstStep.rewards.items.find(i => i.itemKey === 'herb')?.qty} Herbs
            </div>
            <div className="flex items-center gap-2">
              <span>🦌</span> {firstStep.rewards.items.find(i => i.itemKey === 'hide')?.qty} Hides
            </div>
            <div className="flex items-center gap-2">
              <span>⚔️</span> Equipment
            </div>
            <div className="flex items-center gap-2">
              <span>📜</span> Blueprints
            </div>
          </div>
        </div>

        {/* Time Estimate */}
        <div className="mb-6 text-center text-sm text-[#d4c5a9]">
          <p>⏱️ Takes about 15-20 minutes • You can skip optional steps anytime</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleStart}
            disabled={loading}
            className="flex-1 bg-[#8b7355] hover:bg-[#a0846b] disabled:bg-gray-600 text-[#f1e5c8] font-bold py-3 px-6 rounded transition-colors"
          >
            {loading ? 'Starting...' : 'Start Tutorial'}
          </button>
          <button
            onClick={onDismiss}
            disabled={loading}
            className="px-6 py-3 border border-[#8b7355] hover:bg-[#1a1410] rounded transition-colors"
          >
            Skip for Now
          </button>
        </div>

        {/* Note */}
        <p className="mt-4 text-xs text-center text-[#d4c5a9]">
          You can access the tutorial again later from your profile settings
        </p>
      </div>
    </div>
  );
}
