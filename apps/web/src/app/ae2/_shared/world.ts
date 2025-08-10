
'use client';
export type Warehouse = Record<string, number>;
export type Listing = { id: string; item: string; qty: number; price: number; age: number };
export type Mission  = { id: string; item: string; qty: number; risk: 'Low'|'Medium'|'High'; eta: number; progress: number };
export type CraftJob = { id: string; out: string; qty: number; eta: number };
export type Contract = { id: string; item: string; qty: number; price: number };

type Listener = () => void;
function nowMinutes(){ const d=(window as any).__ae_day??1; const m=(window as any).__ae_min??(6*60); return (d-1)*24*60 + m; }

class World {
  gold = 2500; day = 1; minute = 6*60; listeners: Set<Listener> = new Set();
  warehouse: Warehouse = { "Iron Ore": 200, "Herb": 120, "Hide": 60, "Pearl": 5, "Relic Fragment": 2 };
  listings: Listing[] = []; missions: Mission[] = []; crafting: CraftJob[] = []; contracts: Contract[] = [];
  commodities: Record<string, { base:number; vol:number; mult:number }> = {
    "Iron Ore": { base:8, vol:0.4, mult:1 },
    "Herb": { base:6, vol:0.35, mult:1 },
    "Hide": { base:7, vol:0.3, mult:1 },
    "Pearl": { base:60, vol:0.6, mult:1 },
    "Relic Fragment": { base:120, vol:1.0, mult:1 }
  };
  subscribe(fn: Listener){ this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit(){ this.listeners.forEach(fn=>fn()); }
  tick(minutes=10){ this.minute += minutes; if (this.minute >= 24*60){ this.minute = 0; this.day += 1; } (window as any).__ae_day=this.day; (window as any).__ae_min=this.minute; this.processAll(); this.emit(); }
  priceOf(k:string){ const c=this.commodities[k]; const noise=(Math.random()-0.5)*c.vol; return Math.max(1, Math.round((c.base * (1+noise)) * c.mult)); }
  add(k:string, n:number){ this.warehouse[k]=(this.warehouse[k]||0)+n; this.emit(); }
  take(k:string, n:number){ if ((this.warehouse[k]||0) < n) return false; this.warehouse[k]-=n; this.emit(); return true; }
  list(item:string, qty:number, price:number){ if (!this.take(item, qty)) return false; this.listings.push({ id:crypto.randomUUID(), item, qty, price, age:0 }); this.emit(); return true; }
  processAuctions(){ for(const l of this.listings) l.age++; for(let i=this.listings.length-1;i>=0;i--){ const l=this.listings[i]; const idx=this.priceOf(l.item); const chance = l.price <= Math.round(idx*1.05) ? 0.35 : 0.05; if (Math.random() < chance){ this.gold += l.qty*l.price; this.listings.splice(i,1); } else if (l.age>36){ this.add(l.item,l.qty); this.listings.splice(i,1); } } }
  sendMission(item:string, qty:number, risk:any, hours:number){ const id=crypto.randomUUID(); const eta=nowMinutes()+hours*60; this.missions.push({ id, item, qty, risk, eta, progress:0 }); this.emit(); return id; }
  processMissions(){ for(const m of this.missions){ m.progress=Math.min(100, Math.round((1 - ((m.eta - nowMinutes())/(6*60))) * 100)); } for(let i=this.missions.length-1;i>=0;i--){ const m=this.missions[i]; if (nowMinutes() >= m.eta){ const failChance = m.risk==='Low'?0.05 : m.risk==='Medium'?0.15 : 0.3; if (Math.random() >= failChance){ this.add(m.item, m.qty); } this.missions.splice(i,1); } } }
  craft(out:string, qty:number){ const map: Record<string,string> = { "Iron Ingot":"Iron Ore", "Leather Roll":"Hide", "Healing Tonic":"Herb" }; const input = map[out]; if (!input) return false; if (!this.take(input, qty*2)) return false; this.crafting.push({ id:crypto.randomUUID(), out, qty, eta: nowMinutes()+qty*12 }); this.emit(); return true; }
  processCrafting(){ for(let i=this.crafting.length-1;i>=0;i--){ const c=this.crafting[i]; if (nowMinutes() >= c.eta){ this.add(c.out, c.qty); this.crafting.splice(i,1); } } }
  addContract(item:string, qty:number, price:number){ this.contracts.push({ id:crypto.randomUUID(), item, qty, price }); this.emit(); }
  processContracts(){ const hourly = this.contracts.reduce((s,c)=> s + (c.qty*c.price/24), 0); this.gold += hourly * (10/60); }
  processAll(){ this.processMissions(); this.processCrafting(); this.processAuctions(); this.processContracts(); }
}
export const world = new World();
export function useWorld(){ return { world, sub: (fn:()=>void)=> world.subscribe(fn) }; }
