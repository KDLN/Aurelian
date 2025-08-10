// Automatic sprite alignment system - finds the actual sprite content within each frame
// and calculates offsets to properly center/align the character

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
}

export interface FrameOffset {
  row: number;
  col: number;
  offsetX: number;
  offsetY: number;
  empty?: boolean;
}

export interface AlignmentAnalysis {
  rows: number;
  cols: number;
  frameW: number;
  frameH: number;
  pivotMode: 'center' | 'feet';
  targetInFrame: { x: number; y: number };
  frames: FrameOffset[];
}

export class SpriteAligner {
  private frameWidth = 16;
  private frameHeight = 16;
  private alphaThreshold = 1; // Any non-transparent pixel
  private pivotMode: 'center' | 'feet' = 'center';
  private targetInFrame: { x: number; y: number };
  private frameOffsets: Map<string, FrameOffset> = new Map();

  constructor(
    frameWidth = 16,
    frameHeight = 16,
    pivotMode: 'center' | 'feet' = 'center'
  ) {
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.pivotMode = pivotMode;
    
    // Default target position based on pivot mode
    this.targetInFrame = {
      x: frameWidth / 2,
      y: pivotMode === 'feet' ? frameHeight - 1 : frameHeight / 2
    };
  }

  // Slice sprite sheet into individual frames
  private sliceFrames(img: HTMLImageElement) {
    const cols = Math.floor(img.width / this.frameWidth);
    const rows = Math.floor(img.height / this.frameHeight);
    const frames: Array<{
      row: number;
      col: number;
      canvas: HTMLCanvasElement;
      imageData: ImageData;
    }> = [];

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.frameWidth;
    tempCanvas.height = this.frameHeight;
    const ctx = tempCanvas.getContext('2d')!;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.clearRect(0, 0, this.frameWidth, this.frameHeight);
        ctx.drawImage(
          img,
          c * this.frameWidth,
          r * this.frameHeight,
          this.frameWidth,
          this.frameHeight,
          0,
          0,
          this.frameWidth,
          this.frameHeight
        );
        
        const imageData = ctx.getImageData(0, 0, this.frameWidth, this.frameHeight);
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = this.frameWidth;
        frameCanvas.height = this.frameHeight;
        const frameCtx = frameCanvas.getContext('2d')!;
        frameCtx.putImageData(imageData, 0, 0);
        
        frames.push({
          row: r,
          col: c,
          canvas: frameCanvas,
          imageData
        });
      }
    }

    return { frames, rows, cols };
  }

  // Find bounding box of non-transparent pixels
  private getBBox(imageData: ImageData): BoundingBox | null {
    const { width: w, height: h, data } = imageData;
    let minX = w, minY = h, maxX = -1, maxY = -1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = data[(y * w + x) * 4 + 3];
        if (alpha >= this.alphaThreshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX === -1) return null; // Empty frame
    
    return {
      minX,
      minY,
      maxX,
      maxY,
      w: maxX - minX + 1,
      h: maxY - minY + 1
    };
  }

  // Calculate pivot point based on mode
  private pivotPoint(bbox: BoundingBox): { x: number; y: number } {
    if (this.pivotMode === 'center') {
      return {
        x: bbox.minX + bbox.w / 2,
        y: bbox.minY + bbox.h / 2
      };
    }
    // 'feet' mode: bottom-center of visible pixels
    return {
      x: bbox.minX + bbox.w / 2,
      y: bbox.maxY
    };
  }

  // Compute offset to align pivot with target
  private computeOffset(
    bboxPivot: { x: number; y: number },
    target: { x: number; y: number }
  ): { offsetX: number; offsetY: number } {
    return {
      offsetX: Math.round(target.x - bboxPivot.x),
      offsetY: Math.round(target.y - bboxPivot.y)
    };
  }

  // Analyze sprite sheet and generate offsets
  async analyze(img: HTMLImageElement): Promise<AlignmentAnalysis> {
    const { frames, rows, cols } = this.sliceFrames(img);
    const results: FrameOffset[] = [];

    for (const frame of frames) {
      const bbox = this.getBBox(frame.imageData);
      
      if (!bbox) {
        // Empty frame
        const offset = {
          row: frame.row,
          col: frame.col,
          offsetX: 0,
          offsetY: 0,
          empty: true
        };
        results.push(offset);
        this.frameOffsets.set(`${frame.row},${frame.col}`, offset);
        continue;
      }

      const pivot = this.pivotPoint(bbox);
      const { offsetX, offsetY } = this.computeOffset(pivot, this.targetInFrame);
      
      const offset = {
        row: frame.row,
        col: frame.col,
        offsetX,
        offsetY
      };
      
      results.push(offset);
      this.frameOffsets.set(`${frame.row},${frame.col}`, offset);
    }

    return {
      rows,
      cols,
      frameW: this.frameWidth,
      frameH: this.frameHeight,
      pivotMode: this.pivotMode,
      targetInFrame: this.targetInFrame,
      frames: results
    };
  }

  // Get offset for a specific frame
  getFrameOffset(row: number, col: number): FrameOffset | undefined {
    return this.frameOffsets.get(`${row},${col}`);
  }

  // Build a corrected sprite sheet with baked offsets
  buildCorrectedSheet(img: HTMLImageElement, analysis: AlignmentAnalysis): HTMLCanvasElement {
    const { rows, cols } = analysis;
    const canvas = document.createElement('canvas');
    canvas.width = cols * this.frameWidth;
    canvas.height = rows * this.frameHeight;
    const ctx = canvas.getContext('2d')!;

    for (const frame of analysis.frames) {
      if (frame.empty) continue;
      
      const sx = frame.col * this.frameWidth;
      const sy = frame.row * this.frameHeight;
      const dx = frame.col * this.frameWidth + frame.offsetX;
      const dy = frame.row * this.frameHeight + frame.offsetY;
      
      ctx.drawImage(
        img,
        sx, sy, this.frameWidth, this.frameHeight,
        dx, dy, this.frameWidth, this.frameHeight
      );
    }

    return canvas;
  }
}

// Global instance for the Mana Seed sprites
export const manaSeedAligner = new SpriteAligner(16, 16, 'center');