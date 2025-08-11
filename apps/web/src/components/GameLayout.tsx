'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useGameWorld } from '@/lib/game/world';
import { useUserData } from '@/hooks/useUserData';
import { loadCharacterAppearance } from '@/lib/sprites/characterOptions';
import { CharacterAppearance } from '@/lib/sprites/characterSprites';
import CharacterViewer from './CharacterViewer';
import '@/lib/game/styles.css';

interface GameLayoutProps {
  title: string;
  children: ReactNode;
  sidebar?: ReactNode;
  showCharacterViewer?: boolean;
  characterActivity?: 'idle' | 'walking' | 'trading' | 'crafting' | 'combat' | 'mission';
  characterLocation?: string;
}

export default function GameLayout({
  title,
  children,
  sidebar,
  showCharacterViewer = true,
  characterActivity = 'idle',
  characterLocation = 'Hub'
}: GameLayoutProps) {
  const { world, subscribe } = useGameWorld();
  const { wallet } = useUserData();
  const [, forceUpdate] = useState(0);
  const [currentPath, setCurrentPath] = useState('');
  const [characterAppearance, setCharacterAppearance] = useState<CharacterAppearance | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe(() => forceUpdate(x => x + 1));
    return unsubscribe;
  }, [subscribe]);

  useEffect(() => {
    // Set current path on client-side only
    setCurrentPath(window.location.pathname);
    
    // Load character appearance
    const loadAppearance = async () => {
      try {
        // First try to load from database
        const { loadCharacterFromDatabase } = await import('@/lib/sprites/characterDatabase');
        const dbAppearance = await loadCharacterFromDatabase();
        
        if (dbAppearance) {
          setCharacterAppearance(dbAppearance);
        } else {
          // Fallback to localStorage
          const localAppearance = loadCharacterAppearance();
          setCharacterAppearance(localAppearance);
        }
      } catch (error) {
        console.error('Error loading character appearance:', error);
        // Use default appearance
        const defaultAppearance = loadCharacterAppearance();
        setCharacterAppearance(defaultAppearance);
      }
    };
    
    loadAppearance();
  }, []);

  const navigation = [
    { href: '/hub', label: 'Hub' },
    { href: '/auction', label: 'Auction' },
    { href: '/missions', label: 'Missions' },
    { href: '/crafting', label: 'Crafting' },
    { href: '/contracts', label: 'Contracts' },
    { href: '/warehouse', label: 'Warehouse' },
    { href: '/play', label: 'World Map' },
  ];

  return (
    <div className="game">
      <div className="game-container">
        <div className="game-panel game-panel-left">
          <div>
            <h1>{title}</h1>
            <div className="game-muted">{world.getTimeString()}</div>
          </div>

          <div className="game-flex">
            <span>Gold:</span>
            <span className="game-pill game-pill-good">
              {wallet ? wallet.gold.toLocaleString() : world.gold.toLocaleString()}
            </span>
          </div>

          <div>
            <h3>Navigation</h3>
            <nav className="game-nav">
              {navigation.map(nav => (
                <a
                  key={nav.href}
                  href={nav.href}
                  className={currentPath === nav.href ? 'active' : ''}
                >
                  {nav.label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <h3>Quick Stats</h3>
            <div className="game-flex-col">
              <div className="game-space-between">
                <span>Warehouse Items:</span>
                <span>{Object.keys(world.warehouse).length}</span>
              </div>
              <div className="game-space-between">
                <span>Active Listings:</span>
                <span>{world.listings.length}</span>
              </div>
              <div className="game-space-between">
                <span>Active Missions:</span>
                <span>{world.missions.length}</span>
              </div>
              <div className="game-space-between">
                <span>Crafting Jobs:</span>
                <span>{world.crafting.length}</span>
              </div>
            </div>
          </div>

          {sidebar && (
            <div>
              {sidebar}
            </div>
          )}

          {showCharacterViewer && characterAppearance && (
            <div>
              <h3>Player Activity</h3>
              <div style={{ 
                background: '#1a1511',
                border: '2px solid #533b2c',
                borderRadius: '4px',
                padding: '4px 0',
                marginTop: '8px',
                overflow: 'hidden',
                height: '108px'
              }}>
                <CharacterViewer
                  position="inline"
                  activity={characterActivity}
                  location={characterLocation}
                  skinTone={characterAppearance.base}
                  outfit={characterAppearance.outfit}
                  hair={characterAppearance.hair}
                  hat={characterAppearance.hat || ''}
                  size={100}
                  autoWalk={true}
                  walkAreaWidth={260}
                />
              </div>
            </div>
          )}

          <div>
            <button 
              className="game-btn game-btn-warning" 
              onClick={() => world.tick()}
              style={{ width: '100%' }}
            >
              Advance Time (+10 min)
            </button>
          </div>
        </div>

        <div className="game-panel game-panel-right">
          {children}
        </div>
      </div>
    </div>
  );
}