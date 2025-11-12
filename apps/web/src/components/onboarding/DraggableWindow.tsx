'use client';

import { useState, useEffect, ReactNode } from 'react';

interface DraggableWindowProps {
  children: ReactNode;
  initialPosition?: { x: number; y: number };
  width?: string;
  maxWidth?: string;
  title?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
  minimizedContent?: ReactNode;
}

export default function DraggableWindow({
  children,
  initialPosition = { x: 100, y: 100 },
  width = '90vw',
  maxWidth = '600px',
  title,
  onClose,
  onMinimize,
  isMinimized = false,
  minimizedContent
}: DraggableWindowProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't start dragging if clicking on buttons or interactive elements
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.closest('button') ||
      target.closest('input')
    ) {
      return;
    }

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

  if (isMinimized && minimizedContent) {
    return (
      <div
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9999,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
      >
        {minimizedContent}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        maxWidth,
        width,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        border: '3px solid #8b7355',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(139, 115, 85, 0.5)',
        background: '#1a1410'
      }}
      onMouseDown={handleMouseDown}
      className="game-card"
    >
      {/* Header with title and controls */}
      {(title || onClose || onMinimize) && (
        <div
          style={{
            borderBottom: '2px solid #8b7355',
            paddingBottom: '0.5rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {title && (
            <h2 className="game-good" style={{ fontSize: '1.5rem', margin: 0 }}>
              {title}
            </h2>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            {onMinimize && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMinimize();
                }}
                className="game-btn game-btn-small"
                style={{ cursor: 'pointer', padding: '0.25rem 0.5rem' }}
                title="Minimize"
              >
                ↓
              </button>
            )}
            {onClose && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                style={{
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
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ color: '#f1e5c8' }}>{children}</div>
    </div>
  );
}
