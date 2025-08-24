'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import GameButton from '@/components/ui/GameButton';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  guild: {
    id: string;
    name: string;
    tag: string;
  } | null;
  tier: string | null;
  contribution: any;
  joinedAt: string;
}

interface LeaderboardViewProps {
  missionId: string;
  missionName: string;
}

export default function LeaderboardView({ missionId, missionName }: LeaderboardViewProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userPosition, setUserPosition] = useState<LeaderboardEntry | null>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [filters, setFilters] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeGuildFilter, setActiveGuildFilter] = useState<string>('');
  const [activeTierFilter, setActiveTierFilter] = useState<string>('');

  useEffect(() => {
    fetchLeaderboard();
  }, [missionId, currentPage, activeGuildFilter, activeTierFilter]);

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Authentication required');
        return;
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (activeGuildFilter) params.set('guild', activeGuildFilter);
      if (activeTierFilter) params.set('tier', activeTierFilter);

      const response = await fetch(`/api/server/missions/${missionId}/leaderboard?${params}`, {
        headers: {
          'Cookie': `sb-access-token=${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
      setUserPosition(data.userPosition);
      setStatistics(data.statistics);
      setFilters(data.filters);
      setTotalPages(data.pagination?.totalPages || 1);

    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  const getTierColor = (tier: string | null) => {
    switch (tier) {
      case 'legendary': return 'text-purple-400';
      case 'gold': return 'text-yellow-400';
      case 'silver': return 'text-gray-300';
      case 'bronze': return 'text-orange-400';
      default: return 'text-gray-500';
    }
  };

  const getTierIcon = (tier: string | null) => {
    switch (tier) {
      case 'legendary': return '👑';
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      default: return '⚫';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '⭐';
    return '';
  };

  const handleFilterChange = (filterType: 'guild' | 'tier', value: string) => {
    if (filterType === 'guild') {
      setActiveGuildFilter(value);
    } else {
      setActiveTierFilter(value);
    }
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setActiveGuildFilter('');
    setActiveTierFilter('');
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-300">Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">{error}</p>
        <GameButton onClick={fetchLeaderboard}>Retry</GameButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-800 p-3 rounded text-center">
            <div className="text-2xl font-bold text-yellow-400">{statistics.totalParticipants}</div>
            <div className="text-xs text-gray-400">Total Participants</div>
          </div>
          <div className="bg-gray-800 p-3 rounded text-center">
            <div className="text-2xl font-bold text-purple-400">{statistics.tiers.legendary}</div>
            <div className="text-xs text-gray-400">👑 Legendary</div>
          </div>
          <div className="bg-gray-800 p-3 rounded text-center">
            <div className="text-2xl font-bold text-yellow-400">{statistics.tiers.gold}</div>
            <div className="text-xs text-gray-400">🥇 Gold</div>
          </div>
          <div className="bg-gray-800 p-3 rounded text-center">
            <div className="text-2xl font-bold text-gray-300">{statistics.tiers.silver}</div>
            <div className="text-xs text-gray-400">🥈 Silver</div>
          </div>
          <div className="bg-gray-800 p-3 rounded text-center">
            <div className="text-2xl font-bold text-orange-400">{statistics.tiers.bronze}</div>
            <div className="text-xs text-gray-400">🥉 Bronze</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {filters && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-sm text-gray-300 block mb-1">Filter by Guild</label>
              <select
                value={activeGuildFilter}
                onChange={(e) => handleFilterChange('guild', e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm"
              >
                <option value="">All Guilds</option>
                {filters.availableGuilds?.map((guild: any) => (
                  <option key={guild.id} value={guild.id}>
                    [{guild.tag}] {guild.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm text-gray-300 block mb-1">Filter by Tier</label>
              <select
                value={activeTierFilter}
                onChange={(e) => handleFilterChange('tier', e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm"
              >
                <option value="">All Tiers</option>
                {filters.availableTiers?.map((tier: string) => (
                  <option key={tier} value={tier}>
                    {getTierIcon(tier)} {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {(activeGuildFilter || activeTierFilter) && (
              <div className="mt-auto">
                <GameButton 
                  size="small"
                  variant="secondary"
                  onClick={clearFilters}
                >
                  Clear Filters
                </GameButton>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Position (if not on current page) */}
      {userPosition && !leaderboard.find(entry => entry.userId === userPosition.userId) && (
        <div className="bg-yellow-900 bg-opacity-20 border border-yellow-600 rounded-lg p-4">
          <h4 className="text-yellow-400 font-semibold mb-2">Your Position</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl font-bold text-yellow-400">#{userPosition.rank}</span>
              <div>
                <div className="text-white font-medium">{userPosition.displayName}</div>
                <div className="flex items-center space-x-2 text-sm">
                  {userPosition.guild && (
                    <span className="text-blue-300">
                      [{userPosition.guild.tag}] {userPosition.guild.name}
                    </span>
                  )}
                  {userPosition.tier && (
                    <span className={getTierColor(userPosition.tier)}>
                      {getTierIcon(userPosition.tier)} {userPosition.tier}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-yellow-400">
            {missionName} Leaderboard
          </h3>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No participants found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {leaderboard.map((entry, index) => (
              <div 
                key={entry.userId}
                className={cn(
                  'p-4 flex items-center justify-between transition-colors',
                  entry.rank <= 3 ? 'bg-gradient-to-r from-yellow-900 to-transparent' : 'hover:bg-gray-750'
                )}
              >
                <div className="flex items-center space-x-4">
                  <div className="text-center min-w-[60px]">
                    <div className="text-2xl font-bold text-yellow-400">
                      #{entry.rank}
                    </div>
                    <div className="text-lg">
                      {getRankIcon(entry.rank)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-white">
                      {entry.displayName}
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      {entry.guild && (
                        <span className="text-blue-300">
                          [{entry.guild.tag}] {entry.guild.name}
                        </span>
                      )}
                      <span className="text-gray-400">
                        Joined {new Date(entry.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {entry.tier && (
                    <div className={cn('flex items-center space-x-1', getTierColor(entry.tier))}>
                      <span className="text-lg">{getTierIcon(entry.tier)}</span>
                      <span className="font-bold capitalize">{entry.tier}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <GameButton
            size="small"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </GameButton>
          
          <span className="flex items-center px-4 text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          
          <GameButton
            size="small"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </GameButton>
        </div>
      )}
    </div>
  );
}