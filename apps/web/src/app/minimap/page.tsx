'use client';
import { useEffect, useRef, useState } from 'react';
import { MinimapRenderer } from '../../lib/minimap/minimapRenderer';
import { MinimapPlayer, MinimapConfig, PlayerAction, GAME_AREAS } from '../../lib/minimap/minimapTypes';

export default function MinimapPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MinimapRenderer | null>(null);
  const [config, setConfig] = useState<MinimapConfig>({
    width: 1200,
    height: 800,
    scale: 0.5,
    showPlayerNames: true,
    showActionIndicators: true,
    autoCenter: false,
    updateInterval: 1000
  });
  const [selectedArea, setSelectedArea] = useState<string>('central_plaza');
  const [playerCount, setPlayerCount] = useState(50);
  const [simulationRunning, setSimulationRunning] = useState(false);

  // Initialize minimap
  useEffect(() => {
    if (!canvasRef.current) return;
    
    try {
      const renderer = new MinimapRenderer(canvasRef.current, config);
      rendererRef.current = renderer;
      
      // Initial render
      renderer.render();
      
      return () => {
        // Cleanup if needed
      };
    } catch (error) {
      console.error('Failed to initialize minimap:', error);
    }
  }, []);

  // Update config
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateConfig(config);
    }
  }, [config]);

  // Generate mock players for demonstration
  const generateMockPlayers = (): MinimapPlayer[] => {
    const players: MinimapPlayer[] = [];
    const actions: PlayerAction['type'][] = ['idle', 'walking', 'trading', 'crafting', 'mining', 'farming', 'fishing'];
    const names = ['Alex', 'Sam', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Avery', 'Quinn', 'Blake', 'Sage'];
    
    for (let i = 0; i < playerCount; i++) {
      const area = GAME_AREAS[Math.floor(Math.random() * GAME_AREAS.length)];
      const actionType = actions[Math.floor(Math.random() * actions.length)];
      
      // Position within area bounds
      const x = area.bounds.x + Math.random() * area.bounds.width;
      const y = area.bounds.y + Math.random() * area.bounds.height;
      
      // Action intensity based on type
      let intensity = 0;
      switch (actionType) {
        case 'idle':
          intensity = 0;
          break;
        case 'walking':
          intensity = 0.3 + Math.random() * 0.4;
          break;
        case 'trading':
        case 'crafting':
        case 'mining':
        case 'farming':
        case 'fishing':
          intensity = 0.6 + Math.random() * 0.4;
          break;
        case 'combat':
          intensity = 0.8 + Math.random() * 0.2;
          break;
      }
      
      players.push({
        id: `player_${i}`,
        name: `${names[i % names.length]}${i > 9 ? Math.floor(i/10) : ''}`,
        x,
        y,
        areaId: area.id,
        action: {
          type: actionType,
          intensity,
          target: actionType === 'trading' ? `merchant_${Math.floor(Math.random() * 5)}` : undefined
        },
        lastSeen: Date.now() - Math.random() * 5000, // Some players last seen up to 5 seconds ago
        appearance: {
          skinTone: ['#FDBCB4', '#F1C27D', '#E0AC69', '#C68642', '#8D5524'][Math.floor(Math.random() * 5)],
          primaryColor: ['#68b06e', '#4682B4', '#DAA520', '#DC143C', '#9932CC'][Math.floor(Math.random() * 5)]
        }
      });
    }
    
    return players;
  };

  // Simulation effect
  useEffect(() => {
    if (!simulationRunning || !rendererRef.current) return;
    
    const interval = setInterval(() => {
      const mockPlayers = generateMockPlayers();
      rendererRef.current?.updatePlayers(mockPlayers);
    }, config.updateInterval);
    
    return () => clearInterval(interval);
  }, [simulationRunning, config.updateInterval, playerCount]);

  // Start simulation on mount
  useEffect(() => {
    if (rendererRef.current) {
      setSimulationRunning(true);
    }
  }, [rendererRef.current]);

  const centerOnArea = (areaId: string) => {
    setSelectedArea(areaId);
    rendererRef.current?.centerOnArea(areaId);
  };

  const updateConfig = (key: keyof MinimapConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{ 
      padding: 20, 
      background: '#1a1511', 
      color: '#f1e5c8', 
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      gap: 20
    }}>
      {/* Controls Panel */}
      <div style={{ 
        background: '#231913', 
        padding: 20, 
        borderRadius: 8, 
        border: '2px solid #533b2c',
        height: 'fit-content'
      }}>
        <h1 style={{ fontSize: 24, marginBottom: 20 }}>Minimap Controls</h1>
        
        {/* Simulation Controls */}
        <div style={{ marginBottom: 20 }}>
          <h3>Simulation</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <button
              onClick={() => setSimulationRunning(!simulationRunning)}
              style={{
                padding: '8px 12px',
                background: simulationRunning ? '#DC143C' : '#68b06e',
                border: 'none',
                borderRadius: 4,
                color: '#f1e5c8',
                cursor: 'pointer'
              }}
            >
              {simulationRunning ? 'Stop' : 'Start'}
            </button>
          </div>
          
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 5 }}>
              Player Count: {playerCount}
            </label>
            <input
              type="range"
              min="10"
              max="200"
              value={playerCount}
              onChange={e => setPlayerCount(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 5 }}>
              Update Interval: {config.updateInterval}ms
            </label>
            <input
              type="range"
              min="500"
              max="5000"
              step="250"
              value={config.updateInterval}
              onChange={e => updateConfig('updateInterval', Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Display Options */}
        <div style={{ marginBottom: 20 }}>
          <h3>Display Options</h3>
          
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={config.showPlayerNames}
                onChange={e => updateConfig('showPlayerNames', e.target.checked)}
              />
              Show Player Names
            </label>
          </div>
          
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={config.showActionIndicators}
                onChange={e => updateConfig('showActionIndicators', e.target.checked)}
              />
              Show Action Indicators
            </label>
          </div>
          
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 5 }}>
              Zoom: {(config.scale * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={config.scale}
              onChange={e => updateConfig('scale', Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Area Navigation */}
        <div>
          <h3>Quick Navigation</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {GAME_AREAS.map(area => (
              <button
                key={area.id}
                onClick={() => centerOnArea(area.id)}
                style={{
                  padding: '8px 12px',
                  background: selectedArea === area.id ? '#68b06e' : '#533b2c',
                  border: 'none',
                  borderRadius: 4,
                  color: '#f1e5c8',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '12px'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{area.name}</div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>
                  {area.type} • {area.connections.length} connections
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Minimap Canvas */}
      <div style={{ 
        background: '#231913', 
        padding: 20, 
        borderRadius: 8, 
        border: '2px solid #533b2c',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <h2 style={{ marginBottom: 20 }}>World Overview</h2>
        <canvas
          ref={canvasRef}
          style={{
            border: '2px solid #533b2c',
            borderRadius: 8,
            maxWidth: '100%',
            height: 'auto'
          }}
        />
        <div style={{ 
          marginTop: 15, 
          fontSize: 12, 
          color: '#999',
          textAlign: 'center',
          lineHeight: 1.4
        }}>
          <div>🖱️ Drag to pan • 🛞 Scroll to zoom • Double-click area to center</div>
          <div>Player dots show current activity with color-coded actions</div>
        </div>
      </div>
    </div>
  );
}