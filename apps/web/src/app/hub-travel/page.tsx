'use client';

import { useState } from 'react';
import GameLayout from '@/components/GameLayout';

// Enhanced mock data with guild control, contest features, and nation placement
const mockHubs = [
  { 
    id: 'verdant', 
    name: 'Verdant Grove', 
    x: 180, 
    y: 140, 
    nation: 'Verdania',
    owner: 'NPC', 
    safetyRating: 95, 
    taxRate: 5, 
    specialties: ['Herbs', 'Lumber', 'Pelts'],
    controlStatus: 'stable',
    dailyRevenue: 450,
    tradeVolume: 12500
  },
  { 
    id: 'capital', 
    name: 'Aurelian Capital', 
    x: 370, 
    y: 180, 
    nation: 'Aurelia',
    owner: 'Crown Guild', 
    safetyRating: 99, 
    taxRate: 8, 
    specialties: ['Pearls', 'Relics', 'Silk'],
    controlStatus: 'under_contest',
    contestChallenger: 'Iron Brotherhood',
    contestTimeLeft: '3d 14h',
    contestLeader: 'Crown Guild',
    contestScore: { 'Crown Guild': 8420, 'Iron Brotherhood': 6890 },
    dailyRevenue: 1250,
    tradeVolume: 28900
  },
  { 
    id: 'trading-post', 
    name: 'Crossroads Market', 
    x: 320, 
    y: 110, 
    nation: 'Aurelia',
    owner: 'Merchant Alliance', 
    safetyRating: 85, 
    taxRate: 6, 
    specialties: ['Hide', 'Tools', 'Grain'],
    controlStatus: 'stable',
    dailyRevenue: 680,
    tradeVolume: 15600
  },
  { 
    id: 'frontier', 
    name: 'Frontier Outpost', 
    x: 520, 
    y: 260, 
    nation: 'Frontier',
    owner: 'NPC', 
    safetyRating: 60, 
    taxRate: 3, 
    specialties: ['Rare Metals', 'Gems', 'Exotic Goods'],
    controlStatus: 'unclaimed',
    dailyRevenue: 320,
    tradeVolume: 4200
  },
  { 
    id: 'mining-camp', 
    name: 'Iron Hollow', 
    x: 140, 
    y: 280, 
    nation: 'Ironlands',
    owner: 'Iron Brotherhood', 
    safetyRating: 70, 
    taxRate: 4, 
    specialties: ['Iron Ore', 'Coal', 'Weapons'],
    controlStatus: 'recently_captured',
    captureDate: '2d ago',
    dailyRevenue: 520,
    tradeVolume: 9800
  },
  {
    id: 'silk-road',
    name: 'Eastern Gateway',
    x: 480,
    y: 140,
    nation: 'Frontier',
    owner: 'NPC',
    safetyRating: 75,
    taxRate: 4,
    specialties: ['Silk', 'Spices', 'Ivory'],
    controlStatus: 'unclaimed',
    dailyRevenue: 390,
    tradeVolume: 7100
  },
  {
    id: 'woodland-keep',
    name: 'Woodland Keep',
    x: 210,
    y: 100,
    nation: 'Verdania',
    owner: 'Forest Wardens',
    safetyRating: 88,
    taxRate: 3,
    specialties: ['Lumber', 'Medicinal Herbs', 'Bows'],
    controlStatus: 'stable',
    dailyRevenue: 380,
    tradeVolume: 8900
  },
  {
    id: 'imperial-port',
    name: 'Imperial Port',
    x: 420,
    y: 220,
    nation: 'Aurelia',
    owner: 'Harbor Masters',
    safetyRating: 92,
    taxRate: 7,
    specialties: ['Fish', 'Salt', 'Naval Supplies'],
    controlStatus: 'stable',
    dailyRevenue: 890,
    tradeVolume: 21400
  }
];

const mockRoads = [
  { 
    from: 'verdant', 
    to: 'capital', 
    owner: 'Crown Guild', 
    toll: 15, 
    safety: 90, 
    traffic: 'High',
    path: 'M200,150 Q280,120 320,160 Q360,180 400,200' // Curved path around hills
  },
  { 
    from: 'verdant', 
    to: 'trading-post', 
    owner: 'Merchant Alliance', 
    toll: 10, 
    safety: 85, 
    traffic: 'Medium',
    path: 'M200,150 Q220,110 260,105 Q285,100 300,100' // Following river valley
  },
  { 
    from: 'capital', 
    to: 'frontier', 
    owner: null, 
    toll: 0, 
    safety: 45, 
    traffic: 'Low',
    path: 'M400,200 Q430,220 460,250 Q480,280 500,300' // Winding through dangerous terrain
  },
  { 
    from: 'trading-post', 
    to: 'mining-camp', 
    owner: 'Iron Brotherhood', 
    toll: 8, 
    safety: 75, 
    traffic: 'Medium',
    path: 'M300,100 Q250,130 220,180 Q190,220 150,250' // Mountain pass route
  },
];

const mockCaravans = [
  { id: 'caravan1', name: 'Iron Hauler', location: 'verdant', cargo: ['Iron Ore x50'], escort: 3, supplies: 85 },
  { id: 'caravan2', name: 'Swift Trader', location: 'capital', cargo: ['Herbs x30', 'Pearls x10'], escort: 2, supplies: 92 },
  { id: 'caravan3', name: 'Heavy Guard', location: 'trading-post', cargo: ['Hide x75'], escort: 5, supplies: 78 },
];

export default function HubTravelPage() {
  const [selectedCaravan, setSelectedCaravan] = useState<string | null>(null);
  const [selectedHub, setSelectedHub] = useState<string | null>(null);
  const [hoveredHub, setHoveredHub] = useState<string | null>(null);
  const [showOwnershipLayer, setShowOwnershipLayer] = useState(false);
  const [showContestLayer, setShowContestLayer] = useState(false);
  const [pathDrawingMode, setPathDrawingMode] = useState(false);
  const [drawingPath, setDrawingPath] = useState<Array<{x: number, y: number}>>([]);
  const [mapFilter, setMapFilter] = useState<'all' | 'unclaimed' | 'contested' | 'stable'>('all');

  const selectedCaravanData = mockCaravans.find(c => c.id === selectedCaravan);
  const selectedHubData = mockHubs.find(h => h.id === selectedHub);
  const hoveredHubData = mockHubs.find(h => h.id === hoveredHub);

  const getAvailableRoutes = (caravanLocation: string) => {
    return mockRoads.filter(road => 
      road.from === caravanLocation || road.to === caravanLocation
    );
  };

  const getHubColor = (hub: any) => {
    if (showContestLayer) {
      if (hub.controlStatus === 'under_contest') return '#e53e3e';
      if (hub.controlStatus === 'recently_captured') return '#d69e2e';
      if (hub.controlStatus === 'unclaimed') return '#8b6f31';
      return '#68b06e';
    }
    if (showOwnershipLayer) {
      if (hub.owner === 'NPC') return '#8b6f31';
      if (hub.owner.includes('Guild')) return '#c5a572';
      return '#f1e5c8';
    }
    return hub.safetyRating > 80 ? '#68b06e' : hub.safetyRating > 60 ? '#d69e2e' : '#e53e3e';
  };

  const filteredHubs = mockHubs.filter(hub => {
    if (mapFilter === 'all') return true;
    if (mapFilter === 'unclaimed') return hub.controlStatus === 'unclaimed';
    if (mapFilter === 'contested') return hub.controlStatus === 'under_contest';
    if (mapFilter === 'stable') return hub.controlStatus === 'stable';
    return true;
  });

  const handleMapClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!pathDrawingMode) return;
    
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 600;
    const y = ((event.clientY - rect.top) / rect.height) * 400;
    
    setDrawingPath(prev => [...prev, {x, y}]);
  };

  const getRoadColor = (road: any) => {
    if (road.owner) {
      return road.safety > 80 ? '#38a169' : '#d69e2e';
    }
    return '#e53e3e'; // Wild paths
  };

  return (
    <GameLayout title="Hub & Path Travel">
      <div className="game-flex-col">
        <div className="game-space-between" style={{ marginBottom: '1rem' }}>
          <div>
            <h2>Hub & Path Travel</h2>
            <p className="game-muted">Plan routes, manage caravans, and control territory</p>
          </div>
          
          <div className="game-flex" style={{ gap: '0.5rem' }}>
            <select 
              value={mapFilter} 
              onChange={(e) => setMapFilter(e.target.value as any)}
              className="game-input"
              style={{ padding: '0.5rem' }}
            >
              <option value="all">All Hubs</option>
              <option value="unclaimed">Unclaimed</option>
              <option value="contested">Under Contest</option>
              <option value="stable">Stable Control</option>
            </select>
            
            <button
              onClick={() => setShowOwnershipLayer(!showOwnershipLayer)}
              className={`game-btn ${showOwnershipLayer ? 'game-btn-primary' : 'game-btn-secondary'}`}
            >
              {showOwnershipLayer ? 'Hide' : 'Show'} Ownership
            </button>
            
            <button
              onClick={() => setShowContestLayer(!showContestLayer)}
              className={`game-btn ${showContestLayer ? 'game-btn-primary' : 'game-btn-secondary'}`}
            >
              {showContestLayer ? 'Hide' : 'Show'} Contests
            </button>
            
            <button
              onClick={() => {
                setPathDrawingMode(!pathDrawingMode);
                setDrawingPath([]);
              }}
              className={`game-btn ${pathDrawingMode ? 'game-btn-primary' : 'game-btn-secondary'}`}
            >
              {pathDrawingMode ? 'Exit' : 'Draw'} Path
            </button>
            
            {pathDrawingMode && drawingPath.length > 0 && (
              <button
                onClick={() => setDrawingPath([])}
                className="game-btn game-btn-secondary"
              >
                Clear Path
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1rem' }}>
          {/* Map Canvas */}
          <div className="game-card">
            <h3>Trade Route Map</h3>
            
            {/* Map SVG */}
            <div style={{ 
              position: 'relative', 
              background: `
                radial-gradient(ellipse at 30% 20%, rgba(45, 80, 22, 0.15) 0%, transparent 50%),
                radial-gradient(ellipse at 70% 10%, rgba(90, 74, 58, 0.2) 0%, transparent 40%),
                radial-gradient(ellipse at 85% 40%, rgba(139, 111, 49, 0.15) 0%, transparent 60%),
                radial-gradient(ellipse at 20% 80%, rgba(90, 74, 58, 0.2) 0%, transparent 50%),
                linear-gradient(145deg, 
                  #f5e8d2 0%, 
                  #ead2b5 15%,
                  #ddc49a 30%, 
                  #d0b582 45%,
                  #c2a66a 60%,
                  #b89968 80%,
                  #a68550 100%
                )
              `, 
              borderRadius: '8px', 
              height: '400px',
              border: '3px solid #533b2c',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)'
            }}>
              <svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 600 400" 
                style={{ position: 'absolute', top: 0, left: 0, cursor: pathDrawingMode ? 'crosshair' : 'default' }}
                onClick={handleMapClick}
              >
                {/* Enhanced terrain features and patterns */}
                <defs>
                  {/* Brightened elevation gradients */}
                  <radialGradient id="mountainGradient" cx="50%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#9a8a7a" stopOpacity="0.4"/>
                    <stop offset="50%" stopColor="#7a6a5a" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#5a4a3a" stopOpacity="0.2"/>
                  </radialGradient>
                  
                  <radialGradient id="forestGradient" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor="#6a8b4a" stopOpacity="0.4"/>
                    <stop offset="70%" stopColor="#4d7036" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#3a5030" stopOpacity="0.15"/>
                  </radialGradient>
                  
                  <linearGradient id="riverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8baacc" stopOpacity="0.7"/>
                    <stop offset="50%" stopColor="#6a8baa" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#5a7a9a" stopOpacity="0.7"/>
                  </linearGradient>
                  
                  {/* Lighter texture patterns */}
                  <pattern id="forest" patternUnits="userSpaceOnUse" width="25" height="25">
                    <circle cx="8" cy="8" r="3" fill="#4d7036" opacity="0.25"/>
                    <circle cx="18" cy="12" r="2" fill="#5a8040" opacity="0.2"/>
                    <circle cx="12" cy="18" r="2.5" fill="#4d7036" opacity="0.22"/>
                    <circle cx="5" cy="20" r="1.5" fill="#6a9050" opacity="0.18"/>
                  </pattern>
                  
                  <pattern id="mountains" patternUnits="userSpaceOnUse" width="40" height="20">
                    <polygon points="0,20 10,5 20,20" fill="#8a7a6a" opacity="0.3"/>
                    <polygon points="15,20 25,3 35,20" fill="#7a6a5a" opacity="0.35"/>
                    <polygon points="30,20 40,8 50,20" fill="#9a8a7a" opacity="0.25"/>
                  </pattern>
                  
                  <pattern id="hills" patternUnits="userSpaceOnUse" width="30" height="15">
                    <ellipse cx="15" cy="12" rx="10" ry="3" fill="#c6a570" opacity="0.25"/>
                    <ellipse cx="8" cy="10" rx="6" ry="2" fill="#d8b988" opacity="0.2"/>
                    <ellipse cx="22" cy="11" rx="5" ry="2" fill="#ba9d68" opacity="0.22"/>
                  </pattern>
                  
                  {/* Parchment texture */}
                  <filter id="parchmentFilter" x="0%" y="0%" width="100%" height="100%">
                    <feTurbulence baseFrequency="0.9" numOctaves="4" result="noise"/>
                    <feColorMatrix in="noise" type="saturate" values="0"/>
                    <feComponentTransfer>
                      <feFuncA type="discrete" tableValues="0.1 0.05 0.15 0.08 0.12"/>
                    </feComponentTransfer>
                    <feComposite operator="multiply" in2="SourceGraphic"/>
                  </filter>
                  
                  {/* Medieval compass rose */}
                  <g id="compassRose">
                    <circle r="25" fill="none" stroke="#8b6f31" strokeWidth="2" opacity="0.6"/>
                    <path d="M0,-20 L5,-5 L0,0 L-5,-5 Z" fill="#8b6f31" opacity="0.8"/>
                    <path d="M20,0 L5,5 L0,0 L5,-5 Z" fill="#8b6f31" opacity="0.6"/>
                    <path d="M0,20 L5,5 L0,0 L-5,5 Z" fill="#8b6f31" opacity="0.6"/>
                    <path d="M-20,0 L-5,5 L0,0 L-5,-5 Z" fill="#8b6f31" opacity="0.6"/>
                    <text y="-30" textAnchor="middle" fontSize="12" fill="#8b6f31" opacity="0.8" style={{ fontWeight: 'bold' }}>N</text>
                  </g>
                  
                  {/* Enhanced nation territory patterns */}
                  <pattern id="verdania-pattern" patternUnits="userSpaceOnUse" width="50" height="50">
                    <rect width="50" height="50" fill="#2d5016" opacity="0.08"/>
                    <circle cx="15" cy="15" r="2" fill="#3a6020" opacity="0.15"/>
                    <circle cx="35" cy="25" r="1.5" fill="#4a7030" opacity="0.12"/>
                    <circle cx="25" cy="40" r="1" fill="#2d5016" opacity="0.1"/>
                  </pattern>
                  <pattern id="aurelia-pattern" patternUnits="userSpaceOnUse" width="40" height="40">
                    <rect width="40" height="40" fill="#4a6b8a" opacity="0.08"/>
                    <polygon points="20,8 28,20 20,32 12,20" fill="#5a7b9a" opacity="0.12"/>
                    <circle cx="10" cy="10" r="1" fill="#6a8baa" opacity="0.1"/>
                    <circle cx="30" cy="30" r="1" fill="#6a8baa" opacity="0.1"/>
                  </pattern>
                  <pattern id="ironlands-pattern" patternUnits="userSpaceOnUse" width="35" height="35">
                    <rect width="35" height="35" fill="#5a4a3a" opacity="0.08"/>
                    <rect x="8" y="8" width="4" height="4" fill="#6a5a4a" opacity="0.15"/>
                    <rect x="20" y="15" width="3" height="3" fill="#7a6a5a" opacity="0.12"/>
                    <rect x="15" y="25" width="2" height="2" fill="#5a4a3a" opacity="0.1"/>
                  </pattern>
                  <pattern id="frontier-pattern" patternUnits="userSpaceOnUse" width="45" height="45">
                    <rect width="45" height="45" fill="#8b6f31" opacity="0.06"/>
                    <path d="M0,45 L15,30 L30,45 L45,30" stroke="#9b7f41" strokeWidth="1" opacity="0.15" fill="none"/>
                    <path d="M15,0 L30,15 L45,0" stroke="#ab8f51" strokeWidth="1" opacity="0.12" fill="none"/>
                  </pattern>
                </defs>
                
                {/* Nation Territories */}
                {/* Verdania - Northwestern forest kingdom */}
                <path
                  d="M50,50 Q150,40 250,60 L280,120 Q260,180 200,200 L120,220 Q80,150 50,50Z"
                  fill="url(#verdania-pattern)"
                  stroke="#2d5016"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                  opacity="0.6"
                />
                
                {/* Aurelia - Central empire */}
                <path
                  d="M250,60 Q350,50 450,80 L480,150 Q460,220 400,250 L320,240 Q290,180 280,120 Z"
                  fill="url(#aurelia-pattern)"
                  stroke="#4a6b8a"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                  opacity="0.6"
                />
                
                {/* Ironlands - Southwestern mining territory */}
                <path
                  d="M50,220 Q120,210 200,200 L240,280 Q200,350 120,370 L80,320 Q60,270 50,220Z"
                  fill="url(#ironlands-pattern)"
                  stroke="#5a4a3a"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                  opacity="0.6"
                />
                
                {/* Eastern Frontier - Wild eastern lands */}
                <path
                  d="M450,80 Q520,70 580,90 L590,180 Q570,280 520,350 L460,340 Q440,290 400,250 L450,150 Z"
                  fill="url(#frontier-pattern)"
                  stroke="#8b6f31"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                  opacity="0.6"
                />
                
                {/* Brighter Nation Labels */}
                <text x="150" y="130" textAnchor="middle" fontSize="16" fill="#1a3010" opacity="0.9" style={{ fontWeight: 'bold', fontStyle: 'italic', textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}>
                  VERDANIA
                </text>
                <text x="150" y="145" textAnchor="middle" fontSize="10" fill="#1a3010" opacity="0.8" style={{ textShadow: '1px 1px 1px rgba(255,255,255,0.6)' }}>
                  Forest Kingdom
                </text>
                
                <text x="370" y="150" textAnchor="middle" fontSize="16" fill="#2a4b6a" opacity="0.9" style={{ fontWeight: 'bold', fontStyle: 'italic', textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}>
                  AURELIA
                </text>
                <text x="370" y="165" textAnchor="middle" fontSize="10" fill="#2a4b6a" opacity="0.8" style={{ textShadow: '1px 1px 1px rgba(255,255,255,0.6)' }}>
                  Central Empire
                </text>
                
                <text x="140" y="290" textAnchor="middle" fontSize="16" fill="#3a2a1a" opacity="0.9" style={{ fontWeight: 'bold', fontStyle: 'italic', textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}>
                  IRONLANDS
                </text>
                <text x="140" y="305" textAnchor="middle" fontSize="10" fill="#3a2a1a" opacity="0.8" style={{ textShadow: '1px 1px 1px rgba(255,255,255,0.6)' }}>
                  Mining Clans
                </text>
                
                <text x="510" y="200" textAnchor="middle" fontSize="16" fill="#6b5f21" opacity="0.9" style={{ fontWeight: 'bold', fontStyle: 'italic', textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}>
                  FRONTIER
                </text>
                <text x="510" y="215" textAnchor="middle" fontSize="10" fill="#6b5f21" opacity="0.8" style={{ textShadow: '1px 1px 1px rgba(255,255,255,0.6)' }}>
                  Untamed Lands
                </text>
                
                {/* Lighter mountain ranges */}
                <ellipse cx="180" cy="80" rx="70" ry="25" fill="url(#mountainGradient)" opacity="0.5"/>
                <ellipse cx="170" cy="75" rx="60" ry="20" fill="url(#mountains)" opacity="0.6"/>
                
                <ellipse cx="520" cy="320" rx="60" ry="30" fill="url(#mountainGradient)" opacity="0.4"/>
                <ellipse cx="515" cy="315" rx="50" ry="25" fill="url(#mountains)" opacity="0.5"/>
                
                {/* Lighter rolling hills */}
                <ellipse cx="300" cy="300" rx="80" ry="40" fill="url(#hills)" opacity="0.3"/>
                <ellipse cx="450" cy="200" rx="60" ry="30" fill="url(#hills)" opacity="0.25"/>
                <ellipse cx="120" cy="320" rx="50" ry="25" fill="url(#hills)" opacity="0.28"/>
                
                {/* Lighter coastal areas */}
                <path 
                  d="M0,350 Q100,340 200,350 Q300,360 400,350 Q500,340 600,345 L600,400 L0,400 Z" 
                  fill="#6a8baa" 
                  opacity="0.2"
                />
                <path 
                  d="M0,360 Q100,350 200,360 Q300,370 400,360 Q500,350 600,355" 
                  stroke="url(#riverGradient)" 
                  strokeWidth="3" 
                  fill="none" 
                  opacity="0.6"
                />
                
                {/* Lighter forest areas */}
                <ellipse cx="150" cy="160" rx="50" ry="40" fill="url(#forestGradient)" opacity="0.4"/>
                <ellipse cx="140" cy="150" rx="45" ry="35" fill="url(#forest)" opacity="0.5"/>
                
                <ellipse cx="220" cy="110" rx="35" ry="25" fill="url(#forestGradient)" opacity="0.35"/>
                <ellipse cx="215" cy="105" rx="30" ry="20" fill="url(#forest)" opacity="0.4"/>
                
                <ellipse cx="480" cy="120" rx="40" ry="30" fill="url(#forestGradient)" opacity="0.3"/>
                <ellipse cx="475" cy="115" rx="35" ry="25" fill="url(#forest)" opacity="0.35"/>
                
                {/* Lighter river system */}
                <path 
                  d="M30,180 Q120,170 200,160 Q280,150 360,140 Q440,135 520,130 Q580,125 600,120" 
                  stroke="url(#riverGradient)" 
                  strokeWidth="6" 
                  fill="none" 
                  opacity="0.6"
                  strokeLinecap="round"
                />
                
                {/* Lighter tributary rivers */}
                <path 
                  d="M150,200 Q170,180 200,160" 
                  stroke="url(#riverGradient)" 
                  strokeWidth="3" 
                  fill="none" 
                  opacity="0.5"
                />
                <path 
                  d="M320,180 Q340,160 360,140" 
                  stroke="url(#riverGradient)" 
                  strokeWidth="3" 
                  fill="none" 
                  opacity="0.5"
                />
                
                {/* Lighter lakes */}
                <ellipse cx="100" cy="250" rx="25" ry="15" fill="url(#riverGradient)" opacity="0.5"/>
                <ellipse cx="550" cy="180" rx="20" ry="12" fill="url(#riverGradient)" opacity="0.5"/>
                
                {/* Compass rose */}
                <g transform="translate(550, 50)">
                  <use href="#compassRose"/>
                </g>
                
                {/* Map border decorations */}
                <rect x="5" y="5" width="590" height="390" fill="none" stroke="#8b6f31" strokeWidth="3" opacity="0.4" strokeDasharray="10,5"/>
                <rect x="10" y="10" width="580" height="380" fill="none" stroke="#a68550" strokeWidth="1" opacity="0.6"/>
                
                {/* Much lighter parchment texture overlay */}
                <rect x="0" y="0" width="600" height="400" fill="url(#parchmentFilter)" opacity="0.1"/>
                {/* Roads */}
                {mockRoads.map((road, idx) => {
                  const fromHub = mockHubs.find(h => h.id === road.from);
                  const toHub = mockHubs.find(h => h.id === road.to);
                  if (!fromHub || !toHub) return null;
                  
                  // Calculate midpoint for traffic indicator (approximate center of curve)
                  const midX = (fromHub.x + toHub.x) / 2;
                  const midY = (fromHub.y + toHub.y) / 2;
                  
                  return (
                    <g key={idx}>
                      {/* Main road path */}
                      <path
                        d={road.path}
                        stroke={getRoadColor(road)}
                        strokeWidth={road.owner ? "6" : "3"}
                        strokeDasharray={road.owner ? "0" : "8,4"}
                        fill="none"
                        style={{ cursor: 'pointer' }}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      
                      {/* Road border for depth effect */}
                      <path
                        d={road.path}
                        stroke="#2d1810"
                        strokeWidth={road.owner ? "8" : "5"}
                        fill="none"
                        style={{ pointerEvents: 'none' }}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.3"
                      />
                      
                      {/* Traffic indicator */}
                      <circle
                        cx={midX}
                        cy={midY}
                        r={road.traffic === 'High' ? 5 : road.traffic === 'Medium' ? 4 : 3}
                        fill="rgba(139, 111, 49, 0.8)"
                        stroke="#f1e5c8"
                        strokeWidth="1"
                        style={{ pointerEvents: 'none' }}
                      />
                      <text
                        x={midX}
                        y={midY + 1}
                        textAnchor="middle"
                        fontSize="8"
                        fill="#f1e5c8"
                        style={{ pointerEvents: 'none', fontWeight: 'bold' }}
                      >
                        {road.traffic === 'High' ? '●●●' : road.traffic === 'Medium' ? '●●' : '●'}
                      </text>
                    </g>
                  );
                })}
                
                {/* Custom drawn path */}
                {pathDrawingMode && drawingPath.length > 1 && (
                  <path
                    d={`M${drawingPath[0].x},${drawingPath[0].y} ${drawingPath.slice(1).map(p => `L${p.x},${p.y}`).join(' ')}`}
                    stroke="#f1e5c8"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray="6,3"
                    opacity="0.8"
                  />
                )}
                
                {/* Path drawing points */}
                {pathDrawingMode && drawingPath.map((point, idx) => (
                  <circle
                    key={idx}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#f1e5c8"
                    stroke="#2d1810"
                    strokeWidth="2"
                  />
                ))}

                {/* Hubs */}
                {filteredHubs.map(hub => (
                  <g key={hub.id}>
                    {/* Hub base (settlement) */}
                    <circle
                      cx={hub.x}
                      cy={hub.y}
                      r="18"
                      fill={getHubColor(hub)}
                      stroke="#2d1810"
                      strokeWidth="3"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredHub(hub.id)}
                      onMouseLeave={() => setHoveredHub(null)}
                      onClick={() => setSelectedHub(hub.id)}
                    />
                    
                    {/* Inner settlement details */}
                    <circle
                      cx={hub.x}
                      cy={hub.y}
                      r="12"
                      fill="none"
                      stroke="#1a1511"
                      strokeWidth="1"
                      opacity="0.5"
                      style={{ pointerEvents: 'none' }}
                    />
                    
                    {/* Settlement buildings/towers */}
                    <rect
                      x={hub.x - 3}
                      y={hub.y - 8}
                      width="6"
                      height="8"
                      fill="#5a4a3a"
                      stroke="#2d1810"
                      strokeWidth="1"
                      style={{ pointerEvents: 'none' }}
                    />
                    <rect
                      x={hub.x - 1}
                      y={hub.y - 12}
                      width="2"
                      height="4"
                      fill="#6b5a4a"
                      style={{ pointerEvents: 'none' }}
                    />
                    
                    {/* Contest indicator */}
                    {hub.controlStatus === 'under_contest' && (
                      <g>
                        <circle
                          cx={hub.x}
                          cy={hub.y}
                          r="25"
                          fill="none"
                          stroke="#e53e3e"
                          strokeWidth="3"
                          strokeDasharray="5,3"
                          opacity="0.8"
                        >
                          <animate attributeName="stroke-dashoffset" values="0;8" dur="1s" repeatCount="indefinite"/>
                        </circle>
                        <text
                          x={hub.x + 30}
                          y={hub.y - 20}
                          fontSize="9"
                          fill="#e53e3e"
                          style={{ fontWeight: 'bold' }}
                        >
                          CONTESTED
                        </text>
                      </g>
                    )}
                    
                    {/* Recently captured indicator */}
                    {hub.controlStatus === 'recently_captured' && (
                      <text
                        x={hub.x + 25}
                        y={hub.y - 15}
                        fontSize="8"
                        fill="#d69e2e"
                        style={{ fontWeight: 'bold' }}
                      >
                        NEW
                      </text>
                    )}

                    {/* Hub name */}
                    <text
                      x={hub.x}
                      y={hub.y + 30}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#1a1511"
                      style={{ fontWeight: 'bold', textShadow: '1px 1px 0px #f1e5c8' }}
                    >
                      {hub.name}
                    </text>
                    
                    {/* Caravan indicators */}
                    {mockCaravans
                      .filter(caravan => caravan.location === hub.id)
                      .map((caravan, idx) => (
                        <g key={caravan.id}>
                          {/* Wagon body */}
                          <rect
                            x={hub.x - 10 + (idx * 8)}
                            y={hub.y - 30}
                            width="6"
                            height="4"
                            fill={selectedCaravan === caravan.id ? "#e53e3e" : "#8b6f31"}
                            stroke="#2d1810"
                            strokeWidth="1"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedCaravan(caravan.id)}
                          />
                          {/* Wagon wheels */}
                          <circle
                            cx={hub.x - 8 + (idx * 8)}
                            cy={hub.y - 25}
                            r="1.5"
                            fill="#5a4a3a"
                            stroke="#2d1810"
                            strokeWidth="0.5"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedCaravan(caravan.id)}
                          />
                          <circle
                            cx={hub.x - 5 + (idx * 8)}
                            cy={hub.y - 25}
                            r="1.5"
                            fill="#5a4a3a"
                            stroke="#2d1810"
                            strokeWidth="0.5"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedCaravan(caravan.id)}
                          />
                        </g>
                      ))}
                  </g>
                ))}
              </svg>

              {/* Hover tooltip */}
              {hoveredHub && hoveredHubData && (
                <div style={{
                  position: 'absolute',
                  background: 'black',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  pointerEvents: 'none',
                  zIndex: 10,
                  left: `${(hoveredHubData.x / 600) * 100}%`,
                  top: `${(hoveredHubData.y / 400) * 100 - 10}%`,
                  transform: 'translate(-50%, -100%)'
                }}>
                  <div style={{ fontWeight: 'bold' }}>{hoveredHubData.name}</div>
                  <div style={{ color: '#d69e2e', fontSize: '11px' }}>{hoveredHubData.nation}</div>
                  <div>Owner: {hoveredHubData.owner}</div>
                  <div>Safety: {hoveredHubData.safetyRating}%</div>
                  <div>Tax: {hoveredHubData.taxRate}%</div>
                  <div>Daily Revenue: {hoveredHubData.dailyRevenue}g</div>
                  <div>Trade Volume: {hoveredHubData.tradeVolume.toLocaleString()}g</div>
                  {hoveredHubData.controlStatus === 'under_contest' && (
                    <>
                      <div style={{ color: '#e53e3e', fontWeight: 'bold', marginTop: '4px' }}>
                        CONTEST: {hoveredHubData.contestTimeLeft} left
                      </div>
                      <div>Leader: {hoveredHubData.contestLeader}</div>
                      <div>Score: {hoveredHubData.contestScore?.[hoveredHubData.contestLeader!]?.toLocaleString()}</div>
                    </>
                  )}
                  <div>Specialties: {hoveredHubData.specialties.join(', ')}</div>
                </div>
              )}
            </div>

            {/* Map Legend */}
            <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '12px' }}>
              <div className="game-flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '16px', height: '4px', background: '#38a169' }}></div>
                <span>Safe Roads (Owned)</span>
              </div>
              <div className="game-flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '16px', height: '4px', background: '#e53e3e', borderStyle: 'dashed' }}></div>
                <span>Wild Paths (Unowned)</span>
              </div>
              <div className="game-flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#38a169' }}></div>
                <span>Safe Hub (80%+)</span>
              </div>
              <div className="game-flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#d69e2e' }}></div>
                <span>Risky Hub (60-80%)</span>
              </div>
              <div className="game-flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#e53e3e' }}></div>
                <span>Dangerous Hub (&lt;60%)</span>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="game-flex-col" style={{ gap: '1rem' }}>
            {/* Caravan Selection */}
            <div className="game-card">
              <h4>Select Caravan</h4>
              <div className="game-flex-col" style={{ gap: '0.5rem' }}>
                {mockCaravans.map(caravan => (
                  <div
                    key={caravan.id}
                    className="game-card"
                    style={{ 
                      cursor: 'pointer',
                      padding: '0.75rem',
                      backgroundColor: selectedCaravan === caravan.id ? '#2a4d32' : undefined,
                      borderColor: selectedCaravan === caravan.id ? '#68b06e' : undefined
                    }}
                    onClick={() => setSelectedCaravan(caravan.id)}
                  >
                    <div style={{ fontWeight: 'bold' }}>{caravan.name}</div>
                    <div className="game-muted game-small">
                      At: {mockHubs.find(h => h.id === caravan.location)?.name}
                    </div>
                    <div className="game-small">
                      Escort: {caravan.escort} | Supplies: {caravan.supplies}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Route Options */}
            {selectedCaravanData && (
              <div className="game-card">
                <h4>Available Routes</h4>
                <div className="game-flex-col" style={{ gap: '0.75rem' }}>
                  {getAvailableRoutes(selectedCaravanData.location).map((route, idx) => {
                    const destination = route.from === selectedCaravanData.location ? route.to : route.from;
                    const destHub = mockHubs.find(h => h.id === destination);
                    
                    return (
                      <div key={idx} className="game-card" style={{ padding: '0.75rem' }}>
                        <div className="game-space-between">
                          <div style={{ fontWeight: 'bold' }}>To {destHub?.name}</div>
                          <span className={`game-pill ${
                            route.safety > 80 ? 'game-pill-good' :
                            route.safety > 60 ? 'game-pill-warn' :
                            'game-pill-bad'
                          }`}>
                            {route.safety}% Safe
                          </span>
                        </div>
                        
                        <div className="game-small game-flex-col" style={{ gap: '0.25rem', marginTop: '0.5rem' }}>
                          {route.owner ? (
                            <>
                              <div className="game-good">📍 Safe Road</div>
                              <div>Owner: {route.owner}</div>
                              <div>Toll: {route.toll}g</div>
                              <div>Benefits: Escort protection, faster travel</div>
                            </>
                          ) : (
                            <>
                              <div className="game-bad">⚠️ Wild Path</div>
                              <div>No toll required</div>
                              <div>Risk: Bandits, weather, beasts</div>
                              <div>Potential: Discovery bonuses</div>
                            </>
                          )}
                        </div>
                        
                        <button className="game-btn game-btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                          {route.owner ? 'Take Safe Road' : 'Forge New Path'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hub Details */}
            {selectedHubData && (
              <div className="game-card">
                <h4>Hub Details</h4>
                <div className="game-flex-col game-small" style={{ gap: '0.5rem' }}>
                  <div className="game-space-between">
                    <span>Nation:</span>
                    <span style={{ fontWeight: 'bold', color: '#d69e2e' }}>{selectedHubData.nation}</span>
                  </div>
                  <div className="game-space-between">
                    <span>Owner:</span>
                    <span style={{ fontWeight: 'bold' }}>{selectedHubData.owner}</span>
                  </div>
                  <div className="game-space-between">
                    <span>Control Status:</span>
                    <span className={`game-pill ${
                      selectedHubData.controlStatus === 'under_contest' ? 'game-pill-bad' :
                      selectedHubData.controlStatus === 'recently_captured' ? 'game-pill-warn' :
                      selectedHubData.controlStatus === 'unclaimed' ? 'game-pill-neutral' :
                      'game-pill-good'
                    }`}>
                      {selectedHubData.controlStatus.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="game-space-between">
                    <span>Safety Rating:</span>
                    <span className={`${
                      selectedHubData.safetyRating > 80 ? 'game-good' :
                      selectedHubData.safetyRating > 60 ? 'game-warn' :
                      'game-bad'
                    }`} style={{ fontWeight: 'bold' }}>
                      {selectedHubData.safetyRating}%
                    </span>
                  </div>
                  <div className="game-space-between">
                    <span>Tax Rate:</span>
                    <span style={{ fontWeight: 'bold' }}>{selectedHubData.taxRate}%</span>
                  </div>
                  <div className="game-space-between">
                    <span>Daily Revenue:</span>
                    <span style={{ fontWeight: 'bold', color: '#d69e2e' }}>{selectedHubData.dailyRevenue}g</span>
                  </div>
                  <div className="game-space-between">
                    <span>Trade Volume:</span>
                    <span style={{ fontWeight: 'bold' }}>{selectedHubData.tradeVolume.toLocaleString()}g</span>
                  </div>
                  
                  {selectedHubData.controlStatus === 'under_contest' && (
                    <div className="game-card" style={{ padding: '0.5rem', backgroundColor: '#4d2a2a', borderColor: '#e53e3e', marginTop: '0.5rem' }}>
                      <div style={{ fontWeight: 'bold', color: '#e53e3e', marginBottom: '0.5rem' }}>
                        🔥 CONTEST IN PROGRESS
                      </div>
                      <div className="game-space-between game-small">
                        <span>Time Left:</span>
                        <span style={{ fontWeight: 'bold' }}>{selectedHubData.contestTimeLeft}</span>
                      </div>
                      <div className="game-space-between game-small">
                        <span>Challenger:</span>
                        <span style={{ fontWeight: 'bold' }}>{selectedHubData.contestChallenger}</span>
                      </div>
                      <div className="game-space-between game-small">
                        <span>Leader:</span>
                        <span style={{ fontWeight: 'bold', color: '#68b06e' }}>{selectedHubData.contestLeader}</span>
                      </div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Contest Scores:</div>
                        {Object.entries(selectedHubData.contestScore || {}).map(([guild, score]) => (
                          <div key={guild} className="game-space-between game-small">
                            <span>{guild}:</span>
                            <span style={{ fontWeight: 'bold' }}>{score.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedHubData.controlStatus === 'unclaimed' && (
                    <button className="game-btn game-btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                      🏴 Declare Contest
                    </button>
                  )}
                  
                  {selectedHubData.controlStatus === 'stable' && selectedHubData.owner !== 'NPC' && (
                    <button className="game-btn game-btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }}>
                      ⚔️ Challenge Control
                    </button>
                  )}
                  
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Specialties:</div>
                    <div className="game-flex" style={{ flexWrap: 'wrap', gap: '0.25rem' }}>
                      {selectedHubData.specialties.map(specialty => (
                        <span key={specialty} className="game-pill">
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Event Log */}
            <div className="game-card">
              <h4>Recent Events</h4>
              <div className="game-flex-col game-small" style={{ gap: '0.5rem' }}>
                <div className="game-card" style={{ padding: '0.5rem', backgroundColor: '#2a4d32', borderColor: '#68b06e' }}>
                  <div style={{ fontWeight: 'bold' }} className="game-good">Safe Passage</div>
                  <div className="game-good">Swift Trader arrived safely at Capital City</div>
                </div>
                <div className="game-card" style={{ padding: '0.5rem', backgroundColor: '#4d3d2a', borderColor: '#b08c48' }}>
                  <div style={{ fontWeight: 'bold' }} className="game-warn">Toll Collected</div>
                  <div className="game-warn">Crown Guild collected 15g from Iron Hauler</div>
                </div>
                <div className="game-card" style={{ padding: '0.5rem', backgroundColor: '#4d2a2a', borderColor: '#b04848' }}>
                  <div style={{ fontWeight: 'bold' }} className="game-bad">Ambush Attempted</div>
                  <div className="game-bad">Heavy Guard fought off bandits on wild path</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}