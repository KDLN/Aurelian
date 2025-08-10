
'use client';
import { useEffect, useRef, useState } from 'react';
import { world } from '../_shared/world';
import { hubs, links, trailNodes, trailSegs, addTrailNode, connectTrail, canPlaceNode, route, hubById, resetUsage } from '../_shared/worldPaths';

type Mode = 'view'|'lay-node'|'link-node'|'auto-safe'|'auto-risky';

export default function Paths(){
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [origin, setOrigin] = useState<string>('VAL');
  const [dest, setDest] = useState<string>('ASH');
  const [alphaRisk, setAlphaRisk] = useState(0.5);
  const [alphaToll, setAlphaToll] = useState(0.3);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [tmpSel, setTmpSel] = useState<string|null>(null);

  useEffect(()=>{
    const c = canvasRef.current!;
    const ctx = c.getContext('2d')!;
    function draw(){
      const w = c.width = c.clientWidth || 900;
      const h = c.height = c.clientHeight || 560;
      // background
      ctx.fillStyle = '#231913'; ctx.fillRect(0,0,w,h);
      // soft terrain lines
      ctx.strokeStyle = 'rgba(0,0,0,.2)';
      for (let x=0;x<w;x+=30){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
      for (let y=0;y<h;y+=30){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

      // links
      for (const l of links){
        const A = hubById(l.a)!; const B = hubById(l.b)!;
        const crowd = Math.max(0, l.usage - l.capacity);
        ctx.strokeStyle = crowd>0 ? '#d66a5b' : '#986540';
        ctx.lineWidth = 3 + Math.min(6, crowd);
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
        // toll marker
        const mx=(A.x+B.x)/2, my=(A.y+B.y)/2;
        ctx.fillStyle = '#f1e5c8';
        ctx.fillRect(mx-12,my-10,24,16);
        ctx.strokeStyle = '#533b2c'; ctx.strokeRect(mx-12.5,my-10.5,25,17);
        ctx.fillStyle = '#2a1f1a'; ctx.fillRect(mx-10,my-8,20,12);
        ctx.fillStyle = '#c7b38a'; ctx.font = '10px monospace';
        ctx.fillText(String(l.toll), mx-6, my+2);
      }

      // trail segments
      ctx.strokeStyle='#3db37a';
      ctx.lineWidth = 2;
      for (const s of trailSegs){
        const A = trailNodes.find(n=>n.id===s.a)!;
        const B = trailNodes.find(n=>n.id===s.b)!;
        ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke();
      }
      // trail nodes
      for (const n of trailNodes){
        ctx.fillStyle = '#3db37a';
        ctx.beginPath(); ctx.arc(n.x,n.y,5,0,Math.PI*2); ctx.fill();
      }

      // hubs
      for (const h of hubs){
        ctx.fillStyle = '#6e462b';
        ctx.beginPath(); ctx.arc(h.x,h.y,10,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#a36a43'; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle='#f1e5c8'; ctx.font='12px monospace';
        ctx.fillText(h.name, h.x- ctx.measureText(h.name).width/2, h.y-16);
      }

      // route preview
      if (routeInfo){
        ctx.strokeStyle = '#68b06e'; ctx.lineWidth = 4;
        ctx.beginPath();
        for (const [i,leg] of routeInfo.legs.entries()){
          if (i===0) ctx.moveTo(leg.from.x, leg.from.y);
          ctx.lineTo(leg.to.x, leg.to.y);
        }
        ctx.stroke();
      }

      requestAnimationFrame(draw);
    }
    draw();
  }, [routeInfo]);

  function doRoute(safe:boolean){
    resetUsage(); // fresh compute per attempt
    // simulate soft crowding by marking usage on some links (demo)
    links.forEach(l => { l.usage = Math.random() < 0.2 ? l.capacity + 1 : 0; });
    const alphaR = safe ? 0.3 : 0.7;
    const alphaT = safe ? 0.5 : 0.1;
    const r = route(origin, dest, alphaR, alphaT);
    setRouteInfo(r);
  }

  function onCanvasClick(e:any){
    if (mode==='view') return;
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;

    if (mode==='lay-node'){
      const n = addTrailNode(x,y);
      if (!n) alert('Too close to a hub or node; spacing enforced.');
      setRouteInfo(null);
      return;
    }
    if (mode==='link-node'){
      // pick nearest existing trail node to connect
      let best:any=null, dmin=1e9;
      for(const n of trailNodes){ const d=Math.hypot(n.x-x,n.y-y); if(d<dmin){dmin=d; best=n;} }
      if (!best){ alert('Place a node first.'); return; }
      if (!tmpSel){ setTmpSel(best.id); return; }
      const a = trailNodes.find(n=>n.id===tmpSel)!;
      const seg = connectTrail(a, best, 0.30 + Math.random()*0.15);
      if (!seg) alert('Segment too short (spacing).');
      setTmpSel(null);
      setRouteInfo(null);
    }
  }

  return (
    <div className="ae wrap">
      <div className="panel left">
        <h1>Paths & Tolls</h1>
        <div className="muted">Safe hubs with taxed links. Build your own trails to dodge tolls, but risk bandits.</div>

        <label>Origin
          <select value={origin} onChange={e=>setOrigin(e.target.value)}>
            {hubs.map(h=> <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </label>
        <label>Destination
          <select value={dest} onChange={e=>setDest(e.target.value)}>
            {hubs.map(h=> <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </label>

        <div className="grid2">
          <button className="btn" onClick={()=>doRoute(true)}>Auto-route (safer / taxed)</button>
          <button className="btn" onClick={()=>doRoute(false)}>Auto-route (riskier / low toll)</button>
        </div>

        <div className="grid3" style={{marginTop:8}}>
          <button className={"btn"} onClick={()=>setMode('lay-node')}>Lay Trail Node</button>
          <button className={"btn"} onClick={()=>setMode('link-node')}>Link Nodes</button>
          <button className={"btn"} onClick={()=>setMode('view')}>View</button>
        </div>

        <div style={{marginTop:8}} className="muted">
          Mode: <b>{mode}</b><br/>
          Tip: nodes must be spaced; segments must be ≥30px.
        </div>

        <div style={{marginTop:10}}>
          <h2>Route Summary</h2>
          {routeInfo ? (
            <div className="card">
              <div>Dist: <b>{routeInfo.totalDist}</b> km</div>
              <div>Tolls: <b>{routeInfo.totalToll}</b> g</div>
              <div>Risk: <b>{routeInfo.totalRisk}</b></div>
              <div>ETA: <b>{routeInfo.etaHours}</b> h</div>
              <div className="muted" style={{marginTop:6}}>Legs: {routeInfo.legs.length}</div>
            </div>
          ) : <div className="muted">Click an auto-route or build trails.</div>}
        </div>

        <div style={{marginTop:10}}>
          <h2>Economy Hook</h2>
          <div className="muted">When you confirm a route, you could: reserve capacity, pay tolls up-front, add risk to convoy, and start a logistics job.</div>
          <button className="btn" onClick={()=>{
            if (!routeInfo){ alert('Compute a route first.'); return; }
            world.gold -= routeInfo.totalToll;
            alert('Booked route and paid tolls. Gold now: '+world.gold);
          }}>Confirm Route & Pay Tolls</button>
        </div>
      </div>

      <div className="panel right" style={{position:'relative'}}>
        <canvas ref={canvasRef} onClick={onCanvasClick} style={{width:'100%',height:'100%',borderRadius:10}}/>
      </div>

      <style>{`
      :root{--bg:#231913;--panel:#32241d;--edge:#533b2c;--text:#f1e5c8;--muted:#c7b38a;--accent:#d65b5b;--good:#68b06e;--warn:#b7b34d;--bad:#d66a5b}
      .ae{color:var(--text);font-family:ui-monospace,Menlo,Consolas,monospace}
      .ae .wrap{height:calc(100vh - 100px);display:grid;grid-template-columns:360px 1fr;gap:12px;padding:12px;box-sizing:border-box}
      .ae .panel{background:var(--panel);border:4px solid var(--edge);border-radius:10px;box-shadow:0 4px 0 rgba(0,0,0,.4),inset 0 0 0 2px #1d1410}
      .ae .left{padding:12px;display:grid;gap:10px;align-content:start}
      .ae .right{padding:12px}
      .ae h1{margin:0 0 6px 0;font-size:18px}
      .ae h2{margin:0 0 6px 0;font-size:16px}
      .ae .btn{background:#7b4b2d;color:var(--text);border:2px solid #a36a43;padding:6px 10px;border-radius:8px;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,.4)}
      .ae .btn:hover{filter:brightness(1.08)}
      .ae input,.ae select,.ae textarea{background:#2e231d;color:var(--text);border:2px solid #4b3527;border-radius:6px;padding:6px;font-family:inherit}
      .ae .muted{color:var(--muted);font-size:12px}
      .card{background:#2e231d;border:2px solid #4b3527;border-radius:8px;padding:8px;margin-bottom:8px}
      .grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
      .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
      `}</style>
    </div>
  );
}
