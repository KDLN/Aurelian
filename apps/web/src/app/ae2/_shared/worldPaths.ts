
'use client';
// apps/web/src/app/ae2/_shared/worldPaths.ts
// Non-destructive add-on to ae2 world: trade hubs, safe links (taxed), player trails (riskier).
// Includes soft capacity (crowding raises delay/risk) and spacing rules for trail placement.

import { world } from './world';

export type Hub = { id: string; name: string; x: number; y: number; safe: boolean };
export type Link = {
  id: string;
  a: string; // hub id
  b: string; // hub id
  baseDist: number;
  baseRisk: number; // 0..1
  toll: number;     // gold per caravan
  capacity: number; // soft cap (simultaneous caravans)
  usage: number;    // active caravans count (soft)
};
export type TrailNode = { id: string; x: number; y: number };
export type TrailSeg  = { id: string; a: string; b: string; risk: number };

export type RouteLeg = { type: 'link'|'trail', from: {x:number,y:number}, to: {x:number,y:number}, dist: number, toll: number, risk: number, refId: string };
export type RouteEval = { legs: RouteLeg[]; totalDist: number; totalToll: number; totalRisk: number; etaHours: number };

// Map state (in-memory)
export const hubs: Hub[] = [
  { id: 'VAL', name: 'Verdant Vale', x: 120, y: 420, safe: true },
  { id: 'IRN', name: 'Ironridge',    x: 280, y: 160, safe: true },
  { id: 'SAP', name: 'Sapphire',     x: 620, y: 200, safe: true },
  { id: 'ASH', name: 'Ashen Wastes', x: 720, y: 420, safe: true },
  { id: 'CRT', name: 'Central Cross',x: 450, y: 340, safe: true },
];

export const links: Link[] = [
  mkLink('VAL','CRT',  360, 0.10, 5, 6),
  mkLink('CRT','IRN',  240, 0.12, 6, 5),
  mkLink('CRT','SAP',  240, 0.14, 7, 5),
  mkLink('CRT','ASH',  300, 0.18, 9, 4),
  mkLink('IRN','SAP',  360, 0.22, 11, 3), // riskier mountain pass
];

export const trailNodes: TrailNode[] = [];
export const trailSegs: TrailSeg[] = [];

// Helpers
function mkLink(a:string,b:string,dist:number,risk:number,toll:number,capacity:number): Link {
  return { id: `${a}-${b}`, a, b, baseDist: dist, baseRisk: risk, toll, capacity, usage: 0 };
}

export function resetUsage(){
  for (const l of links) l.usage = 0;
}

// Player trail placement rules
const MIN_NODE_SPACING = 40; // px
const MIN_SEG_LENGTH   = 30; // px

export function canPlaceNode(x:number,y:number){
  // cannot be too close to existing nodes or hubs to avoid stacking
  for (const h of hubs){
    const d=Math.hypot(h.x-x,h.y-y); if (d < MIN_NODE_SPACING) return false;
  }
  for (const n of trailNodes){
    const d=Math.hypot(n.x-x,n.y-y); if (d < MIN_NODE_SPACING) return false;
  }
  return true;
}
export function addTrailNode(x:number,y:number): TrailNode | null {
  if (!canPlaceNode(x,y)) return null;
  const node = { id: crypto.randomUUID(), x, y };
  trailNodes.push(node);
  return node;
}
export function canConnect(a:TrailNode, b:TrailNode){
  return Math.hypot(a.x-b.x, a.y-b.y) >= MIN_SEG_LENGTH;
}
export function connectTrail(a:TrailNode, b:TrailNode, risk=0.30){
  if(!canConnect(a,b)) return null;
  const seg = { id: crypto.randomUUID(), a: a.id, b: b.id, risk };
  trailSegs.push(seg);
  return seg;
}

// Graph building
type GNode = { id: string; x:number; y:number; neighbors: Array<{ id:string; dist:number; risk:number; toll:number; refId:string; type:'link'|'trail' }> };

function buildGraph(){
  const nodes = new Map<string, GNode>();
  const addNode=(id:string,x:number,y:number)=>{
    if(!nodes.has(id)) nodes.set(id, { id, x, y, neighbors: [] });
  };
  // hubs
  for(const h of hubs) addNode(h.id, h.x, h.y);
  // trail nodes
  for(const n of trailNodes) addNode(n.id, n.x, n.y);

  // links between hubs
  for(const l of links){
    const A = hubs.find(h=>h.id===l.a)!; const B = hubs.find(h=>h.id===l.b)!;
    const crow = Math.hypot(A.x - B.x, A.y - B.y);
    const dist = l.baseDist || crow;
    const risk = l.baseRisk * crowdFactor(l);
    const toll = l.toll;
    nodes.get(l.a)!.neighbors.push({ id: l.b, dist, risk, toll, refId: l.id, type:'link' });
    nodes.get(l.b)!.neighbors.push({ id: l.a, dist, risk, toll, refId: l.id, type:'link' });
  }
  // trail segments
  for(const s of trailSegs){
    const A = trailNodes.find(n=>n.id===s.a)!;
    const B = trailNodes.find(n=>n.id===s.b)!;
    const dist = Math.hypot(A.x - B.x, A.y - B.y);
    const risk = s.risk; const toll = 0;
    nodes.get(A.id)!.neighbors.push({ id: B.id, dist, risk, toll, refId: s.id, type:'trail' });
    nodes.get(B.id)!.neighbors.push({ id: A.id, dist, risk, toll, refId: s.id, type:'trail' });
  }
  return nodes;
}

function crowdFactor(l:Link){
  // Soft capacity: usage beyond capacity increases risk and implied delay.
  if (l.usage <= l.capacity) return 1.0;
  const over = l.usage - l.capacity;
  return 1.0 + Math.min(0.8, over * 0.15); // up to +80% risk when overcrowded
}

// Simple Dijkstra with composite cost (alpha for risk vs toll)
export function route(fromId:string, toId:string, alphaRisk=0.5, alphaToll=0.3){
  const graph = buildGraph();
  if(!graph.has(fromId) || !graph.has(toId)) return null;
  const cost = new Map<string, number>();
  const prev = new Map<string, { id:string; via:any }>();
  const Q = new Set<string>();
  for (const id of graph.keys()){ cost.set(id, Infinity); Q.add(id); }
  cost.set(fromId, 0);

  while (Q.size){
    let u:string|null=null, best=Infinity;
    for (const id of Q){ const c=cost.get(id)!; if(c<best){best=c;u=id;} }
    if(u===null) break;
    Q.delete(u);
    if (u===toId) break;
    for (const nb of graph.get(u)!.neighbors){
      const edgeCost = nb.dist*0.01 + nb.risk*alphaRisk*10 + nb.toll*alphaToll*0.5;
      const alt = cost.get(u)! + edgeCost;
      if (alt < cost.get(nb.id)!){
        cost.set(nb.id, alt);
        prev.set(nb.id, { id: u, via: nb });
      }
    }
  }

  if (!prev.has(toId)) return null;
  const legs: RouteLeg[] = [];
  let cur = toId;
  while (cur !== fromId){
    const p = prev.get(cur)!;
    legs.push({
      type: p.via.type,
      from: { x: graph.get(p.id)!.x, y: graph.get(p.id)!.y },
      to:   { x: graph.get(cur)!.x, y: graph.get(cur)!.y },
      dist: p.via.dist,
      toll: p.via.toll,
      risk: p.via.risk,
      refId: p.via.refId
    });
    cur = p.id;
  }
  legs.reverse();

  // Summaries + bump link usage
  let totalDist=0,totalToll=0,totalRisk=0;
  for (const leg of legs){
    totalDist += leg.dist;
    totalToll += leg.toll;
    totalRisk += leg.risk * (leg.dist/300); // distance-weighted risk
    if (leg.type==='link'){
      const l = links.find(x=>x.id===leg.refId);
      if (l) l.usage += 1;
    }
  }
  const etaHours = totalDist / 40; // 40 km/h caravan baseline
  return { legs, totalDist: Math.round(totalDist), totalToll: Math.round(totalToll), totalRisk: Number(totalRisk.toFixed(2)), etaHours: Number(etaHours.toFixed(1)) } as RouteEval;
}

// Utility
export function hubById(id:string){ return hubs.find(h=>h.id===id); }
export function nearestHub(x:number,y:number){ let best:Hub|null=null, dmin=1e9; for(const h of hubs){ const d=Math.hypot(h.x-x,h.y-y); if(d<dmin){dmin=d; best=h;} } return best; }
