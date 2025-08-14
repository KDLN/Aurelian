'use client';

import { useState } from 'react';
import GameLayout from '@/components/GameLayout';

// Mock data for demonstration
const mockHubs = [
  { id: 'verdant', name: 'Verdant', x: 200, y: 150, owner: 'NPC', safetyRating: 95, taxRate: 5, specialties: ['Herbs', 'Iron Ore'] },
  { id: 'capital', name: 'Capital City', x: 400, y: 200, owner: 'Crown Guild', safetyRating: 99, taxRate: 8, specialties: ['Pearls', 'Relics'] },
  { id: 'trading-post', name: 'Trading Post', x: 300, y: 100, owner: 'Merchant Alliance', safetyRating: 85, taxRate: 6, specialties: ['Hide', 'Tools'] },
  { id: 'frontier', name: 'Frontier Outpost', x: 500, y: 300, owner: 'NPC', safetyRating: 60, taxRate: 3, specialties: ['Rare Metals'] },
  { id: 'mining-camp', name: 'Mining Camp', x: 150, y: 250, owner: 'Iron Brotherhood', safetyRating: 70, taxRate: 4, specialties: ['Iron Ore', 'Coal'] },
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

  const selectedCaravanData = mockCaravans.find(c => c.id === selectedCaravan);
  const selectedHubData = mockHubs.find(h => h.id === selectedHub);
  const hoveredHubData = mockHubs.find(h => h.id === hoveredHub);

  const getAvailableRoutes = (caravanLocation: string) => {
    return mockRoads.filter(road => 
      road.from === caravanLocation || road.to === caravanLocation
    );
  };

  const getHubColor = (hub: any) => {
    if (showOwnershipLayer) {
      if (hub.owner === 'NPC') return '#8b6f31';
      if (hub.owner.includes('Guild')) return '#c5a572';
      return '#f1e5c8';
    }
    return hub.safetyRating > 80 ? '#68b06e' : hub.safetyRating > 60 ? '#d69e2e' : '#e53e3e';
  };

  const getRoadColor = (road: any) => {
    if (road.owner) {
      return road.safety > 80 ? '#38a169' : '#d69e2e';
    }
    return '#e53e3e'; // Wild paths
  };

  return (
    <GameLayout title="Hub & Path Travel" characterActivity="trading" characterLocation="Hub: Planning Route">
      <div className="game-flex-col">
        <div className="game-space-between" style={{ marginBottom: '1rem' }}>
          <div>
            <h2>Hub & Path Travel</h2>
            <p className="game-muted">Plan routes, manage caravans, and navigate the trade networks</p>
          </div>
          
          <button
            onClick={() => setShowOwnershipLayer(!showOwnershipLayer)}
            className={`game-btn ${showOwnershipLayer ? 'game-btn-primary' : 'game-btn-secondary'}`}
          >
            {showOwnershipLayer ? 'Hide' : 'Show'} Ownership
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1rem' }}>
          {/* Map Canvas */}
          <div className="game-card">
            <h3>Trade Route Map</h3>
            
            {/* Map SVG */}
            <div style={{ 
              position: 'relative', 
              background: 'linear-gradient(135deg, #d4b895 0%, #c9aa80 25%, #b89968 50%, #a68550 75%, #8b6f31 100%)', 
              borderRadius: '8px', 
              height: '400px',
              border: '2px solid #533b2c'
            }}>
              <svg width="100%" height="100%" viewBox="0 0 600 400" style={{ position: 'absolute', top: 0, left: 0 }}>
                {/* Terrain features */}
                <defs>
                  <pattern id="forest" patternUnits="userSpaceOnUse" width="20" height="20">
                    <circle cx="10" cy="10" r="3" fill="#2d5016" opacity="0.3"/>
                    <circle cx="5" cy="15" r="2" fill="#2d5016" opacity="0.3"/>
                    <circle cx="15" cy="5" r="2" fill="#2d5016" opacity="0.3"/>
                  </pattern>
                  <pattern id="mountains" patternUnits="userSpaceOnUse" width="30" height="15">
                    <polygon points="0,15 15,0 30,15" fill="#5a4a3a" opacity="0.4"/>
                  </pattern>
                </defs>
                
                {/* Forest areas */}
                <ellipse cx="120" cy="180" rx="40" ry="30" fill="url(#forest)" opacity="0.6"/>
                <ellipse cx="480" cy="120" rx="35" ry="25" fill="url(#forest)" opacity="0.6"/>
                <ellipse cx="350" cy="320" rx="45" ry="35" fill="url(#forest)" opacity="0.6"/>
                
                {/* Mountain ranges */}
                <ellipse cx="180" cy="80" rx="60" ry="20" fill="url(#mountains)" opacity="0.7"/>
                <ellipse cx="450" cy="350" rx="50" ry="25" fill="url(#mountains)" opacity="0.7"/>
                
                {/* River */}
                <path 
                  d="M50,150 Q150,140 250,120 Q350,100 450,90 Q550,85 600,80" 
                  stroke="#4a6b8a" 
                  strokeWidth="4" 
                  fill="none" 
                  opacity="0.6"
                  strokeLinecap="round"
                />
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
                
                {/* Hubs */}
                {mockHubs.map(hub => (
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
                  <div>Owner: {hoveredHubData.owner}</div>
                  <div>Safety: {hoveredHubData.safetyRating}%</div>
                  <div>Tax: {hoveredHubData.taxRate}%</div>
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
                    <span>Owner:</span>
                    <span style={{ fontWeight: 'bold' }}>{selectedHubData.owner}</span>
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