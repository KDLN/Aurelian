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
  { from: 'verdant', to: 'capital', owner: 'Crown Guild', toll: 15, safety: 90, traffic: 'High' },
  { from: 'verdant', to: 'trading-post', owner: 'Merchant Alliance', toll: 10, safety: 85, traffic: 'Medium' },
  { from: 'capital', to: 'frontier', owner: null, toll: 0, safety: 45, traffic: 'Low' },
  { from: 'trading-post', to: 'mining-camp', owner: 'Iron Brotherhood', toll: 8, safety: 75, traffic: 'Medium' },
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
              background: '#f5f5f5', 
              borderRadius: '8px', 
              height: '400px',
              border: '2px solid #533b2c'
            }}>
              <svg width="100%" height="100%" viewBox="0 0 600 400" style={{ position: 'absolute', top: 0, left: 0 }}>
                {/* Roads */}
                {mockRoads.map((road, idx) => {
                  const fromHub = mockHubs.find(h => h.id === road.from);
                  const toHub = mockHubs.find(h => h.id === road.to);
                  if (!fromHub || !toHub) return null;
                  
                  return (
                    <g key={idx}>
                      <line
                        x1={fromHub.x}
                        y1={fromHub.y}
                        x2={toHub.x}
                        y2={toHub.y}
                        stroke={getRoadColor(road)}
                        strokeWidth={road.owner ? "4" : "2"}
                        strokeDasharray={road.owner ? "0" : "5,5"}
                        style={{ cursor: 'pointer' }}
                      />
                      {/* Traffic indicator */}
                      <circle
                        cx={(fromHub.x + toHub.x) / 2}
                        cy={(fromHub.y + toHub.y) / 2}
                        r={road.traffic === 'High' ? 4 : road.traffic === 'Medium' ? 3 : 2}
                        fill="rgba(255,255,255,0.8)"
                        stroke="#333"
                        strokeWidth="1"
                      />
                    </g>
                  );
                })}
                
                {/* Hubs */}
                {mockHubs.map(hub => (
                  <g key={hub.id}>
                    <circle
                      cx={hub.x}
                      cy={hub.y}
                      r="15"
                      fill={getHubColor(hub)}
                      stroke="#333"
                      strokeWidth="2"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredHub(hub.id)}
                      onMouseLeave={() => setHoveredHub(null)}
                      onClick={() => setSelectedHub(hub.id)}
                    />
                    <text
                      x={hub.x}
                      y={hub.y + 25}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#333"
                      style={{ fontWeight: 'bold' }}
                    >
                      {hub.name}
                    </text>
                    
                    {/* Caravan indicators */}
                    {mockCaravans
                      .filter(caravan => caravan.location === hub.id)
                      .map((caravan, idx) => (
                        <rect
                          key={caravan.id}
                          x={hub.x - 8 + (idx * 4)}
                          y={hub.y - 25}
                          width="3"
                          height="8"
                          fill={selectedCaravan === caravan.id ? "#e53e3e" : "#8b6f31"}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedCaravan(caravan.id)}
                        />
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