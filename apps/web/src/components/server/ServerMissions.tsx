'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import GamePanel from '@/components/ui/GamePanel';
import GameButton from '@/components/ui/GameButton';
import EventBanner from './EventBanner';
import MissionCard from './MissionCard';
import LeaderboardView from './LeaderboardView';
import ContributionForm from './ContributionForm';
import GlobalProgress from './GlobalProgress';

interface ServerMission {
  id: string;
  name: string;
  description: string;
  type: string;
  globalRequirements: any;
  globalProgress: any;
  rewards: any;
  tiers: any;
  status: string;
  startedAt: string | null;
  endsAt: string;
  participantCount: number;
  userParticipation: {
    id: string;
    contribution: any;
    tier: string | null;
    rank: number | null;
    rewardClaimed: boolean;
    joinedAt: string;
  } | null;
}

interface ServerMissionsProps {
  className?: string;
}

export default function ServerMissions({ className = '' }: ServerMissionsProps) {
  const [missions, setMissions] = useState<ServerMission[]>([]);
  const [selectedMission, setSelectedMission] = useState<ServerMission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'contribute'>('overview');
  const [showContributeModal, setShowContributeModal] = useState(false);

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('/api/server/missions', {
        headers: {
          'Cookie': `sb-access-token=${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch missions');
      }

      const data = await response.json();
      setMissions(data.missions || []);
      
      // Auto-select the first mission if none selected
      if (data.missions?.length > 0 && !selectedMission) {
        setSelectedMission(data.missions[0]);
      }

    } catch (err) {
      console.error('Error fetching server missions:', err);
      setError('Failed to load server missions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContribution = async (contribution: any) => {
    if (!selectedMission) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/server/missions/${selectedMission.id}/participate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `sb-access-token=${session.access_token}`
        },
        body: JSON.stringify({ contribution })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit contribution');
      }

      const result = await response.json();
      
      // Refresh missions to show updated progress
      await fetchMissions();
      
      // Show success message
      setShowContributeModal(false);
      
      return result;
    } catch (err) {
      console.error('Error submitting contribution:', err);
      throw err;
    }
  };

  const handleClaimRewards = async () => {
    if (!selectedMission?.userParticipation) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/server/missions/${selectedMission.id}/claim`, {
        method: 'POST',
        headers: {
          'Cookie': `sb-access-token=${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to claim rewards');
      }

      const result = await response.json();
      
      // Refresh missions
      await fetchMissions();
      
      return result;
    } catch (err) {
      console.error('Error claiming rewards:', err);
      throw err;
    }
  };

  if (isLoading) {
    return (
      <GamePanel className={className}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-300">Loading server events...</p>
          </div>
        </div>
      </GamePanel>
    );
  }

  if (error) {
    return (
      <GamePanel className={className}>
        <div className="text-center p-8">
          <p className="text-red-400 mb-4">{error}</p>
          <GameButton onClick={fetchMissions}>Retry</GameButton>
        </div>
      </GamePanel>
    );
  }

  const activeMissions = missions.filter(m => m.status === 'active');
  const currentEvent = activeMissions[0]; // Show the most recent active mission as main event

  return (
    <div className={className}>
      {/* Event Banner */}
      {currentEvent && (
        <EventBanner 
          mission={currentEvent}
          className="mb-6"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mission List */}
        <div className="lg:col-span-1">
          <GamePanel>
            <div className="p-4">
              <h2 className="text-xl font-bold text-yellow-400 mb-4">Server Events</h2>
              
              {missions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No active server events</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {missions.map((mission) => (
                    <MissionCard
                      key={mission.id}
                      mission={mission}
                      isSelected={selectedMission?.id === mission.id}
                      onClick={() => setSelectedMission(mission)}
                    />
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
                {/* Tab Navigation */}
                <div className="flex space-x-4 mb-6 border-b border-gray-600">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-2 px-1 ${
                      activeTab === 'overview' 
                        ? 'border-b-2 border-yellow-400 text-yellow-400' 
                        : 'text-gray-300 hover:text-yellow-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`pb-2 px-1 ${
                      activeTab === 'leaderboard' 
                        ? 'border-b-2 border-yellow-400 text-yellow-400' 
                        : 'text-gray-300 hover:text-yellow-300'
                    }`}
                  >
                    Leaderboard
                  </button>
                  {selectedMission.status === 'active' && (
                    <button
                      onClick={() => setActiveTab('contribute')}
                      className={`pb-2 px-1 ${
                        activeTab === 'contribute' 
                          ? 'border-b-2 border-yellow-400 text-yellow-400' 
                          : 'text-gray-300 hover:text-yellow-300'
                      }`}
                    >
                      Contribute
                    </button>
                  )}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                  <div>
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-yellow-400 mb-2">
                        {selectedMission.name}
                      </h3>
                      <p className="text-gray-300 mb-4">
                        {selectedMission.description}
                      </p>
                      
                      {/* Mission Status */}
                      <div className="flex items-center space-x-4 text-sm">
                        <span className={`px-2 py-1 rounded ${
                          selectedMission.status === 'active' 
                            ? 'bg-green-900 text-green-300'
                            : selectedMission.status === 'completed'
                            ? 'bg-blue-900 text-blue-300'
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {selectedMission.status.toUpperCase()}
                        </span>
                        <span className="text-gray-400">
                          {selectedMission.participantCount} participants
                        </span>
                        {selectedMission.userParticipation && (
                          <span className="text-yellow-400">
                            Your tier: {selectedMission.userParticipation.tier || 'Unranked'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Global Progress */}
                    <GlobalProgress 
                      mission={selectedMission}
                      className="mb-6"
                    />

                    {/* User Participation */}
                    {selectedMission.userParticipation && (
                      <div className="bg-gray-800 p-4 rounded-lg mb-6">
                        <h4 className="text-lg font-semibold text-yellow-400 mb-2">Your Participation</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Tier:</span>
                            <span className="ml-2 text-yellow-300">
                              {selectedMission.userParticipation.tier || 'Unranked'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Rank:</span>
                            <span className="ml-2 text-yellow-300">
                              #{selectedMission.userParticipation.rank || 'N/A'}
                            </span>
                          </div>
                        </div>
                        
                        {selectedMission.status === 'completed' && 
                         selectedMission.userParticipation.tier && 
                         !selectedMission.userParticipation.rewardClaimed && (
                          <div className="mt-4">
                            <GameButton 
                              variant="primary"
                              onClick={handleClaimRewards}
                            >
                              Claim Rewards
                            </GameButton>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    {selectedMission.status === 'active' && (
                      <div className="flex space-x-3">
                        <GameButton 
                          variant="primary"
                          onClick={() => setShowContributeModal(true)}
                        >
                          Contribute
                        </GameButton>
                        <GameButton 
                          variant="secondary"
                          onClick={() => setActiveTab('leaderboard')}
                        >
                          View Leaderboard
                        </GameButton>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'leaderboard' && (
                  <LeaderboardView 
                    missionId={selectedMission.id}
                    missionName={selectedMission.name}
                  />
                )}

                {activeTab === 'contribute' && selectedMission.status === 'active' && (
                  <ContributionForm 
                    mission={selectedMission}
                    onSubmit={handleContribution}
                  />
                )}
              </div>
            </GamePanel>
          ) : (
            <GamePanel>
              <div className="text-center p-8 text-gray-400">
                <p>Select a server event to view details</p>
              </div>
            </GamePanel>
          )}
        </div>
      </div>

      {/* Contribution Modal */}
      {showContributeModal && selectedMission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-yellow-400">Contribute to Mission</h3>
              <button 
                onClick={() => setShowContributeModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <ContributionForm 
              mission={selectedMission}
              onSubmit={async (contribution) => {
                await handleContribution(contribution);
                setShowContributeModal(false);
              }}
              onCancel={() => setShowContributeModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}