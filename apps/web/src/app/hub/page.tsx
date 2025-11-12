'use client';

import { useEffect, useState, useCallback } from 'react';
import GameLayout from '@/components/GameLayout';
import { useUserDataQuery } from '@/hooks/useUserDataQuery';
import { useAgents } from '@/hooks/useAgents';
import { useMissions } from '@/hooks/useMissionsQuery';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

interface RecentActivity {
  id: string;
  type: 'mission_completed' | 'auction_sold' | 'agent_hired' | 'item_crafted';
  message: string;
  timestamp: Date | string;
  reward?: number;
}

export default function TradingHub() {
  const { wallet, inventory } = useUserDataQuery();
  const { agents } = useAgents();
  const { data: missionData } = useMissions();
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [guildInfo, setGuildInfo] = useState<any>(null);
  const [craftingInfo, setCraftingInfo] = useState<any>(null);
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [gameNews, setGameNews] = useState<any[]>([]);
  const [serverMissions, setServerMissions] = useState<any[]>([]);

  // Separate function for fetching server missions with polling
  const fetchServerMissions = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const response = await fetch('/api/server/missions?status=active', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });
        if (response.ok) {
          const result = await response.json();
          setServerMissions(result.missions || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch server missions:', error);
    }
  }, []);

  // Poll server missions every 30 seconds
  useEffect(() => {
    fetchServerMissions();
    const interval = setInterval(fetchServerMissions, 30000);
    return () => clearInterval(interval);
  }, [fetchServerMissions]);

  useEffect(() => {
    const initializeHubData = async () => {
      // Get user info
      const { data } = await supabase.auth.getUser();
      setUser(data.user);

      if (!data.user) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Fetch all hub data in parallel
      const fetchPromises = [
        // Activities
        fetch('/api/user/activities?limit=5', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }),
        // Profile
        fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }),
        // Guild info
        fetch('/api/guild', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }).catch(() => null), // Guild is optional
        // Crafting info
        fetch('/api/crafting/jobs', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }).catch(() => null), // Crafting is optional
        // Daily stats
        fetch('/api/user/stats?period=summary', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }).catch(() => null), // Stats is optional
        // Game news (public endpoint, no auth needed)
        fetch('/api/news?limit=6').catch(() => null),
      ];

      try {
        const [activitiesRes, profileRes, guildRes, craftingRes, statsRes, newsRes] = await Promise.all(fetchPromises);

        // Handle activities
        if (activitiesRes?.ok) {
          const result = await activitiesRes.json();
          setRecentActivity(result.activities || []);
        }

        // Handle profile
        if (profileRes?.ok) {
          const result = await profileRes.json();
          setProfile(result.profile);
        }

        // Handle guild (optional)
        if (guildRes?.ok) {
          const result = await guildRes.json();
          setGuildInfo(result.guild);
        }

        // Handle crafting (optional)
        if (craftingRes?.ok) {
          const result = await craftingRes.json();
          setCraftingInfo(result);
        }

        // Handle daily stats (optional)
        if (statsRes?.ok) {
          const result = await statsRes.json();
          setDailyStats(result.summary);
        }

        // Handle news (optional)
        if (newsRes?.ok) {
          const result = await newsRes.json();
          setGameNews(result.news || []);
        }
      } catch (error) {
        console.error('Error fetching hub data:', error);
      }
    };

    initializeHubData();
  }, []);

  const activeMissions = missionData?.activeMissions || [];
  const availableAgents = agents.filter(agent => agent._count.missions === 0);

  // Get top warehouse items
  const warehouseItems = inventory?.inventory
    ?.filter(item => item.location === 'warehouse' && item.quantity > 0)
    ?.sort((a, b) => b.quantity - a.quantity)
    ?.slice(0, 6) || [];

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'mission_completed': return '🎯';
      case 'auction_sold': return '💰';
      case 'agent_hired': return '👥';
      case 'item_crafted': return '⚒️';
      default: return '📝';
    }
  };

  const formatTimeAgo = (timestamp: Date | string) => {
    const now = new Date();
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const sidebar = (
    <div>
      <h3>Account Status</h3>
      <div className="game-flex-col">
        <div className="game-space-between">
          <span className="game-small">Gold:</span>
          <span className="game-good game-small">{wallet?.gold?.toLocaleString() || 0}g</span>
        </div>
        <div className="game-space-between">
          <span className="game-small">Agents:</span>
          <span className="game-good game-small">{agents.length}/4</span>
        </div>
        <div className="game-space-between">
          <span className="game-small">Active Missions:</span>
          <span className="game-warn game-small">{activeMissions.length}</span>
        </div>
        <div className="game-space-between">
          <span className="game-small">Crafting Jobs:</span>
          <span className="game-good game-small">{craftingInfo?.activeJobs?.length || 0}</span>
        </div>
        {guildInfo && (
          <div className="game-space-between">
            <span className="game-small">Guild:</span>
            <span className="game-good game-small">[{guildInfo.tag}] {guildInfo.name}</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <Link href="/profile" className="game-btn game-btn-secondary" style={{ width: '100%', textAlign: 'center', display: 'block', marginBottom: '0.5rem' }}>
          👤 Profile
        </Link>
        {guildInfo ? (
          <Link href="/guild" className="game-btn game-btn-secondary" style={{ width: '100%', textAlign: 'center', display: 'block', marginBottom: '0.5rem' }}>
            🏰 {guildInfo.tag}
          </Link>
        ) : (
          <Link href="/guild" className="game-btn game-btn-secondary" style={{ width: '100%', textAlign: 'center', display: 'block', marginBottom: '0.5rem' }}>
            🏰 Join Guild
          </Link>
        )}
        <Link href="/crafting" className="game-btn game-btn-secondary" style={{ width: '100%', textAlign: 'center', display: 'block', marginBottom: '0.5rem' }}>
          ⚒️ Crafting {craftingInfo?.activeJobs?.length > 0 ? `(${craftingInfo.activeJobs.length})` : ''}
        </Link>
      </div>
    </div>
  );

  return (
    <GameLayout
      title="Trading Hub"
      sidebar={sidebar}
    >
      <div className="game-flex-col">
        <div className="game-card">
          <div className="game-grid-2">
            <div>
              <h2>Welcome back, {profile?.display || user?.email?.split('@')[0] || 'Trader'}!</h2>
              <p className="game-muted">
                Manage your trading empire from the central hub. Check your progress,
                review recent activity, and plan your next moves.
              </p>
            </div>
            <div className="game-card-nested">
              <h4>Today's Summary</h4>
              <div className="game-grid-2 game-small">
                <div className="game-space-between">
                  <span>Gold Earned:</span>
                  <span className="game-good">+{dailyStats?.todaysStats?.goldEarned || 0}g</span>
                </div>
                <div className="game-space-between">
                  <span>Missions Done:</span>
                  <span className="game-good">{dailyStats?.todaysStats?.missionsCompleted || 0}</span>
                </div>
                <div className="game-space-between">
                  <span>Items Traded:</span>
                  <span className="game-good">{dailyStats?.todaysStats?.itemsTraded || 0}</span>
                </div>
                <div className="game-space-between">
                  <span>Items Crafted:</span>
                  <span className="game-good">{dailyStats?.todaysStats?.itemsCrafted || 0}</span>
                </div>
                <div className="game-space-between">
                  <span>Net Gold:</span>
                  <span className={dailyStats?.performance?.netGoldWeek >= 0 ? 'game-good' : 'game-bad'}>
                    {dailyStats?.performance?.netGoldWeek >= 0 ? '+' : ''}{dailyStats?.performance?.netGoldWeek || 0}g
                  </span>
                </div>
                <div className="game-space-between">
                  <span>Success Rate:</span>
                  <span className="game-good">{dailyStats?.performance?.missionSuccessRate || 0}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="game-grid-2">
          <div className="game-card">
            <h3>Recent Activity</h3>
            {recentActivity.length > 0 ? (
              <div className="game-flex-col">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="game-space-between">
                    <div>
                      <span>{getActivityIcon(activity.type)} {activity.message}</span>
                      <div className="game-muted game-small">{formatTimeAgo(activity.timestamp)}</div>
                    </div>
                    {activity.reward && (
                      <span className="game-good game-small">+{activity.reward}g</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="game-muted">No recent activity</p>
            )}
          </div>

          <div className="game-card">
            <h3>Top Warehouse Items</h3>
            {warehouseItems.length > 0 ? (
              <div className="game-flex-col">
                {warehouseItems.map(item => (
                  <div key={item.id} className="game-space-between">
                    <span>{item.itemName || item.itemKey.replace(/_/g, ' ')}</span>
                    <span className="game-pill game-pill-good">{item.quantity}</span>
                  </div>
                ))}
                <Link href="/warehouse" className="game-btn game-btn-small" style={{ marginTop: '0.5rem' }}>
                  View All Items
                </Link>
              </div>
            ) : (
              <div>
                <p className="game-muted">No items in warehouse</p>
                <Link href="/market" className="game-btn game-btn-primary" style={{ marginTop: '0.5rem' }}>
                  Browse Market
                </Link>
              </div>
            )}
          </div>
        </div>

        {activeMissions.length > 0 && (
          <div className="game-card">
            <h3>Active Missions ({activeMissions.length})</h3>
            <div className="game-grid-3">
              {activeMissions.slice(0, 3).map(mission => (
                <div key={mission.id} className="game-card-sm">
                  <div className="game-space-between">
                    <span className="game-small">{mission.mission?.name || 'Unknown Mission'}</span>
                    <span className={`game-pill game-pill-${
                      mission.mission?.riskLevel === 'LOW' ? 'good' : 
                      mission.mission?.riskLevel === 'MEDIUM' ? 'warn' : 'bad'
                    }`}>
                      {mission.mission?.riskLevel || 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="game-muted game-small">
                    Agent: {agents.find(a => a.id === (mission as any).agentId)?.name || 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
            {activeMissions.length > 3 && (
              <Link href="/missions" className="game-btn game-btn-small" style={{ marginTop: '0.5rem' }}>
                View All Missions ({activeMissions.length})
              </Link>
            )}
          </div>
        )}

        {/* Active Server Missions */}
        {serverMissions.length > 0 && (
          <div className="game-card">
            <div className="game-space-between">
              <h3>🌍 Active Server Events</h3>
              <Link href="/missions" className="game-btn game-btn-small">
                View All
              </Link>
            </div>
            <div className="game-flex-col">
              {serverMissions.slice(0, 2).map((mission: any) => {
                const progress = mission.globalProgress || {};
                const requirements = mission.globalRequirements || {};
                
                // Calculate overall progress percentage
                let totalProgress = 0;
                let totalRequired = 0;
                Object.keys(requirements).forEach(key => {
                  totalProgress += progress[key] || 0;
                  totalRequired += requirements[key] || 0;
                });
                const progressPercent = totalRequired > 0 ? Math.round((totalProgress / totalRequired) * 100) : 0;
                
                const timeRemaining = mission.endsAt ? new Date(mission.endsAt).getTime() - Date.now() : 0;
                const hoursLeft = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
                
                return (
                  <div key={mission.id} className="game-card-nested">
                    <div className="game-space-between" style={{ marginBottom: '0.5rem' }}>
                      <h4 className="game-good">{mission.name}</h4>
                      <span className={`game-pill ${
                        mission.status === 'active' ? 'game-pill-good' : 
                        mission.status === 'scheduled' ? 'game-pill-warn' : 'game-pill-muted'
                      }`}>
                        {mission.status}
                      </span>
                    </div>
                    
                    <p className="game-muted game-small">{mission.description}</p>
                    
                    <div className="game-space-between" style={{ marginTop: '0.5rem' }}>
                      <div>
                        <span className="game-small">Progress: </span>
                        <span className="game-good game-small">{progressPercent}%</span>
                      </div>
                      {hoursLeft > 0 && (
                        <div className="game-small game-muted">
                          {hoursLeft}h remaining
                        </div>
                      )}
                    </div>
                    
                    <div className="game-progress-bar" style={{ marginTop: '0.5rem' }}>
                      <div 
                        className="game-progress-fill"
                        style={{ width: `${Math.min(100, progressPercent)}%` }}
                      ></div>
                    </div>
                    
                    {mission.status === 'active' && (
                      <Link 
                        href={`/missions?server=${mission.id}`} 
                        className="game-btn game-btn-small game-btn-primary" 
                        style={{ marginTop: '0.5rem', width: '100%', textAlign: 'center' }}
                      >
                        🎯 Contribute Resources
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Game News/Updates */}
        <div className="game-card">
          <div className="game-space-between">
            <h3>📢 Game Updates & News</h3>
            <Link href="/admin/news" className="game-btn game-btn-small">
              ⚙️ Manage
            </Link>
          </div>
          <div 
            className="game-flex-col" 
            style={{ 
              maxHeight: '300px', 
              overflow: 'auto',
              paddingRight: '4px'
            }}
          >
            {gameNews.length > 0 ? (
              gameNews.map(news => {
                const getCategoryIcon = (category: string) => {
                  switch (category) {
                    case 'update': return '🆕';
                    case 'event': return '🎉';
                    case 'maintenance': return '🚧';
                    case 'market': return '📈';
                    case 'announcement': return '📢';
                    default: return '📝';
                  }
                };
                
                const getCategoryColor = (category: string, priority: string) => {
                  if (priority === 'urgent') return 'game-bad';
                  if (priority === 'high') return 'game-warn';
                  switch (category) {
                    case 'update': return 'game-good';
                    case 'event': return 'game-warn';
                    case 'maintenance': return 'game-bad';
                    case 'market': return 'game-warn';
                    default: return '';
                  }
                };

                return (
                  <div key={news.id} className="game-card-nested">
                    <div className="game-space-between" style={{ marginBottom: '0.5rem' }}>
                      <h4 className={getCategoryColor(news.category, news.priority)}>
                        {getCategoryIcon(news.category)} {news.title}
                      </h4>
                      {news.isPinned && <span className="game-pill game-pill-warn">📌</span>}
                    </div>
                    <p>{news.content}</p>
                    <div className="game-muted game-small" style={{ marginTop: '0.5rem' }}>
                      By {news.author.name} • {new Date(news.publishedAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="game-card-nested">
                <h4>📝 No News Available</h4>
                <p className="game-muted">
                  Check back later for game updates and announcements.
                </p>
                <Link href="/admin/news" className="game-btn game-btn-small">
                  Create First News Item
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}