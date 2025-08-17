'use client';

import { ReactNode, useEffect, useState } from 'react';
import GameLayout from './GameLayout';
import MobileGameLayout from './MobileGameLayout';

interface ResponsiveGameLayoutProps {
  title: string;
  children: ReactNode;
  sidebar?: ReactNode;
  showCharacterViewer?: boolean;
  characterActivity?: 'idle' | 'walking' | 'trading' | 'crafting' | 'combat' | 'mission';
  characterLocation?: string;
  showChat?: boolean;
  chatInitialChannel?: 'general' | 'trade' | 'guild';
  guildChannels?: Array<{
    id: string;
    name: string;
    description?: string;
    roleRequired?: string;
  }>;
}

export default function ResponsiveGameLayout(props: ResponsiveGameLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check initial screen size
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();

    // Add resize listener
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Use mobile layout for screens smaller than 768px (tablet breakpoint)
  if (isMobile) {
    return <MobileGameLayout {...props} />;
  }

  return <GameLayout {...props} />;
}