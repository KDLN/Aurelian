'use client';

import { useState, useEffect } from 'react';
import { useGuild } from '@/hooks/useGuild';
import AllianceDirectory from '@/components/AllianceDirectory';

// Simple placeholder components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-32">
    <div className="text-[#f1e5c8]">Loading...</div>
  </div>
);

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-[#2d1810] border border-[#8b6f31] rounded-lg p-6">
    {children}
  </div>
);

const TreasurySection = () => (
  <div className="bg-[#1a1008] border border-[#8b6f31] rounded-lg p-6">
    <div className="text-[#f1e5c8]">Treasury management coming soon...</div>
  </div>
);

export function GuildPanel() {
  const { guild, isLoading, error, isInGuild } = useGuild();
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'alliances' | 'treasury' | 'warehouse'>('overview');

  if (isLoading) {
    return (
      <div className="bg-[#2d1810] border border-[#8b6f31] rounded-lg p-6">
        <LoadingSpinner message="Loading guild information..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#2d1810] border border-red-600 rounded-lg p-6">
        <div className="text-red-400 text-center">
          <div className="font-bold mb-2">Error</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  if (!isInGuild || !guild) {
    return (
      <div className="bg-[#2d1810] border border-[#8b6f31] rounded-lg p-6">
        <div className="text-center text-[#f1e5c8]">
          <div className="text-xl font-bold mb-4">Not in a Guild</div>
          <div className="text-gray-300 mb-6">
            Join or create a guild to access alliance features, shared resources, and collaborative opportunities.
          </div>
          <button className="px-6 py-2 bg-[#d4af37] hover:bg-[#b8941f] text-[#1a1008] font-medium rounded transition-colors">
            Browse Guilds
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="bg-[#2d1810] border border-[#8b6f31] rounded-lg">
        {/* Guild Header */}
        <div className="border-b border-[#8b6f31] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-[#f1e5c8]">{guild.name}</h1>
                <div className="flex items-center space-x-4 text-sm text-[#d4af37]">
                  <span>[{guild.tag}]</span>
                  <span>Level {guild.level}</span>
                  <span>{guild.memberCount}/{guild.maxMembers} members</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    guild.userRole === 'LEADER' ? 'bg-purple-600' :
                    guild.userRole === 'OFFICER' ? 'bg-blue-600' :
                    guild.userRole === 'TRADER' ? 'bg-green-600' : 'bg-gray-600'
                  } text-white`}>
                    {guild.userRole}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-right">
              <div>
                <div className="text-xs text-[#d4af37] uppercase tracking-wider">Treasury</div>
                <div className="text-lg font-bold text-[#f1e5c8]">{guild.treasury.toLocaleString()}g</div>
              </div>
              <div>
                <div className="text-xs text-[#d4af37] uppercase tracking-wider">XP Progress</div>
                <div className="text-sm text-[#f1e5c8]">{guild.xp}/{guild.xpNext} ({guild.xpProgress}%)</div>
                <div className="w-24 h-2 bg-[#1a1008] border border-[#8b6f31] rounded overflow-hidden">
                  <div 
                    className="h-full bg-[#d4af37] transition-all duration-300"
                    style={{ width: `${guild.xpProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-[#8b6f31] px-6">
          <div className="flex space-x-1">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'alliances', label: 'Alliances', badge: 0 },
              { key: 'treasury', label: 'Treasury' },
              { key: 'members', label: 'Members' },
              { key: 'warehouse', label: 'Warehouse' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors relative ${
                  activeTab === tab.key
                    ? 'border-[#d4af37] text-[#d4af37]'
                    : 'border-transparent text-[#f1e5c8] hover:text-[#d4af37]'
                }`}
              >
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <GuildOverviewTab guild={guild} />
          )}
          
          {activeTab === 'alliances' && (
            <div>
              <AllianceDirectory />
            </div>
          )}
          
          {activeTab === 'treasury' && (
            <TreasurySection />
          )}
          
          {activeTab === 'members' && (
            <GuildMembersTab guild={guild} />
          )}
          
          {activeTab === 'warehouse' && (
            <GuildWarehouseTab guild={guild} />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

// Guild Overview Tab Component
function GuildOverviewTab({ guild }: { guild: any }) {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1008] p-4 rounded border border-[#8b6f31] text-center">
          <div className="text-xs text-[#d4af37] uppercase tracking-wider">Level</div>
          <div className="text-2xl font-bold text-[#f1e5c8]">{guild.level}</div>
        </div>
        <div className="bg-[#1a1008] p-4 rounded border border-[#8b6f31] text-center">
          <div className="text-xs text-[#d4af37] uppercase tracking-wider">Members</div>
          <div className="text-2xl font-bold text-[#f1e5c8]">{guild.memberCount}</div>
        </div>
        <div className="bg-[#1a1008] p-4 rounded border border-[#8b6f31] text-center">
          <div className="text-xs text-[#d4af37] uppercase tracking-wider">Treasury</div>
          <div className="text-xl font-bold text-[#f1e5c8]">{guild.treasury.toLocaleString()}g</div>
        </div>
        <div className="bg-[#1a1008] p-4 rounded border border-[#8b6f31] text-center">
          <div className="text-xs text-[#d4af37] uppercase tracking-wider">Alliances</div>
          <div className="text-2xl font-bold text-green-400">{guild.recentAlliances?.length || 0}</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#1a1008] border border-[#8b6f31] rounded-lg p-4">
        <h3 className="text-lg font-bold text-[#f1e5c8] mb-4">Recent Activity</h3>
        <div className="space-y-2">
          {guild.recentActivity?.slice(0, 5).map((activity: any, index: number) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <span className="text-[#f1e5c8]">{activity.action}</span>
              <span className="text-gray-400">{new Date(activity.createdAt).toLocaleDateString()}</span>
            </div>
          )) || (
            <div className="text-gray-400 text-center py-4">No recent activity</div>
          )}
        </div>
      </div>

      {/* Guild Description */}
      {guild.description && (
        <div className="bg-[#1a1008] border border-[#8b6f31] rounded-lg p-4">
          <h3 className="text-lg font-bold text-[#f1e5c8] mb-2">Description</h3>
          <p className="text-[#f1e5c8]">{guild.description}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        {['LEADER', 'OFFICER'].includes(guild.userRole) && (
          <button className="px-4 py-2 bg-[#d4af37] hover:bg-[#b8941f] text-[#1a1008] font-medium rounded transition-colors">
            Manage Guild
          </button>
        )}
        <button className="px-4 py-2 bg-[#8b6f31] hover:bg-[#a67c40] text-[#f1e5c8] rounded transition-colors">
          View Leaderboard
        </button>
        <button className="px-4 py-2 bg-[#8b6f31] hover:bg-[#a67c40] text-[#f1e5c8] rounded transition-colors">
          Guild Wars
        </button>
      </div>
    </div>
  );
}

// Placeholder components for other tabs
function GuildMembersTab({ guild }: { guild: any }) {
  return (
    <div className="text-center text-[#f1e5c8] py-8">
      <div className="text-lg font-bold mb-2">Members</div>
      <div>Guild member management coming soon...</div>
    </div>
  );
}

function GuildWarehouseTab({ guild }: { guild: any }) {
  return (
    <div className="text-center text-[#f1e5c8] py-8">
      <div className="text-lg font-bold mb-2">Warehouse</div>
      <div>Guild warehouse management coming soon...</div>
    </div>
  );
}

export default GuildPanel;