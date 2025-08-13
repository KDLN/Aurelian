import { spriteLoader, SpriteSheet } from './spriteLoader';

export type Direction = 'south' | 'west' | 'east' | 'north';
export type AnimationType = 'idle' | 'walk' | 'run';

export interface CharacterLayer {
  type: 'base' | 'outfit' | 'hair' | 'hat' | 'weapon' | 'shield';
  variant: string;
  color?: string;
}

export interface CharacterAppearance {
  name?: string;
  base: string;
  outfit?: string;
  hair?: string;
  hairColor?: string;
  hat?: string;
  weapon?: string;
  shield?: string;
  skinColor?: string;
  outfitColor?: string;
}

export class CharacterSprite {
  private layers: Map<string, SpriteSheet> = new Map();
  private currentFrame = 0;
  private animationTime = 0;
  private currentAnimation: AnimationType = 'idle';
  private currentDirection: Direction = 'south';

  constructor(private appearance: CharacterAppearance) {}

  async load(): Promise<void> {
    const basePath = '/sprites/FREE Mana Seed Character Base Demo 2.0';
    const charType = 'char_a_p1';
    
    const loadPromises: Promise<void>[] = [];

    // Load base character
    const basePath_ = `${basePath}/${charType}/${charType}_0bas_humn_${this.appearance.base}.png`;
    loadPromises.push(
      spriteLoader.loadSpriteSheet(basePath_).then(sheet => {
        this.layers.set('base', sheet);
      })
    );

    // Load outfit if specified
    if (this.appearance.outfit) {
      const outfitPath = `${basePath}/${charType}/1out/${charType}_1out_${this.appearance.outfit}.png`;
      loadPromises.push(
        spriteLoader.loadSpriteSheet(outfitPath).then(sheet => {
          this.layers.set('outfit', sheet);
        })
      );
    }

    // Load hair if specified
    if (this.appearance.hair) {
      const hairPath = `${basePath}/${charType}/4har/${charType}_4har_${this.appearance.hair}.png`;
      loadPromises.push(
        spriteLoader.loadSpriteSheet(hairPath).then(sheet => {
          this.layers.set('hair', sheet);
        })
      );
    }

    // Load hat if specified
    if (this.appearance.hat) {
      const hatPath = `${basePath}/${charType}/5hat/${charType}_5hat_${this.appearance.hat}.png`;
      loadPromises.push(
        spriteLoader.loadSpriteSheet(hatPath).then(sheet => {
          this.layers.set('hat', sheet);
        })
      );
    }

    await Promise.all(loadPromises);
  }

  setAnimation(type: AnimationType, direction: Direction) {
    if (this.currentAnimation !== type || this.currentDirection !== direction) {
      this.currentAnimation = type;
      this.currentDirection = direction;
      this.currentFrame = 0;
      this.animationTime = 0;
    }
  }

  update(deltaTime: number) {
    this.animationTime += deltaTime;

    const frameDurations = this.getFrameDurations();
    const currentFrameDuration = frameDurations[this.currentFrame];

    if (this.animationTime >= currentFrameDuration) {
      this.animationTime -= currentFrameDuration;
      this.currentFrame = (this.currentFrame + 1) % frameDurations.length;
    }
  }

  private getFrameDurations(): number[] {
    switch (this.currentAnimation) {
      case 'idle':
        return [10000]; // Very long idle - basically static
      case 'walk':
        return [200, 200, 200, 200, 200, 200]; // Faster, more responsive walk animation
      case 'run':
        return [120, 80, 150, 120, 80, 150]; // Faster run animation
      default:
        return [200];
    }
  }

  private getDirectionRow(): number {
    // Looking at the actual sprite sheet, the directions appear to be:
    // Rows 0-3 are other animations
    // Row 4 = South (facing down/toward camera)
    // Row 5 = North (facing up/away)
    // Row 6 = East (facing right)
    // Row 7 = West (facing left)
    const directionMap: Record<Direction, number> = {
      'south': 4,
      'north': 5,
      'east': 6,
      'west': 7
    };
    return directionMap[this.currentDirection];
  }

  private getAnimationFrames(): number[] {
    switch (this.currentAnimation) {
      case 'idle':
        return [0]; // Just use the first frame for idle
      case 'walk':
        return [0, 1, 2, 3, 4, 5]; // Walk cycle frames
      case 'run':
        return [0, 1, 6, 3, 4, 7]; // Run cycle with special frames 6&7
      default:
        return [0];
    }
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = 3) {
    const row = this.getDirectionRow();
    const frames = this.getAnimationFrames();
    const frameIndex = Math.floor(this.currentFrame) % frames.length; // Ensure valid frame index
    const col = frames[frameIndex];

    const drawLayer = (layerName: string) => {
      const sheet = this.layers.get(layerName);
      if (!sheet || !sheet.image.complete) return;

      const frame = spriteLoader.getFrame(sheet, col, row);
      
      // Mana Seed sprites are designed to be drawn directly on top of each other
      // No offset calculations needed - just center the 64x64 frame
      const drawX = x - (frame.width * scale) / 2;
      const drawY = y - (frame.height * scale) / 2;
      
      try {
        ctx.drawImage(
          sheet.image,
          frame.x, frame.y, frame.width, frame.height,
          drawX, drawY, frame.width * scale, frame.height * scale
        );
      } catch (error) {
        console.warn(`Failed to draw layer ${layerName}:`, error);
      }
    };

    // Draw layers in correct order (as specified in Mana Seed guide)
    drawLayer('base');
    drawLayer('outfit');
    drawLayer('hair');
    drawLayer('hat');
    drawLayer('weapon');
    drawLayer('shield');
  }
}