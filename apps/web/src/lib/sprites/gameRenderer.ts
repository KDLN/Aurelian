import { CharacterSprite, CharacterAppearance } from './characterSprites';
import { loadCharacterAppearance } from './characterOptions';

export interface GamePlayer {
  id: string;
  x: number;
  y: number;
  appearance?: CharacterAppearance;
  sprite?: CharacterSprite;
  lastDirection: 'south' | 'west' | 'east' | 'north';
  isMoving: boolean;
  lastPosition: { x: number; y: number };
}

export class GameRenderer {
  private players: Map<string, GamePlayer> = new Map();
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  async addPlayer(id: string, x: number, y: number, appearance?: CharacterAppearance) {
    // Use saved character appearance if none provided
    const finalAppearance = appearance || loadCharacterAppearance();
    
    const player: GamePlayer = {
      id,
      x,
      y,
      appearance: finalAppearance,
      lastDirection: 'south',
      isMoving: false,
      lastPosition: { x, y }
    };

    // Load sprite
    try {
      const sprite = new CharacterSprite(finalAppearance);
      await sprite.load();
      player.sprite = sprite;
    } catch (error) {
      console.warn(`Failed to load sprite for player ${id}:`, error);
    }

    this.players.set(id, player);
  }

  removePlayer(id: string) {
    this.players.delete(id);
  }

  updatePlayerPosition(id: string, x: number, y: number) {
    const player = this.players.get(id);
    if (!player) return;

    // Determine direction and movement
    const dx = x - player.x;
    const dy = y - player.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      player.lastDirection = dx > 0 ? 'east' : 'west';
    } else if (dy !== 0) {
      player.lastDirection = dy > 0 ? 'south' : 'north';
    }

    player.isMoving = dx !== 0 || dy !== 0;
    player.lastPosition = { x: player.x, y: player.y };
    player.x = x;
    player.y = y;

    // Update sprite animation
    if (player.sprite) {
      const animationType = player.isMoving ? 'walk' : 'idle';
      player.sprite.setAnimation(animationType, player.lastDirection);
    }
  }

  update(deltaTime: number) {
    this.players.forEach(player => {
      if (player.sprite) {
        player.sprite.update(deltaTime);
      }
      
      // Stop moving animation after a short delay
      if (player.isMoving) {
        const timeSinceMove = Date.now(); // This would need proper time tracking
        // For now, we'll rely on position updates to determine movement
      }
    });
  }

  render() {
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.fillStyle = '#231913';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw grid
    this.ctx.strokeStyle = 'rgba(241, 229, 200, 0.1)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 32) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 32) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }

    // Draw players
    this.players.forEach(player => {
      if (player.sprite) {
        // Draw sprite centered on player position - scale down 64px sprites
        player.sprite.draw(this.ctx, player.x, player.y, 0.5); // 64px * 0.5 = 32px in game
      } else {
        // Fallback: draw simple circle
        this.ctx.fillStyle = '#68b06e';
        this.ctx.beginPath();
        this.ctx.arc(player.x, player.y, 12, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Draw name
      this.ctx.fillStyle = '#f1e5c8';
      this.ctx.font = '12px monospace';
      this.ctx.textAlign = 'center';
      const name = player.appearance?.name || player.id.slice(0, 4);
      this.ctx.fillText(name, player.x, player.y + 25);
    });
  }

  getPlayer(id: string): GamePlayer | undefined {
    return this.players.get(id);
  }

  getAllPlayers(): GamePlayer[] {
    return Array.from(this.players.values());
  }
}