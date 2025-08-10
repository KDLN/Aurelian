'use client';
import { useEffect, useRef, useState } from 'react';

interface AnimationFrame {
  row: number;
  col: number;
  duration: number;
}

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
  const spritesRef = useRef<Map<string, HTMLImageElement>>(new Map());
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
  const [spritesLoaded, setSpritesLoaded] = useState(false);

  // Character customization
  const [outfit, setOutfit] = useState('fstr');
  const [hair, setHair] = useState('dap1');
  const [hat, setHat] = useState('');
  const [skinTone, setSkinTone] = useState('v00');

  // Load sprite sheets
  useEffect(() => {
    const loadSprites = async () => {
      const basePath = '/sprites/FREE Mana Seed Character Base Demo 2.0';
      const spritesToLoad = [
        // Base pages
        { key: 'base_p1', path: `${basePath}/char_a_p1/char_a_p1_0bas_humn_v00.png` },
        { key: 'base_pONE1', path: `${basePath}/char_a_pONE1/char_a_pONE1_0bas_humn_v00.png` },
        { key: 'base_pONE2', path: `${basePath}/char_a_pONE2/char_a_pONE2_0bas_humn_v00.png` },
        { key: 'base_pONE3', path: `${basePath}/char_a_pONE3/char_a_pONE3_0bas_humn_v00.png` },
        // Outfits
        { key: 'outfit_p1', path: `${basePath}/char_a_p1/1out/char_a_p1_1out_fstr.png` },
        // Hair
        { key: 'hair_p1', path: `${basePath}/char_a_p1/4har/char_a_p1_4har_dap1_v00.png` },
        // Weapons
        { key: 'weapon_pONE1', path: `${basePath}/char_a_pONE1/6tla/char_a_pONE1_6tla_sw01.png` },
        { key: 'weapon_pONE2', path: `${basePath}/char_a_pONE2/6tla/char_a_pONE2_6tla_sw01.png` },
        { key: 'weapon_pONE3', path: `${basePath}/char_a_pONE3/6tla/char_a_pONE3_6tla_sw01.png` },
        // Shields
        { key: 'shield_pONE3', path: `${basePath}/char_a_pONE3/7tlb/char_a_pONE3_7tlb_sh01.png` },
      ];

      const loadPromises = spritesToLoad.map(({ key, path }) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            spritesRef.current.set(key, img);
            resolve();
          };
          img.onerror = () => {
            console.warn(`Failed to load sprite: ${path}`);
            resolve();
          };
          img.src = path;
        });
      });

      await Promise.all(loadPromises);
      setSpritesLoaded(true);
    };

    loadSprites();
  }, []);

  // Draw sprite frame
  const drawSpriteFrame = (
    ctx: CanvasRenderingContext2D,
    page: string,
    row: number,
    col: number,
    x: number,
    y: number,
    scale: number
  ) => {
    const baseSprite = spritesRef.current.get(`base_${page}`);
    if (!baseSprite) return;

    const frameSize = 64;
    const sx = col * frameSize;
    const sy = row * frameSize;

    // Draw base
    ctx.drawImage(
      baseSprite,
      sx, sy, frameSize, frameSize,
      x, y, frameSize * scale, frameSize * scale
    );

    // Draw outfit for p1 animations
    if (page === 'p1' && outfit) {
      const outfitSprite = spritesRef.current.get('outfit_p1');
      if (outfitSprite) {
        ctx.drawImage(
          outfitSprite,
          sx, sy, frameSize, frameSize,
          x, y, frameSize * scale, frameSize * scale
        );
      }
    }

    // Draw hair for p1 animations
    if (page === 'p1' && hair && !hat) {
      const hairSprite = spritesRef.current.get('hair_p1');
      if (hairSprite) {
        ctx.drawImage(
          hairSprite,
          sx, sy, frameSize, frameSize,
          x, y, frameSize * scale, frameSize * scale
        );
      }
    }

    // Draw weapon for combat pages
    if (showWeapon && (page === 'pONE1' || page === 'pONE2' || page === 'pONE3')) {
      const weaponSprite = spritesRef.current.get(`weapon_${page}`);
      if (weaponSprite) {
        ctx.drawImage(
          weaponSprite,
          sx, sy, frameSize, frameSize,
          x, y, frameSize * scale, frameSize * scale
        );
      }
    }

    // Draw shield for pONE3
    if (showShield && page === 'pONE3') {
      const shieldSprite = spritesRef.current.get('shield_pONE3');
      if (shieldSprite) {
        ctx.drawImage(
          shieldSprite,
          sx, sy, frameSize, frameSize,
          x, y, frameSize * scale, frameSize * scale
        );
      }
    }
  };

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !spritesLoaded) return;

    const animate = (timestamp: number) => {
      if (!canvasRef.current) {
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
        
        drawSpriteFrame(
          ctx,
          currentAnimation.page,
          currentFrame.row + directionRow,
          currentFrame.col,
          0, 0, zoom
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
          
          drawSpriteFrame(
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
  }, [currentAnimation, direction, isPlaying, zoom, showViewer, spritesLoaded, outfit, hair, hat, showWeapon, showShield]);

  const filteredAnimations = selectedCategory === 'all' 
    ? ANIMATIONS 
    : ANIMATIONS.filter(a => a.category === selectedCategory);

  if (!spritesLoaded) {
    return (
      <div style={{ 
        padding: 16, 
        background: '#231913', 
        color: '#f1e5c8', 
        minHeight: '100vh',
        fontFamily: 'monospace'
      }}>
        <h1>Loading sprites...</h1>
      </div>
    );
  }

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
            <button onClick={() => setDirection('south')} style={{ marginRight: 4 }}>South ↓</button>
            <button onClick={() => setDirection('north')} style={{ marginRight: 4 }}>North ↑</button>
            <button onClick={() => setDirection('east')} style={{ marginRight: 4 }}>East →</button>
            <button onClick={() => setDirection('west')}>West ←</button>
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
          <p style={{ fontSize: 12, opacity: 0.7 }}>
            Note: Peasant hat (pfht) and Pointy hat (pnty) will hide hair to prevent clipping
          </p>
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

        {/* Equipment Options */}
        <div>
          <h2>Equipment</h2>
          <div style={{ marginBottom: 8 }}>
            <label>
              <input 
                type="checkbox" 
                checked={showWeapon} 
                onChange={(e) => setShowWeapon(e.target.checked)}
              />
              Show Weapon (combat animations)
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              <input 
                type="checkbox" 
                checked={showShield} 
                onChange={(e) => setShowShield(e.target.checked)}
              />
              Show Shield (pONE3 only)
            </label>
          </div>
          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 16 }}>
            Note: Character customization (outfit, hair, hat) currently only works with p1 animations.
            Combat animations show base character with weapons.
          </p>
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