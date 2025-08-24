'use client';

import { cn } from '@/lib/utils';

interface MissionCardProps {
  mission: {
    id: string;
    name: string;
    description: string;
    type: string;
    status: string;
    startedAt: string | null;
    endsAt: string;
    participantCount: number;
    globalProgress: any;
    globalRequirements: any;
    userParticipation: {
      tier: string | null;
      rank: number | null;
    } | null;
  };
  isSelected: boolean;
  onClick: () => void;
}

export default function MissionCard({ mission, isSelected, onClick }: MissionCardProps) {
  const calculateProgress = () => {
    const progress = mission.globalProgress || {};
    const requirements = mission.globalRequirements || {};
    
    let totalProgress = 0;
    let totalRequirements = 0;

    // Items progress
    if (requirements.items) {
      for (const [itemKey, required] of Object.entries(requirements.items as Record<string, number>)) {
        const current = progress.items?.[itemKey] || 0;
        totalProgress += Math.min(current, required);
        totalRequirements += required;
      }
    }

    // Gold progress
    if (requirements.gold) {
      const current = progress.gold || 0;
      totalProgress += Math.min(current, requirements.gold);
      totalRequirements += requirements.gold;
    }

    // Trades progress
    if (requirements.trades) {
      const current = progress.trades || 0;
      totalProgress += Math.min(current, requirements.trades);
      totalRequirements += requirements.trades;
    }

    return totalRequirements > 0 ? (totalProgress / totalRequirements) * 100 : 0;
  };

  const progressPercentage = calculateProgress();
  const isParticipating = mission.userParticipation !== null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'completed': return 'text-blue-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trade_festival': return '💰';
      case 'resource_drive': return '⚒️';
      case 'world_event': return '🌍';
      case 'competition': return '🏆';
      case 'seasonal': return '🎃';
      default: return '🎯';
    }
  };

  const getTimeRemaining = () => {
    if (mission.status !== 'active') return null;
    
    const now = new Date().getTime();
    const endTime = new Date(mission.endsAt).getTime();
    const distance = endTime - now;

    if (distance <= 0) return 'Ended';

    const hours = Math.floor(distance / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      return `${minutes}m`;
    }
  };

  const timeRemaining = getTimeRemaining();

  return (
    <div 
      className={cn(
        'p-4 border rounded-lg cursor-pointer transition-all hover:shadow-lg',
        isSelected 
          ? 'border-yellow-400 bg-yellow-900 bg-opacity-20 shadow-lg' 
          : 'border-gray-600 bg-gray-800 hover:border-gray-500'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getTypeIcon(mission.type)}</span>
          <div>
            <h3 className="font-bold text-yellow-300 text-sm leading-tight">
              {mission.name}
            </h3>
            <p className={cn('text-xs capitalize', getStatusColor(mission.status))}>
              {mission.status}
            </p>
          </div>
        </div>
        
        {timeRemaining && (
          <div className="text-right text-xs text-gray-400">
            <div>{timeRemaining}</div>
          </div>
        )}
      </div>

      <p className="text-gray-300 text-xs mb-3 line-clamp-2">
        {mission.description}
      </p>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Progress</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div 
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              progressPercentage >= 100 ? 'bg-green-400' : 'bg-yellow-400'
            )}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">
          {mission.participantCount} participants
        </span>
        
        {isParticipating && mission.userParticipation?.tier && (
          <span className="text-yellow-400 font-medium">
            {mission.userParticipation.tier}
            {mission.userParticipation.rank && (
              <span className="text-gray-400 ml-1">
                #{mission.userParticipation.rank}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Participation Indicator */}
      {isParticipating && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}