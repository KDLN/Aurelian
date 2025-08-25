'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface EventBannerProps {
  mission: {
    id: string;
    name: string;
    description: string;
    type: string;
    status: string;
    startedAt: string | null;
    endsAt: string;
    globalProgress: any;
    globalRequirements: any;
    userParticipation: any;
    participantCount?: number;
  };
  className?: string;
}

export default function EventBanner({ mission, className }: EventBannerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const endTime = new Date(mission.endsAt).getTime();
      const distance = endTime - now;

      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
          setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else {
          setTimeRemaining(`${minutes}m`);
        }
      } else {
        setTimeRemaining('Expired');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [mission.endsAt]);

  // Calculate overall progress percentage
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'trade_festival': return 'from-green-600 to-emerald-600';
      case 'resource_drive': return 'from-blue-600 to-cyan-600';
      case 'world_event': return 'from-purple-600 to-violet-600';
      case 'competition': return 'from-red-600 to-orange-600';
      case 'seasonal': return 'from-yellow-600 to-amber-600';
      default: return 'from-gray-600 to-slate-600';
    }
  };

  return (
    <div className={cn(
      'relative overflow-hidden rounded-lg border border-gray-600',
      `bg-gradient-to-r ${getTypeColor(mission.type)}`,
      className
    )}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.1) 10px, rgba(255,255,255,.1) 20px)`
        }} />
      </div>

      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{getTypeIcon(mission.type)}</span>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {mission.name}
              </h2>
              <p className="text-white text-opacity-80 capitalize">
                {mission.type.replace('_', ' ')} • {mission.status}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-white text-opacity-80 text-sm">
              {mission.status === 'active' ? 'Ends in' : 'Ended'}
            </div>
            <div className="text-xl font-bold text-white">
              {timeRemaining}
            </div>
          </div>
        </div>

        <p className="text-white text-opacity-90 mb-4 leading-relaxed">
          {mission.description}
        </p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-white text-opacity-80 mb-1">
            <span>Global Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-black bg-opacity-30 rounded-full h-3">
            <div 
              className="h-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-300"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
          {/* Participation Count */}
          {mission.participantCount !== undefined && (
            <div className="flex justify-between text-xs text-white text-opacity-60 mt-1">
              <span>Participants</span>
              <span>{mission.participantCount.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Participation Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {isParticipating ? (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <span className="text-white font-medium">
                  Participating
                  {mission.userParticipation.tier && (
                    <span className="text-yellow-300 ml-2">
                      ({mission.userParticipation.tier} tier)
                    </span>
                  )}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full" />
                <span className="text-white text-opacity-70">
                  Not participating
                </span>
              </div>
            )}
          </div>
          
          {progressPercentage >= 100 && (
            <div className="flex items-center space-x-1 text-yellow-300">
              <span>🎉</span>
              <span className="font-bold">COMPLETED!</span>
            </div>
          )}
        </div>
      </div>

      {/* Pulse animation for active missions */}
      {mission.status === 'active' && (
        <div className="absolute inset-0 border-2 border-yellow-400 rounded-lg opacity-0 animate-pulse" />
      )}
    </div>
  );
}