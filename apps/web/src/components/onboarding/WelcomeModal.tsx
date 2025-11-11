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
        userSelect: 'none',
        border: '3px solid #8b7355',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(139, 115, 85, 0.5)',
        background: '#1a1410'
      }}
      onMouseDown={handleMouseDown}
      className="game-card"
    >
        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: '#8b7355',
            border: '2px solid #a0846b',
            borderRadius: '4px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#f1e5c8',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#a0846b';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#8b7355';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1rem', paddingTop: '0.5rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#f1e5c8', fontWeight: 'bold' }}>🎉 Welcome to The Exchange!</h1>
          <p className="game-muted" style={{ fontSize: '0.9rem' }}>Drag to move • Your trading adventure begins here</p>
        </div>

        {/* Introduction */}
        <div className="game-flex-col" style={{ marginBottom: '1rem' }}>
          <p style={{ color: '#f1e5c8', lineHeight: '1.6' }}>
            You've arrived at a bustling trade hub where fortunes are made through cunning trading,
            strategic crafting, and bold expeditions.
          </p>
          <p style={{ color: '#f1e5c8', lineHeight: '1.6' }}>
            This quick tutorial will teach you everything you need to become a master trader:
          </p>
        </div>

        {/* Features List */}
        <div className="game-grid-2" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📦</span>
            <div>
              <h3 style={{ color: '#d4a574', fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Manage Your Warehouse</h3>
              <p style={{ color: '#b8a890', fontSize: '0.85rem' }}>Store and organize your trading goods</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>👤</span>
            <div>
              <h3 style={{ color: '#d4a574', fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Hire Agents</h3>
              <p style={{ color: '#b8a890', fontSize: '0.85rem' }}>Send them on missions to gather resources</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🔨</span>
            <div>
              <h3 style={{ color: '#d4a574', fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Craft Items</h3>
              <p style={{ color: '#b8a890', fontSize: '0.85rem' }}>Transform raw materials into valuable goods</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🏪</span>
            <div>
              <h3 style={{ color: '#d4a574', fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Trade on Market</h3>
              <p style={{ color: '#b8a890', fontSize: '0.85rem' }}>Buy low, sell high, build your empire</p>
            </div>
          </div>
        </div>

        {/* Starter Package */}
        <div style={{
          marginBottom: '1rem',
          background: '#0d0a08',
          border: '2px solid #8b7355',
          borderRadius: '6px',
          padding: '1rem'
        }}>
          <h3 style={{ marginBottom: '0.5rem', color: '#f1e5c8', fontWeight: 'bold', fontSize: '1.1rem' }}>
            <span>🎁</span> Starter Package Awaiting!
          </h3>
          <p style={{ marginBottom: '0.5rem', color: '#f1e5c8', fontSize: '0.95rem' }}>Complete the tutorial to unlock your starter package:</p>
          <div className="game-grid-2" style={{ fontSize: '0.9rem', color: '#f1e5c8' }}>
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
        <div style={{ textAlign: 'center', marginBottom: '1rem', color: '#b8a890', fontSize: '0.9rem' }}>
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
        <p style={{ textAlign: 'center', marginTop: '1rem', color: '#b8a890', fontSize: '0.85rem' }}>
          You can access the tutorial again later from your profile settings
        </p>
      </div>
  );
}
