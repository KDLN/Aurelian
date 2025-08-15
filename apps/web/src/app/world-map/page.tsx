'use client';

import { useEffect, useRef, useState } from 'react';
import GameLayout from '@/components/GameLayout';
import { MinimapRenderer } from '@/lib/minimap/minimapRenderer';
import { MinimapConfig, GAME_AREAS } from '@/lib/minimap/minimapTypes';
import { useMissions } from '@/hooks/useMissionsQuery';
import { useUserData } from '@/hooks/useUserData';

export default function WorldMapPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MinimapRenderer | null>(null);
  const { data: missionsData } = useMissions();
  const { user } = useUserData();
  
  const [config, setConfig] = useState<MinimapConfig>({
    width: 1000,
    height: 700,
    scale: 0.8,
    showPlayerNames: false,
    showActionIndicators: true,
    autoCenter: false,
    updateInterval: 2000
  });
  
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [showMissionRoutes, setShowMissionRoutes] = useState(true);
  const [showTradeRoutes, setShowTradeRoutes] = useState(true);

  // Initialize world map
  useEffect(() => {
    if (!canvasRef.current) return;
    
    try {
      const renderer = new MinimapRenderer(canvasRef.current, config);
      rendererRef.current = renderer;
      
      // Center on Central Plaza initially
      renderer.centerOnArea('central_plaza');
      
      return () => {
        renderer.destroy();
      };
    } catch (error) {
      console.error('Failed to initialize world map:', error);
    }
  }, []);

  // Update config
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateConfig(config);
    }
  }, [config]);

  const handleAreaSelect = (areaId: string) => {
    setSelectedArea(areaId);
    if (rendererRef.current) {
      rendererRef.current.centerOnArea(areaId);
    }
  };

  const getAreaInfo = (areaId: string) => {
    const area = GAME_AREAS.find(a => a.id === areaId);
    if (!area) return null;

    const activeMissions = missionsData?.activeMissions?.filter(m => 
      m.mission?.fromHub === area.name || m.mission?.toHub === area.name
    ) || [];

    return {
      ...area,
      activeMissions: activeMissions.length,
      connections: area.connections.length
    };
  };

  const sidebar = (
    <div>
      <h3>World Map</h3>
      <p className="game-muted game-small">
        Explore trade routes, plan missions, and track your activities across the realm.
      </p>

      <h3>Map Controls</h3>
      <div className="game-flex-col" style={{ gap: '8px' }}>
        <label className="game-flex" style={{ alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={showMissionRoutes}
            onChange={(e) => setShowMissionRoutes(e.target.checked)}
          />
          <span className="game-small">Mission Routes</span>
        </label>
        <label className="game-flex" style={{ alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={showTradeRoutes}
            onChange={(e) => setShowTradeRoutes(e.target.checked)}
          />
          <span className="game-small">Trade Routes</span>
        </label>
      </div>

      <h3>Zoom Level</h3>
      <input
        type="range"
        min="0.3"
        max="2"
        step="0.1"
        value={config.scale}
        onChange={(e) => setConfig(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
        style={{ width: '100%' }}
      />
      <div className="game-small game-center">{Math.round(config.scale * 100)}%</div>

      <h3>Quick Travel</h3>
      <div className="game-flex-col" style={{ gap: '4px' }}>
        {GAME_AREAS.slice(0, 6).map(area => (
          <button
            key={area.id}
            onClick={() => handleAreaSelect(area.id)}
            className={`game-btn ${selectedArea === area.id ? 'game-btn-primary' : ''}`}
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            {area.name}
          </button>
        ))}
      </div>

      <h3>Legend</h3>
      <div className="game-flex-col" style={{ gap: '4px' }}>
        <div className="game-flex" style={{ alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '3px', background: '#8b4513' }}></div>
          <span className="game-small">Trade Routes</span>
        </div>
        <div className="game-flex" style={{ alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '3px', background: '#daa520' }}></div>
          <span className="game-small">Active Paths</span>
        </div>
        <div className="game-flex" style={{ alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '3px', background: '#ffd700' }}></div>
          <span className="game-small">Selected Route</span>
        </div>
      </div>
    </div>
  );

  return (
    <GameLayout 
      title="World Map" 
      characterActivity="idle" 
      characterLocation="Map Room"
      sidebar={sidebar}
    >
      <div className="game-flex-col">
        <div className="game-card">
          <div className="game-flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3>Realm of Aurelian</h3>
            <div className="game-flex" style={{ gap: '8px' }}>
              <button 
                onClick={() => rendererRef.current?.centerOnArea('central_plaza')}
                className="game-btn game-btn-small"
              >
                🏛️ Center on Capital
              </button>
              <button 
                onClick={() => setConfig(prev => ({ ...prev, scale: 0.8 }))}
                className="game-btn game-btn-small"
              >
                🔍 Reset Zoom
              </button>
            </div>
          </div>
          
          <div style={{ 
            position: 'relative',
            border: '2px solid #533b2c',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <canvas
              ref={canvasRef}
              width={config.width}
              height={config.height}
              style={{
                display: 'block',
                background: '#1a1511',
                cursor: 'grab'
              }}
            />
          </div>

          <div className="game-flex" style={{ justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: '#9b8c70' }}>
            <span>🖱️ Click and drag to pan • 🖱️ Scroll to zoom • 🖱️ Double-click areas to center</span>
            <span>🖱️ Click paths for travel info</span>
          </div>
        </div>

        <div className="game-grid-2" style={{ gap: '16px' }}>
          <div className="game-card">
            <h3>Area Information</h3>
            {selectedArea ? (
              (() => {
                const areaInfo = getAreaInfo(selectedArea);
                if (!areaInfo) return <p className="game-muted">Area not found</p>;
                
                return (
                  <div>
                    <div style={{ marginBottom: '12px' }}>
                      <h4 style={{ color: areaInfo.color, marginBottom: '4px' }}>
                        {areaInfo.name}
                      </h4>
                      <p className="game-small game-muted">
                        Type: {areaInfo.type.charAt(0).toUpperCase() + areaInfo.type.slice(1)}
                      </p>
                    </div>
                    
                    <div className="game-grid-2" style={{ gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <div className="game-small">Connected Routes:</div>
                        <div className="game-good">{areaInfo.connections}</div>
                      </div>
                      <div>
                        <div className="game-small">Active Missions:</div>
                        <div className="game-warn">{areaInfo.activeMissions}</div>
                      </div>
                    </div>

                    <div>
                      <div className="game-small" style={{ marginBottom: '8px' }}>Connected To:</div>
                      <div className="game-flex-col" style={{ gap: '4px' }}>
                        {areaInfo.connections.map(connId => {
                          const connectedArea = GAME_AREAS.find(a => a.id === connId);
                          return connectedArea ? (
                            <button
                              key={connId}
                              onClick={() => handleAreaSelect(connId)}
                              className="game-btn game-btn-small"
                              style={{ textAlign: 'left', fontSize: '11px' }}
                            >
                              → {connectedArea.name}
                            </button>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <p className="game-muted">Select an area on the map to view details</p>
            )}
          </div>

          <div className="game-card">
            <h3>Mission Planning</h3>
            {missionsData?.activeMissions && missionsData.activeMissions.length > 0 ? (
              <div>
                <p className="game-small game-muted" style={{ marginBottom: '12px' }}>
                  Track your active missions on the map
                </p>
                <div className="game-flex-col" style={{ gap: '8px' }}>
                  {missionsData.activeMissions.slice(0, 3).map(mission => (
                    <div key={mission.id} style={{
                      background: '#1a1511',
                      border: '1px solid #533b2c',
                      borderRadius: '4px',
                      padding: '8px',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {mission.mission?.name}
                      </div>
                      <div style={{ color: '#9b8c70' }}>
                        {mission.mission?.fromHub} → {mission.mission?.toHub}
                      </div>
                      <div style={{ color: '#68b06e', marginTop: '4px' }}>
                        {mission.agent?.name} (Level {mission.agent?.level})
                      </div>
                    </div>
                  ))}
                </div>
                {missionsData.activeMissions.length > 3 && (
                  <div className="game-small game-muted" style={{ textAlign: 'center', marginTop: '8px' }}>
                    +{missionsData.activeMissions.length - 3} more missions
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="game-muted">No active missions</p>
                <a href="/missions" className="game-btn game-btn-primary" style={{ marginTop: '12px' }}>
                  Start Mission
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="game-card">
          <h3>Quick Actions</h3>
          <div className="game-grid-3">
            <a href="/missions" className="game-btn">🎯 Plan Mission</a>
            <a href="/hub-travel" className="game-btn">🚀 Fast Travel</a>
            <a href="/guild" className="game-btn">🏛️ Guild Operations</a>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}