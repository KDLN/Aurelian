'use client';

/**
 * Hub Gameplay Page
 *
 * Complete trading hub interface with all gameplay elements using the new design system.
 * This page showcases the full hub experience with real data fetching and interactions.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserDataQuery } from '@/hooks/useUserDataQuery';
import { useAgents } from '@/hooks/useAgents';
import { useMissions } from '@/hooks/useMissionsQuery';
import GameLayout from '@/components/GameLayout';
import Link from 'next/link';
import {
  HubSummaryStats,
  ActivityFeed,
  WarehouseSnapshot,
  AgentRoster,
  NewsFeed,
  ActiveMissionsGrid,
} from '@/components/hub';
import type {
  ActivityItem,
  WarehouseItem,
  Agent,
  NewsItem,
  MissionData,
} from '@/components/hub';

export default function HubGameplayPage() {
  // Data hooks
  const { wallet, inventory } = useUserDataQuery();
  const { agents } = useAgents();
  const { data: missionData } = useMissions();

  // State
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [guildInfo, setGuildInfo] = useState<any>(null);
  const [craftingInfo, setCraftingInfo] = useState<any>(null);
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [gameNews, setGameNews] = useState<any[]>([]);
  const [serverMissions, setServerMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch server missions with polling
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

  // Initialize hub data
  useEffect(() => {
    const initializeHubData = async () => {
      setLoading(true);

      // Get user
      const { data } = await supabase.auth.getUser();
      setUser(data.user);

      if (!data.user) {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      // Fetch all data in parallel
      try {
        const [
          activitiesRes,
          profileRes,
          guildRes,
          craftingRes,
          statsRes,
          newsRes,
        ] = await Promise.all([
          fetch('/api/user/activities?limit=6', {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          }),
          fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          }),
          fetch('/api/guild', {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          }).catch(() => null),
          fetch('/api/crafting/jobs', {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          }).catch(() => null),
          fetch('/api/user/stats?period=summary', {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          }).catch(() => null),
          fetch('/api/news?limit=6').catch(() => null),
        ]);

        if (activitiesRes?.ok) {
          const result = await activitiesRes.json();
          setRecentActivity(result.activities || []);
        }

        if (profileRes?.ok) {
          const result = await profileRes.json();
          setProfile(result.profile);
        }

        if (guildRes?.ok) {
          const result = await guildRes.json();
          setGuildInfo(result.guild);
        }

        if (craftingRes?.ok) {
          const result = await craftingRes.json();
          setCraftingInfo(result);
        }

        if (statsRes?.ok) {
          const result = await statsRes.json();
          setDailyStats(result.summary);
        }

        if (newsRes?.ok) {
          const result = await newsRes.json();
          setGameNews(result.news || []);
        }
      } catch (error) {
        console.error('Error fetching hub data:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeHubData();
    fetchServerMissions();

    // Poll server missions every 30 seconds
    const interval = setInterval(fetchServerMissions, 30000);
    return () => clearInterval(interval);
  }, [fetchServerMissions]);

  // Data transformations
  const displayName = profile?.display || user?.email?.split('@')[0] || 'Trader';
  const activeMissions = missionData?.activeMissions || [];
  const availableAgents = agents.filter(agent => agent._count?.missions === 0);

  // Transform daily stats for HubSummaryStats component
  const summaryStats = [
    {
      label: 'Gold Earned',
      value: `+${dailyStats?.todaysStats?.goldEarned?.toLocaleString() || 0}g`,
      tone: 'good' as const,
      icon: '💰',
    },
    {
      label: 'Missions Done',
      value: dailyStats?.todaysStats?.missionsCompleted || 0,
      tone: 'good' as const,
      icon: '🎯',
    },
    {
      label: 'Items Traded',
      value: dailyStats?.todaysStats?.itemsTraded || 0,
      tone: 'neutral' as const,
      icon: '📦',
    },
    {
      label: 'Gold Spent',
      value: `${dailyStats?.todaysStats?.goldSpent?.toLocaleString() || 0}g`,
      tone: 'warn' as const,
      icon: '💸',
    },
  ];

  // Transform activities
  const activities: ActivityItem[] = (recentActivity || []).map(activity => ({
    icon: getActivityIcon(activity?.type),
    message: activity?.message || 'Unknown activity',
    time: formatTimeAgo(activity?.timestamp),
    value: activity?.reward ? `+${activity.reward}g` : undefined,
    valueType: activity?.reward ? 'gold' : undefined,
  }));

  // Transform warehouse items
  const warehouseItems: WarehouseItem[] = (inventory?.inventory || [])
    .filter(item => item.location === 'warehouse' && item.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6)
    .map(item => ({
      name: item.itemDef?.name || 'Unknown Item',
      quantity: item.quantity,
      demand: getDemandLevel(item.itemDef?.name),
      tier: item.itemDef?.tier || 'Common',
    }));

  // Transform agents
  const agentRoster: Agent[] = (agents || []).map(agent => ({
    name: agent?.name || 'Unknown Agent',
    condition: agent?._count?.missions > 0 ? 'on_mission' : 'ready',
    role: agent?.role || 'Agent',
    focus: agent?.focus || undefined,
  }));

  // Transform news
  const news: NewsItem[] = (gameNews || []).map(item => ({
    title: item?.title || 'News Update',
    timestamp: formatTimeAgo(item?.createdAt),
    readUrl: item?.link || '#',
  }));

  // Transform missions
  const missions: MissionData[] = (activeMissions || []).slice(0, 6).map(mission => ({
    name: mission?.template?.name || 'Unknown Mission',
    risk: (mission?.template?.risk?.toLowerCase() || 'low') as 'low' | 'medium' | 'high',
    agentName: mission?.agent?.name,
    eta: mission?.eta || 'Unknown',
    progress: calculateProgress(mission?.startedAt, mission?.eta),
  }));

  // Sidebar content matching original hub
  const sidebar = (
    <div className="ds">
      <h3 className="ds-heading-4 ds-mb-md">Account Status</h3>
      <div className="ds-stack ds-stack--sm">
        <div className="ds-split">
          <span className="ds-text-sm ds-text-muted">Gold:</span>
          <span className="ds-text-sm ds-text-gold ds-text-bold">{wallet?.gold?.toLocaleString() || 0}g</span>
        </div>
        <div className="ds-split">
          <span className="ds-text-sm ds-text-muted">Agents:</span>
          <span className="ds-text-sm ds-text-good ds-text-bold">{agents.length}/4</span>
        </div>
        <div className="ds-split">
          <span className="ds-text-sm ds-text-muted">Active Missions:</span>
          <span className="ds-text-sm ds-text-warn ds-text-bold">{activeMissions.length}</span>
        </div>
        <div className="ds-split">
          <span className="ds-text-sm ds-text-muted">Crafting Jobs:</span>
          <span className="ds-text-sm ds-text-good ds-text-bold">{craftingInfo?.activeJobs?.length || 0}</span>
        </div>
        {guildInfo && (
          <div className="ds-split">
            <span className="ds-text-sm ds-text-muted">Guild:</span>
            <span className="ds-text-sm ds-text-good ds-text-bold">[{guildInfo.tag}] {guildInfo.name}</span>
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

  if (loading) {
    return (
      <GameLayout title="Trading Hub" sidebar={sidebar}>
        <div className="ds">
          <div className="ds-card ds-text-center ds-py-xl">
            <div className="ds-text-lg ds-text-muted">Loading hub data...</div>
          </div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Trading Hub" sidebar={sidebar}>
      <div className="ds ds-stack ds-stack--md">
        {/* Welcome + Summary (Horizontal) - Matches Original Hub */}
        <div className="ds-card">
          <div className="ds-grid-2 ds-gap-lg">
            <div>
              <h2 className="ds-heading-2 ds-mb-sm">Welcome back, {displayName}!</h2>
              <p className="ds-text-muted">
                Manage your trading empire from the central hub. Check your progress,
                review recent activity, and plan your next moves.
              </p>
            </div>
            <div>
              <HubSummaryStats stats={summaryStats} title="Today's Summary" />
            </div>
          </div>
        </div>

        {/* Activity + Warehouse (Horizontal) */}
        <div className="ds-grid-2 ds-gap-md">
          <ActivityFeed activities={activities.slice(0, 5)} title="Recent Activity" limit={5} />
          <WarehouseSnapshot items={warehouseItems.slice(0, 5)} title="Top Warehouse Items" limit={5} />
        </div>

        {/* Active Missions - Full Width */}
        {missions.length > 0 && (
          <ActiveMissionsGrid missions={missions.slice(0, 3)} title={`Active Missions (${activeMissions.length})`} />
        )}

        {/* Server Events - Full Width */}
        {serverMissions.length > 0 && (
          <div className="ds-card">
            <div className="ds-card__header">
              <h3 className="ds-card__title">🌍 Active Server Events</h3>
              <Link href="/missions" className="ds-btn ds-btn--sm">View All</Link>
            </div>
            <div className="ds-stack ds-stack--md">
              {serverMissions.slice(0, 2).map((mission, index) => (
                <div key={index} className="ds-card--nested">
                  <div className="ds-split ds-mb-xs">
                    <h4 className="ds-heading-4 ds-text-good ds-m-0">{mission.name}</h4>
                    <span className={`ds-pill ${mission.status === 'active' ? 'ds-pill--good' : 'ds-pill--neutral'}`}>
                      {mission.status}
                    </span>
                  </div>
                  {mission.description && (
                    <p className="ds-text-sm ds-text-muted ds-mb-sm">{mission.description}</p>
                  )}
                  {mission.progress !== undefined && (
                    <div>
                      <div className="ds-split ds-mb-xs">
                        <span className="ds-text-sm">Progress: <span className="ds-text-good">{mission.progress}%</span></span>
                        {mission.hoursLeft && (
                          <span className="ds-text-sm ds-text-muted">{mission.hoursLeft}h remaining</span>
                        )}
                      </div>
                      <div className="ds-progress">
                        <div className="ds-progress__fill" style={{ width: `${Math.min(100, mission.progress)}%` }} />
                      </div>
                      {mission.status === 'active' && (
                        <Link
                          href={`/missions?server=${mission.id}`}
                          className="ds-btn ds-btn--primary ds-btn--sm ds-w-full ds-mt-sm"
                        >
                          🎯 Contribute Resources
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* World News - Full Width with Scrollable Container */}
        <NewsFeed news={news} title="📢 Game Updates & News" limit={6} />
      </div>
    </GameLayout>
  );
}

/* ============================================================================
   HELPER FUNCTIONS
   ============================================================================ */

function getActivityIcon(type: string): string {
  const icons: Record<string, string> = {
    mission_completed: '🎯',
    auction_sold: '💰',
    auction_bought: '🛒',
    agent_hired: '👥',
    item_crafted: '⚒️',
    guild_joined: '🏰',
    achievement: '🏆',
  };
  return icons[type] || '📝';
}

function formatTimeAgo(timestamp: Date | string | undefined): string {
  if (!timestamp) return 'Unknown';

  try {
    const now = new Date();
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

    if (isNaN(date.getTime())) return 'Unknown';

    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  } catch {
    return 'Unknown';
  }
}

function getDemandLevel(itemName?: string): 'high' | 'medium' | 'low' {
  // This would normally come from market data
  // For now, return random demand
  const random = Math.random();
  if (random > 0.7) return 'high';
  if (random > 0.3) return 'medium';
  return 'low';
}

function calculateProgress(startedAt: string | Date | undefined, eta: string | undefined): number {
  if (!startedAt || !eta) return 0;

  try {
    const start = new Date(startedAt).getTime();
    const now = new Date().getTime();
    const end = start + parseETA(eta);

    const progress = ((now - start) / (end - start)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  } catch {
    return 0;
  }
}

function parseETA(eta: string): number {
  // Parse "2h 30m" format to milliseconds
  const hours = eta.match(/(\d+)h/);
  const minutes = eta.match(/(\d+)m/);

  let ms = 0;
  if (hours) ms += parseInt(hours[1]) * 3600000;
  if (minutes) ms += parseInt(minutes[1]) * 60000;

  return ms || 3600000; // Default 1 hour
}
