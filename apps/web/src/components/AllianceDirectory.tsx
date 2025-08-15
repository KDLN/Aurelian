'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  AllianceManagement, 
  GuildAlliance, 
  AllianceProposal,
  AllianceStats,
  AllianceActivity
} from '@/types/guild';
import AllianceMissions from '@/components/AllianceMissions';

interface AllianceDirectoryProps {
  className?: string;
}

export default function AllianceDirectory({ className = '' }: AllianceDirectoryProps) {
  const [allianceData, setAllianceData] = useState<AllianceManagement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'missions' | 'activity'>('active');
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalForm, setProposalForm] = useState<AllianceProposal>({
    targetGuildId: '',
    type: 'ALLIANCE',
    message: ''
  });

  useEffect(() => {
    fetchAllianceData();
  }, []);

  const fetchAllianceData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/guild/alliance/list', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch alliances: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setAllianceData(result.data);
      }
    } catch (err) {
      console.error('Error loading alliance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load alliance data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProposeAlliance = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/guild/alliance/propose', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(proposalForm)
      });

      if (response.ok) {
        setShowProposalForm(false);
        setProposalForm({ targetGuildId: '', type: 'ALLIANCE', message: '' });
        await fetchAllianceData(); // Refresh data
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to propose alliance');
      }
    } catch (err) {
      console.error('Error proposing alliance:', err);
      setError('Failed to propose alliance');
    }
  };

  const handleRespondToAlliance = async (allianceId: string, action: 'ACCEPT' | 'DECLINE') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/guild/alliance/respond', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ allianceId, action })
      });

      if (response.ok) {
        await fetchAllianceData(); // Refresh data
      } else {
        const error = await response.json();
        setError(error.error || `Failed to ${action.toLowerCase()} alliance`);
      }
    } catch (err) {
      console.error(`Error ${action.toLowerCase()}ing alliance:`, err);
      setError(`Failed to ${action.toLowerCase()} alliance`);
    }
  };

  const handleBreakAlliance = async (allianceId: string) => {
    if (!confirm('Are you sure you want to break this alliance? This action cannot be undone.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/guild/alliance/break', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ allianceId, reason: 'Broken via Alliance Directory' })
      });

      if (response.ok) {
        await fetchAllianceData(); // Refresh data
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to break alliance');
      }
    } catch (err) {
      console.error('Error breaking alliance:', err);
      setError('Failed to break alliance');
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-[#2d1810] border border-[#8b6f31] rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="text-[#f1e5c8]">Loading alliance data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-[#2d1810] border border-red-600 rounded-lg p-6 ${className}`}>
        <div className="text-red-400 text-center">
          <div className="font-bold mb-2">Error</div>
          <div>{error}</div>
          <button 
            onClick={fetchAllianceData}
            className="mt-4 px-4 py-2 bg-[#8b6f31] hover:bg-[#a67c40] text-[#f1e5c8] rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!allianceData) {
    return (
      <div className={`bg-[#2d1810] border border-[#8b6f31] rounded-lg p-6 ${className}`}>
        <div className="text-[#f1e5c8] text-center">No alliance data available</div>
      </div>
    );
  }

  return (
    <div className={`bg-[#2d1810] border border-[#8b6f31] rounded-lg ${className}`}>
      {/* Header with Stats */}
      <div className="border-b border-[#8b6f31] p-6">
        <h2 className="text-2xl font-bold text-[#f1e5c8] mb-4">Alliance Directory</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1a1008] p-3 rounded border border-[#8b6f31]">
            <div className="text-xs text-[#d4af37] uppercase tracking-wider">Active</div>
            <div className="text-lg font-bold text-[#f1e5c8]">{allianceData.stats.totalActive}</div>
          </div>
          <div className="bg-[#1a1008] p-3 rounded border border-[#8b6f31]">
            <div className="text-xs text-[#d4af37] uppercase tracking-wider">Alliances</div>
            <div className="text-lg font-bold text-green-400">{allianceData.stats.totalAlliances}</div>
          </div>
          <div className="bg-[#1a1008] p-3 rounded border border-[#8b6f31]">
            <div className="text-xs text-[#d4af37] uppercase tracking-wider">Rivalries</div>
            <div className="text-lg font-bold text-red-400">{allianceData.stats.totalRivalries}</div>
          </div>
          <div className="bg-[#1a1008] p-3 rounded border border-[#8b6f31]">
            <div className="text-xs text-[#d4af37] uppercase tracking-wider">Pending</div>
            <div className="text-lg font-bold text-yellow-400">
              {allianceData.stats.pendingIncoming + allianceData.stats.pendingOutgoing}
            </div>
          </div>
        </div>

        {/* Benefits Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#1a1008] p-3 rounded border border-[#8b6f31]">
            <div className="text-xs text-[#d4af37] uppercase tracking-wider">Travel Benefits</div>
            <div className="text-sm text-[#f1e5c8]">
              Avg. {allianceData.stats.averageTravelBenefit}% tax reduction
            </div>
          </div>
          <div className="bg-[#1a1008] p-3 rounded border border-[#8b6f31]">
            <div className="text-xs text-[#d4af37] uppercase tracking-wider">Auction Benefits</div>
            <div className="text-sm text-[#f1e5c8]">
              Avg. {allianceData.stats.averageAuctionBenefit}% fee reduction
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-[#8b6f31] px-6">
        <div className="flex space-x-1">
          {[
            { key: 'active', label: 'Active Alliances' },
            { key: 'pending', label: 'Pending' },
            { key: 'missions', label: 'Joint Missions' },
            { key: 'activity', label: 'Recent Activity' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#d4af37] text-[#d4af37]'
                  : 'border-transparent text-[#f1e5c8] hover:text-[#d4af37]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {/* Action Buttons */}
        {allianceData.userGuild.canManageAlliances && (
          <div className="mb-6">
            <button
              onClick={() => setShowProposalForm(true)}
              className="px-4 py-2 bg-[#d4af37] hover:bg-[#b8941f] text-[#1a1008] font-medium rounded transition-colors"
            >
              Propose Alliance
            </button>
          </div>
        )}

        {/* Proposal Form Modal */}
        {showProposalForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#2d1810] border border-[#8b6f31] rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-[#f1e5c8] mb-4">Propose Alliance</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#d4af37] mb-2">Target Guild ID</label>
                  <input
                    type="text"
                    value={proposalForm.targetGuildId}
                    onChange={(e) => setProposalForm({...proposalForm, targetGuildId: e.target.value})}
                    className="w-full p-2 bg-[#1a1008] border border-[#8b6f31] rounded text-[#f1e5c8]"
                    placeholder="Guild ID to propose alliance to"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-[#d4af37] mb-2">Type</label>
                  <select
                    value={proposalForm.type}
                    onChange={(e) => setProposalForm({...proposalForm, type: e.target.value as 'ALLIANCE' | 'RIVALRY'})}
                    className="w-full p-2 bg-[#1a1008] border border-[#8b6f31] rounded text-[#f1e5c8]"
                  >
                    <option value="ALLIANCE">Alliance</option>
                    <option value="RIVALRY">Rivalry</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-[#d4af37] mb-2">Message (Optional)</label>
                  <textarea
                    value={proposalForm.message}
                    onChange={(e) => setProposalForm({...proposalForm, message: e.target.value})}
                    className="w-full p-2 bg-[#1a1008] border border-[#8b6f31] rounded text-[#f1e5c8] h-20 resize-none"
                    placeholder="Optional message to include with proposal"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowProposalForm(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProposeAlliance}
                  disabled={!proposalForm.targetGuildId}
                  className="px-4 py-2 bg-[#d4af37] hover:bg-[#b8941f] text-[#1a1008] font-medium rounded transition-colors disabled:opacity-50"
                >
                  Propose
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Alliances Tab */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {allianceData.alliances.active.length === 0 ? (
              <div className="text-center text-[#f1e5c8] py-8">
                No active alliances. Consider proposing alliances for strategic benefits!
              </div>
            ) : (
              allianceData.alliances.active.map(alliance => (
                <div key={alliance.id} className="bg-[#1a1008] border border-[#8b6f31] rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          alliance.type === 'ALLIANCE' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {alliance.type}
                        </span>
                        <span className="text-lg font-bold text-[#f1e5c8]">
                          {alliance.otherGuild.name} [{alliance.otherGuild.tag}]
                        </span>
                        <span className="text-sm text-[#d4af37]">
                          Level {alliance.otherGuild.level} • {alliance.otherGuild.memberCount} members
                        </span>
                      </div>
                      
                      {alliance.benefits && (
                        <div className="grid grid-cols-2 gap-4 text-sm text-[#f1e5c8] mb-2">
                          <div>Travel Tax: -{alliance.benefits.travelTaxReduction}%</div>
                          <div>Auction Fees: -{alliance.benefits.auctionFeeReduction}%</div>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-400">
                        Allied since {new Date(alliance.acceptedAt!).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {allianceData.userGuild.canBreakAlliances && (
                      <button
                        onClick={() => handleBreakAlliance(alliance.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                      >
                        Break Alliance
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pending Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            {/* Incoming Proposals */}
            {allianceData.alliances.pending.incoming.length > 0 && (
              <div>
                <h4 className="text-lg font-bold text-[#f1e5c8] mb-3">Incoming Proposals</h4>
                <div className="space-y-3">
                  {allianceData.alliances.pending.incoming.map(alliance => (
                    <div key={alliance.id} className="bg-[#1a1008] border border-yellow-600 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              alliance.type === 'ALLIANCE' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                            }`}>
                              {alliance.type}
                            </span>
                            <span className="text-lg font-bold text-[#f1e5c8]">
                              {alliance.otherGuild.name} [{alliance.otherGuild.tag}]
                            </span>
                          </div>
                          
                          {alliance.proposalMessage && (
                            <div className="text-sm text-[#f1e5c8] mb-2 italic">
                              "{alliance.proposalMessage}"
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-400">
                            Proposed {new Date(alliance.proposedAt).toLocaleDateString()}
                            {alliance.expiresAt && (
                              <span> • Expires {new Date(alliance.expiresAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        
                        {allianceData.userGuild.canManageAlliances && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleRespondToAlliance(alliance.id, 'ACCEPT')}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRespondToAlliance(alliance.id, 'DECLINE')}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outgoing Proposals */}
            {allianceData.alliances.pending.outgoing.length > 0 && (
              <div>
                <h4 className="text-lg font-bold text-[#f1e5c8] mb-3">Outgoing Proposals</h4>
                <div className="space-y-3">
                  {allianceData.alliances.pending.outgoing.map(alliance => (
                    <div key={alliance.id} className="bg-[#1a1008] border border-[#8b6f31] rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          alliance.type === 'ALLIANCE' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {alliance.type}
                        </span>
                        <span className="text-lg font-bold text-[#f1e5c8]">
                          {alliance.otherGuild.name} [{alliance.otherGuild.tag}]
                        </span>
                        <span className="text-sm text-yellow-400">Awaiting Response</span>
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        Sent {new Date(alliance.proposedAt).toLocaleDateString()}
                        {alliance.expiresAt && (
                          <span> • Expires {new Date(alliance.expiresAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allianceData.alliances.pending.incoming.length === 0 && 
             allianceData.alliances.pending.outgoing.length === 0 && (
              <div className="text-center text-[#f1e5c8] py-8">
                No pending alliance proposals.
              </div>
            )}
          </div>
        )}

        {/* Missions Tab */}
        {activeTab === 'missions' && (
          <AllianceMissions className="mt-0" />
        )}

        {/* Recent Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-3">
            {allianceData.recentActivity.length === 0 ? (
              <div className="text-center text-[#f1e5c8] py-8">
                No recent alliance activity.
              </div>
            ) : (
              allianceData.recentActivity.map(activity => (
                <div key={activity.id} className="bg-[#1a1008] border border-[#8b6f31] rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <span className="text-[#f1e5c8] capitalize">
                        {activity.action.replace(/_/g, ' ')}
                      </span>
                      <div className="text-xs text-gray-400 mt-1">
                        by {activity.user} • {new Date(activity.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}