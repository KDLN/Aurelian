import { ReactNode, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

interface GamePanelProps {
  children: ReactNode;
  side?: 'left' | 'right';
  className?: string;
  style?: CSSProperties;
}

export default function GamePanel({ 
  children, 
  side,
  className,
  style 
}: GamePanelProps) {
  const sideClass = side ? `game-panel-${side}` : '';
  
  return (
    <div 
      className={cn('game-panel', sideClass, className)}
      style={style}
    >
      {children}
    </div>
  );
}