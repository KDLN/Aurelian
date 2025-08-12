'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { supabase } from '@/lib/supabaseClient';

type Achievement = {
  id: string;
  key: string;
  name: string;
  description: string;
  unlockedAt: string;
  reward: any;
};

type Guild = {
  id: string;
  name: string;
  tag: string;
  level: number;
  xp: number;
  xpNext: number;
  xpProgress: number;
};

export default function GuildAchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    loadAchievements();
  }, [isClient]);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      // First get guild info to make sure user is in a guild
      const guildResponse = await fetch('/api/guild/info', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!guildResponse.ok) {
        throw new Error('Failed to fetch guild data');
      }

      const guildData = await guildResponse.json();
      
      if (!guildData.inGuild) {
        setError('You are not in a guild');
        return;
      }

      setGuild({
        id: guildData.guild.id,
        name: guildData.guild.name,
        tag: guildData.guild.tag,
        level: guildData.guild.level,
        xp: guildData.guild.xp,
        xpNext: guildData.guild.xpNext,
        xpProgress: guildData.guild.xpProgress
      });

      // For now, we'll use a subset of the achievements from the guild info
      // In a real implementation, you'd have a dedicated achievements endpoint
      const allAchievements = guildData.guild.recentAchievements || [];
      setAchievements(allAchievements);

    } catch (err) {
      console.error('Error loading achievements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const getAchievementIcon = (key: string) => {
    const icons: Record<string, string> = {
      'first_member': '👋',
      'first_trade': '💰',
      'treasury_10k': '💎',
      'treasury_50k': '🏛️',
      'members_10': '👥',
      'members_25': '👨‍👩‍👧‍👦',
      'members_50': '🏟️',
      'level_5': '⭐',
      'level_10': '🌟',
      'level_20': '💫',
      'warehouse_100': '📦',
      'warehouse_500': '🏭',
      'alliance_first': '🤝',
      'war_first': '⚔️',
      'war_victory': '🏆',
      'craft_master': '🔨',
      'trade_master': '📈',
      'builder': '🏗️',
      'explorer': '🗺️'
    };
    return icons[key] || '🏆';
  };

  const getAchievementCategory = (key: string) => {
    if (key.includes('member')) return 'Membership';
    if (key.includes('treasury') || key.includes('trade')) return 'Economy';
    if (key.includes('level')) return 'Progress';
    if (key.includes('warehouse') || key.includes('craft')) return 'Industry';
    if (key.includes('alliance') || key.includes('war')) return 'Diplomacy';
    return 'General';
  };

  const getRewardDisplay = (reward: any) => {
    if (!reward) return null;
    
    const rewards = [];
    if (reward.xp) rewards.push(`${reward.xp} XP`);
    if (reward.gold) rewards.push(`${reward.gold}g`);
    if (reward.item) rewards.push(reward.item);
    
    return rewards.length > 0 ? rewards.join(', ') : null;
  };

  // Group achievements by category
  const achievementsByCategory = achievements.reduce((acc, achievement) => {
    const category = getAchievementCategory(achievement.key);
    if (!acc[category]) acc[category] = [];
    acc[category].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  const sidebar = guild ? (
    <div>
      <h3>Guild Achievements</h3>
      <div className="game-flex-col">
        <a href="/guild" className="game-btn game-btn-small">
          ← Back to Guild
        </a>
      </div>

      <h3>Guild Progress</h3>
      <div className="game-flex-col">
        <div className="game-space-between">
          <span>Guild:</span>
          <span>[{guild.tag}] {guild.name}</span>
        </div>
        <div className="game-space-between">
          <span>Level:</span>
          <span className="game-good">{guild.level}</span>
        </div>
        <div className="game-space-between">
          <span>Achievements:</span>
          <span className="game-good">{achievements.length}</span>
        </div>
      </div>

      <div style={{ margin: '16px 0' }}>
        <div className="game-space-between">
          <span>Level Progress</span>
          <span>{guild.xp.toLocaleString()} / {guild.xpNext.toLocaleString()} XP</span>
        </div>
        <div style={{ 
          background: '#1a1511',
          border: '1px solid #533b2c',
          borderRadius: '4px',
          height: '12px',
          marginTop: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            background: 'linear-gradient(90deg, #6eb5ff, #4a8acc)',
            height: '100%',
            width: `${guild.xpProgress}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      <h3>Categories</h3>
      <div className="game-flex-col">
        {Object.keys(achievementsByCategory).map(category => (
          <div key={category} className="game-space-between">
            <span>{category}:</span>
            <span>{achievementsByCategory[category].length}</span>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div>
      <h3>Loading...</h3>
    </div>
  );

  if (!isClient) {
    return (
      <GameLayout title="Guild Achievements" sidebar={<div>Loading...</div>}>
        <div>Loading achievements...</div>
      </GameLayout>
    );
  }

  if (loading) {
    return (
      <GameLayout title="Guild Achievements" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center">Loading guild achievements...</div>
        </div>
      </GameLayout>
    );
  }

  if (error) {
    return (
      <GameLayout title="Guild Achievements" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center game-bad">Error: {error}</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
            <button className="game-btn" onClick={loadAchievements}>
              Retry
            </button>
            <a href="/guild" className="game-btn game-btn-primary">
              Back to Guild
            </a>
          </div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title={`${guild?.name} Achievements`} sidebar={sidebar}>
      <div className="game-flex-col">
        {guild && (
          <div className="game-card">
            <div className="game-space-between" style={{ marginBottom: '16px' }}>
              <div>
                <h2>🏆 Guild Achievements</h2>
                <p className="game-muted">[{guild.tag}] {guild.name} - Level {guild.level}</p>
              </div>
              <div className="game-center">
                <div className="game-big game-good">{achievements.length}</div>
                <div className="game-small game-muted">Unlocked</div>
              </div>
            </div>

            <div style={{ margin: '16px 0' }}>
              <div className="game-space-between">
                <span>Guild Experience Progress</span>
                <span>{guild.xp.toLocaleString()} / {guild.xpNext.toLocaleString()} XP</span>
              </div>
              <div style={{ 
                background: '#1a1511',
                border: '1px solid #533b2c',
                borderRadius: '4px',
                height: '16px',
                marginTop: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: 'linear-gradient(90deg, #6eb5ff, #4a8acc)',
                  height: '100%',
                  width: `${guild.xpProgress}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div className="game-small game-muted" style={{ marginTop: '4px' }}>
                {guild.xpProgress}% complete to Level {guild.level + 1}
              </div>
            </div>
          </div>
        )}

        {achievements.length > 0 ? (
          <div className="game-flex-col">
            {Object.entries(achievementsByCategory).map(([category, categoryAchievements]) => (
              <div key={category} className="game-card">
                <h3>{category} ({categoryAchievements.length})</h3>
                <div className="game-flex-col">
                  {categoryAchievements
                    .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
                    .map(achievement => (
                    <div key={achievement.id} className="game-card" style={{ margin: '8px 0', background: '#1a1511' }}>
                      <div className="game-space-between">
                        <div className="game-flex" style={{ alignItems: 'center', gap: '12px' }}>
                          <div style={{ fontSize: '32px' }}>
                            {getAchievementIcon(achievement.key)}
                          </div>
                          <div>
                            <strong>{achievement.name}</strong>
                            <div className="game-small game-muted">{achievement.description}</div>
                            {getRewardDisplay(achievement.reward) && (
                              <div className="game-small game-good">
                                Reward: {getRewardDisplay(achievement.reward)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="game-center" style={{ minWidth: '120px' }}>
                          <div className="game-small game-muted">Unlocked</div>
                          <div className="game-small">{formatTimeAgo(achievement.unlockedAt)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="game-card">
            <div className="game-center">
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
              <h3>No Achievements Yet</h3>
              <p className="game-muted">
                Your guild hasn't unlocked any achievements yet. Complete guild activities to earn your first achievements!
              </p>
              
              <div style={{ marginTop: '24px' }}>
                <h4>How to Earn Achievements:</h4>
                <div className="game-flex-col" style={{ gap: '8px', textAlign: 'left', maxWidth: '400px' }}>
                  <div>👋 <strong>Grow your guild</strong> - Recruit new members</div>
                  <div>💰 <strong>Build treasury</strong> - Contribute gold to guild funds</div>
                  <div>⭐ <strong>Level up</strong> - Gain experience through activities</div>
                  <div>📦 <strong>Use warehouse</strong> - Store and trade items</div>
                  <div>🤝 <strong>Form alliances</strong> - Partner with other guilds</div>
                  <div>⚔️ <strong>Engage in wars</strong> - Compete against rivals</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Achievement Progress Info */}
        <div className="game-card">
          <h3>Achievement System</h3>
          <p className="game-muted">
            Guild achievements are unlocked automatically when your guild reaches certain milestones. 
            Each achievement grants experience points and sometimes special rewards like gold, items, or cosmetic upgrades.
          </p>
          
          <div className="game-grid-2" style={{ marginTop: '16px' }}>
            <div>
              <strong>Membership Achievements</strong>
              <div className="game-small game-muted">Unlock by growing your guild membership</div>
            </div>
            <div>
              <strong>Economy Achievements</strong>
              <div className="game-small game-muted">Unlock by building treasury and trading</div>
            </div>
            <div>
              <strong>Progress Achievements</strong>
              <div className="game-small game-muted">Unlock by gaining guild levels</div>
            </div>
            <div>
              <strong>Industry Achievements</strong>
              <div className="game-small game-muted">Unlock by using warehouse and crafting</div>
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}