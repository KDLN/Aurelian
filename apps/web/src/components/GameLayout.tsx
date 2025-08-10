'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useGameWorld } from '@/lib/game/world';
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
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribe(() => forceUpdate(x => x + 1));
    return unsubscribe;
  }, [subscribe]);

  const navigation = [
    { href: '/game', label: 'Hub' },
    { href: '/game/auction', label: 'Auction' },
    { href: '/game/missions', label: 'Missions' },
    { href: '/game/crafting', label: 'Crafting' },
    { href: '/game/contracts', label: 'Contracts' },
    { href: '/game/warehouse', label: 'Warehouse' },
    { href: '/play', label: 'World Map' },
  ];

  return (
    <div className="game">
      {showCharacterViewer && (
        <CharacterViewer
          position="top-right"
          activity={characterActivity}
          location={characterLocation}
          outfit="fstr"
          hair="dap1"
          hat=""
        />
      )}

      <div className="game-container">
        <div className="game-panel game-panel-left">
          <div>
            <h1>{title}</h1>
            <div className="game-muted">{world.getTimeString()}</div>
          </div>

          <div className="game-flex">
            <span>Gold:</span>
            <span className="game-pill game-pill-good">{world.gold.toLocaleString()}</span>
          </div>

          <div>
            <h3>Navigation</h3>
            <nav className="game-nav">
              {navigation.map(nav => (
                <a
                  key={nav.href}
                  href={nav.href}
                  className={typeof window !== 'undefined' && window.location.pathname === nav.href ? 'active' : ''}
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