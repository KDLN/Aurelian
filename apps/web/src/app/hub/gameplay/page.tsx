'use client';

/**
 * Hub Gameplay Page
 *
 * Clone of /hub/page.tsx using design system (ds-*) classes instead of game-* classes.
 * Structure matches the original hub exactly.
 */

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

export default function HubGameplayPage() {
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
  const availableAgents = agents.filter(agent => agent._count?.missions === 0);

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
    <div className="ds">
      <h3 className="ds-heading-3">Account Status</h3>
      <div className="ds-stack ds-stack--sm">
        <div className="ds-split">
          <span className="ds-text-sm">Gold:</span>
          <span className="ds-text-sm ds-text-good">{wallet?.gold?.toLocaleString() || 0}g</span>
        </div>
        <div className="ds-split">
          <span className="ds-text-sm">Agents:</span>
          <span className="ds-text-sm ds-text-good">{agents.length}/4</span>
        </div>
        <div className="ds-split">
          <span className="ds-text-sm">Active Missions:</span>
          <span className="ds-text-sm ds-text-warn">{activeMissions.length}</span>
        </div>
        <div className="ds-split">
          <span className="ds-text-sm">Crafting Jobs:</span>
          <span className="ds-text-sm ds-text-good">{craftingInfo?.activeJobs?.length || 0}</span>
        </div>
        {guildInfo && (
          <div className="ds-split">
            <span className="ds-text-sm">Guild:</span>
            <span className="ds-text-sm ds-text-good">[{guildInfo.tag}] {guildInfo.name}</span>
          </div>
        )}
      </div>

      <div className="ds-stack ds-stack--sm ds-mt-lg">
        <Link href="/profile" className="ds-btn ds-btn--secondary ds-w-full">
          👤 Profile
        </Link>
        {guildInfo ? (
          <Link href="/guild" className="ds-btn ds-btn--secondary ds-w-full">
            🏰 {guildInfo.tag}
          </Link>
        ) : (
          <Link href="/guild" className="ds-btn ds-btn--secondary ds-w-full">
            🏰 Join Guild
          </Link>
        )}
        <Link href="/crafting" className="ds-btn ds-btn--secondary ds-w-full">
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
      <div className="ds ds-stack ds-stack--md">
        <div className="ds-card">
          <div className="ds-grid-2 ds-gap-lg">
            <div>
              <h2 className="ds-heading-2">Welcome back, {profile?.display || user?.email?.split('@')[0] || 'Trader'}!</h2>
              <p className="ds-text-muted">
                Manage your trading empire from the central hub. Check your progress,
                review recent activity, and plan your next moves.
              </p>
            </div>
            <div className="ds-card--nested">
              <h4 className="ds-heading-4">Today's Summary</h4>
              <div className="ds-grid-2 ds-gap-sm ds-text-sm">
                <div className="ds-split">
                  <span>Gold Earned:</span>
                  <span className="ds-text-good">+{dailyStats?.todaysStats?.goldEarned || 0}g</span>
                </div>
                <div className="ds-split">
                  <span>Missions Done:</span>
                  <span className="ds-text-good">{dailyStats?.todaysStats?.missionsCompleted || 0}</span>
                </div>
                <div className="ds-split">
                  <span>Items Traded:</span>
                  <span className="ds-text-good">{dailyStats?.todaysStats?.itemsTraded || 0}</span>
                </div>
                <div className="ds-split">
                  <span>Items Crafted:</span>
                  <span className="ds-text-good">{dailyStats?.todaysStats?.itemsCrafted || 0}</span>
                </div>
                <div className="ds-split">
                  <span>Net Gold:</span>
                  <span className={dailyStats?.performance?.netGoldWeek >= 0 ? 'ds-text-good' : 'ds-text-bad'}>
                    {dailyStats?.performance?.netGoldWeek >= 0 ? '+' : ''}{dailyStats?.performance?.netGoldWeek || 0}g
                  </span>
                </div>
                <div className="ds-split">
                  <span>Success Rate:</span>
                  <span className="ds-text-good">{dailyStats?.performance?.missionSuccessRate || 0}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ds-grid-2 ds-gap-md">
          <div className="ds-card">
            <h3 className="ds-heading-3">Recent Activity</h3>
            {recentActivity.length > 0 ? (
              <div className="ds-stack ds-stack--sm">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="ds-split">
                    <div>
                      <span>{getActivityIcon(activity.type)} {activity.message}</span>
                      <div className="ds-text-muted ds-text-sm">{formatTimeAgo(activity.timestamp)}</div>
                    </div>
                    {activity.reward && (
                      <span className="ds-text-good ds-text-sm">+{activity.reward}g</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="ds-text-muted">No recent activity</p>
            )}
          </div>

          <div className="ds-card">
            <h3 className="ds-heading-3">Top Warehouse Items</h3>
            {warehouseItems.length > 0 ? (
              <div className="ds-stack ds-stack--sm">
                {warehouseItems.map(item => (
                  <div key={item.id} className="ds-split">
                    <span>{item.itemName || item.itemKey.replace(/_/g, ' ')}</span>
                    <span className="ds-pill ds-pill--good">{item.quantity}</span>
                  </div>
                ))}
                <Link href="/warehouse" className="ds-btn ds-btn--sm ds-mt-sm">
                  View All Items
                </Link>
              </div>
            ) : (
              <div>
                <p className="ds-text-muted">No items in warehouse</p>
                <Link href="/market" className="ds-btn ds-btn--primary ds-mt-sm">
                  Browse Market
                </Link>
              </div>
            )}
          </div>
        </div>

        {activeMissions.length > 0 && (
          <div className="ds-card">
            <h3 className="ds-heading-3">Active Missions ({activeMissions.length})</h3>
            <div className="ds-grid-3 ds-gap-md">
              {activeMissions.slice(0, 3).map(mission => (
                <div key={mission.id} className="ds-card ds-card--sm ds-p-md">
                  <div className="ds-split ds-mb-xs">
                    <span className="ds-text-sm">{mission.mission?.name || 'Unknown Mission'}</span>
                    <span className={`ds-pill ${
                      mission.mission?.riskLevel === 'LOW' ? 'ds-pill--good' :
                      mission.mission?.riskLevel === 'MEDIUM' ? 'ds-pill--warn' : 'ds-pill--bad'
                    }`}>
                      {mission.mission?.riskLevel || 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="ds-text-muted ds-text-sm">
                    Agent: {agents.find(a => a.id === (mission as any).agentId)?.name || 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
            {activeMissions.length > 3 && (
              <Link href="/missions" className="ds-btn ds-btn--sm ds-mt-md">
                View All Missions ({activeMissions.length})
              </Link>
            )}
          </div>
        )}

        {/* Active Server Missions */}
        {serverMissions.length > 0 && (
          <div className="ds-card">
            <div className="ds-split ds-mb-md">
              <h3 className="ds-heading-3">🌍 Active Server Events</h3>
              <Link href="/missions" className="ds-btn ds-btn--sm">
                View All
              </Link>
            </div>
            <div className="ds-stack ds-stack--md">
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
                  <div key={mission.id} className="ds-card--nested">
                    <div className="ds-split ds-mb-sm">
                      <h4 className="ds-heading-4 ds-text-good">{mission.name}</h4>
                      <span className={`ds-pill ${
                        mission.status === 'active' ? 'ds-pill--good' :
                        mission.status === 'scheduled' ? 'ds-pill--warn' : 'ds-pill--neutral'
                      }`}>
                        {mission.status}
                      </span>
                    </div>

                    <p className="ds-text-muted ds-text-sm">{mission.description}</p>

                    <div className="ds-split ds-mt-sm">
                      <div>
                        <span className="ds-text-sm">Progress: </span>
                        <span className="ds-text-good ds-text-sm">{progressPercent}%</span>
                      </div>
                      {hoursLeft > 0 && (
                        <div className="ds-text-sm ds-text-muted">
                          {hoursLeft}h remaining
                        </div>
                      )}
                    </div>

                    <div className="ds-progress ds-mt-sm">
                      <div
                        className="ds-progress__fill"
                        style={{ width: `${Math.min(100, progressPercent)}%` }}
                      ></div>
                    </div>

                    {mission.status === 'active' && (
                      <Link
                        href={`/missions?server=${mission.id}`}
                        className="ds-btn ds-btn--sm ds-btn--primary ds-w-full ds-mt-sm"
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
        <div className="ds-card">
          <div className="ds-split ds-mb-md">
            <h3 className="ds-heading-3">📢 Game Updates & News</h3>
            <Link href="/admin/news" className="ds-btn ds-btn--sm">
              ⚙️ Manage
            </Link>
          </div>
          <div
            className="ds-stack ds-stack--sm"
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
                  if (priority === 'urgent') return 'ds-text-bad';
                  if (priority === 'high') return 'ds-text-warn';
                  switch (category) {
                    case 'update': return 'ds-text-good';
                    case 'event': return 'ds-text-warn';
                    case 'maintenance': return 'ds-text-bad';
                    case 'market': return 'ds-text-warn';
                    default: return '';
                  }
                };

                return (
                  <div key={news.id} className="ds-card--nested">
                    <div className="ds-split ds-mb-sm">
                      <h4 className={`ds-heading-4 ${getCategoryColor(news.category, news.priority)}`}>
                        {getCategoryIcon(news.category)} {news.title}
                      </h4>
                      {news.isPinned && <span className="ds-pill ds-pill--warn">📌</span>}
                    </div>
                    <p>{news.content}</p>
                    <div className="ds-text-muted ds-text-sm ds-mt-sm">
                      By {news.author.name} • {new Date(news.publishedAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="ds-card--nested">
                <h4 className="ds-heading-4">📝 No News Available</h4>
                <p className="ds-text-muted">
                  Check back later for game updates and announcements.
                </p>
                <Link href="/admin/news" className="ds-btn ds-btn--sm ds-mt-sm">
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
