'use client';

import React, { useState } from 'react';

interface HelpTooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: string;
  trigger?: 'hover' | 'click';
  children?: React.ReactNode;
}

export default function HelpTooltip({ 
  content, 
  position = 'top', 
  maxWidth = '200px',
  trigger = 'hover',
  children
}: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsVisible(false);
    }
  };

  const handleClick = () => {
    if (trigger === 'click') {
      setIsVisible(!isVisible);
    }
  };

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'absolute' as const,
      zIndex: 1000,
      backgroundColor: '#1a1511',
      border: '1px solid #533b2c',
      borderRadius: '4px',
      padding: '8px 12px',
      fontSize: '12px',
      color: '#f1e5c8',
      maxWidth,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
      whiteSpace: 'normal' as const,
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyles,
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
        };
      case 'bottom':
        return {
          ...baseStyles,
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '8px',
        };
      case 'left':
        return {
          ...baseStyles,
          right: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginRight: '8px',
        };
      case 'right':
        return {
          ...baseStyles,
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginLeft: '8px',
        };
      default:
        return baseStyles;
    }
  };

  return (
    <div 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children || (
        <span style={{ 
          cursor: 'help',
          color: '#9b8c70',
          fontSize: '14px',
          userSelect: 'none'
        }}>
          ❓
        </span>
      )}
      
      {isVisible && (
        <div style={getPositionStyles()}>
          {content}
          
          {/* Arrow pointer */}
          <div
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              borderStyle: 'solid',
              ...(position === 'top' && {
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                borderWidth: '6px 6px 0 6px',
                borderColor: '#533b2c transparent transparent transparent',
              }),
              ...(position === 'bottom' && {
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                borderWidth: '0 6px 6px 6px',
                borderColor: 'transparent transparent #533b2c transparent',
              }),
              ...(position === 'left' && {
                left: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                borderWidth: '6px 0 6px 6px',
                borderColor: 'transparent transparent transparent #533b2c',
              }),
              ...(position === 'right' && {
                right: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                borderWidth: '6px 6px 6px 0',
                borderColor: 'transparent #533b2c transparent transparent',
              }),
            }}
          />
        </div>
      )}
    </div>
  );
}

// Quick preset components for common help topics
export const GoldTooltip = () => (
  <HelpTooltip content="Gold is the primary currency. Earn it through missions, trading, and crafting." />
);

export const RiskTooltip = () => (
  <HelpTooltip content="Mission risk affects success rate: LOW (85%), MEDIUM (65%), HIGH (40%). Agent level and equipment improve success." />
);

export const DurationTooltip = () => (
  <HelpTooltip content="Mission duration depends on distance and agent speed. Better agents complete missions faster." />
);

export const FeeTooltip = () => (
  <HelpTooltip content="Auction fees are based on listing duration: shorter listings have lower fees (2-12%)." />
);

export const ContractTooltip = () => (
  <HelpTooltip content="Contracts automatically buy items when available at your price limit. Gold is locked until completion or expiry." />
);

export const GuildTooltip = () => (
  <HelpTooltip content="Guilds provide shared warehouses, treasury, alliance missions, and private chat channels." />
);

export const CraftingTooltip = () => (
  <HelpTooltip content="Crafting transforms raw materials into valuable items. Jobs take real time to complete." />
);

export const EquipmentTooltip = () => (
  <HelpTooltip content="Better equipment improves agent success rates, speed, and experience gain." />
);