export interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnimationFrame {
  frame: number;
  duration: number;
}

export interface Animation {
  name: string;
  frames: AnimationFrame[];
  loop: boolean;
}

export interface SpriteSheet {
  image: HTMLImageElement;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
}

export class SpriteLoader {
  private cache: Map<string, HTMLImageElement> = new Map();
  private loading: Map<string, Promise<HTMLImageElement>> = new Map();

  async loadImage(path: string): Promise<HTMLImageElement> {
    if (this.cache.has(path)) {
      return this.cache.get(path)!;
    }

    if (this.loading.has(path)) {
      return this.loading.get(path)!;
    }

    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(path, img);
        this.loading.delete(path);
        resolve(img);
      };
      img.onerror = () => {
        this.loading.delete(path);
        reject(new Error(`Failed to load image: ${path}`));
      };
      img.src = path;
    });

    this.loading.set(path, loadPromise);
    return loadPromise;
  }

  async loadSpriteSheet(path: string): Promise<SpriteSheet> {
    const image = await this.loadImage(path);
    // Mana Seed sprites are actually 64x64, not 16x16!
    return {
      image,
      frameWidth: 64,
      frameHeight: 64,
      columns: 8,
      rows: 8
    };
  }

  getFrame(sheet: SpriteSheet, col: number, row: number): SpriteFrame {
    return {
      x: col * sheet.frameWidth,
      y: row * sheet.frameHeight,
      width: sheet.frameWidth,
      height: sheet.frameHeight
    };
  }
}

export const spriteLoader = new SpriteLoader();