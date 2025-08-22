import React from 'react';
import { useMissionTimer } from '@/hooks/useMissionTimer';

interface MissionTimerProps {
  startTime: string;
  endTime: string;
  onComplete?: (missionInstanceId: string) => void;
  missionInstanceId: string;
  riskColor: string;
  isCompleting?: boolean;
}

export default function MissionTimer({
  startTime,
  endTime,
  onComplete,
  missionInstanceId,
  riskColor,
  isCompleting = false
}: MissionTimerProps) {
  const { timeRemaining, progress, isReady } = useMissionTimer(startTime, endTime);

  return (
    <>
      <div style={{ marginTop: '8px' }}>
        <div className="game-progress">
          <div 
            className="game-progress-fill" 
            style={{ 
              width: `${progress}%`,
              background: isReady ? '#68b06e' : '#b7b34d'
            }}
          >
            {isReady ? 'Ready!' : `${progress}%`}
          </div>
        </div>
      </div>
      
      <div className="game-space-between game-small" style={{ marginTop: '4px' }}>
        <span>Time remaining: {timeRemaining}</span>
        {isReady && onComplete && (
          <button 
            className="game-btn game-btn-small game-btn-primary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isCompleting) {
                onComplete(missionInstanceId);
              }
            }}
            disabled={isCompleting}
            style={{ 
              opacity: isCompleting ? 0.6 : 1,
              cursor: isCompleting ? 'not-allowed' : 'pointer'
            }}
          >
            {isCompleting ? 'Completing...' : 'Complete Mission'}
          </button>
        )}
      </div>
    </>
  );
}