'use client';

// Core game types
export type Warehouse = Record<string, number>;
export type Listing = { id: string; item: string; qty: number; price: number; age: number };
export type Mission = { id: string; item: string; qty: number; risk: 'LOW' | 'MEDIUM' | 'HIGH'; eta: number; progress: number };
export type CraftJob = { id: string; out: string; qty: number; eta: number };
export type Contract = { id: string; item: string; qty: number; limit: number; filled: number; expires: number };

export type GameState = {
  gold: number;
  day: number;
  minute: number;
  warehouse: Warehouse;
  listings: Listing[];
  missions: Mission[];
  crafting: CraftJob[];
  contracts: Contract[];
};

type Listener = () => void;

function nowMinutes(): number {
  const d = (window as any).__ae_day ?? 1;
  const m = (window as any).__ae_min ?? (6 * 60);
  return (d - 1) * 24 * 60 + m;
}

class GameWorld {
  // Core state
  gold = 0;
  day = 1;
  minute = 6 * 60;
  listeners: Set<Listener> = new Set();

  // Game data
  warehouse: Warehouse = {
    "Iron Ore": 200,
    "Herb": 120, 
    "Hide": 60,
    "Pearl": 5,
    "Relic Fragment": 2
  };

  listings: Listing[] = [];
  missions: Mission[] = [];
  crafting: CraftJob[] = [];
  contracts: Contract[] = [];

  // Market data
  commodities: Record<string, { base: number; vol: number; mult: number }> = {
    "Iron Ore": { base: 8, vol: 0.4, mult: 1 },
    "Herb": { base: 6, vol: 0.35, mult: 1 },
    "Hide": { base: 7, vol: 0.3, mult: 1 },
    "Pearl": { base: 60, vol: 0.6, mult: 1 },
    "Relic Fragment": { base: 120, vol: 1.0, mult: 1 }
  };

  // Event system
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    this.listeners.forEach(fn => fn());
  }

  // Time management
  tick(minutes = 10): void {
    this.minute += minutes;
    if (this.minute >= 24 * 60) {
      this.minute = 0;
      this.day += 1;
    }
    (window as any).__ae_day = this.day;
    (window as any).__ae_min = this.minute;
    this.processAll();
    this.emit();
  }

  getTimeString(): string {
    const hour = Math.floor(this.minute / 60);
    const min = this.minute % 60;
    return `Day ${this.day}, ${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  }

  // Market functions
  priceOf(item: string): number {
    const c = this.commodities[item];
    if (!c) return 1;
    const noise = (Math.random() - 0.5) * c.vol;
    return Math.max(1, Math.round((c.base * (1 + noise)) * c.mult));
  }

  // Inventory management
  add(item: string, quantity: number): void {
    this.warehouse[item] = (this.warehouse[item] || 0) + quantity;
    this.emit();
  }

  take(item: string, quantity: number): boolean {
    if ((this.warehouse[item] || 0) < quantity) return false;
    this.warehouse[item] -= quantity;
    this.emit();
    return true;
  }

  // Auction system
  list(item: string, qty: number, price: number): boolean {
    if (!this.take(item, qty)) return false;
    this.listings.push({
      id: crypto.randomUUID(),
      item,
      qty,
      price,
      age: 0
    });
    this.emit();
    return true;
  }

  // Mission system
  sendMission(item: string, qty: number, risk: 'LOW' | 'MEDIUM' | 'HIGH', hours: number): string {
    const id = crypto.randomUUID();
    const eta = nowMinutes() + hours * 60;
    this.missions.push({ id, item, qty, risk, eta, progress: 0 });
    this.emit();
    return id;
  }

  // Crafting system
  craft(output: string, qty: number): boolean {
    const recipes: Record<string, string> = {
      "Iron Ingot": "Iron Ore",
      "Leather Roll": "Hide", 
      "Healing Tonic": "Herb"
    };
    
    const input = recipes[output];
    if (!input) return false;
    if (!this.take(input, qty * 2)) return false;
    
    this.crafting.push({
      id: crypto.randomUUID(),
      out: output,
      qty,
      eta: nowMinutes() + qty * 12
    });
    this.emit();
    return true;
  }

  // Contract system
  createContract(item: string, qty: number, limit: number, hours: number): string {
    const cost = qty * limit;
    if (this.gold < cost) return '';
    
    this.gold -= cost;
    const id = crypto.randomUUID();
    this.contracts.push({
      id,
      item,
      qty,
      limit,
      filled: 0,
      expires: nowMinutes() + hours * 60
    });
    this.emit();
    return id;
  }

  addContract(item: string, qty: number, price: number): void {
    this.contracts.push({
      id: crypto.randomUUID(),
      item,
      qty: qty,
      limit: price,
      filled: 0,
      expires: nowMinutes() + 6 * 60
    });
    this.emit();
  }

  // Processing systems
  private processAuctions(): void {
    // Age all listings
    for (const listing of this.listings) {
      listing.age++;
    }

    // Process sales and expiry
    for (let i = this.listings.length - 1; i >= 0; i--) {
      const listing = this.listings[i];
      const marketPrice = this.priceOf(listing.item);
      const sellChance = listing.price <= Math.round(marketPrice * 1.05) ? 0.35 : 0.05;
      
      if (Math.random() < sellChance) {
        // Item sold
        this.gold += listing.qty * listing.price;
        this.listings.splice(i, 1);
      } else if (listing.age > 36) {
        // Item expired, return to warehouse
        this.add(listing.item, listing.qty);
        this.listings.splice(i, 1);
      }
    }
  }

  private processMissions(): void {
    // Update progress
    for (const mission of this.missions) {
      mission.progress = Math.min(100, Math.round((1 - ((mission.eta - nowMinutes()) / (6 * 60))) * 100));
    }

    // Complete missions
    for (let i = this.missions.length - 1; i >= 0; i--) {
      const mission = this.missions[i];
      if (nowMinutes() >= mission.eta) {
        const failChance = mission.risk === 'LOW' ? 0.05 : mission.risk === 'MEDIUM' ? 0.15 : 0.3;
        if (Math.random() >= failChance) {
          this.add(mission.item, mission.qty);
        }
        this.missions.splice(i, 1);
      }
    }
  }

  private processCrafting(): void {
    for (let i = this.crafting.length - 1; i >= 0; i--) {
      const job = this.crafting[i];
      if (nowMinutes() >= job.eta) {
        this.add(job.out, job.qty);
        this.crafting.splice(i, 1);
      }
    }
  }

  private processContracts(): void {
    // Process contract fulfillment and expiry
    for (let i = this.contracts.length - 1; i >= 0; i--) {
      const contract = this.contracts[i];
      
      // Check if expired
      if (nowMinutes() >= contract.expires) {
        // Refund remaining gold
        const refund = (contract.qty - contract.filled) * contract.limit;
        this.gold += refund;
        this.contracts.splice(i, 1);
        continue;
      }
      
      // Try to fulfill contract (simulate market availability)
      if (contract.filled < contract.qty && Math.random() < 0.1) {
        const available = Math.min(contract.qty - contract.filled, Math.floor(Math.random() * 5) + 1);
        contract.filled += available;
        this.add(contract.item, available);
      }
    }
  }

  private processAll(): void {
    this.processMissions();
    this.processCrafting();
    this.processAuctions();
    this.processContracts();
  }

  // Get current state snapshot
  getState(): GameState {
    return {
      gold: this.gold,
      day: this.day,
      minute: this.minute,
      warehouse: { ...this.warehouse },
      listings: [...this.listings],
      missions: [...this.missions],
      crafting: [...this.crafting],
      contracts: [...this.contracts]
    };
  }
}

// Global game world instance
export const gameWorld = new GameWorld();

// React hook for using the game world
export function useGameWorld() {
  return {
    world: gameWorld,
    subscribe: (fn: () => void) => gameWorld.subscribe(fn)
  };
}