'use client';

import { useEffect, useState } from 'react';
import ResponsiveGameLayout from '@/components/ResponsiveGameLayout';
import MobileCard from '@/components/ui/MobileCard';
import { MobileListItem, MobileDataRow } from '@/components/ui/MobileTable';
import { useUserDataQuery } from '@/hooks/useUserDataQuery';
import { useAgents } from '@/hooks/useAgents';
import { useMissions } from '@/hooks/useMissionsQuery';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RecentActivity {
  id: string;
  type: 'mission_completed' | 'auction_sold' | 'agent_hired' | 'item_crafted';
  message: string;
  timestamp: Date;
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

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

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
    if (priority === 'urgent') return 'destructive';
    if (priority === 'high') return 'default';
    switch (category) {
      case 'update': return 'secondary';
      case 'event': return 'default';
      case 'maintenance': return 'destructive';
      case 'market': return 'outline';
      default: return 'secondary';
    }
  };

  const sidebar = (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-sm mb-2">Account Status</h3>
        <div className="space-y-2 text-sm">
          <MobileDataRow label="Gold" value={`${wallet?.gold?.toLocaleString() || 0}g`} />
          <MobileDataRow label="Agents" value={`${agents.length}/4`} />
          <MobileDataRow label="Active Missions" value={activeMissions.length} />
          <MobileDataRow label="Crafting Jobs" value={craftingInfo?.activeJobs?.length || 0} />
          {guildInfo && (
            <MobileDataRow label="Guild" value={`[${guildInfo.tag}] ${guildInfo.name}`} />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Link href="/profile" className="block">
          <Button variant="outline" className="w-full justify-start">
            👤 Profile
          </Button>
        </Link>
        {guildInfo ? (
          <Link href="/guild" className="block">
            <Button variant="outline" className="w-full justify-start">
              🏰 {guildInfo.tag}
            </Button>
          </Link>
        ) : (
          <Link href="/guild" className="block">
            <Button variant="outline" className="w-full justify-start">
              🏰 Join Guild
            </Button>
          </Link>
        )}
        <Link href="/crafting" className="block">
          <Button variant="outline" className="w-full justify-start">
            ⚒️ Crafting {craftingInfo?.activeJobs?.length > 0 ? `(${craftingInfo.activeJobs.length})` : ''}
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <ResponsiveGameLayout 
      title="Trading Hub" 
      characterActivity="planning" 
      characterLocation="Trading Hub"
      sidebar={sidebar}
    >
      <div className="space-y-4">
        {/* Welcome Card */}
        <MobileCard title={`Welcome back, ${profile?.display || user?.email?.split('@')[0] || 'Trader'}!`}>
          <p className="text-sm text-[#c7b38a] mb-4">
            Manage your trading empire from the central hub. Check your progress, 
            review recent activity, and plan your next moves.
          </p>
          
          {/* Today's Summary */}
          <div className="bg-[#1a1511] border border-[#533b2c] rounded p-3 space-y-2">
            <h4 className="font-bold text-sm mb-2">Today's Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <MobileDataRow label="Gold Earned" value={`+${dailyStats?.todaysStats?.goldEarned || 0}g`} />
              <MobileDataRow label="Missions Done" value={dailyStats?.todaysStats?.missionsCompleted || 0} />
              <MobileDataRow label="Items Traded" value={dailyStats?.todaysStats?.itemsTraded || 0} />
              <MobileDataRow label="Items Crafted" value={dailyStats?.todaysStats?.itemsCrafted || 0} />
              <MobileDataRow label="Net Gold" value={`${dailyStats?.performance?.netGoldWeek >= 0 ? '+' : ''}${dailyStats?.performance?.netGoldWeek || 0}g`} />
              <MobileDataRow label="Success Rate" value={`${dailyStats?.performance?.missionSuccessRate || 0}%`} />
            </div>
          </div>
        </MobileCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recent Activity */}
          <MobileCard title="Recent Activity" collapsible={true} defaultOpen={true}>
            {recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-start justify-between gap-2 py-2 border-b border-[#533b2c] last:border-0">
                    <div className="flex-1">
                      <div className="text-sm">
                        <span className="mr-2">{getActivityIcon(activity.type)}</span>
                        {activity.message}
                      </div>
                      <div className="text-xs text-[#c7b38a] mt-1">
                        {formatTimeAgo(activity.timestamp)}
                      </div>
                    </div>
                    {activity.reward && (
                      <Badge variant="secondary" className="text-xs">
                        +{activity.reward}g
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#c7b38a]">No recent activity</p>
            )}
          </MobileCard>

          {/* Top Warehouse Items */}
          <MobileCard title="Top Warehouse Items" collapsible={true} defaultOpen={true}>
            {warehouseItems.length > 0 ? (
              <div className="space-y-2">
                {warehouseItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-1">
                    <span className="text-sm">{item.itemName || item.itemKey.replace(/_/g, ' ')}</span>
                    <Badge variant="secondary">{item.quantity}</Badge>
                  </div>
                ))}
                <Link href="/warehouse" className="block mt-3">
                  <Button size="sm" variant="outline" className="w-full">
                    View All Items
                  </Button>
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[#c7b38a] mb-3">No items in warehouse</p>
                <Link href="/market" className="block">
                  <Button size="sm" className="w-full">
                    Browse Market
                  </Button>
                </Link>
              </div>
            )}
          </MobileCard>
        </div>

        {/* Active Missions */}
        {activeMissions.length > 0 && (
          <MobileCard 
            title={`Active Missions (${activeMissions.length})`} 
            collapsible={true} 
            defaultOpen={false}
          >
            <div className="space-y-2">
              {activeMissions.slice(0, 3).map(mission => (
                <MobileListItem
                  key={mission.id}
                  title={mission.mission?.name || 'Unknown Mission'}
                  subtitle={`Agent: ${agents.find(a => a.id === mission.agentId)?.name || 'Unknown'}`}
                  badges={[
                    { 
                      label: mission.mission?.riskLevel || 'UNKNOWN',
                      variant: mission.mission?.riskLevel === 'LOW' ? 'secondary' : 
                               mission.mission?.riskLevel === 'MEDIUM' ? 'default' : 'destructive'
                    }
                  ]}
                />
              ))}
              {activeMissions.length > 3 && (
                <Link href="/missions" className="block mt-3">
                  <Button size="sm" variant="outline" className="w-full">
                    View All Missions ({activeMissions.length})
                  </Button>
                </Link>
              )}
            </div>
          </MobileCard>
        )}

        {/* Game News/Updates */}
        <MobileCard 
          title="📢 Game Updates & News" 
          collapsible={true} 
          defaultOpen={false}
          actions={
            <Link href="/admin/news">
              <Button size="sm" variant="ghost">
                ⚙️
              </Button>
            </Link>
          }
        >
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {gameNews.length > 0 ? (
              gameNews.map(news => (
                <div key={news.id} className="bg-[#1a1511] border border-[#533b2c] rounded p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-sm">
                      {getCategoryIcon(news.category)} {news.title}
                    </h4>
                    {news.isPinned && <Badge variant="outline" className="text-xs">📌</Badge>}
                  </div>
                  <p className="text-xs text-[#c7b38a] mb-2">{news.content}</p>
                  <div className="text-xs text-[#9b8c70]">
                    By {news.author.name} • {new Date(news.publishedAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-[#c7b38a] mb-3">No news available</p>
                <Link href="/admin/news">
                  <Button size="sm" variant="outline">
                    Create First News Item
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </MobileCard>
      </div>
    </ResponsiveGameLayout>
  );
}