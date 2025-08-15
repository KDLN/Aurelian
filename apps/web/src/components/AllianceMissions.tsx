'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AllianceMission, AllianceMissionParticipant } from '@/types/guild';

interface AllianceMissionsProps {
  className?: string;
}

interface MissionFormData {
  allianceId: string;
  name: string;
  description: string;
  requirements: {
    type: 'gather' | 'craft' | 'trade' | 'combat';
    items?: { itemKey: string; quantity: number }[];
    gold?: number;
    time?: number;
  };
  rewards: {
    gold?: number;
    items?: { itemId: string; quantity: number }[];
    xp?: number;
  };
  maxParticipants: number;
  expiresIn: number;
}

export default function AllianceMissions({ className = '' }: AllianceMissionsProps) {
  const [missions, setMissions] = useState<{
    available: AllianceMission[];
    participating: AllianceMission[];
    completed: AllianceMission[];
  }>({ available: [], participating: [], completed: [] });
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'participating' | 'completed' | 'create'>('available');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userAlliances, setUserAlliances] = useState<any[]>([]);
  
  const [missionForm, setMissionForm] = useState<MissionFormData>({
    allianceId: '',
    name: '',
    description: '',
    requirements: { type: 'gather' },
    rewards: {},
    maxParticipants: 5,
    expiresIn: 24
  });

  useEffect(() => {
    fetchMissions();
    fetchUserAlliances();
  }, []);

  const fetchMissions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/guild/alliance/missions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch missions: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setMissions(result.missions);
        setStats(result.stats);
      }
    } catch (err) {
      console.error('Error loading alliance missions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load missions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserAlliances = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/guild/alliance/list', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.alliances?.active) {
          setUserAlliances(result.data.alliances.active);
        }
      }
    } catch (err) {
      console.error('Error loading user alliances:', err);
    }
  };

  const handleJoinMission = async (missionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/guild/alliance/missions/join', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ missionId })
      });

      if (response.ok) {
        await fetchMissions(); // Refresh missions
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to join mission');
      }
    } catch (err) {
      console.error('Error joining mission:', err);
      setError('Failed to join mission');
    }
  };

  const handleCreateMission = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/guild/alliance/missions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(missionForm)
      });

      if (response.ok) {
        setShowCreateForm(false);
        setMissionForm({
          allianceId: '',
          name: '',
          description: '',
          requirements: { type: 'gather' },
          rewards: {},
          maxParticipants: 5,
          expiresIn: 24
        });
        await fetchMissions(); // Refresh missions
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to create mission');
      }
    } catch (err) {
      console.error('Error creating mission:', err);
      setError('Failed to create mission');
    }
  };

  const handleCompleteMission = async (missionId: string) => {
    if (!confirm('Are you sure you want to mark this mission as completed? This will distribute rewards to all participants.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/guild/alliance/missions/complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ missionId, completeMission: true })
      });

      if (response.ok) {
        await fetchMissions(); // Refresh missions
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to complete mission');
      }
    } catch (err) {
      console.error('Error completing mission:', err);
      setError('Failed to complete mission');
    }
  };

  const formatRequirements = (requirements: any) => {
    if (!requirements) return 'No requirements specified';
    
    const parts = [];
    if (requirements.type) parts.push(`Type: ${requirements.type}`);
    if (requirements.items?.length) {
      parts.push(`Items: ${requirements.items.map((item: any) => `${item.quantity}x ${item.itemKey}`).join(', ')}`);
    }
    if (requirements.gold) parts.push(`Gold: ${requirements.gold}`);
    if (requirements.time) parts.push(`Time: ${requirements.time} hours`);
    
    return parts.join(' • ');
  };

  const formatRewards = (rewards: any) => {
    if (!rewards) return 'No rewards specified';
    
    const parts = [];
    if (rewards.gold) parts.push(`${rewards.gold} gold`);
    if (rewards.xp) parts.push(`${rewards.xp} XP`);
    if (rewards.items?.length) {
      parts.push(`Items: ${rewards.items.map((item: any) => `${item.quantity}x ${item.itemId}`).join(', ')}`);
    }
    
    return parts.join(' • ');
  };

  if (isLoading) {
    return (
      <div className={`bg-[#2d1810] border border-[#8b6f31] rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="text-[#f1e5c8]">Loading alliance missions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#2d1810] border border-[#8b6f31] rounded-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-[#8b6f31] p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-[#f1e5c8]">Alliance Missions</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-[#d4af37] hover:bg-[#b8941f] text-[#1a1008] font-medium rounded transition-colors"
          >
            Create Mission
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-[#1a1008] p-3 rounded border border-[#8b6f31]">
              <div className="text-xs text-[#d4af37] uppercase tracking-wider">Total</div>
              <div className="text-lg font-bold text-[#f1e5c8]">{stats.totalMissions}</div>
            </div>
            <div className="bg-[#1a1008] p-3 rounded border border-[#8b6f31]">
              <div className="text-xs text-[#d4af37] uppercase tracking-wider">Active</div>
              <div className="text-lg font-bold text-green-400">{stats.activeMissions}</div>
            </div>
            <div className="bg-[#1a1008] p-3 rounded border border-[#8b6f31]">
              <div className="text-xs text-[#d4af37] uppercase tracking-wider">Completed</div>
              <div className="text-lg font-bold text-blue-400">{stats.completedMissions}</div>
            </div>
            <div className="bg-[#1a1008] p-3 rounded border border-[#8b6f31]">
              <div className="text-xs text-[#d4af37] uppercase tracking-wider">Participating</div>
              <div className="text-lg font-bold text-yellow-400">{stats.userParticipating}</div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-[#8b6f31] px-6">
        <div className="flex space-x-1">
          {[
            { key: 'available', label: 'Available', count: missions.available.length },
            { key: 'participating', label: 'Participating', count: missions.participating.length },
            { key: 'completed', label: 'Completed', count: missions.completed.length }
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
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Create Mission Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2d1810] border border-[#8b6f31] rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-[#f1e5c8] mb-6">Create Alliance Mission</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-[#d4af37] mb-2">Alliance</label>
                <select
                  value={missionForm.allianceId}
                  onChange={(e) => setMissionForm({...missionForm, allianceId: e.target.value})}
                  className="w-full p-3 bg-[#1a1008] border border-[#8b6f31] rounded text-[#f1e5c8]"
                >
                  <option value="">Select an alliance</option>
                  {userAlliances.map(alliance => (
                    <option key={alliance.id} value={alliance.id}>
                      {alliance.otherGuild.name} [{alliance.otherGuild.tag}] Alliance
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#d4af37] mb-2">Mission Name</label>
                <input
                  type="text"
                  value={missionForm.name}
                  onChange={(e) => setMissionForm({...missionForm, name: e.target.value})}
                  className="w-full p-3 bg-[#1a1008] border border-[#8b6f31] rounded text-[#f1e5c8]"
                  placeholder="Enter mission name"
                />
              </div>

              <div>
                <label className="block text-sm text-[#d4af37] mb-2">Description</label>
                <textarea
                  value={missionForm.description}
                  onChange={(e) => setMissionForm({...missionForm, description: e.target.value})}
                  className="w-full p-3 bg-[#1a1008] border border-[#8b6f31] rounded text-[#f1e5c8] h-24 resize-none"
                  placeholder="Describe the mission objectives and details"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-[#d4af37] mb-2">Max Participants</label>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={missionForm.maxParticipants}
                    onChange={(e) => setMissionForm({...missionForm, maxParticipants: parseInt(e.target.value) || 5})}
                    className="w-full p-3 bg-[#1a1008] border border-[#8b6f31] rounded text-[#f1e5c8]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#d4af37] mb-2">Expires In (hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={missionForm.expiresIn}
                    onChange={(e) => setMissionForm({...missionForm, expiresIn: parseInt(e.target.value) || 24})}
                    className="w-full p-3 bg-[#1a1008] border border-[#8b6f31] rounded text-[#f1e5c8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#d4af37] mb-2">Gold Reward</label>
                <input
                  type="number"
                  min="0"
                  value={missionForm.rewards.gold || ''}
                  onChange={(e) => setMissionForm({
                    ...missionForm, 
                    rewards: {...missionForm.rewards, gold: parseInt(e.target.value) || 0}
                  })}
                  className="w-full p-3 bg-[#1a1008] border border-[#8b6f31] rounded text-[#f1e5c8]"
                  placeholder="Total gold reward to split among participants"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-8">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMission}
                disabled={!missionForm.allianceId || !missionForm.name || !missionForm.description}
                className="px-6 py-2 bg-[#d4af37] hover:bg-[#b8941f] text-[#1a1008] font-medium rounded transition-colors disabled:opacity-50"
              >
                Create Mission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="p-6">
        {error && (
          <div className="bg-red-600 bg-opacity-20 border border-red-600 rounded-lg p-4 mb-6">
            <div className="text-red-400">{error}</div>
            <button 
              onClick={() => setError(null)}
              className="text-red-300 hover:text-red-100 text-sm mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Mission Lists */}
        <div className="space-y-4">
          {activeTab === 'available' && (
            missions.available.length === 0 ? (
              <div className="text-center text-[#f1e5c8] py-12">
                <div className="text-4xl mb-4">⚔️</div>
                <div className="text-lg font-bold mb-2">No Available Missions</div>
                <div className="text-gray-400">Check back later or create a new alliance mission!</div>
              </div>
            ) : (
              missions.available.map(mission => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  onJoin={() => handleJoinMission(mission.id)}
                  showJoinButton={true}
                />
              ))
            )
          )}

          {activeTab === 'participating' && (
            missions.participating.length === 0 ? (
              <div className="text-center text-[#f1e5c8] py-12">
                <div className="text-4xl mb-4">🤝</div>
                <div className="text-lg font-bold mb-2">Not Participating</div>
                <div className="text-gray-400">Join available missions to start earning alliance rewards!</div>
              </div>
            ) : (
              missions.participating.map(mission => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  onComplete={() => handleCompleteMission(mission.id)}
                  showCompleteButton={true}
                />
              ))
            )
          )}

          {activeTab === 'completed' && (
            missions.completed.length === 0 ? (
              <div className="text-center text-[#f1e5c8] py-12">
                <div className="text-4xl mb-4">🏆</div>
                <div className="text-lg font-bold mb-2">No Completed Missions</div>
                <div className="text-gray-400">Complete missions to see your achievements here!</div>
              </div>
            ) : (
              missions.completed.map(mission => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  isCompleted={true}
                />
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Mission Card Component
interface MissionCardProps {
  mission: AllianceMission;
  onJoin?: () => void;
  onComplete?: () => void;
  showJoinButton?: boolean;
  showCompleteButton?: boolean;
  isCompleted?: boolean;
}

function MissionCard({ 
  mission, 
  onJoin, 
  onComplete, 
  showJoinButton, 
  showCompleteButton, 
  isCompleted 
}: MissionCardProps) {
  const formatRequirements = (requirements: any) => {
    if (!requirements) return 'No requirements specified';
    
    const parts = [];
    if (requirements.type) parts.push(`Type: ${requirements.type}`);
    if (requirements.items?.length) {
      parts.push(`Items: ${requirements.items.map((item: any) => `${item.quantity}x ${item.itemKey}`).join(', ')}`);
    }
    if (requirements.gold) parts.push(`Gold: ${requirements.gold}`);
    
    return parts.join(' • ');
  };

  const formatRewards = (rewards: any) => {
    if (!rewards) return 'No rewards specified';
    
    const parts = [];
    if (rewards.gold) parts.push(`${rewards.gold} gold`);
    if (rewards.xp) parts.push(`${rewards.xp} XP`);
    
    return parts.join(' • ');
  };

  return (
    <div className="bg-[#1a1008] border border-[#8b6f31] rounded-lg p-6 hover:border-[#d4af37] transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-[#f1e5c8] mb-2">{mission.name}</h3>
          <p className="text-[#f1e5c8] mb-4">{mission.description}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {isCompleted && (
            <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-medium">
              Completed
            </span>
          )}
          <span className="px-3 py-1 bg-[#8b6f31] text-[#f1e5c8] rounded-full text-xs font-medium">
            {mission.currentParticipants}/{mission.maxParticipants} participants
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-sm text-[#d4af37] font-medium mb-1">Requirements:</div>
          <div className="text-sm text-[#f1e5c8]">{formatRequirements(mission.requirements)}</div>
        </div>
        <div>
          <div className="text-sm text-[#d4af37] font-medium mb-1">Rewards:</div>
          <div className="text-sm text-[#f1e5c8]">{formatRewards(mission.rewards)}</div>
        </div>
      </div>

      {/* Participants */}
      {mission.participants && mission.participants.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-[#d4af37] font-medium mb-2">Participants:</div>
          <div className="flex flex-wrap gap-2">
            {mission.participants.map(participant => (
              <span
                key={participant.id}
                className="px-2 py-1 bg-[#2d1810] border border-[#8b6f31] rounded text-xs text-[#f1e5c8]"
              >
                {participant.displayName} [{participant.guildTag}]
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-400">
          {isCompleted ? (
            `Completed ${new Date(mission.completedAt!).toLocaleDateString()}`
          ) : mission.expiresAt ? (
            `Expires ${new Date(mission.expiresAt).toLocaleDateString()}`
          ) : (
            `Started ${new Date(mission.startedAt).toLocaleDateString()}`
          )}
        </div>
        
        <div className="flex space-x-3">
          {showJoinButton && (
            <button
              onClick={onJoin}
              disabled={!mission.canJoin}
              className="px-4 py-2 bg-[#d4af37] hover:bg-[#b8941f] text-[#1a1008] font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mission.canJoin ? 'Join Mission' : 'Cannot Join'}
            </button>
          )}
          {showCompleteButton && (
            <button
              onClick={onComplete}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors"
            >
              Complete Mission
            </button>
          )}
        </div>
      </div>
    </div>
  );
}