'use client';

import { ReactNode, useEffect, useState } from 'react';
import GameButton from '@/components/ui/GameButton';
import GamePanel from '@/components/ui/GamePanel';
import { useGameWorld } from '@/lib/game/world';
import { useUserDataQuery } from '@/hooks/useUserDataQuery';
import { useMissions } from '@/hooks/useMissionsQuery';
import { ChatSystem } from '@/components/chat';
import HelpTooltip from '@/components/HelpTooltip';
import OnboardingTips from '@/components/OnboardingTips';
import '@/lib/game/styles.css';

interface GameLayoutProps {
  title: string;
  children: ReactNode;
  sidebar?: ReactNode;
  showChat?: boolean;
  chatInitialChannel?: 'general' | 'trade' | 'guild';
  guildChannels?: Array<{
    id: string;
    name: string;
    description?: string;
    roleRequired?: string;
  }>;
}

export default function GameLayout({
  title,
  children,
  sidebar,
  showChat = true,
  chatInitialChannel = 'general',
  guildChannels = []
}: GameLayoutProps) {
  const { world, subscribe } = useGameWorld();
  const { wallet, inventory, user } = useUserDataQuery();
  const { data: missionsData } = useMissions();
  const [, forceUpdate] = useState(0);
  const [currentPath, setCurrentPath] = useState('');
  const [username, setUsername] = useState<string>('Anonymous Trader');
  const [userGuildChannels, setUserGuildChannels] = useState<Array<{
    id: string;
    name: string;
    description?: string;
    roleRequired?: string;
  }>>([]);

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

  // Load username and guild info from profile
  useEffect(() => {
    const loadUserData = async () => {
      if (user?.id) {
        try {
          const { supabase } = await import('@/lib/supabaseClient');
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.access_token) {
            // Load profile info
            const profileResponse = await fetch('/api/profile', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            });
            
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              if (profileData.profile?.display) {
                setUsername(profileData.profile.display);
              }
            }

            // Load guild info
            const guildResponse = await fetch('/api/guild/info', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            });
            
            if (guildResponse.ok) {
              const guildData = await guildResponse.json();
              if (guildData.success && guildData.inGuild && guildData.guild?.channels) {
                setUserGuildChannels(guildData.guild.channels);
              }
            }
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }
    };
    
    loadUserData();
  }, [user]);

  const navigation = [
    { href: '/hub', label: 'Hub' },
    { href: '/hub-travel', label: 'Hub Travel' },
    { href: '/auction', label: 'Auction' },
    { href: '/missions', label: 'Missions' },
    { href: '/agents', label: 'Agents' },
    { href: '/crafting', label: 'Crafting' },
    { href: '/contracts', label: 'Contracts' },
    { href: '/warehouse', label: 'Warehouse' },
    { href: '/inventory', label: 'Inventory' },
    { href: '/guild', label: 'Guild' },
    { href: '/world-map', label: 'World Map' },
    { href: '/help', label: '❓ Help' },
  ];

  return (
    <div className="game">
      <div className="game-container">
        <GamePanel side="left" style={{ height: 'calc(100vh - 24px)', overflow: 'auto' }}>

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
              {!wallet && user && (
                <div style={{ marginTop: '8px' }}>
                  <GameButton 
                    onClick={async () => {
                      try {
                        const session = await import('@/lib/supabaseClient').then(m => m.supabase.auth.getSession());
                        const token = session.data.session?.access_token;
                        if (!token) return;
                        
                        const response = await fetch('/api/user/wallet/create', {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        if (response.ok) {
                          window.location.reload();
                        }
                      } catch (error) {
                        console.error('Failed to create wallet:', error);
                      }
                    }}
                    variant="warning"
                    size="small"
                  >
                    💰 Create Wallet
                  </GameButton>
                </div>
              )}
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
            <div className="game-flex" style={{ alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <h3>Quick Stats</h3>
              <HelpTooltip 
                content="Overview of your current activities. Click items for quick navigation."
                position="right"
              />
            </div>
            <div className="game-flex-col">
              <div className="game-space-between">
                <span>
                  Warehouse Items:
                  <HelpTooltip 
                    content="Items in your personal warehouse storage. Click to visit warehouse."
                    position="top"
                    maxWidth="160px"
                  />
                </span>
                <a href="/warehouse" style={{ color: '#f1e5c8', textDecoration: 'none' }}>
                  {inventory?.totalItems || Object.keys(world.warehouse).length}
                </a>
              </div>
              <div className="game-space-between">
                <span>
                  Active Listings:
                  <HelpTooltip 
                    content="Items you have listed for sale on the auction house."
                    position="top"
                    maxWidth="160px"
                  />
                </span>
                <a href="/auction" style={{ color: '#f1e5c8', textDecoration: 'none' }}>
                  {world.listings.length}
                </a>
              </div>
              <div className="game-space-between">
                <span>
                  Active Missions:
                  <HelpTooltip 
                    content="Agents currently out on missions. Check mission control for details."
                    position="top"
                    maxWidth="160px"
                  />
                </span>
                <a href="/missions" style={{ color: '#f1e5c8', textDecoration: 'none' }}>
                  {missionsData?.activeMissions?.length || world.missions.length}
                </a>
              </div>
              <div className="game-space-between">
                <span>
                  Crafting Jobs:
                  <HelpTooltip 
                    content="Items currently being crafted. Visit crafting to collect completed jobs."
                    position="top"
                    maxWidth="160px"
                  />
                </span>
                <a href="/crafting" style={{ color: '#f1e5c8', textDecoration: 'none' }}>
                  {world.crafting.length}
                </a>
              </div>
            </div>
          </div>

          {sidebar && (
            <div>
              {sidebar}
            </div>
          )}

          <div>
            <GameButton 
              variant="warning" 
              onClick={() => world.tick()}
              style={{ width: '100%' }}
            >
              Advance Time (+10 min)
            </GameButton>
          </div>
        </GamePanel>

        <GamePanel side="right" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 24px)' }}>
          {/* Main Content Area */}
          <div style={{ flex: '1', overflow: 'hidden', paddingBottom: '16px', minHeight: 0 }}>
            {children}
          </div>
          
          {/* Chat Area - Fixed at Bottom */}
          {showChat && (
            <div style={{ 
              height: '350px', 
              minHeight: '350px',
              maxHeight: '350px',
              borderTop: '2px solid #533b2c',
              paddingTop: '8px',
              flexShrink: 0
            }}>
              <ChatSystem
                initialChannel={chatInitialChannel}
                guildChannels={userGuildChannels.length > 0 ? userGuildChannels : guildChannels}
                isCompact={true}
                className=""
              />
            </div>
          )}
        </GamePanel>
      </div>
      
      {/* Onboarding system - appears globally */}
      <OnboardingTips />
    </div>
  );
}