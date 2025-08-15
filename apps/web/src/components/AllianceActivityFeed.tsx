'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AllianceActivity } from '@/types/guild';

interface AllianceActivityFeedProps {
  className?: string;
  maxItems?: number;
  showFilters?: boolean;
  autoRefresh?: boolean;
}

export function AllianceActivityFeed({ 
  className = '', 
  maxItems = 20,
  showFilters = true,
  autoRefresh = true
}: AllianceActivityFeedProps) {
  const [activities, setActivities] = useState<AllianceActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'alliances' | 'missions' | 'benefits'>('all');

  useEffect(() => {
    fetchAllianceActivity();
    
    if (autoRefresh) {
      const interval = setInterval(fetchAllianceActivity, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchAllianceActivity = async () => {
    try {
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setActivities([]);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/guild/alliance/list', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.recentActivity) {
          setActivities(result.data.recentActivity);
        }
      }
    } catch (err) {
      console.error('Error loading alliance activity:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (action: string) => {
    if (action.includes('alliance_proposed')) return '🤝';
    if (action.includes('alliance_accepted')) return '✅';
    if (action.includes('alliance_declined')) return '❌';
    if (action.includes('alliance_broken')) return '💔';
    if (action.includes('travel_benefit')) return '🚗';
    if (action.includes('auction_benefit')) return '💰';
    if (action.includes('mission')) return '⚔️';
    if (action.includes('chat')) return '💬';
    return '📋';
  };

  const getActivityColor = (action: string) => {
    if (action.includes('accepted') || action.includes('benefit')) return 'text-green-400';
    if (action.includes('declined') || action.includes('broken')) return 'text-red-400';
    if (action.includes('proposed') || action.includes('pending')) return 'text-yellow-400';
    return 'text-[#f1e5c8]';
  };

  const formatActionText = (action: string, details: any) => {
    const actionMap: Record<string, string> = {
      'alliance_proposed': 'proposed an alliance with',
      'alliance_accepted': 'accepted alliance from',
      'alliance_declined': 'declined alliance from',
      'alliance_broken': 'broke alliance with',
      'alliance_travel_benefit_used': 'used travel tax discount via alliance with',
      'alliance_auction_benefit_used': 'used auction fee discount via alliance with',
      'alliance_chat_message': 'sent message in alliance chat',
      'alliance_mission_joined': 'joined alliance mission',
      'alliance_mission_completed': 'completed alliance mission'
    };

    const baseText = actionMap[action] || action.replace(/_/g, ' ');
    
    if (details?.targetGuildName) {
      return `${baseText} ${details.targetGuildName} [${details.targetGuildTag || ''}]`;
    }
    if (details?.otherGuildName) {
      return `${baseText} ${details.otherGuildName} [${details.otherGuildTag || ''}]`;
    }
    if (details?.fromGuildName) {
      return `${baseText} ${details.fromGuildName} [${details.fromGuildTag || ''}]`;
    }
    
    return baseText;
  };

  const getFilteredActivities = () => {
    let filtered = activities;
    
    if (filter !== 'all') {
      filtered = activities.filter(activity => {
        switch (filter) {
          case 'alliances':
            return activity.action.includes('alliance_') && 
                   !activity.action.includes('benefit') && 
                   !activity.action.includes('chat');
          case 'missions':
            return activity.action.includes('mission');
          case 'benefits':
            return activity.action.includes('benefit');
          default:
            return true;
        }
      });
    }
    
    return filtered.slice(0, maxItems);
  };

  if (isLoading) {
    return (
      <div className={`bg-[#2d1810] border border-[#8b6f31] rounded-lg p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[#1a1008] rounded w-3/4"></div>
          <div className="h-4 bg-[#1a1008] rounded w-1/2"></div>
          <div className="h-4 bg-[#1a1008] rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  const filteredActivities = getFilteredActivities();

  return (
    <div className={`bg-[#2d1810] border border-[#8b6f31] rounded-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-[#8b6f31] p-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-[#f1e5c8]">Alliance Activity</h3>
          <button
            onClick={fetchAllianceActivity}
            className="text-[#d4af37] hover:text-[#b8941f] text-sm transition-colors"
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        
        {/* Filters */}
        {showFilters && (
          <div className="flex space-x-2 mt-3">
            {[
              { key: 'all', label: 'All' },
              { key: 'alliances', label: 'Alliances' },
              { key: 'benefits', label: 'Benefits' },
              { key: 'missions', label: 'Missions' }
            ].map(filterOption => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as any)}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  filter === filterOption.key
                    ? 'bg-[#d4af37] text-[#1a1008] font-medium'
                    : 'bg-[#1a1008] text-[#f1e5c8] hover:bg-[#8b6f31]'
                }`}
              >
                {filterOption.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="text-red-400 text-center text-sm mb-4">
            {error}
          </div>
        )}

        {filteredActivities.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <div className="text-4xl mb-2">🤝</div>
            <div className="text-sm">No alliance activity yet</div>
            <div className="text-xs mt-1">
              Alliance actions will appear here once your guild forms alliances
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 bg-[#1a1008] border border-[#8b6f31] rounded-lg hover:border-[#d4af37] transition-colors"
              >
                <div className="text-lg flex-shrink-0">
                  {getActivityIcon(activity.action)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm ${getActivityColor(activity.action)}`}>
                    {activity.user} {formatActionText(activity.action, activity.details)}
                  </div>
                  
                  {/* Additional details */}
                  {activity.details?.allianceDiscount && (
                    <div className="text-xs text-green-400 mt-1">
                      Saved {activity.details.allianceDiscount} gold ({activity.details.discountPercent}% discount)
                    </div>
                  )}
                  
                  {activity.details?.message && (
                    <div className="text-xs text-gray-400 mt-1 italic">
                      "{activity.details.message}"
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(activity.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activities.length > maxItems && (
          <div className="text-center mt-4">
            <button className="text-[#d4af37] hover:text-[#b8941f] text-sm transition-colors">
              View All Activity ({activities.length} total)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AllianceActivityFeed;