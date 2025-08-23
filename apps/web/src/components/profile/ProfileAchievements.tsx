'use client';

import GamePanel from '../ui/GamePanel';
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
  if (achievements.length === 0) {
    return (
      <GamePanel className="achievements-panel">
        <h3 className="panel-title">Achievements</h3>
        <div className="no-achievements">
          <span className="muted">No achievements yet. Start trading to earn your first badge!</span>
        </div>
      </GamePanel>
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

  return (
    <GamePanel className="achievements-panel">
      <h3 className="panel-title">
        Achievements ({achievements.length})
      </h3>
      
      <div className="achievements-container">
        {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => (
          <div key={category} className="achievement-category">
            <h4 className="category-title">
              <span className="category-icon">{CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]}</span>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </h4>
            
            <div className="achievement-grid">
              {categoryAchievements.map((achievement) => {
                const data = ACHIEVEMENT_DATA[achievement];
                const rarity = data?.rarity || 'common';
                const colors = RARITY_COLORS[rarity];
                
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
                    <div className="achievement-name">{achievement}</div>
                    <div className="achievement-description">{data?.description || ''}</div>
                    <div className="achievement-rarity">{rarity.toUpperCase()}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .achievements-panel {
          background: #32241d;
          border: 4px solid #533b2c;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 4px 0 rgba(0,0,0,.4), inset 0 0 0 2px #1d1410;
        }

        .panel-title {
          font-size: 14px;
          font-weight: bold;
          color: #f1e5c8;
          margin: 0 0 10px 0;
          border-bottom: 2px solid #533b2c;
          padding-bottom: 6px;
        }

        .no-achievements {
          text-align: center;
          padding: 20px;
        }

        .muted {
          color: #c7b38a;
          font-style: italic;
        }

        .achievements-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .achievement-category {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .category-title {
          font-size: 14px;
          font-weight: bold;
          color: #f1e5c8;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .category-icon {
          font-size: 16px;
        }

        .achievement-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 8px;
        }

        .achievement-badge {
          padding: 8px;
          border: 2px solid;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }

        .achievement-badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
        }

        .achievement-name {
          font-size: 12px;
          font-weight: bold;
        }

        .achievement-description {
          font-size: 10px;
          opacity: 0.9;
        }

        .achievement-rarity {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: bold;
          align-self: flex-end;
          opacity: 0.7;
        }

        @media (max-width: 768px) {
          .achievement-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </GamePanel>
  );
}