'use client';
import { useEffect, useState } from 'react';
import { getRTClient } from '../../lib/rtClient';

export default function Lobby(){
  const [status, setStatus] = useState('connecting...');
  const [log, setLog] = useState<string[]>([]);
  useEffect(()=>{
    const client = getRTClient();
    async function run(){
      try{
        const room = await client.joinOrCreate('movement', { probe: true });
        setStatus('connected');
        room.onMessage('*', (type:any, message:any)=> setLog(l=>[`[${new Date().toLocaleTimeString()}] ${type}: ${JSON.stringify(message)}`, ...l].slice(0,50)));
        return ()=> room.leave();
      }catch(e:any){
        setStatus('failed: '+(e?.message||'unknown'));
      }
    }
    const cleanup = run() as any;
    return ()=>{ if (typeof cleanup === 'function') cleanup(); };
  },[]);
  return (
    <div className="ae" style={{padding:16}}>
      <h1>Lobby (Multiplayer Probe)</h1>
      <div className="muted">WebSocket: <b>{status}</b></div>
      <div style={{marginTop:8}} className="panel" >
        <div style={{padding:12, maxHeight:'60vh', overflow:'auto'}}>
          {log.map((l,i)=>(<div key={i} className="muted">{l}</div>))}
        </div>
      </div>
      <style>{`
        .panel{background:#32241d;border:4px solid #533b2c;border-radius:10px;box-shadow:0 4px 0 rgba(0,0,0,.4),inset 0 0 0 2px #1d1410}
        .ae{color:#f1e5c8;font-family:ui-monospace,Menlo,Consolas,monospace}
        .muted{color:#c7b38a;font-size:12px}
      `}</style>
    </div>
  );
}
