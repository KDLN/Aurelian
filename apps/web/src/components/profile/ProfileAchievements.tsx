'use client';

import { useState } from 'react';
import { ProfilePanel } from './ProfileLayout';
import { Badge } from '../ui/badge';

interface ProfileAchievementsProps {
  achievements: string[];
}

// Define achievement categories and descriptions
const ACHIEVEMENT_DATA: Record<string, {
  description: string;
  category: 'missions' | 'trading' | 'crafting' | 'social' | 'time';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}> = {
  'Century Runner': {
    description: 'Complete 100 missions',
    category: 'missions',
    rarity: 'rare'
  },
  'Near Perfect': {
    description: 'Achieve 95%+ mission success rate',
    category: 'missions',
    rarity: 'epic'
  },
  'Streak Master': {
    description: 'Complete 10 missions in a row',
    category: 'missions',
    rarity: 'rare'
  },
  'Gold Hoarder': {
    description: 'Earn 10,000+ gold from missions',
    category: 'missions',
    rarity: 'rare'
  },
  'Master Crafter': {
    description: 'Reach crafting level 10',
    category: 'crafting',
    rarity: 'epic'
  },
  'Production Line': {
    description: 'Craft 500+ items',
    category: 'crafting',
    rarity: 'rare'
  },
  'Market Mogul': {
    description: 'Complete 50+ auction sales',
    category: 'trading',
    rarity: 'rare'
  },
  'Sales Champion': {
    description: 'Earn 5,000+ gold from sales',
    category: 'trading',
    rarity: 'epic'
  },
  'Time Veteran': {
    description: 'Play for 100+ hours',
    category: 'time',
    rarity: 'legendary'
  },
  'Dedicated Trader': {
    description: 'Log in 100+ times',
    category: 'social',
    rarity: 'rare'
  },
  'Caravan Master': {
    description: 'Unlock 5+ caravan slots',
    category: 'missions',
    rarity: 'epic'
  }
};

const RARITY_COLORS = {
  common: { bg: '#4b3527', border: '#533b2c', text: '#c7b38a' },
  rare: { bg: '#1e3a8a', border: '#3b82f6', text: '#dbeafe' },
  epic: { bg: '#581c87', border: '#a855f7', text: '#e9d5ff' },
  legendary: { bg: '#ea580c', border: '#fb923c', text: '#fed7aa' }
};

const CATEGORY_ICONS = {
  missions: '🗡️',
  trading: '💰',
  crafting: '🔨',
  social: '👥',
  time: '⏰'
};

export default function ProfileAchievements({ achievements }: ProfileAchievementsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (achievements.length === 0) {
    return (
      <ProfilePanel title="Achievements">
        <div className="no-achievements">
          <div className="no-achievements-icon">🏆</div>
          <span className="no-achievements-text">No achievements yet</span>
          <span className="no-achievements-subtitle">Start trading to earn your first badge!</span>
        </div>
      </ProfilePanel>
    );
  }

  const groupedAchievements = achievements.reduce((groups, achievement) => {
    const data = ACHIEVEMENT_DATA[achievement];
    const category = data?.category || 'missions';
    
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(achievement);
    return groups;
  }, {} as Record<string, string[]>);

  const categories = Object.keys(groupedAchievements);
  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : groupedAchievements[selectedCategory] || [];

  return (
    <ProfilePanel title={`Achievements (${achievements.length})`}>
      {/* Filter Controls */}
      <div className="achievements-controls">
        <div className="category-filters">
          <button
            className={`filter-button ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              className={`filter-button ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              <span className="filter-icon">
                {CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]}
              </span>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="view-toggles">
          <button
            className={`view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            ⊞
          </button>
          <button
            className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Achievements Display */}
      <div className={`achievements-container ${viewMode}`}>
        {filteredAchievements.map((achievement) => {
          const data = ACHIEVEMENT_DATA[achievement];
          const rarity = data?.rarity || 'common';
          const colors = RARITY_COLORS[rarity];
          const category = data?.category || 'missions';
          
          return (
            <div 
              key={achievement}
              className="achievement-badge"
              style={{
                backgroundColor: colors.bg,
                borderColor: colors.border,
                color: colors.text
              }}
            >
              <div className="achievement-header">
                <span className="achievement-category-icon">
                  {CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]}
                </span>
                <div className="achievement-rarity">{rarity.toUpperCase()}</div>
              </div>
              <div className="achievement-name">{achievement}</div>
              <div className="achievement-description">{data?.description || ''}</div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .no-achievements {
          text-align: center;
          padding: 32px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .no-achievements-icon {
          font-size: 48px;
          opacity: 0.5;
        }

        .no-achievements-text {
          color: #f1e5c8;
          font-weight: 600;
          font-size: 16px;
        }

        .no-achievements-subtitle {
          color: #c7b38a;
          font-size: 12px;
          font-style: italic;
        }

        .achievements-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          gap: 12px;
          flex-wrap: wrap;
        }

        .category-filters {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .filter-button {
          padding: 6px 10px;
          background: #2e231d;
          border: 1px solid #4b3527;
          border-radius: 4px;
          color: #c7b38a;
          font-size: 11px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
          min-height: 32px;
        }

        .filter-button:hover {
          background: #342920;
          border-color: #533b2c;
        }

        .filter-button.active {
          background: #7b4b2d;
          border-color: #a36a43;
          color: #f1e5c8;
        }

        .filter-icon {
          font-size: 12px;
        }

        .view-toggles {
          display: flex;
          gap: 2px;
        }

        .view-toggle {
          padding: 6px 8px;
          background: #2e231d;
          border: 1px solid #4b3527;
          border-radius: 4px;
          color: #c7b38a;
          font-size: 14px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 32px;
          min-width: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .view-toggle:hover {
          background: #342920;
          border-color: #533b2c;
        }

        .view-toggle.active {
          background: #7b4b2d;
          border-color: #a36a43;
          color: #f1e5c8;
        }

        .achievements-container.grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }

        .achievements-container.list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .achievement-badge {
          padding: 12px;
          border: 2px solid;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: all 0.2s ease;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .achievement-badge::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: currentColor;
          opacity: 0.3;
        }

        .achievement-badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .achievements-container.list .achievement-badge {
          flex-direction: row;
          align-items: center;
          gap: 12px;
        }

        .achievement-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .achievement-category-icon {
          font-size: 16px;
        }

        .achievement-rarity {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: bold;
          opacity: 0.8;
          padding: 2px 4px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }

        .achievement-name {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .achievements-container.list .achievement-name {
          flex: 1;
          margin-bottom: 0;
        }

        .achievement-description {
          font-size: 11px;
          opacity: 0.9;
          line-height: 1.3;
        }

        .achievements-container.list .achievement-description {
          flex: 2;
        }

        @media (max-width: 768px) {
          .achievements-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .category-filters {
            justify-content: flex-start;
          }

          .view-toggles {
            align-self: center;
          }

          .achievements-container.grid {
            grid-template-columns: 1fr;
          }

          .achievements-container.list .achievement-badge {
            flex-direction: column;
            align-items: flex-start;
          }

          .filter-button {
            font-size: 10px;
            padding: 4px 6px;
          }
        }
      `}</style>
    </ProfilePanel>
  );
}