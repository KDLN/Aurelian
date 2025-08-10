'use client';
import { useEffect, useState } from 'react';
import { world, useWorld } from '../_shared/world';
export default function CraftingAE2(){
  const [, setT] = useState(0);
  useEffect(() => {
    const unsub = useWorld().sub(() => setT(x => x + 1));
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);
  function start(){
    const out=(document.getElementById('c_bp') as HTMLSelectElement).value;
    const qty=Number((document.getElementById('c_qty') as HTMLInputElement).value||1);
    if (!world.craft(out, qty)) alert('Not enough inputs.');
  }
  function prog(c:any){ const minutes = ((window as any).__ae_day??1 - 1) * 1440 + ((window as any).__ae_min??360); const left=Math.max(0, c.eta - minutes); return Math.min(100, Math.round((1 - (left/(6*60))) * 100)); }
  return (
    <div className="ae wrap">
      <div className="panel left">
        <h1>Crafting</h1>
        <div>
          <select id="c_bp"><option>Iron Ingot</option><option>Leather Roll</option><option>Healing Tonic</option></select>
          <input id="c_qty" type="number" defaultValue={10}/>
          <button className="btn" onClick={start}>Start</button>
        </div>
        <h2>Warehouse</h2>
        <div>{Object.entries(world.warehouse).map(([k,v])=> <div className="card" key={k}><b>{k}</b> — <span className="pill">{v}</span></div>)}</div>
      </div>
      <div className="panel right">
        <h2>Queue</h2>
        <div>{world.crafting.map(c=>(
          <div className="card" key={c.id}><b>{c.out}</b> x{c.qty} — Progress {prog(c)}%</div>
        ))}</div>
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
.ae table{width:100%;border-collapse:separate;border-spacing:0 6px;font-size:13px}
.ae th,.ae td{padding:6px 8px}
.ae tbody tr{background:#2e231d;border:2px solid #4b3527}
.ae .muted{color:var(--muted);font-size:12px}
.ae .pill{display:inline-block;background:#7b4b2d;border:2px solid #a36a43;padding:4px 8px;border-radius:999px}
.ae .grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.ae .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.ae .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.ae .card{background:#2e231d;border:2px solid #4b3527;border-radius:8px;padding:8px;margin-bottom:8px}
`}</style>

    </div>
  );
}