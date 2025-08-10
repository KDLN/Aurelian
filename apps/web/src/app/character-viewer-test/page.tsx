'use client';
import { useEffect, useRef, useState } from 'react';
import { CharacterSprite } from '../../lib/sprites/characterSprites';
import { AnimationFrame } from '../../lib/sprites/types';

interface AnimationDefinition {
  name: string;
  page: string;
  frames: AnimationFrame[];
  description: string;
  category: 'movement' | 'combat' | 'action' | 'emote';
}

const ANIMATIONS: AnimationDefinition[] = [
  // Movement animations (p1)
  {
    name: 'idle',
    page: 'p1',
    frames: [{ row: 0, col: 0, duration: 10000 }],
    description: 'Standing still',
    category: 'movement'
  },
  {
    name: 'walk',
    page: 'p1',
    frames: [
      { row: 0, col: 1, duration: 135 },
      { row: 0, col: 2, duration: 135 },
      { row: 0, col: 3, duration: 135 },
      { row: 0, col: 4, duration: 135 },
      { row: 0, col: 5, duration: 135 },
      { row: 0, col: 6, duration: 135 }
    ],
    description: 'Walking cycle',
    category: 'movement'
  },
  {
    name: 'run',
    page: 'p1',
    frames: [
      { row: 0, col: 1, duration: 80 },
      { row: 0, col: 2, duration: 55 },
      { row: 0, col: 7, duration: 125 },
      { row: 0, col: 4, duration: 80 },
      { row: 0, col: 5, duration: 55 },
      { row: 0, col: 8, duration: 125 }
    ],
    description: 'Running cycle',
    category: 'movement'
  },
  {
    name: 'push',
    page: 'p1',
    frames: [
      { row: 0, col: 2, duration: 300 },
      { row: 0, col: 3, duration: 300 }
    ],
    description: 'Pushing/Crafting motion',
    category: 'action'
  },
  {
    name: 'pull',
    page: 'p1',
    frames: [
      { row: 0, col: 4, duration: 400 },
      { row: 0, col: 5, duration: 400 }
    ],
    description: 'Pulling/Trading motion',
    category: 'action'
  },
  {
    name: 'jump',
    page: 'p1',
    frames: [
      { row: 0, col: 6, duration: 300 },
      { row: 0, col: 7, duration: 150 },
      { row: 0, col: 8, duration: 100 },
      { row: 0, col: 6, duration: 300 }
    ],
    description: 'Jump/Victory hop',
    category: 'emote'
  },
  // Combat animations (pONE1)
  {
    name: 'draw_weapon',
    page: 'pONE1',
    frames: [
      { row: 0, col: 1, duration: 100 },
      { row: 0, col: 2, duration: 100 },
      { row: 0, col: 3, duration: 100 }
    ],
    description: 'Draw weapon',
    category: 'combat'
  },
  {
    name: 'parry',
    page: 'pONE1',
    frames: [{ row: 0, col: 4, duration: 500 }],
    description: 'Defensive parry',
    category: 'combat'
  },
  {
    name: 'evade',
    page: 'pONE1',
    frames: [{ row: 0, col: 5, duration: 300 }],
    description: 'Dodge/Evade',
    category: 'combat'
  },
  {
    name: 'get_hit',
    page: 'pONE1',
    frames: [{ row: 0, col: 6, duration: 400 }],
    description: 'Taking damage',
    category: 'combat'
  },
  {
    name: 'knockdown',
    page: 'pONE1',
    frames: [
      { row: 0, col: 6, duration: 200 },
      { row: 0, col: 7, duration: 200 },
      { row: 0, col: 8, duration: 400 }
    ],
    description: 'Knocked down',
    category: 'combat'
  },
  // Combat stance (pONE2)
  {
    name: 'combat_idle',
    page: 'pONE2',
    frames: [
      { row: 0, col: 1, duration: 200 },
      { row: 0, col: 2, duration: 200 },
      { row: 0, col: 3, duration: 200 },
      { row: 0, col: 4, duration: 200 }
    ],
    description: 'Combat ready stance',
    category: 'combat'
  },
  {
    name: 'combat_move',
    page: 'pONE2',
    frames: [
      { row: 0, col: 5, duration: 140 },
      { row: 0, col: 6, duration: 140 },
      { row: 0, col: 7, duration: 200 },
      { row: 0, col: 8, duration: 240 }
    ],
    description: 'Combat movement',
    category: 'combat'
  },
  // Attack animations (pONE3)
  {
    name: 'slash_1',
    page: 'pONE3',
    frames: [
      { row: 0, col: 1, duration: 160 },
      { row: 0, col: 2, duration: 65 },
      { row: 0, col: 3, duration: 65 },
      { row: 0, col: 4, duration: 200 }
    ],
    description: 'Sword slash attack',
    category: 'combat'
  },
  {
    name: 'slash_2',
    page: 'pONE3',
    frames: [
      { row: 0, col: 5, duration: 160 },
      { row: 0, col: 6, duration: 65 },
      { row: 0, col: 7, duration: 65 },
      { row: 0, col: 8, duration: 200 }
    ],
    description: 'Alternate slash',
    category: 'combat'
  },
  {
    name: 'thrust',
    page: 'pONE3',
    frames: [
      { row: 4, col: 1, duration: 100 },
      { row: 4, col: 2, duration: 100 },
      { row: 4, col: 3, duration: 100 },
      { row: 4, col: 4, duration: 200 }
    ],
    description: 'Thrust attack',
    category: 'combat'
  },
  {
    name: 'shield_bash',
    page: 'pONE3',
    frames: [
      { row: 4, col: 5, duration: 100 },
      { row: 4, col: 6, duration: 100 },
      { row: 4, col: 7, duration: 100 },
      { row: 4, col: 8, duration: 200 }
    ],
    description: 'Shield bash',
    category: 'combat'
  }
];

export default function CharacterViewerTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerCanvasRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<CharacterSprite | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const currentFrameRef = useRef<number>(0);
  const frameTimeRef = useRef<number>(0);
  
  const [currentAnimation, setCurrentAnimation] = useState<AnimationDefinition>(ANIMATIONS[0]);
  const [direction, setDirection] = useState<'south' | 'north' | 'east' | 'west'>('south');
  const [isPlaying, setIsPlaying] = useState(true);
  const [showWeapon, setShowWeapon] = useState(false);
  const [showShield, setShowShield] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [zoom, setZoom] = useState(3);
  const [showViewer, setShowViewer] = useState(true);

  // Character customization
  const [outfit, setOutfit] = useState('fstr');
  const [hair, setHair] = useState('dap1');
  const [hat, setHat] = useState('');
  const [skinTone, setSkinTone] = useState('v00');

  // Initialize sprite
  useEffect(() => {
    const initSprite = async () => {
      const sprite = new CharacterSprite();
      await sprite.loadAssets();
      spriteRef.current = sprite;
      
      // Set initial character
      sprite.setCharacter({
        base: skinTone,
        outfit: outfit,
        hair: hair ? `${hair}_${skinTone}` : undefined,
        hat: hat || undefined,
        weapon: showWeapon ? 'sw01' : undefined,
        shield: showShield ? 'sh01' : undefined
      });
    };
    initSprite();
  }, []);

  // Update character when customization changes
  useEffect(() => {
    if (spriteRef.current) {
      spriteRef.current.setCharacter({
        base: skinTone,
        outfit: outfit,
        hair: hair ? `${hair}_${skinTone}` : undefined,
        hat: hat || undefined,
        weapon: showWeapon ? 'sw01' : undefined,
        shield: showShield ? 'sh01' : undefined
      });
    }
  }, [outfit, hair, hat, skinTone, showWeapon, showShield]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const animate = (timestamp: number) => {
      if (!canvasRef.current || !spriteRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      frameTimeRef.current += deltaTime;

      const frame = currentAnimation.frames[currentFrameRef.current];
      if (frameTimeRef.current >= frame.duration) {
        frameTimeRef.current = 0;
        currentFrameRef.current = (currentFrameRef.current + 1) % currentAnimation.frames.length;
      }

      // Clear and draw main canvas
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        const currentFrame = currentAnimation.frames[currentFrameRef.current];
        const directionRow = direction === 'south' ? 0 : 
                           direction === 'north' ? 1 : 
                           direction === 'east' ? 2 : 3;
        
        spriteRef.current.drawFrame(
          ctx,
          currentAnimation.page,
          currentFrame.row + directionRow,
          currentFrame.col,
          64, 64, zoom
        );
      }

      // Draw character viewer
      if (showViewer && viewerCanvasRef.current) {
        const viewerCtx = viewerCanvasRef.current.getContext('2d');
        if (viewerCtx) {
          viewerCtx.imageSmoothingEnabled = false;
          
          // Dark background
          viewerCtx.fillStyle = '#1a1511';
          viewerCtx.fillRect(0, 0, 160, 160);
          
          // Draw character at 2.5x zoom
          const currentFrame = currentAnimation.frames[currentFrameRef.current];
          const directionRow = direction === 'south' ? 0 : 
                             direction === 'north' ? 1 : 
                             direction === 'east' ? 2 : 3;
          
          spriteRef.current.drawFrame(
            viewerCtx,
            currentAnimation.page,
            currentFrame.row + directionRow,
            currentFrame.col,
            32, 48, 2.5
          );
          
          // Draw border
          viewerCtx.strokeStyle = '#f1e5c8';
          viewerCtx.lineWidth = 2;
          viewerCtx.strokeRect(1, 1, 158, 158);
          
          // Activity text
          viewerCtx.fillStyle = '#f1e5c8';
          viewerCtx.font = '10px monospace';
          viewerCtx.fillText(currentAnimation.description, 4, 156);
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentAnimation, direction, isPlaying, zoom, showViewer]);

  const filteredAnimations = selectedCategory === 'all' 
    ? ANIMATIONS 
    : ANIMATIONS.filter(a => a.category === selectedCategory);

  return (
    <div style={{ 
      padding: 16, 
      background: '#231913', 
      color: '#f1e5c8', 
      minHeight: '100vh',
      fontFamily: 'monospace'
    }}>
      <h1>Character Viewer Test</h1>
      
      <div style={{ display: 'flex', gap: 32 }}>
        {/* Main Display */}
        <div>
          <h2>Animation Preview</h2>
          <canvas
            ref={canvasRef}
            width={192}
            height={192}
            style={{ 
              border: '2px solid #f1e5c8',
              imageRendering: 'pixelated',
              background: '#1a1511'
            }}
          />
          
          {/* Controls */}
          <div style={{ marginTop: 16 }}>
            <button onClick={() => setIsPlaying(!isPlaying)} style={{ marginRight: 8 }}>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button onClick={() => {
              currentFrameRef.current = 0;
              frameTimeRef.current = 0;
            }}>
              Reset
            </button>
          </div>

          {/* Direction */}
          <div style={{ marginTop: 16 }}>
            <h3>Direction</h3>
            <button onClick={() => setDirection('south')} style={{ marginRight: 4 }}>South</button>
            <button onClick={() => setDirection('north')} style={{ marginRight: 4 }}>North</button>
            <button onClick={() => setDirection('east')} style={{ marginRight: 4 }}>East</button>
            <button onClick={() => setDirection('west')}>West</button>
          </div>

          {/* Zoom */}
          <div style={{ marginTop: 16 }}>
            <h3>Zoom: {zoom}x</h3>
            <input 
              type="range" 
              min="1" 
              max="5" 
              step="0.5"
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))} 
            />
          </div>
        </div>

        {/* Character Viewer Preview */}
        <div>
          <h2>Character Viewer (Top-Right Style)</h2>
          <div style={{ 
            position: 'relative',
            width: 160,
            height: 160,
            marginBottom: 16
          }}>
            <canvas
              ref={viewerCanvasRef}
              width={160}
              height={160}
              style={{
                imageRendering: 'pixelated',
                boxShadow: '0 4px 8px rgba(0,0,0,0.5)'
              }}
            />
          </div>
          <button onClick={() => setShowViewer(!showViewer)}>
            {showViewer ? 'Hide' : 'Show'} Viewer
          </button>
        </div>

        {/* Character Customization */}
        <div>
          <h2>Character Customization</h2>
          
          <div style={{ marginBottom: 8 }}>
            <label>Skin Tone: </label>
            <select value={skinTone} onChange={(e) => setSkinTone(e.target.value)}>
              <option value="v00">Light</option>
              <option value="v01">Medium</option>
              <option value="v02">Dark</option>
              <option value="v03">Pale</option>
              <option value="v04">Green</option>
              <option value="v05">Blue</option>
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label>Outfit: </label>
            <select value={outfit} onChange={(e) => setOutfit(e.target.value)}>
              <option value="">None</option>
              <option value="fstr">Farmer Shirt</option>
              <option value="pfpn">Peasant Pants</option>
              <option value="boxr">Boxers</option>
              <option value="undi">Underwear</option>
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label>Hair: </label>
            <select value={hair} onChange={(e) => setHair(e.target.value)}>
              <option value="">None</option>
              <option value="bob1">Bob</option>
              <option value="dap1">Dapper</option>
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label>Hat: </label>
            <select value={hat} onChange={(e) => setHat(e.target.value)}>
              <option value="">None</option>
              <option value="pfht">Peasant Hat</option>
              <option value="pnty">Pointy Hat</option>
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label>
              <input 
                type="checkbox" 
                checked={showWeapon} 
                onChange={(e) => setShowWeapon(e.target.checked)}
              />
              Show Weapon
            </label>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label>
              <input 
                type="checkbox" 
                checked={showShield} 
                onChange={(e) => setShowShield(e.target.checked)}
              />
              Show Shield
            </label>
          </div>
        </div>
      </div>

      {/* Animation List */}
      <div style={{ marginTop: 32 }}>
        <h2>Available Animations</h2>
        
        {/* Category Filter */}
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setSelectedCategory('all')} style={{ marginRight: 4 }}>All</button>
          <button onClick={() => setSelectedCategory('movement')} style={{ marginRight: 4 }}>Movement</button>
          <button onClick={() => setSelectedCategory('action')} style={{ marginRight: 4 }}>Action</button>
          <button onClick={() => setSelectedCategory('combat')} style={{ marginRight: 4 }}>Combat</button>
          <button onClick={() => setSelectedCategory('emote')} style={{ marginRight: 4 }}>Emote</button>
        </div>

        {/* Animation Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 8
        }}>
          {filteredAnimations.map((anim) => (
            <button
              key={anim.name}
              onClick={() => {
                setCurrentAnimation(anim);
                currentFrameRef.current = 0;
                frameTimeRef.current = 0;
                // Enable weapons for combat animations
                if (anim.category === 'combat' && anim.page !== 'pONE1') {
                  setShowWeapon(true);
                  if (anim.name === 'shield_bash') setShowShield(true);
                }
              }}
              style={{
                padding: 8,
                background: currentAnimation.name === anim.name ? '#3a2f1f' : '#1a1511',
                border: `1px solid ${currentAnimation.name === anim.name ? '#f1e5c8' : '#4a3f2f'}`,
                color: '#f1e5c8',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{anim.name}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{anim.description}</div>
              <div style={{ fontSize: 10, opacity: 0.6 }}>
                {anim.category} • {anim.page} • {anim.frames.length} frames
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Animation Details */}
      <div style={{ marginTop: 32 }}>
        <h2>Current Animation Details</h2>
        <pre style={{ background: '#1a1511', padding: 16, borderRadius: 4 }}>
{JSON.stringify({
  name: currentAnimation.name,
  page: currentAnimation.page,
  category: currentAnimation.category,
  frameCount: currentAnimation.frames.length,
  currentFrame: currentFrameRef.current,
  frames: currentAnimation.frames
}, null, 2)}
        </pre>
      </div>
    </div>
  );
}