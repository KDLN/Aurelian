'use client';

import GamePanel from '@/components/ui/GamePanel';

interface ParticipantAnalyticsProps {
  analytics: any;
  missions: any[];
}

export default function ParticipantAnalytics({ analytics, missions }: ParticipantAnalyticsProps) {
  return (
    <GamePanel>
      <div className="p-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-6">Server Mission Analytics</h2>
        
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-yellow-400">{analytics.overview?.totalMissions || 0}</div>
            <div className="text-sm text-gray-400">Total Missions</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-green-400">{analytics.overview?.activeMissions || 0}</div>
            <div className="text-sm text-gray-400">Active Missions</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-blue-400">{analytics.participation?.uniqueParticipants || 0}</div>
            <div className="text-sm text-gray-400">Unique Participants</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-purple-400">{Math.round(analytics.overview?.successRate || 0)}%</div>
            <div className="text-sm text-gray-400">Success Rate</div>
          </div>
        </div>

        {/* Mission Type Distribution */}
        {analytics.distribution?.byType && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-yellow-400 mb-4">Mission Types</h3>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(analytics.distribution.byType).map(([type, count]) => (
                  <div key={type} className="text-center">
                    <div className="text-xl font-bold text-white">{count as number}</div>
                    <div className="text-sm text-gray-400 capitalize">{type.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top Guilds */}
        {analytics.topGuilds && analytics.topGuilds.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-yellow-400 mb-4">Most Active Guilds</h3>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="space-y-3">
                {analytics.topGuilds.map((guildStat: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-700 rounded">
                    <div>
                      <span className="font-medium text-white">
                        [{guildStat.guild?.tag}] {guildStat.guild?.name}
                      </span>
                      <span className="text-sm text-gray-400 ml-2">
                        Level {guildStat.guild?.level}
                      </span>
                    </div>
                    <div className="text-yellow-400 font-bold">
                      {guildStat.participationCount} participations
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {analytics.recentActivity && analytics.recentActivity.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-yellow-400 mb-4">Recent Mission Activity</h3>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="space-y-3">
                {analytics.recentActivity.map((mission: any) => (
                  <div key={mission.id} className="flex justify-between items-center p-3 bg-gray-700 rounded">
                    <div>
                      <div className="font-medium text-white">{mission.name}</div>
                      <div className="text-sm text-gray-400 capitalize">
                        {mission.type.replace('_', ' ')} • {mission.status}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-400">
                      <div>{mission.participantCount} participants</div>
                      <div>
                        {mission.completedAt 
                          ? `Completed ${new Date(mission.completedAt).toLocaleDateString()}`
                          : `Created ${new Date(mission.createdAt).toLocaleDateString()}`
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Economic Impact */}
        {analytics.economicImpact && (
          <div>
            <h3 className="text-lg font-semibold text-yellow-400 mb-4">Economic Impact (Last 7 Days)</h3>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {analytics.economicImpact.goldDistributed?.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-gray-400">Gold Distributed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {analytics.economicImpact.rewardTransactions || 0}
                  </div>
                  <div className="text-sm text-gray-400">Reward Transactions</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </GamePanel>
  );
}