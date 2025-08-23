'use client';

import GamePanel from '../ui/GamePanel';
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
      <GamePanel className="stats-panel">
        <h3 className="panel-title">Mission Performance</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Missions Completed</span>
            <span className="stat-value">{stats.missions.completed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Success Rate</span>
            <span className="stat-value">{stats.missions.successRate}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Current Streak</span>
            <span className="stat-value">{stats.missions.currentStreak}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Best Streak</span>
            <span className="stat-value">{stats.missions.longestStreak}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Gold from Missions</span>
            <span className="stat-value">{formatGold(stats.missions.totalGoldEarned)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Favorite Risk</span>
            <Badge 
              style={{ 
                backgroundColor: getRiskLevelColor(stats.missions.favoriteRiskLevel),
                color: '#000' 
              }}
            >
              {stats.missions.favoriteRiskLevel}
            </Badge>
          </div>
        </div>
        
        {stats.missions.mostPopularRoute !== 'None' && (
          <div className="popular-route">
            <span className="route-label">Most Used Route:</span>
            <span className="route-value">{stats.missions.mostPopularRoute}</span>
          </div>
        )}
      </GamePanel>

      {/* Crafting Statistics */}
      <GamePanel className="stats-panel">
        <h3 className="panel-title">Crafting Mastery</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Crafting Level</span>
            <span className="stat-value">{stats.crafting.currentLevel}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Items Crafted</span>
            <span className="stat-value">{stats.crafting.totalItemsCrafted}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Jobs Completed</span>
            <span className="stat-value">{stats.crafting.completed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Favorite Item</span>
            <span className="stat-value">{stats.crafting.mostCraftedItem}</span>
          </div>
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
      </GamePanel>

      {/* Trading Statistics */}
      <GamePanel className="stats-panel">
        <h3 className="panel-title">Trading Empire</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Items Sold</span>
            <span className="stat-value">{stats.trading.soldListings}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Sales Revenue</span>
            <span className="stat-value">{formatGold(stats.trading.totalGoldFromSales)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Active Listings</span>
            <span className="stat-value">{stats.trading.activeListings}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Avg Sale Price</span>
            <span className="stat-value">{formatGold(stats.trading.averageListingPrice)}</span>
          </div>
          <div className="stat-item span-2">
            <span className="stat-label">Most Traded Item</span>
            <span className="stat-value">{stats.trading.mostTradedItem}</span>
          </div>
        </div>
      </GamePanel>

      {/* All-Time Statistics */}
      {canViewPrivateStats && (
        <GamePanel className="stats-panel">
          <h3 className="panel-title">All-Time Records</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Total Gold Earned</span>
              <span className="stat-value">{formatGold(stats.allTime.goldEarned)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Gold Spent</span>
              <span className="stat-value">{formatGold(stats.allTime.goldSpent)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Net Profit</span>
              <span className={`stat-value ${stats.allTime.goldEarned >= stats.allTime.goldSpent ? 'positive' : 'negative'}`}>
                {formatGold(stats.allTime.goldEarned - stats.allTime.goldSpent)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Agents Hired</span>
              <span className="stat-value">{stats.allTime.agentsHired}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Playtime</span>
              <span className="stat-value">{formatTime(stats.allTime.activeTimeMinutes)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Sessions</span>
              <span className="stat-value">{stats.allTime.loginCount}</span>
            </div>
          </div>
        </GamePanel>
      )}

      <style jsx>{`
        .profile-stats {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .stats-panel {
          background: #32241d;
          border: 4px solid #533b2c;
          border-radius: 10px;
          padding: 16px;
          box-shadow: 0 4px 0 rgba(0,0,0,.4), inset 0 0 0 2px #1d1410;
        }

        .panel-title {
          font-size: 16px;
          font-weight: bold;
          color: #f1e5c8;
          margin: 0 0 12px 0;
          border-bottom: 2px solid #533b2c;
          padding-bottom: 8px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px;
          background: #2e231d;
          border: 2px solid #4b3527;
          border-radius: 6px;
        }

        .stat-item.span-2 {
          grid-column: span 2;
        }

        .stat-label {
          font-size: 11px;
          color: #c7b38a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 14px;
          font-weight: bold;
          color: #f1e5c8;
        }

        .stat-value.positive {
          color: #4ade80;
        }

        .stat-value.negative {
          color: #f87171;
        }

        .popular-route {
          margin-top: 12px;
          padding: 8px;
          background: #2e231d;
          border: 2px solid #4b3527;
          border-radius: 6px;
          display: flex;
          gap: 8px;
        }

        .route-label {
          font-size: 12px;
          color: #c7b38a;
        }

        .route-value {
          font-size: 12px;
          color: #f1e5c8;
          font-weight: bold;
        }

        .xp-progress {
          margin-top: 12px;
        }

        .xp-label {
          font-size: 12px;
          color: #c7b38a;
          margin-bottom: 4px;
        }

        .xp-bar {
          width: 100%;
          height: 8px;
          background: #2e231d;
          border: 2px solid #4b3527;
          border-radius: 4px;
          overflow: hidden;
        }

        .xp-fill {
          height: 100%;
          background: linear-gradient(90deg, #7b4b2d, #a36a43);
          transition: width 0.3s ease;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .stat-item.span-2 {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}