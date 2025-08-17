'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Menu, X, MessageSquare, User, Home, Package, Hammer, Map, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameWorld } from '@/lib/game/world';
import { useUserDataQuery } from '@/hooks/useUserDataQuery';
import { useMissions } from '@/hooks/useMissionsQuery';
import { ChatSystem } from '@/components/chat';
import CharacterViewer from './CharacterViewer';
import { loadCharacterAppearance } from '@/lib/sprites/characterOptions';
import { CharacterAppearance } from '@/lib/sprites/characterSprites';

interface MobileGameLayoutProps {
  title: string;
  children: ReactNode;
  sidebar?: ReactNode;
  showCharacterViewer?: boolean;
  characterActivity?: 'idle' | 'walking' | 'trading' | 'crafting' | 'combat' | 'mission';
  characterLocation?: string;
  showChat?: boolean;
  chatInitialChannel?: 'general' | 'trade' | 'guild';
}

const mobileNavItems = [
  { href: '/hub', label: 'Hub', icon: Home },
  { href: '/missions', label: 'Missions', icon: Map },
  { href: '/market', label: 'Market', icon: Store },
  { href: '/warehouse', label: 'Items', icon: Package },
  { href: '/crafting', label: 'Craft', icon: Hammer },
];

export default function MobileGameLayout({
  title,
  children,
  sidebar,
  showCharacterViewer = true,
  characterActivity = 'idle',
  characterLocation = 'Hub',
  showChat = true,
  chatInitialChannel = 'general',
}: MobileGameLayoutProps) {
  const { world } = useGameWorld();
  const { wallet, user } = useUserDataQuery();
  const { data: missionsData } = useMissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [characterAppearance, setCharacterAppearance] = useState<CharacterAppearance | null>(null);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    setCurrentPath(window.location.pathname);
    
    // Load character appearance
    const loadAppearance = async () => {
      try {
        const defaultAppearance = loadCharacterAppearance();
        setCharacterAppearance(defaultAppearance);
      } catch (error) {
        console.error('Error loading character:', error);
      }
    };
    loadAppearance();
  }, []);

  const activeMissions = missionsData?.activeMissions?.length || 0;

  return (
    <div className="min-h-screen bg-[#231913] text-[#f1e5c8]">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#32241d] border-b-2 border-[#533b2c]">
        <div className="flex items-center justify-between p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-[#f1e5c8]"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          
          <div className="text-center flex-1">
            <h1 className="text-lg font-bold">{title}</h1>
            <div className="text-xs text-[#c7b38a]">{world.getTimeString()}</div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {wallet?.gold || 0}g
            </Badge>
            {showChat && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChatOpen(!chatOpen)}
                className="text-[#f1e5c8]"
              >
                <MessageSquare className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)}>
          <div 
            className="fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[#32241d] border-r-2 border-[#533b2c] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 space-y-4">
              {/* Character Preview */}
              {showCharacterViewer && characterAppearance && (
                <Card className="bg-[#2e231d] border-[#4b3527] p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-[#1a1511] rounded border border-[#533b2c]">
                      <CharacterViewer 
                        appearance={characterAppearance}
                        scale={1}
                        animation="idle"
                        direction="down"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold">{user?.email?.split('@')[0] || 'Trader'}</div>
                      <div className="text-xs text-[#c7b38a]">Level 1</div>
                      <div className="text-xs text-[#d4af37]">{wallet?.gold || 0} gold</div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Quick Stats */}
              <Card className="bg-[#2e231d] border-[#4b3527] p-3">
                <h3 className="font-bold mb-2">Quick Stats</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#c7b38a]">Missions:</span>
                    <span>{activeMissions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#c7b38a]">Location:</span>
                    <span>{characterLocation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#c7b38a]">Activity:</span>
                    <span>{characterActivity}</span>
                  </div>
                </div>
              </Card>

              {/* Custom Sidebar Content */}
              {sidebar && (
                <Card className="bg-[#2e231d] border-[#4b3527] p-3">
                  {sidebar}
                </Card>
              )}

              {/* Game Actions */}
              <Button 
                className="w-full bg-[#7b4b2d] hover:bg-[#8b5b3d] text-[#f1e5c8]"
                onClick={() => world.tick()}
              >
                Advance Time (+10 min)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pt-16 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#32241d] border-t-2 border-[#533b2c]">
        <div className="flex justify-around items-center py-2">
          {mobileNavItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPath === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center p-2 ${
                  isActive ? 'text-[#d4af37]' : 'text-[#c7b38a]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs mt-1">{item.label}</span>
              </a>
            );
          })}
        </div>
      </nav>

      {/* Mobile Chat Overlay */}
      {showChat && chatOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setChatOpen(false)}>
          <div 
            className="fixed bottom-0 left-0 right-0 h-[70vh] bg-[#32241d] border-t-2 border-[#533b2c]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-[#533b2c]">
              <h3 className="font-bold">Chat</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChatOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="h-[calc(100%-50px)]">
              <ChatSystem
                initialChannel={chatInitialChannel}
                isCompact={false}
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}