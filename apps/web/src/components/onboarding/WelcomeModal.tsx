'use client';

/**
 * WelcomeModal Component
 *
 * First modal shown to new users. Introduces the game and starts the onboarding flow.
 */

import { useState, useEffect } from 'react';
import { ONBOARDING_STEPS } from '@/lib/onboarding/steps';

interface WelcomeModalProps {
  onStart: () => void;
  onDismiss: () => void;
}

export default function WelcomeModal({ onStart, onDismiss }: WelcomeModalProps) {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleStart = async () => {
    setLoading(true);
    try {
      await onStart();
    } catch (error) {
      console.error('Failed to start onboarding:', error);
      setLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
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

  const firstStep = ONBOARDING_STEPS[0];

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        maxWidth: '600px',
        width: '90vw',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      className="game-card shadow-2xl"
    >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <h1 className="game-good" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉 Welcome to The Exchange!</h1>
          <p className="game-muted">Drag to move • Your trading adventure begins here</p>
        </div>

        {/* Introduction */}
        <div className="game-flex-col" style={{ marginBottom: '1rem' }}>
          <p>
            You've arrived at a bustling trade hub where fortunes are made through cunning trading,
            strategic crafting, and bold expeditions.
          </p>
          <p>
            This quick tutorial will teach you everything you need to become a master trader:
          </p>
        </div>

        {/* Features List */}
        <div className="game-grid-2" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📦</span>
            <div>
              <h3 className="game-good game-small">Manage Your Warehouse</h3>
              <p className="game-muted game-small">Store and organize your trading goods</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>👤</span>
            <div>
              <h3 className="game-good game-small">Hire Agents</h3>
              <p className="game-muted game-small">Send them on missions to gather resources</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🔨</span>
            <div>
              <h3 className="game-good game-small">Craft Items</h3>
              <p className="game-muted game-small">Transform raw materials into valuable goods</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🏪</span>
            <div>
              <h3 className="game-good game-small">Trade on Market</h3>
              <p className="game-muted game-small">Buy low, sell high, build your empire</p>
            </div>
          </div>
        </div>

        {/* Starter Package */}
        <div className="game-card-nested" style={{ marginBottom: '1rem' }}>
          <h3 className="game-good" style={{ marginBottom: '0.5rem' }}>
            <span>🎁</span> Starter Package Awaiting!
          </h3>
          <p className="game-small" style={{ marginBottom: '0.5rem' }}>Complete the tutorial to unlock your starter package:</p>
          <div className="game-grid-2 game-small">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>💰</span> {firstStep.rewards.gold} Gold
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>⚒️</span> {firstStep.rewards.items.find(i => i.itemKey === 'iron_ore')?.qty} Iron Ore
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>🌿</span> {firstStep.rewards.items.find(i => i.itemKey === 'herb')?.qty} Herbs
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>🦌</span> {firstStep.rewards.items.find(i => i.itemKey === 'hide')?.qty} Hides
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>⚔️</span> Equipment
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>📜</span> Blueprints
            </div>
          </div>
        </div>

        {/* Time Estimate */}
        <div className="game-muted game-small" style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <p>⏱️ Takes about 15-20 minutes • You can skip optional steps anytime</p>
        </div>

        {/* Action Buttons */}
        <div className="game-space-between">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStart();
            }}
            disabled={loading}
            className="game-btn game-btn-primary"
            style={{ cursor: 'pointer', flex: 1, marginRight: '0.5rem' }}
          >
            {loading ? 'Starting...' : 'Start Tutorial'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            disabled={loading}
            className="game-btn game-btn-secondary"
            style={{ cursor: 'pointer' }}
          >
            Skip for Now
          </button>
        </div>

        {/* Note */}
        <p className="game-muted game-small" style={{ textAlign: 'center', marginTop: '1rem' }}>
          You can access the tutorial again later from your profile settings
        </p>
      </div>
  );
}
