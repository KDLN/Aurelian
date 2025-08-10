'use client';
import { useEffect, useRef } from 'react';
import { world } from '../_shared/world';
export default function AnalyticsAE2(){
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c=canvasRef.current!; const ctx=c.getContext('2d')!;
    let series:number[]=[];
    function avg(){ let s=0,n=0; for(const k in world.commodities){ s += world.priceOf(k); n++; } return Math.round(s/n); }
    for(let i=0;i<120;i++) series.push(avg());
    function draw(){
      const w=c.width=c.clientWidth||800, h=c.height=c.clientHeight||500;
      ctx.fillStyle='#231913'; ctx.fillRect(0,0,w,h);
      ctx.strokeStyle='#4b3527'; for(let i=0;i<10;i++){ const y=(h/10)*i; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
      ctx.strokeStyle='#f1e5c8'; ctx.beginPath();
      for(let i=0;i<series.length;i++){ const x=i*(w/(series.length-1||1)); const y = h - (series[i]/200)*h*0.8 - 20; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }
      ctx.stroke();
      requestAnimationFrame(draw);
    }
    draw();
  },[]);
  return (
    <div className="ae wrap">
      <div className="panel left">
        <h1>Analytics</h1>
        <div className="muted">Average price index, live.</div>
      </div>
      <div className="panel right"><canvas ref={canvasRef} style={{width:'100%',height:'100%'}}/></div>
      
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