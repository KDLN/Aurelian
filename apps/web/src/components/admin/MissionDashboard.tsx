'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import GamePanel from '@/components/ui/GamePanel';
import GameButton from '@/components/ui/GameButton';
import { cn } from '@/lib/utils';

interface Mission {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  startedAt: string | null;
  endsAt: string;
  completedAt: string | null;
  createdAt: string;
  participantCount: number;
  globalProgress: any;
  globalRequirements: any;
  rewards: any;
  tiers: any;
}

interface MissionDashboardProps {
  missions: Mission[];
  selectedMission: Mission | null;
  onSelectMission: (mission: Mission) => void;
  onMissionAction: (action: string, missionId: string, data?: any) => Promise<any>;
  onRefresh: () => void;
}

export default function MissionDashboard({ 
  missions, 
  selectedMission, 
  onSelectMission, 
  onMissionAction,
  onRefresh 
}: MissionDashboardProps) {
  const [missionDetails, setMissionDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (selectedMission) {
      fetchMissionDetails(selectedMission.id);
    }
  }, [selectedMission]);

  const fetchMissionDetails = async (missionId: string) => {
    try {
      setIsLoadingDetails(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const response = await fetch(`/api/server/missions/admin/${missionId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMissionDetails(data);
      }
    } catch (err) {
      console.error('Error fetching mission details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleAction = async (action: string, data?: any) => {
    if (!selectedMission) return;

    try {
      setActionLoading(action);
      await onMissionAction(action, selectedMission.id, data);
      
      // Refresh details after action
      await fetchMissionDetails(selectedMission.id);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-900';
      case 'completed': return 'text-blue-400 bg-blue-900';
      case 'failed': return 'text-red-400 bg-red-900';
      case 'scheduled': return 'text-yellow-400 bg-yellow-900';
      default: return 'text-gray-400 bg-gray-700';
    }
  };

  const calculateProgress = (mission: Mission) => {
    const progress = mission.globalProgress || {};
    const requirements = mission.globalRequirements || {};
    
    let totalProgress = 0;
    let totalRequirements = 0;

    if (requirements.items) {
      for (const [itemKey, required] of Object.entries(requirements.items as Record<string, number>)) {
        const current = progress.items?.[itemKey] || 0;
        totalProgress += Math.min(current, required);
        totalRequirements += required;
      }
    }

    if (requirements.gold) {
      const current = progress.gold || 0;
      totalProgress += Math.min(current, requirements.gold);
      totalRequirements += requirements.gold;
    }

    if (requirements.trades) {
      const current = progress.trades || 0;
      totalProgress += Math.min(current, requirements.trades);
      totalRequirements += requirements.trades;
    }

    return totalRequirements > 0 ? (totalProgress / totalRequirements) * 100 : 0;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Mission List */}
      <div className="lg:col-span-1">
        <GamePanel>
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-yellow-400">All Missions</h2>
              <GameButton size="small" onClick={onRefresh}>
                Refresh
              </GameButton>
            </div>

            {missions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No missions found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {missions.map((mission) => (
                  <div
                    key={mission.id}
                    className={cn(
                      'p-3 border rounded cursor-pointer transition-all',
                      selectedMission?.id === mission.id
                        ? 'border-yellow-400 bg-yellow-900 bg-opacity-20'
                        : 'border-gray-600 hover:border-gray-500'
                    )}
                    onClick={() => onSelectMission(mission)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-yellow-300 text-sm">
                        {mission.name}
                      </h3>
                      <span className={cn(
                        'text-xs px-2 py-1 rounded',
                        getStatusColor(mission.status)
                      )}>
                        {mission.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-400 mb-2">
                      <div>Type: {mission.type}</div>
                      <div>Participants: {mission.participantCount}</div>
                      <div>Created: {new Date(mission.createdAt).toLocaleDateString()}</div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="h-1.5 bg-yellow-400 rounded-full transition-all"
                        style={{ width: `${Math.min(calculateProgress(mission), 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GamePanel>
      </div>

      {/* Mission Details */}
      <div className="lg:col-span-2">
        {selectedMission ? (
          <GamePanel>
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-yellow-400">
                    {selectedMission.name}
                  </h2>
                  <div className="flex items-center space-x-4 text-sm mt-1">
                    <span className={cn(
                      'px-2 py-1 rounded',
                      getStatusColor(selectedMission.status)
                    )}>
                      {selectedMission.status.toUpperCase()}
                    </span>
                    <span className="text-gray-400">
                      {selectedMission.participantCount} participants
                    </span>
                    <span className="text-gray-400">
                      {Math.round(calculateProgress(selectedMission))}% complete
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  {selectedMission.status === 'scheduled' && (
                    <GameButton
                      size="small"
                      variant="primary"
                      disabled={!!actionLoading}
                      onClick={() => handleAction('start')}
                    >
                      {actionLoading === 'start' ? 'Starting...' : 'Start Mission'}
                    </GameButton>
                  )}

                  {selectedMission.status === 'active' && (
                    <>
                      <GameButton
                        size="small"
                        variant="warning"
                        disabled={!!actionLoading}
                        onClick={() => handleAction('pause')}
                      >
                        {actionLoading === 'pause' ? 'Pausing...' : 'Pause'}
                      </GameButton>
                      <GameButton
                        size="small"
                        variant="danger"
                        disabled={!!actionLoading}
                        onClick={() => {
                          if (confirm('Are you sure you want to force end this mission?')) {
                            handleAction('end', { forced: true });
                          }
                        }}
                      >
                        {actionLoading === 'end' ? 'Ending...' : 'Force End'}
                      </GameButton>
                    </>
                  )}

                  {(selectedMission.status === 'scheduled' || selectedMission.status === 'failed') && 
                   selectedMission.participantCount === 0 && (
                    <GameButton
                      size="small"
                      variant="danger"
                      disabled={!!actionLoading}
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this mission?')) {
                          handleAction('delete');
                        }
                      }}
                    >
                      {actionLoading === 'delete' ? 'Deleting...' : 'Delete'}
                    </GameButton>
                  )}
                </div>
              </div>

              <p className="text-gray-300 mb-6">
                {selectedMission.description}
              </p>

              {/* Mission Timeline */}
              <div className="bg-gray-800 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-yellow-400 mb-3">Timeline</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Created</div>
                    <div className="text-white">
                      {new Date(selectedMission.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {selectedMission.startedAt && (
                    <div>
                      <div className="text-gray-400">Started</div>
                      <div className="text-green-300">
                        {new Date(selectedMission.startedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-gray-400">
                      {selectedMission.completedAt ? 'Completed' : 'Ends'}
                    </div>
                    <div className={selectedMission.completedAt ? 'text-blue-300' : 'text-yellow-300'}>
                      {selectedMission.completedAt 
                        ? new Date(selectedMission.completedAt).toLocaleString()
                        : new Date(selectedMission.endsAt).toLocaleString()
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirements and Progress */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-3">Requirements</h3>
                  <div className="space-y-2 text-sm">
                    {selectedMission.globalRequirements.items && (
                      <div>
                        <div className="text-gray-400">Items:</div>
                        {Object.entries(selectedMission.globalRequirements.items as Record<string, number>)
                          .map(([item, qty]) => (
                          <div key={item} className="ml-4 text-gray-300">
                            {item.replace('_', ' ')}: {qty.toLocaleString()}
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedMission.globalRequirements.gold && (
                      <div>
                        <div className="text-gray-400">Gold:</div>
                        <div className="ml-4 text-gray-300">
                          {selectedMission.globalRequirements.gold.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {selectedMission.globalRequirements.trades && (
                      <div>
                        <div className="text-gray-400">Trades:</div>
                        <div className="ml-4 text-gray-300">
                          {selectedMission.globalRequirements.trades.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-3">Current Progress</h3>
                  <div className="space-y-2 text-sm">
                    {selectedMission.globalProgress.items && (
                      <div>
                        <div className="text-gray-400">Items:</div>
                        {Object.entries(selectedMission.globalProgress.items as Record<string, number>)
                          .map(([item, qty]) => (
                          <div key={item} className="ml-4 text-gray-300">
                            {item.replace('_', ' ')}: {qty.toLocaleString()}
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedMission.globalProgress.gold !== undefined && (
                      <div>
                        <div className="text-gray-400">Gold:</div>
                        <div className="ml-4 text-gray-300">
                          {selectedMission.globalProgress.gold.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {selectedMission.globalProgress.trades !== undefined && (
                      <div>
                        <div className="text-gray-400">Trades:</div>
                        <div className="ml-4 text-gray-300">
                          {selectedMission.globalProgress.trades.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Participant List */}
              {isLoadingDetails ? (
                <div className="text-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : missionDetails?.participants && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-3">
                    Participants ({missionDetails.participants.length})
                  </h3>
                  <div className="max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {missionDetails.participants.map((participant: any, index: number) => (
                        <div key={participant.id} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                          <div>
                            <div className="font-medium text-white">
                              {participant.displayName}
                            </div>
                            <div className="text-xs text-gray-400">
                              {participant.guild && `[${participant.guild.tag}] ${participant.guild.name}`}
                              {participant.tier && ` • ${participant.tier} tier`}
                              {participant.rank && ` • Rank #${participant.rank}`}
                            </div>
                          </div>
                          <div className="text-xs text-gray-400">
                            {participant.rewardClaimed ? '✅ Claimed' : '⏳ Pending'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </GamePanel>
        ) : (
          <GamePanel>
            <div className="text-center py-16 text-gray-400">
              <p>Select a mission to view details and controls</p>
            </div>
          </GamePanel>
        )}
      </div>
    </div>
  );
}