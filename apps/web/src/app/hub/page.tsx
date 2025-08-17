'use client';

import { useEffect, useState } from 'react';
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
      ];

      try {
        const [activitiesRes, profileRes, guildRes, craftingRes] = await Promise.all(fetchPromises);

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
      characterActivity="planning" 
      characterLocation="Trading Hub"
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
                  <span>Gold:</span>
                  <span className="game-good">{wallet?.gold?.toLocaleString() || 0}g</span>
                </div>
                <div className="game-space-between">
                  <span>Available Agents:</span>
                  <span className="game-good">{availableAgents.length}</span>
                </div>
                <div className="game-space-between">
                  <span>Active Missions:</span>
                  <span className={activeMissions.length > 0 ? 'game-warn' : 'game-good'}>
                    {activeMissions.length}
                  </span>
                </div>
                <div className="game-space-between">
                  <span>Warehouse Items:</span>
                  <span className="game-good">{warehouseItems.length}</span>
                </div>
                <div className="game-space-between">
                  <span>Crafting Jobs:</span>
                  <span className={craftingInfo?.activeJobs?.length > 0 ? 'game-warn' : 'game-good'}>
                    {craftingInfo?.activeJobs?.length || 0}
                  </span>
                </div>
                {guildInfo && (
                  <div className="game-space-between">
                    <span>Guild:</span>
                    <span className="game-good">[{guildInfo.tag}]</span>
                  </div>
                )}
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
                    Agent: {agents.find(a => a.id === mission.agentId)?.name || 'Unknown'}
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

        {/* Game News/Updates */}
        <div className="game-card">
          <h3>📢 Game Updates & News</h3>
          <div 
            className="game-flex-col" 
            style={{ 
              maxHeight: '300px', 
              overflow: 'auto',
              paddingRight: '4px'
            }}
          >
            <div className="game-card-nested">
              <h4 className="game-good">✨ New Feature: Guild System</h4>
              <p>
                Join or create guilds to collaborate with other traders. Share resources, 
                coordinate missions, and compete in guild challenges!
              </p>
              <Link href="/guild" className="game-btn game-btn-small">Explore Guilds</Link>
            </div>
            
            <div className="game-card-nested">
              <h4 className="game-warn">⚡ Market Volatility Alert</h4>
              <p>
                Increased demand for Iron Ore and Herbs in northern cities. 
                Consider redirecting caravans for higher profits.
              </p>
              <Link href="/market" className="game-btn game-btn-small">Check Prices</Link>
            </div>

            <div className="game-card-nested">
              <h4>🔧 System Improvements</h4>
              <p>
                Recent updates include improved UI scaling for high-resolution displays, 
                better inventory management, and enhanced mission tracking.
              </p>
            </div>

            <div className="game-card-nested">
              <h4 className="game-good">🎉 Celebration Event</h4>
              <p>
                Special rewards for completing missions during the harvest festival! 
                Double experience and bonus gold until the end of the month.
              </p>
            </div>

            <div className="game-card-nested">
              <h4>📊 Economy Report</h4>
              <p>
                Trading volume has increased 25% this quarter. Popular trade routes 
                include Beacon to Ironclad and Pearl Harbor to Silk Road settlements.
              </p>
            </div>

            <div className="game-card-nested">
              <h4 className="game-warn">🚧 Maintenance Notice</h4>
              <p>
                Server maintenance scheduled for tomorrow at 3 AM UTC. Expected downtime: 30 minutes.
                All progress will be saved automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}