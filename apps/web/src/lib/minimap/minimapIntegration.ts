import { MinimapPlayer, PlayerAction } from './minimapTypes';

// Integration layer for connecting minimap to Colyseus realtime system
export class MinimapIntegration {
  private static instance: MinimapIntegration;
  private players: Map<string, MinimapPlayer> = new Map();
  private callbacks: ((players: MinimapPlayer[]) => void)[] = [];

  static getInstance(): MinimapIntegration {
    if (!MinimapIntegration.instance) {
      MinimapIntegration.instance = new MinimapIntegration();
    }
    return MinimapIntegration.instance;
  }

  // Subscribe to player updates
  subscribe(callback: (players: MinimapPlayer[]) => void) {
    this.callbacks.push(callback);
    // Send current state immediately
    callback(Array.from(this.players.values()));
  }

  unsubscribe(callback: (players: MinimapPlayer[]) => void) {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  private notifySubscribers() {
    const players = Array.from(this.players.values());
    this.callbacks.forEach(callback => callback(players));
  }

  // Update player position from Colyseus room
  updatePlayerPosition(playerId: string, x: number, y: number, areaId?: string) {
    const player = this.players.get(playerId);
    if (player) {
      const oldX = player.x;
      const oldY = player.y;
      
      player.x = x;
      player.y = y;
      if (areaId) player.areaId = areaId;
      player.lastSeen = Date.now();
      
      // Detect movement and update action
      const distance = Math.sqrt((x - oldX) ** 2 + (y - oldY) ** 2);
      if (distance > 5) { // Threshold for movement detection
        player.action = {
          type: 'walking',
          intensity: Math.min(1, distance / 50), // Scale intensity by movement speed
        };
      } else if (player.action.type === 'walking') {
        // Stop walking if not moving much
        player.action = { type: 'idle', intensity: 0 };
      }
      
      this.notifySubscribers();
    }
  }

  // Add new player
  addPlayer(
    playerId: string, 
    name: string, 
    x: number, 
    y: number, 
    areaId: string,
    appearance?: { skinTone?: string; primaryColor?: string }
  ) {
    const player: MinimapPlayer = {
      id: playerId,
      name,
      x,
      y,
      areaId,
      action: { type: 'idle', intensity: 0 },
      lastSeen: Date.now(),
      appearance: {
        skinTone: appearance?.skinTone || '#F1C27D',
        primaryColor: appearance?.primaryColor || '#68b06e'
      }
    };
    
    this.players.set(playerId, player);
    this.notifySubscribers();
  }

  // Remove player
  removePlayer(playerId: string) {
    this.players.delete(playerId);
    this.notifySubscribers();
  }

  // Update player action (called from game logic)
  updatePlayerAction(playerId: string, action: PlayerAction) {
    const player = this.players.get(playerId);
    if (player) {
      player.action = action;
      player.lastSeen = Date.now();
      this.notifySubscribers();
    }
  }

  // Get player for specific queries
  getPlayer(playerId: string): MinimapPlayer | undefined {
    return this.players.get(playerId);
  }

  // Get all players in area
  getPlayersInArea(areaId: string): MinimapPlayer[] {
    return Array.from(this.players.values()).filter(p => p.areaId === areaId);
  }

  // Get players by action type
  getPlayersByAction(actionType: PlayerAction['type']): MinimapPlayer[] {
    return Array.from(this.players.values()).filter(p => p.action.type === actionType);
  }

  // Activity detection helpers
  detectTrading(playerId: string, targetPlayerId?: string) {
    this.updatePlayerAction(playerId, {
      type: 'trading',
      intensity: 0.8,
      target: targetPlayerId
    });
  }

  detectCrafting(playerId: string, craftingItem?: string) {
    this.updatePlayerAction(playerId, {
      type: 'crafting',
      intensity: 0.7,
      target: craftingItem
    });
  }

  detectMining(playerId: string, resourceNode?: string) {
    this.updatePlayerAction(playerId, {
      type: 'mining',
      intensity: 0.6,
      target: resourceNode
    });
  }

  detectFarming(playerId: string, cropType?: string) {
    this.updatePlayerAction(playerId, {
      type: 'farming',
      intensity: 0.5,
      target: cropType
    });
  }

  detectFishing(playerId: string, fishingSpot?: string) {
    this.updatePlayerAction(playerId, {
      type: 'fishing',
      intensity: 0.4,
      target: fishingSpot
    });
  }

  detectCombat(playerId: string, targetId?: string) {
    this.updatePlayerAction(playerId, {
      type: 'combat',
      intensity: 1.0,
      target: targetId
    });
  }

  // Batch update for performance
  batchUpdate(updates: Array<{
    playerId: string;
    x?: number;
    y?: number;
    areaId?: string;
    action?: PlayerAction;
  }>) {
    let hasChanges = false;
    
    updates.forEach(update => {
      const player = this.players.get(update.playerId);
      if (player) {
        if (update.x !== undefined) player.x = update.x;
        if (update.y !== undefined) player.y = update.y;
        if (update.areaId) player.areaId = update.areaId;
        if (update.action) player.action = update.action;
        player.lastSeen = Date.now();
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      this.notifySubscribers();
    }
  }

  // Clean up inactive players
  cleanupInactivePlayers(maxInactiveTime = 60000) { // 1 minute default
    const now = Date.now();
    let hasChanges = false;
    
    for (const [playerId, player] of this.players.entries()) {
      if (now - player.lastSeen > maxInactiveTime) {
        this.players.delete(playerId);
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      this.notifySubscribers();
    }
  }
}

// Export singleton instance
export const minimapIntegration = MinimapIntegration.getInstance();