'use client';

import React, { useEffect, useState } from 'react';
import GameButton from '@/components/ui/GameButton';
import GamePanel from '@/components/ui/GamePanel';
import { useGameWorld } from '@/lib/game/world';
import { useUserDataQuery } from '@/hooks/useUserDataQuery';
import { useMissions } from '@/hooks/useMissionsQuery';
import { useMobile } from '@/hooks/useMobile';
import { ChatSystem } from '@/components/chat';
import HelpTooltip from '@/components/HelpTooltip';
import OnboardingTips from '@/components/OnboardingTips';
import { CharacterAppearance } from '@/lib/sprites/characterSprites';
import { loadCharacterAppearance } from '@/lib/sprites/characterOptions';
import '@/lib/game/styles.css';

interface GameLayoutProps {
  title: string;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  showChat?: boolean;
  chatInitialChannel?: 'general' | 'trade' | 'guild';
  guildChannels?: Array<{
    id: string;
    name: string;
    description?: string;
    roleRequired?: string;
  }>;
  hideActiveJobs?: boolean;
}

export default function GameLayout({
  title,
  children,
  sidebar,
  showChat = true,
  chatInitialChannel = 'general',
  guildChannels = [],
  hideActiveJobs = false
}: GameLayoutProps) {
  const { world, subscribe } = useGameWorld();
  const { wallet, inventory, user } = useUserDataQuery();
  const { data: missionsData } = useMissions();
  const { isMobile, isLoaded } = useMobile();
  const [, forceUpdate] = useState(0);
  const [currentPath, setCurrentPath] = useState('');
  const [username, setUsername] = useState<string>('Anonymous Trader');
  const [characterAppearance, setCharacterAppearance] = useState<CharacterAppearance | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(isMobile);
  const [userGuildChannels, setUserGuildChannels] = useState<Array<{
    id: string;
    name: string;
    description?: string;
    roleRequired?: string;
  }>>([]);
  const [unreadMailCount, setUnreadMailCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

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

            // Check if user is admin
            const adminEmails = ['kdln@live.com'];
            setIsAdmin(adminEmails.includes(session.user.email || ''));

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

            // Load unread mail count
            const mailResponse = await fetch('/api/mail/folders', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            });
            
            if (mailResponse.ok) {
              const mailData = await mailResponse.json();
              const inboxFolder = mailData.folders?.find((f: any) => f.id === 'inbox');
              if (inboxFolder) {
                setUnreadMailCount(inboxFolder.unreadCount || 0);
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
    { href: '/auction', label: 'Auction' },
    { href: '/missions', label: 'Missions' },
    { href: '/agents', label: 'Agents' },
    { href: '/crafting', label: 'Crafting' },
    { href: '/contracts', label: 'Contracts' },
    { href: '/storage', label: 'Storage' },
    { 
      href: '/mail', 
      label: unreadMailCount > 0 ? `📧 Mail (${unreadMailCount})` : '📧 Mail' 
    },
    { href: '/guild', label: 'Guild' },
    { href: '/help', label: '❓ Help' },
    ...(isAdmin ? [{ href: '/admin', label: '⚙️ Admin' }] : []),
  ];

  // Don't render until mobile detection is complete
  if (!isLoaded) {
    return (
      <div className="game">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          color: '#f1e5c8'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="game">
      {/* Mobile Header with Menu Toggle */}
      {isMobile && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          background: '#2a1f1a',
          border: '2px solid #533b2c',
          padding: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: '16px', color: '#f1e5c8' }}>{title}</h1>
          <GameButton
            size="small"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '☰' : '✕'}
          </GameButton>
        </div>
      )}
      
      <div className="game-container">
        <GamePanel 
          side="left" 
          style={{ 
            height: isMobile ? 'auto' : 'calc(100vh - 24px)', 
            overflow: 'auto',
            display: isMobile && sidebarCollapsed ? 'none' : 'block'
          }}
        >

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
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
              gap: isMobile ? '4px' : '8px', 
              fontSize: isMobile ? '11px' : '12px' 
            }}>
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

          {!isMobile && (
            <div>
              <h1>{title}</h1>
              <div className="game-muted">{world.getTimeString()}</div>
            </div>
          )}
          
          {isMobile && (
            <div>
              <div className="game-muted">{world.getTimeString()}</div>
            </div>
          )}

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
            </div>
          </div>

          {sidebar && (
            <div>
              {sidebar}
            </div>
          )}

        </GamePanel>

        <GamePanel 
          side="right" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: isMobile ? 'auto' : 'calc(100vh - 24px)',
            minHeight: isMobile ? '50vh' : 'auto'
          }}
        >
          {/* Main Content Area */}
          <div style={{ flex: '1', overflow: 'hidden', paddingBottom: '16px', minHeight: 0 }}>
            {children}
          </div>
          
          {/* Active Jobs Section - Right Sidebar */}
          {!hideActiveJobs && (
            <div style={{ 
              background: 'rgba(83, 59, 44, 0.2)',
              border: '1px solid #533b2c',
              borderRadius: '4px',
              padding: '8px',
              marginBottom: '8px',
              flexShrink: 0
            }}>
              <h4 style={{ marginBottom: '8px', color: '#f1e5c8', fontSize: '14px' }}>Active Jobs</h4>
              <div className="game-space-between" style={{ marginBottom: '4px' }}>
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
          )}
          
          {/* Chat Area - Fixed at Bottom */}
          {showChat && (
            <>
              {isMobile && (
                <div style={{ 
                  borderTop: '2px solid #533b2c',
                  padding: '4px 0',
                  textAlign: 'center'
                }}>
                  <GameButton
                    size="small"
                    onClick={() => setChatCollapsed(!chatCollapsed)}
                  >
                    {chatCollapsed ? '💬 Show Chat' : '💬 Hide Chat'}
                  </GameButton>
                </div>
              )}
              
              {!chatCollapsed && (
                <div style={{ 
                  height: isMobile ? '250px' : '350px', 
                  minHeight: isMobile ? '250px' : '350px',
                  maxHeight: isMobile ? '250px' : '350px',
                  borderTop: isMobile ? 'none' : '2px solid #533b2c',
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
            </>
          )}
        </GamePanel>
      </div>
      
      {/* Onboarding system - appears globally */}
      <OnboardingTips />
    </div>
  );
}