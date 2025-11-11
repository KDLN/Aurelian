'use client';

/**
 * RewardClaimModal Component
 *
 * Shows rewards when user completes a step. Animated celebration modal.
 */

import { useEffect, useState } from 'react';
import type { StepRewards } from '@/lib/onboarding/steps';

interface RewardClaimModalProps {
  isOpen: boolean;
  stepTitle: string;
  stepIcon: string;
  rewards: StepRewards;
  onClose: () => void;
}

export default function RewardClaimModal({
  isOpen,
  stepTitle,
  stepIcon,
  rewards,
  onClose
}: RewardClaimModalProps) {
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'show' | 'exit'>('enter');

  useEffect(() => {
    if (isOpen) {
      setAnimationPhase('enter');
      setTimeout(() => setAnimationPhase('show'), 100);
    }
  }, [isOpen]);

  const handleClose = () => {
    setAnimationPhase('exit');
    setTimeout(onClose, 300);
  };

  if (!isOpen) return null;

  const modalClasses = {
    enter: 'opacity-0 scale-90',
    show: 'opacity-100 scale-100',
    exit: 'opacity-0 scale-90'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      {/* Confetti Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-10%',
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          >
            {['🎉', '✨', '💰', '🎁', '⭐'][Math.floor(Math.random() * 5)]}
          </div>
        ))}
      </div>

      {/* Modal */}
      <div
        className={`relative bg-[#231913] border-4 border-yellow-600 rounded-lg max-w-lg w-full mx-4 p-8 text-[#f1e5c8] transition-all duration-300 ${modalClasses[animationPhase]}`}
      >
        {/* Celebration Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-2 animate-bounce">{stepIcon}</div>
          <h2 className="text-3xl font-bold text-yellow-400 mb-2">Step Complete!</h2>
          <h3 className="text-xl text-[#d4c5a9]">{stepTitle}</h3>
        </div>

        {/* Rewards Section */}
        <div className="mb-6">
          <h4 className="text-xl font-bold mb-4 text-center">🎁 Rewards Claimed!</h4>

          {/* Gold Reward */}
          {rewards.gold > 0 && (
            <div className="mb-4 p-4 bg-yellow-900 bg-opacity-30 border-2 border-yellow-600 rounded-lg animate-pulse">
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl">💰</span>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">+{rewards.gold} Gold</p>
                  <p className="text-sm text-yellow-200">Added to your wallet</p>
                </div>
              </div>
            </div>
          )}

          {/* Item Rewards */}
          {rewards.items.length > 0 && (
            <div className="mb-4 p-4 bg-blue-900 bg-opacity-30 border-2 border-blue-600 rounded-lg">
              <p className="font-bold mb-3 text-center text-blue-300">📦 Items Received:</p>
              <div className="grid grid-cols-2 gap-2">
                {rewards.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-[#1a1410] p-2 rounded border border-blue-500"
                  >
                    <span className="text-2xl">
                      {getItemIcon(item.itemKey)}
                    </span>
                    <div>
                      <p className="font-bold text-sm">
                        {item.qty}× {formatItemName(item.itemKey)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-center text-blue-200 mt-2">
                Items added to your warehouse
              </p>
            </div>
          )}

          {/* Bonus Rewards */}
          {rewards.bonuses && rewards.bonuses.length > 0 && (
            <div className="mb-4 p-4 bg-purple-900 bg-opacity-30 border-2 border-purple-600 rounded-lg">
              <p className="font-bold mb-3 text-center text-purple-300">✨ Special Bonuses:</p>
              <div className="space-y-2">
                {rewards.bonuses.map((bonus, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-[#1a1410] p-2 rounded border border-purple-500"
                  >
                    <span className="text-xl">{getBonusIcon(bonus)}</span>
                    <p className="text-sm text-purple-200">{formatBonusName(bonus)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Continue Button */}
        <button
          onClick={handleClose}
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-3 px-6 rounded-lg transition-colors text-lg"
        >
          Continue Tutorial
        </button>

        {/* Encouragement Text */}
        <p className="mt-4 text-center text-sm text-[#d4c5a9]">
          Keep going! More rewards await 🚀
        </p>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}

/**
 * Get item icon based on item key
 */
function getItemIcon(itemKey: string): string {
  const icons: Record<string, string> = {
    iron_ore: '⚒️',
    herb: '🌿',
    hide: '🦌',
    pearl: '🔮',
    relic_fragment: '💎',
    healing_tonic: '🧪',
    leather_vest: '🦺',
    rusty_sword: '⚔️',
    basic_compass: '🧭'
  };
  return icons[itemKey] || '📦';
}

/**
 * Format item name for display
 */
function formatItemName(itemKey: string): string {
  return itemKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get bonus icon based on bonus type
 */
function getBonusIcon(bonus: string): string {
  const icons: Record<string, string> = {
    unlock_starter_blueprints: '📜',
    '2x_mission_reward': '🎯',
    instant_craft: '⚡',
    '10xp_bonus': '⭐',
    free_listing: '🏪'
  };
  return icons[bonus] || '✨';
}

/**
 * Format bonus name for display
 */
function formatBonusName(bonus: string): string {
  const names: Record<string, string> = {
    unlock_starter_blueprints: 'Starter blueprints unlocked',
    '2x_mission_reward': 'Next mission grants 2× rewards',
    instant_craft: 'Next craft completes instantly',
    '10xp_bonus': '+10 Crafting XP bonus',
    free_listing: 'Next market listing is free'
  };
  return names[bonus] || bonus.replace(/_/g, ' ');
}
