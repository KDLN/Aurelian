'use client';

import { ProfilePanel } from './ProfileLayout';
import StatCard from '../ui/StatCard';
import { Badge } from '../ui/badge';

interface ProfileStatsProps {
  stats: {
    missions: {
      total: number;
      completed: number;
      failed: number;
      active: number;
      successRate: number;
      totalGoldEarned: number;
      longestStreak: number;
      currentStreak: number;
      favoriteRiskLevel: string;
      mostPopularRoute: string;
    };
    crafting: {
      totalJobs: number;
      completed: number;
      currentLevel: number;
      currentXP: number;
      nextLevelXP: number;
      mostCraftedItem: string;
      totalItemsCrafted: number;
    };
    trading: {
      totalListings: number;
      soldListings: number;
      activeListings: number;
      totalGoldFromSales: number;
      mostTradedItem: string;
      averageListingPrice: number;
    };
    allTime: {
      goldEarned: number;
      goldSpent: number;
      missionsCompleted: number;
      missionsFailed: number;
      itemsTraded: number;
      itemsCrafted: number;
      agentsHired: number;
      activeTimeMinutes: number;
      loginCount: number;
    };
  };
  canViewPrivateStats?: boolean;
}

export default function ProfileStats({ stats, canViewPrivateStats = false }: ProfileStatsProps) {
  const formatGold = (amount: number) => amount.toLocaleString();
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
  };

  const getRiskLevelColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return '#4ade80'; // green
      case 'MEDIUM': return '#fbbf24'; // yellow
      case 'HIGH': return '#f87171'; // red
      default: return '#c7b38a';
    }
  };

  const getProgressPercentage = (current: number, next: number) => {
    return Math.min((current / next) * 100, 100);
  };

  return (
    <div className="profile-stats">
      {/* Mission Statistics */}
      <ProfilePanel title="Mission Performance">
        <div className="stats-grid">
          <StatCard
            label="Missions Completed"
            value={stats.missions.completed}
            icon="🗡️"
          />
          <StatCard
            label="Success Rate"
            value={`${stats.missions.successRate}%`}
            icon="📈"
            variant={stats.missions.successRate >= 80 ? 'positive' : stats.missions.successRate >= 60 ? 'neutral' : 'negative'}
          />
          <StatCard
            label="Current Streak"
            value={stats.missions.currentStreak}
            icon="🔥"
            variant={stats.missions.currentStreak >= 5 ? 'positive' : 'neutral'}
          />
          <StatCard
            label="Best Streak"
            value={stats.missions.longestStreak}
            icon="🏆"
          />
          <StatCard
            label="Gold from Missions"
            value={formatGold(stats.missions.totalGoldEarned)}
            icon="💰"
            variant="positive"
          />
          <StatCard
            label="Favorite Risk"
            value={
              <Badge 
                style={{ 
                  backgroundColor: getRiskLevelColor(stats.missions.favoriteRiskLevel),
                  color: '#000',
                  fontSize: '11px',
                  padding: '2px 6px'
                }}
              >
                {stats.missions.favoriteRiskLevel}
              </Badge>
            }
            icon="⚖️"
          />
        </div>
        
        {stats.missions.mostPopularRoute !== 'None' && (
          <div className="popular-route">
            <span className="route-label">Most Used Route:</span>
            <span className="route-value">{stats.missions.mostPopularRoute}</span>
          </div>
        )}
      </ProfilePanel>

      {/* Crafting Statistics */}
      <ProfilePanel title="Crafting Mastery">
        <div className="stats-grid">
          <StatCard
            label="Crafting Level"
            value={stats.crafting.currentLevel}
            icon="⭐"
            size="lg"
          />
          <StatCard
            label="Items Crafted"
            value={stats.crafting.totalItemsCrafted}
            icon="🔨"
          />
          <StatCard
            label="Jobs Completed"
            value={stats.crafting.completed}
            icon="✅"
          />
          <StatCard
            label="Favorite Item"
            value={stats.crafting.mostCraftedItem}
            icon="❤️"
          />
        </div>
        
        <div className="xp-progress">
          <div className="xp-label">
            XP Progress: {stats.crafting.currentXP} / {stats.crafting.nextLevelXP}
          </div>
          <div className="xp-bar">
            <div 
              className="xp-fill"
              style={{ 
                width: `${getProgressPercentage(stats.crafting.currentXP, stats.crafting.nextLevelXP)}%` 
              }}
            />
          </div>
        </div>
      </ProfilePanel>

      {/* Trading Statistics */}
      <ProfilePanel title="Trading Empire">
        <div className="stats-grid">
          <StatCard
            label="Items Sold"
            value={stats.trading.soldListings}
            icon="📦"
          />
          <StatCard
            label="Sales Revenue"
            value={formatGold(stats.trading.totalGoldFromSales)}
            icon="💰"
            variant="positive"
          />
          <StatCard
            label="Active Listings"
            value={stats.trading.activeListings}
            icon="📋"
            variant={stats.trading.activeListings > 0 ? 'positive' : 'neutral'}
          />
          <StatCard
            label="Avg Sale Price"
            value={formatGold(stats.trading.averageListingPrice)}
            icon="💎"
          />
          <StatCard
            label="Most Traded Item"
            value={stats.trading.mostTradedItem}
            icon="🏅"
            className="span-2"
          />
        </div>
      </ProfilePanel>

      {/* All-Time Statistics */}
      {canViewPrivateStats && (
        <ProfilePanel title="All-Time Records">
          <div className="stats-grid">
            <StatCard
              label="Total Gold Earned"
              value={formatGold(stats.allTime.goldEarned)}
              icon="💰"
              variant="positive"
            />
            <StatCard
              label="Total Gold Spent"
              value={formatGold(stats.allTime.goldSpent)}
              icon="💸"
              variant="negative"
            />
            <StatCard
              label="Net Profit"
              value={formatGold(stats.allTime.goldEarned - stats.allTime.goldSpent)}
              icon={stats.allTime.goldEarned >= stats.allTime.goldSpent ? "📈" : "📉"}
              variant={stats.allTime.goldEarned >= stats.allTime.goldSpent ? 'positive' : 'negative'}
            />
            <StatCard
              label="Agents Hired"
              value={stats.allTime.agentsHired}
              icon="👥"
            />
            <StatCard
              label="Total Playtime"
              value={formatTime(stats.allTime.activeTimeMinutes)}
              icon="⏰"
            />
            <StatCard
              label="Sessions"
              value={stats.allTime.loginCount}
              icon="🔄"
            />
          </div>
        </ProfilePanel>
      )}

      <style jsx>{`
        .profile-stats {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
        }

        .stats-grid :global(.span-2) {
          grid-column: span 2;
        }

        .popular-route {
          margin-top: 16px;
          padding: 12px;
          background: #2e231d;
          border: 1px solid #4b3527;
          border-radius: 6px;
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .route-label {
          font-size: 12px;
          color: #c7b38a;
          font-weight: 500;
        }

        .route-value {
          font-size: 12px;
          color: #f1e5c8;
          font-weight: 600;
        }

        .xp-progress {
          margin-top: 16px;
          padding: 12px;
          background: rgba(163, 106, 67, 0.1);
          border: 1px solid #533b2c;
          border-radius: 6px;
        }

        .xp-label {
          font-size: 12px;
          color: #c7b38a;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .xp-bar {
          width: 100%;
          height: 10px;
          background: #2e231d;
          border: 1px solid #4b3527;
          border-radius: 5px;
          overflow: hidden;
          position: relative;
        }

        .xp-fill {
          height: 100%;
          background: linear-gradient(90deg, #7b4b2d, #a36a43);
          border-radius: 4px;
          transition: width 0.3s ease;
          box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          
          .stats-grid :global(.span-2) {
            grid-column: span 2;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          
          .stats-grid :global(.span-2) {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}