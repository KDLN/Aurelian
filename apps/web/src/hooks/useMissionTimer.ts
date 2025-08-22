import { useState, useEffect, useRef } from 'react';

interface MissionTimer {
  timeRemaining: string;
  progress: number;
  isReady: boolean;
}

export function useMissionTimer(
  startTime: string,
  endTime: string,
  updateInterval: number = 1000
): MissionTimer {
  const [timer, setTimer] = useState<MissionTimer>(() => 
    calculateTimer(startTime, endTime)
  );
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const updateTimer = () => {
      const newTimer = calculateTimer(startTime, endTime);
      setTimer(newTimer);
      
      // Stop updating if mission is ready
      if (newTimer.isReady && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    // Update immediately
    updateTimer();
    
    // Don't set interval if already ready
    const initialTimer = calculateTimer(startTime, endTime);
    if (!initialTimer.isReady) {
      intervalRef.current = setInterval(updateTimer, updateInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startTime, endTime, updateInterval]);

  return timer;
}

function calculateTimer(startTime: string, endTime: string): MissionTimer {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = now.getTime() - start.getTime();
  const remainingMs = end.getTime() - now.getTime();
  
  const isReady = remainingMs <= 0;
  const progress = isReady ? 100 : Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  
  let timeRemaining: string;
  if (isReady) {
    timeRemaining = 'Ready!';
  } else {
    const minutes = Math.floor(remainingMs / (1000 * 60));
    const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      timeRemaining = `${minutes}m ${seconds}s`;
    } else {
      timeRemaining = `${seconds}s`;
    }
  }
  
  return {
    timeRemaining,
    progress: Math.floor(progress),
    isReady,
  };
}