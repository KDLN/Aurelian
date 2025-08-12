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
  const { wallet, user } = useUserData();
  const [, forceUpdate] = useState(0);
  const [currentPath, setCurrentPath] = useState('');
  const [characterAppearance, setCharacterAppearance] = useState<CharacterAppearance | null>(null);
  const [username, setUsername] = useState<string>('Anonymous Trader');

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
          console.warn('No character appearance found in database, using defaults');
          // Use default appearance
          const defaultAppearance = loadCharacterAppearance();
          setCharacterAppearance(defaultAppearance);
        }
      } catch (error) {
        console.error('Error loading character appearance:', error);
        const defaultAppearance = loadCharacterAppearance();
        setCharacterAppearance(defaultAppearance);
      }
    };
    
    loadAppearance();
  }, []);

  // Load username from profile
  useEffect(() => {
    const loadUsername = async () => {
      if (user?.id) {
        try {
          const { supabase } = await import('@/lib/supabaseClient');
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.access_token) {
            const response = await fetch('/api/profile', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.profile?.display) {
                setUsername(data.profile.display);
              }
            }
          }
        } catch (error) {
          console.error('Error loading username:', error);
        }
      }
    };
    
    loadUsername();
  }, [user]);

  const navigation = [
    { href: '/hub', label: 'Hub' },
    { href: '/auction', label: 'Auction' },
    { href: '/missions', label: 'Missions' },
    { href: '/crafting', label: 'Crafting' },
    { href: '/contracts', label: 'Contracts' },
    { href: '/warehouse', label: 'Warehouse' },
    { href: '/guild', label: 'Guild' },
    { href: '/play', label: 'World Map' },
  ];

  return (
    <div className="game">
      <div className="game-container">
        <div className="game-panel game-panel-left">
          {/* Character Viewer at the top */}
          {showCharacterViewer && characterAppearance && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                background: '#1a1511',
                border: '2px solid #533b2c',
                borderRadius: '4px',
                overflow: 'hidden',
                height: '108px',
                position: 'relative'
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
                  walkAreaWidth={336}
                  showBorder={false}
                />
              </div>
            </div>
          )}

          {/* Player Stats Section */}
          <div style={{ 
            background: 'rgba(83, 59, 44, 0.2)',
            border: '1px solid #533b2c',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f1e5c8' }}>
                {username}
              </div>
              <div style={{ fontSize: '12px', color: '#9b8c70', marginTop: '2px' }}>
                Beacon Trader
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              <div className="game-space-between">
                <span style={{ color: '#9b8c70' }}>Level:</span>
                <span style={{ color: '#f1e5c8' }}>1</span>
              </div>
              <div className="game-space-between">
                <span style={{ color: '#9b8c70' }}>Gold:</span>
                <span style={{ color: '#d4af37' }}>
                  {wallet ? wallet.gold.toLocaleString() : '0'}
                </span>
              </div>
              <div className="game-space-between">
                <span style={{ color: '#9b8c70' }}>EXP:</span>
                <span style={{ color: '#f1e5c8' }}>0 / 100</span>
              </div>
              <div className="game-space-between">
                <span style={{ color: '#9b8c70' }}>Reputation:</span>
                <span style={{ color: '#6eb5ff' }}>Neutral</span>
              </div>
            </div>
            
            {/* Experience Bar */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ 
                background: '#1a1511',
                border: '1px solid #533b2c',
                borderRadius: '2px',
                height: '8px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: 'linear-gradient(90deg, #6eb5ff, #4a8acc)',
                  height: '100%',
                  width: '0%',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          </div>

          <div>
            <h1>{title}</h1>
            <div className="game-muted">{world.getTimeString()}</div>
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