'use client';
import { useEffect, useRef, useState } from 'react';

interface AnimationFrame {
  row: number;
  col: number;
  duration: number;
}

interface CharacterViewerProps {
  // Character appearance
  skinTone?: string;
  outfit?: string;
  hair?: string;
  hat?: string;
  weapon?: string;
  shield?: string;
  
  // State/context
  activity?: 'idle' | 'walking' | 'running' | 'trading' | 'crafting' | 'combat' | 'mission';
  location?: string;
  mood?: 'neutral' | 'happy' | 'alert' | 'tired';
  
  // Display options
  size?: number;
  showBorder?: boolean;
  position?: 'top-right' | 'top-left' | 'inline';
  autoWalk?: boolean;
  walkAreaWidth?: number;
}

// Hat configuration - which hats should hide hair to prevent clipping
const HATS_THAT_HIDE_HAIR = [
  'pfht', // Peasant hat - covers most of head
  'pnty', // Pointy hat - tall wizard hat
  // Add more hats here as they're added to the game
];

// Animation definitions based on activity
const ACTIVITY_ANIMATIONS: Record<string, AnimationFrame[]> = {
  idle: [{ row: 0, col: 0, duration: 10000 }],
  walking: [
    { row: 0, col: 1, duration: 135 },
    { row: 0, col: 2, duration: 135 },
    { row: 0, col: 3, duration: 135 },
    { row: 0, col: 4, duration: 135 },
    { row: 0, col: 5, duration: 135 },
    { row: 0, col: 6, duration: 135 }
  ],
  running: [
    { row: 0, col: 1, duration: 80 },
    { row: 0, col: 2, duration: 55 },
    { row: 0, col: 7, duration: 125 },
    { row: 0, col: 4, duration: 80 },
    { row: 0, col: 5, duration: 55 },
    { row: 0, col: 8, duration: 125 }
  ],
  trading: [
    { row: 0, col: 4, duration: 400 },
    { row: 0, col: 5, duration: 400 }
  ],
  crafting: [
    { row: 0, col: 2, duration: 300 },
    { row: 0, col: 3, duration: 300 }
  ],
  combat: [
    { row: 0, col: 1, duration: 200 },
    { row: 0, col: 2, duration: 200 },
    { row: 0, col: 3, duration: 200 },
    { row: 0, col: 4, duration: 200 }
  ],
  mission: [
    { row: 0, col: 1, duration: 160 },
    { row: 0, col: 2, duration: 65 },
    { row: 0, col: 3, duration: 65 },
    { row: 0, col: 4, duration: 200 }
  ]
};

export default function CharacterViewer({
  skinTone = 'v00',
  outfit = 'fstr',
  hair = 'dap1',
  hat = '',
  weapon = '',
  shield = '',
  activity = 'idle',
  location = '',
  mood = 'neutral',
  size = 160,
  showBorder = true,
  position = 'inline',
  autoWalk = false,
  walkAreaWidth = 240
}: CharacterViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const currentFrameRef = useRef<number>(0);
  const frameTimeRef = useRef<number>(0);
  const [spritesLoaded, setSpritesLoaded] = useState(false);
  const [direction, setDirection] = useState<'south' | 'north' | 'east' | 'west'>('west');
  const characterXRef = useRef<number>(walkAreaWidth);
  const walkDirectionRef = useRef<'left' | 'right'>('left');
  const walkSpeedRef = useRef<number>(0.03); // pixels per millisecond - increased for better visibility

  // Determine if hair should be hidden based on hat
  const shouldHideHair = hat && HATS_THAT_HIDE_HAIR.includes(hat);

  // Load sprites
  useEffect(() => {
    const loadSprites = async () => {
      const basePath = '/sprites/FREE Mana Seed Character Base Demo 2.0';
      const spritesToLoad = [];

      // Determine which page to use based on activity
      const page = activity === 'combat' || activity === 'mission' ? 'pONE2' : 'p1';
      
      // Base sprite
      spritesToLoad.push({ 
        key: `base_${page}`, 
        path: `${basePath}/char_a_${page}/char_a_${page}_0bas_humn_${skinTone}.png` 
      });

      // Outfit
      if (outfit && page === 'p1') {
        spritesToLoad.push({ 
          key: 'outfit', 
          path: `${basePath}/char_a_p1/1out/char_a_p1_1out_${outfit}.png` 
        });
      }

      // Hair (only if not hidden by hat)
      if (hair && !shouldHideHair && page === 'p1') {
        spritesToLoad.push({ 
          key: 'hair', 
          path: `${basePath}/char_a_p1/4har/char_a_p1_4har_${hair}_${skinTone}.png` 
        });
      }

      // Hat
      if (hat && page === 'p1') {
        spritesToLoad.push({ 
          key: 'hat', 
          path: `${basePath}/char_a_p1/5hat/char_a_p1_5hat_${hat}.png` 
        });
      }

      // Weapon (for combat/mission activities)
      if ((weapon || activity === 'combat' || activity === 'mission') && page !== 'p1') {
        spritesToLoad.push({ 
          key: 'weapon', 
          path: `${basePath}/char_a_${page}/6tla/char_a_${page}_6tla_${weapon || 'sw01'}.png` 
        });
      }

      // Shield (for combat activities)
      if (shield && page === 'pONE2') {
        spritesToLoad.push({ 
          key: 'shield', 
          path: `${basePath}/char_a_pONE2/7tlb/char_a_pONE2_7tlb_${shield}.png` 
        });
      }

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
  }, [skinTone, outfit, hair, hat, weapon, shield, activity, shouldHideHair]);

  // Animation loop
  useEffect(() => {
    if (!spritesLoaded || !canvasRef.current) return;

    const animate = (timestamp: number) => {
      if (!canvasRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      frameTimeRef.current += deltaTime;

      // Handle auto-walk movement
      if (autoWalk) {
        // Update position
        if (walkDirectionRef.current === 'left') {
          characterXRef.current -= walkSpeedRef.current * deltaTime;
          // Walk completely off the left edge
          if (characterXRef.current <= -size - 20) {
            characterXRef.current = -size - 20;
            walkDirectionRef.current = 'right';
            setDirection('east');
          }
        } else {
          characterXRef.current += walkSpeedRef.current * deltaTime;
          // Walk completely off the right edge (account for character width)
          if (characterXRef.current >= walkAreaWidth - size + 20) {
            characterXRef.current = walkAreaWidth - size + 20;
            walkDirectionRef.current = 'left';
            setDirection('west');
          }
        }
      }

      const currentActivity = autoWalk ? 'walking' : activity;
      const frames = ACTIVITY_ANIMATIONS[currentActivity] || ACTIVITY_ANIMATIONS.idle;
      const frame = frames[currentFrameRef.current];
      
      if (frameTimeRef.current >= frame.duration) {
        frameTimeRef.current = 0;
        currentFrameRef.current = (currentFrameRef.current + 1) % frames.length;
      }

      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        
        // Clear canvas - use full walk area width if auto-walking
        const canvasWidth = autoWalk ? walkAreaWidth : size;
        ctx.fillStyle = '#1a1511';
        ctx.fillRect(0, 0, canvasWidth, size);
        
        // Determine page and get base sprite
        const page = activity === 'combat' || activity === 'mission' ? 'pONE2' : 'p1';
        const baseSprite = spritesRef.current.get(`base_${page}`);
        
        if (baseSprite) {
          const frameSize = 64;
          const scale = size / 64;
          const currentFrame = frames[currentFrameRef.current];
          const directionRow = direction === 'south' ? 0 : 
                             direction === 'north' ? 1 : 
                             direction === 'east' ? 2 : 3;
          
          const sx = currentFrame.col * frameSize;
          const sy = (currentFrame.row + directionRow) * frameSize;
          const drawX = autoWalk ? characterXRef.current : (size - frameSize * scale) / 2;
          const drawY = (size - frameSize * scale) / 2;
          
          // Draw base
          ctx.drawImage(
            baseSprite,
            sx, sy, frameSize, frameSize,
            drawX, drawY, frameSize * scale, frameSize * scale
          );
          
          // Draw layers in order
          const layers = ['outfit', 'hair', 'hat', 'weapon', 'shield'];
          layers.forEach(layer => {
            const sprite = spritesRef.current.get(layer);
            if (sprite) {
              ctx.drawImage(
                sprite,
                sx, sy, frameSize, frameSize,
                drawX, drawY, frameSize * scale, frameSize * scale
              );
            }
          });
        }
        
        // Draw border - adjust for auto-walk width
        if (showBorder && !autoWalk) {
          ctx.strokeStyle = '#f1e5c8';
          ctx.lineWidth = 2;
          ctx.strokeRect(1, 1, size - 2, size - 2);
        }
        
        // Activity text - only show if not auto-walking
        if (!autoWalk) {
          ctx.fillStyle = '#f1e5c8';
          ctx.font = '10px monospace';
          ctx.fillText(activity.charAt(0).toUpperCase() + activity.slice(1), 4, size - 4);
          
          // Location text
          if (location) {
            ctx.fillText(location, 4, 12);
          }
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
  }, [spritesLoaded, activity, direction, size, showBorder, location, autoWalk, walkAreaWidth]);

  // Position styles based on prop
  const positionStyles = position === 'top-right' ? {
    position: 'fixed' as const,
    top: 16,
    right: 16,
    zIndex: 1000,
    boxShadow: '0 4px 8px rgba(0,0,0,0.5)'
  } : position === 'top-left' ? {
    position: 'fixed' as const,
    top: 16,
    left: 16,
    zIndex: 1000,
    boxShadow: '0 4px 8px rgba(0,0,0,0.5)'
  } : {};

  if (!spritesLoaded) {
    return (
      <div style={{
        width: size,
        height: size,
        background: '#1a1511',
        border: showBorder ? '2px solid #f1e5c8' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f1e5c8',
        fontFamily: 'monospace',
        fontSize: 12,
        ...positionStyles
      }}>
        Loading...
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={autoWalk ? walkAreaWidth : size}
      height={size}
      style={{
        imageRendering: 'pixelated',
        width: autoWalk ? walkAreaWidth : size,
        height: size,
        ...positionStyles
      }}
    />
  );
}