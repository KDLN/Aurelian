export interface MinimapArea {
  id: string;
  name: string;
  type: 'town' | 'wilderness' | 'dungeon' | 'market' | 'guild' | 'farm';
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color: string;
  connections: string[]; // Connected area IDs
}

export interface PlayerAction {
  type: 'idle' | 'walking' | 'trading' | 'crafting' | 'mining' | 'farming' | 'combat' | 'fishing';
  intensity: number; // 0-1, how active they are
  target?: string; // What/who they're interacting with
}

export interface MinimapPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  areaId: string;
  action: PlayerAction;
  lastSeen: number;
  appearance?: {
    skinTone: string;
    primaryColor: string; // Main outfit color
  };
}

export interface MinimapConfig {
  width: number;
  height: number;
  scale: number;
  showPlayerNames: boolean;
  showActionIndicators: boolean;
  autoCenter: boolean;
  updateInterval: number; // milliseconds
}

export const GAME_AREAS: MinimapArea[] = [
  {
    id: 'central_plaza',
    name: 'Central Plaza',
    type: 'town',
    bounds: { x: 400, y: 400, width: 200, height: 200 },
    color: '#8B4513',
    connections: ['market_district', 'residential_quarter', 'guild_hall']
  },
  {
    id: 'market_district',
    name: 'Market District',
    type: 'market',
    bounds: { x: 100, y: 200, width: 250, height: 150 },
    color: '#DAA520',
    connections: ['central_plaza', 'warehouse_district']
  },
  {
    id: 'guild_hall',
    name: 'Guild Hall',
    type: 'guild',
    bounds: { x: 650, y: 300, width: 150, height: 100 },
    color: '#4682B4',
    connections: ['central_plaza']
  },
  {
    id: 'residential_quarter',
    name: 'Residential Quarter', 
    type: 'town',
    bounds: { x: 300, y: 650, width: 300, height: 200 },
    color: '#228B22',
    connections: ['central_plaza', 'farmlands']
  },
  {
    id: 'warehouse_district',
    name: 'Warehouse District',
    type: 'town',
    bounds: { x: 50, y: 50, width: 200, height: 100 },
    color: '#696969',
    connections: ['market_district', 'northern_gates']
  },
  {
    id: 'farmlands',
    name: 'Farmlands',
    type: 'farm',
    bounds: { x: 200, y: 900, width: 400, height: 200 },
    color: '#9ACD32',
    connections: ['residential_quarter', 'eastern_wilderness']
  },
  {
    id: 'northern_gates',
    name: 'Northern Gates',
    type: 'wilderness',
    bounds: { x: 300, y: 0, width: 200, height: 100 },
    color: '#8FBC8F',
    connections: ['warehouse_district', 'northern_wilderness']
  },
  {
    id: 'eastern_wilderness',
    name: 'Eastern Wilderness',
    type: 'wilderness', 
    bounds: { x: 750, y: 700, width: 250, height: 300 },
    color: '#556B2F',
    connections: ['farmlands', 'mining_camp']
  },
  {
    id: 'northern_wilderness',
    name: 'Northern Wilderness',
    type: 'wilderness',
    bounds: { x: 450, y: 0, width: 300, height: 150 },
    color: '#2F4F4F',
    connections: ['northern_gates']
  },
  {
    id: 'mining_camp',
    name: 'Mining Camp',
    type: 'town',
    bounds: { x: 850, y: 500, width: 100, height: 150 },
    color: '#B8860B',
    connections: ['eastern_wilderness', 'crystal_caves']
  },
  {
    id: 'crystal_caves',
    name: 'Crystal Caves',
    type: 'dungeon',
    bounds: { x: 950, y: 600, width: 150, height: 100 },
    color: '#483D8B',
    connections: ['mining_camp']
  }
];

export const ACTION_COLORS: Record<PlayerAction['type'], string> = {
  idle: '#CCCCCC',
  walking: '#87CEEB',
  trading: '#FFD700', 
  crafting: '#FF6347',
  mining: '#8B4513',
  farming: '#9ACD32',
  combat: '#DC143C',
  fishing: '#00CED1'
};

export const ACTION_ICONS: Record<PlayerAction['type'], string> = {
  idle: '●',
  walking: '→',
  trading: '💰',
  crafting: '🔨',
  mining: '⛏️',
  farming: '🌾',
  combat: '⚔️',
  fishing: '🎣'
};