'use client';

import React, { useState } from 'react';
import { ProfilePanel } from './ProfileLayout';

interface ProfileDashboardProps {
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
  achievements: string[];
  canViewPrivateStats?: boolean;
  showUnobtainedAchievements?: boolean;
}

export default function ProfileDashboard({ stats, achievements, canViewPrivateStats = false, showUnobtainedAchievements = false }: ProfileDashboardProps) {
  const [showAllStats, setShowAllStats] = useState(false);

  const formatGold = (amount: number) => amount.toLocaleString();
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
  };

  const getProgressPercentage = (current: number, next: number) => {
    return Math.min((current / next) * 100, 100);
  };

  const getRiskLevelColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return '#4ade80';
      case 'MEDIUM': return '#fbbf24';
      case 'HIGH': return '#f87171';
      default: return '#c7b38a';
    }
  };

  // Achievement definitions
  const ACHIEVEMENT_DATA: Record<string, {
    description: string;
    category: 'missions' | 'trading' | 'crafting' | 'social' | 'time';
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    requirement: (stats: any) => boolean;
  }> = {
    'Century Runner': {
      description: 'Complete 100 missions',
      category: 'missions',
      rarity: 'rare',
      requirement: (stats) => stats.missions.completed >= 100
    },
    'Near Perfect': {
      description: 'Achieve 95%+ mission success rate',
      category: 'missions',
      rarity: 'epic',
      requirement: (stats) => stats.missions.successRate >= 95
    },
    'Streak Master': {
      description: 'Complete 10 missions in a row',
      category: 'missions',
      rarity: 'rare',
      requirement: (stats) => stats.missions.longestStreak >= 10
    },
    'Gold Hoarder': {
      description: 'Earn 10,000+ gold from missions',
      category: 'missions',
      rarity: 'rare',
      requirement: (stats) => stats.missions.totalGoldEarned >= 10000
    },
    'Master Crafter': {
      description: 'Reach crafting level 10',
      category: 'crafting',
      rarity: 'epic',
      requirement: (stats) => stats.crafting.currentLevel >= 10
    },
    'Production Line': {
      description: 'Craft 500+ items',
      category: 'crafting',
      rarity: 'rare',
      requirement: (stats) => stats.crafting.totalItemsCrafted >= 500
    },
    'Market Mogul': {
      description: 'Complete 50+ auction sales',
      category: 'trading',
      rarity: 'rare',
      requirement: (stats) => stats.trading.soldListings >= 50
    },
    'Sales Champion': {
      description: 'Earn 5,000+ gold from sales',
      category: 'trading',
      rarity: 'epic',
      requirement: (stats) => stats.trading.totalGoldFromSales >= 5000
    },
    'Time Veteran': {
      description: 'Play for 100+ hours',
      category: 'time',
      rarity: 'legendary',
      requirement: (stats) => stats.allTime.activeTimeMinutes >= 6000
    },
    'Dedicated Trader': {
      description: 'Log in 100+ times',
      category: 'social',
      rarity: 'rare',
      requirement: (stats) => stats.allTime.loginCount >= 100
    },
    'Caravan Master': {
      description: 'Unlock 5+ caravan slots',
      category: 'missions',
      rarity: 'epic',
      requirement: (stats) => stats.missions.completed >= 25 // Assuming slots unlock based on missions
    }
  };

  // Calculate which achievements are available but not yet obtained
  const unobtainedAchievements = showUnobtainedAchievements 
    ? Object.entries(ACHIEVEMENT_DATA)
        .filter(([name, data]) => !achievements.includes(name) && !data.requirement(stats))
        .map(([name, data]) => ({ name, ...data }))
        .slice(0, 3) // Show top 3 closest achievements
    : [];

  // Get highlights - most interesting stats to show
  const highlights = [
    ...(stats.missions.currentStreak > 0 ? [{ 
      label: 'Current Streak', 
      value: stats.missions.currentStreak, 
      icon: '🔥', 
      color: '#f87171' 
    }] : []),
    ...(stats.missions.active > 0 ? [{ 
      label: 'Active Missions', 
      value: stats.missions.active, 
      icon: '⚔️', 
      color: '#fbbf24' 
    }] : []),
    ...(stats.trading.activeListings > 0 ? [{ 
      label: 'Active Listings', 
      value: stats.trading.activeListings, 
      icon: '📋', 
      color: '#4ade80' 
    }] : []),
    ...(stats.crafting.currentLevel > 1 ? [{ 
      label: 'Crafting Level', 
      value: stats.crafting.currentLevel, 
      icon: '⭐', 
      color: '#a855f7' 
    }] : []),
  ].slice(0, 4); // Max 4 highlights

  return (
    <div className="profile-dashboard">
      {/* Three Column Layout */}
      <div className="dashboard-grid">
        {/* Column 1: Right Now */}
        <div className="dashboard-column">
          <h3 className="column-title">Right Now</h3>
          
          {highlights.length > 0 ? (
            <div className="highlight-stats">
              {highlights.map((highlight, index) => (
                <div key={index} className="highlight-card">
                  <div className="highlight-icon" style={{ color: highlight.color }}>
                    {highlight.icon}
                  </div>
                  <div className="highlight-content">
                    <div className="highlight-value">{highlight.value}</div>
                    <div className="highlight-label">{highlight.label}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <div className="empty-text">Start trading to see your live stats!</div>
            </div>
          )}
        </div>

        {/* Column 2: Progress */}
        <div className="dashboard-column">
          <h3 className="column-title">Progress</h3>
          
          <div className="progress-stats">
            {/* Level & XP Combined */}
            <div className="progress-card level-card">
              <div className="progress-header">
                <span className="progress-icon">⭐</span>
                <span className="progress-title">Level {stats.crafting.currentLevel}</span>
              </div>
              <div className="xp-progress">
                <div className="xp-bar">
                  <div 
                    className="xp-fill"
                    style={{ 
                      width: `${getProgressPercentage(stats.crafting.currentXP, stats.crafting.nextLevelXP)}%` 
                    }}
                  />
                </div>
                <div className="xp-text">{stats.crafting.currentXP} / {stats.crafting.nextLevelXP} XP</div>
              </div>
            </div>

            {/* Success Rate Gauge */}
            {stats.missions.total > 0 && (
              <div className="progress-card gauge-card">
                <div className="progress-header">
                  <span className="progress-icon">📈</span>
                  <span className="progress-title">Success Rate</span>
                </div>
                <div className="gauge">
                  <div className="gauge-value">{stats.missions.successRate}%</div>
                  <div 
                    className="gauge-fill"
                    style={{ 
                      background: `conic-gradient(${
                        stats.missions.successRate >= 80 ? '#4ade80' : 
                        stats.missions.successRate >= 60 ? '#fbbf24' : '#f87171'
                      } ${stats.missions.successRate * 3.6}deg, #2e231d 0deg)` 
                    }}
                  />
                </div>
              </div>
            )}

            {/* Top Achievements */}
            {achievements.slice(0, 3).length > 0 && (
              <div className="progress-card achievements-card">
                <div className="progress-header">
                  <span className="progress-icon">🏆</span>
                  <span className="progress-title">Recent Badges</span>
                </div>
                <div className="mini-achievements">
                  {achievements.slice(0, 3).map((achievement, index) => (
                    <div key={index} className="mini-badge">
                      {achievement}
                    </div>
                  ))}
                  {achievements.length > 3 && (
                    <div className="mini-badge more">+{achievements.length - 3}</div>
                  )}
                </div>
              </div>
            )}

            {/* Unobtained Achievements - Only for own profile */}
            {unobtainedAchievements.length > 0 && (
              <div className="progress-card unobtained-achievements-card">
                <div className="progress-header">
                  <span className="progress-icon">🎯</span>
                  <span className="progress-title">Goals to Unlock</span>
                </div>
                <div className="unobtained-achievements">
                  {unobtainedAchievements.map((achievement, index) => (
                    <div key={index} className="unobtained-badge">
                      <div className="unobtained-name">{achievement.name}</div>
                      <div className="unobtained-description">{achievement.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Lifetime */}
        <div className="dashboard-column">
          <h3 className="column-title">Lifetime</h3>
          
          <div className="lifetime-stats">
            {/* Compact Counters */}
            <div className="counter-grid">
              {stats.missions.completed > 0 && (
                <div className="counter-item">
                  <div className="counter-value">{stats.missions.completed}</div>
                  <div className="counter-label">Missions</div>
                </div>
              )}
              {stats.trading.soldListings > 0 && (
                <div className="counter-item">
                  <div className="counter-value">{stats.trading.soldListings}</div>
                  <div className="counter-label">Trades</div>
                </div>
              )}
              {stats.crafting.totalItemsCrafted > 0 && (
                <div className="counter-item">
                  <div className="counter-value">{stats.crafting.totalItemsCrafted}</div>
                  <div className="counter-label">Crafted</div>
                </div>
              )}
              {canViewPrivateStats && stats.allTime.goldEarned > 0 && (
                <div className="counter-item gold">
                  <div className="counter-value">{formatGold(stats.allTime.goldEarned)}</div>
                  <div className="counter-label">Gold Earned</div>
                </div>
              )}
            </div>

            {/* Best Records */}
            <div className="records-section">
              <div className="records-title">Best Records</div>
              <div className="records-list">
                {stats.missions.longestStreak > 0 && (
                  <div className="record-item">
                    <span className="record-icon">🔥</span>
                    <span className="record-text">Streak: {stats.missions.longestStreak}</span>
                  </div>
                )}
                {stats.trading.totalGoldFromSales > 0 && (
                  <div className="record-item">
                    <span className="record-icon">💰</span>
                    <span className="record-text">Best Sale: {formatGold(stats.trading.averageListingPrice)}</span>
                  </div>
                )}
                {canViewPrivateStats && stats.allTime.activeTimeMinutes > 60 && (
                  <div className="record-item">
                    <span className="record-icon">⏰</span>
                    <span className="record-text">Playtime: {formatTime(stats.allTime.activeTimeMinutes)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Show All Toggle */}
      <div className="dashboard-footer">
        <button 
          className="toggle-stats" 
          onClick={() => setShowAllStats(!showAllStats)}
        >
          {showAllStats ? '📊 Show Less' : '📈 Show All Stats'}
        </button>
      </div>

      <style jsx>{`
        .profile-dashboard {
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
          flex: 1;
          min-height: 0;
        }

        .dashboard-column {
          display: flex;
          flex-direction: column;
          min-height: 0;
          animation: fadeInSlide 0.6s ease-out;
        }
        
        .dashboard-column:nth-child(1) { animation-delay: 0.1s; }
        .dashboard-column:nth-child(2) { animation-delay: 0.3s; }
        .dashboard-column:nth-child(3) { animation-delay: 0.5s; }

        .column-title {
          font-size: 14px;
          font-weight: 600;
          color: #f1e5c8;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #4b3527;
          padding-bottom: 8px;
        }

        .highlight-stats, .progress-stats, .lifetime-stats {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .highlight-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #32241d;
          border: 2px solid #533b2c;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .highlight-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        
        .highlight-card {
          animation: slideInUp 0.3s ease-out;
        }
        
        .highlight-card:nth-child(1) { animation-delay: 0.1s; }
        .highlight-card:nth-child(2) { animation-delay: 0.2s; }
        .highlight-card:nth-child(3) { animation-delay: 0.3s; }
        .highlight-card:nth-child(4) { animation-delay: 0.4s; }

        .highlight-icon {
          font-size: 20px;
        }

        .highlight-content {
          flex: 1;
        }

        .highlight-value {
          font-size: 18px;
          font-weight: 700;
          color: #f1e5c8;
          line-height: 1.2;
        }

        .highlight-label {
          font-size: 11px;
          color: #c7b38a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          text-align: center;
          flex: 1;
        }

        .empty-icon {
          font-size: 32px;
          margin-bottom: 12px;
          opacity: 0.6;
        }

        .empty-text {
          font-size: 12px;
          color: #c7b38a;
          font-style: italic;
        }

        .progress-card {
          padding: 12px;
          background: #32241d;
          border: 2px solid #533b2c;
          border-radius: 8px;
        }

        .progress-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .progress-icon {
          font-size: 14px;
        }

        .progress-title {
          font-size: 12px;
          font-weight: 600;
          color: #f1e5c8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .xp-progress {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .xp-bar {
          width: 100%;
          height: 8px;
          background: #2e231d;
          border: 1px solid #4b3527;
          border-radius: 4px;
          overflow: hidden;
        }

        .xp-fill {
          height: 100%;
          background: linear-gradient(90deg, #7b4b2d, #a36a43);
          border-radius: 3px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }

        .xp-text {
          font-size: 10px;
          color: #c7b38a;
          text-align: center;
        }

        .gauge {
          position: relative;
          width: 60px;
          height: 60px;
          margin: 0 auto;
        }

        .gauge-fill {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          mask: radial-gradient(circle closest-side, transparent 65%, black 66%);
          -webkit-mask: radial-gradient(circle closest-side, transparent 65%, black 66%);
        }

        .gauge-value {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 14px;
          font-weight: 700;
          color: #f1e5c8;
        }

        .mini-achievements {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .mini-badge {
          background: #7b4b2d;
          color: #f1e5c8;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .mini-badge:hover {
          transform: scale(1.05);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .mini-badge.more {
          background: #533b2c;
          color: #c7b38a;
        }

        .unobtained-achievements {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .unobtained-badge {
          padding: 6px 8px;
          background: #1e1912;
          border: 1px dashed #4b3527;
          border-radius: 4px;
          opacity: 0.8;
          transition: all 0.2s ease;
        }

        .unobtained-badge:hover {
          opacity: 1;
          border-color: #a36a43;
          background: #241d16;
        }

        .unobtained-name {
          font-size: 10px;
          font-weight: 600;
          color: #a36a43;
          margin-bottom: 2px;
        }

        .unobtained-description {
          font-size: 8px;
          color: #8a7560;
          line-height: 1.2;
        }

        .counter-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 16px;
        }

        .counter-item {
          text-align: center;
          padding: 8px;
          background: rgba(163, 106, 67, 0.1);
          border: 1px solid #533b2c;
          border-radius: 6px;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .counter-item:hover {
          transform: translateY(-1px);
          background: rgba(163, 106, 67, 0.15);
          border-color: #a36a43;
        }

        .counter-item.gold {
          grid-column: span 2;
          background: rgba(212, 175, 55, 0.1);
          border-color: #d4af37;
        }

        .counter-value {
          font-size: 16px;
          font-weight: 700;
          color: #f1e5c8;
          line-height: 1.2;
        }

        .counter-label {
          font-size: 10px;
          color: #c7b38a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .records-section {
          flex: 1;
        }

        .records-title {
          font-size: 12px;
          color: #c7b38a;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .records-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .record-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          background: rgba(163, 106, 67, 0.1);
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        
        .record-item:hover {
          background: rgba(163, 106, 67, 0.2);
          transform: translateX(4px);
        }

        .record-icon {
          font-size: 12px;
        }

        .record-text {
          font-size: 11px;
          color: #f1e5c8;
        }

        .dashboard-footer {
          margin-top: 16px;
          text-align: center;
        }

        .toggle-stats {
          background: #7b4b2d;
          color: #f1e5c8;
          border: 2px solid #a36a43;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .toggle-stats:hover {
          background: #8d5a37;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        @keyframes slideInUp {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes countUp {
          0% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        @keyframes fadeInSlide {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .counter-value, .highlight-value {
          animation: countUp 0.4s ease-out;
        }

        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .counter-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .counter-item.gold {
            grid-column: span 3;
          }
        }
      `}</style>
    </div>
  );
}