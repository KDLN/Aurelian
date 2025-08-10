'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface Mission {
  id: string;
  itemId: string;
  qty: number;
  risk: string;
  eta: string;
  status: string;
}

export default function MissionsPage(){
  const [missions, setMissions] = useState<Mission[]>([]);

  useEffect(()=>{
    supabase
      .from('Mission')
      .select('id, itemId, qty, risk, eta, status')
      .then(({ data })=> setMissions(data as Mission[] || []));
  },[]);

  async function accept(id:string){
    await supabase.from('Mission').update({ status:'active' }).eq('id', id);
    setMissions(m => m.filter(x => x.id !== id));
  }

  return (
    <div className="ae" style={{padding:16}}>
      <h1>Mission Board</h1>
      <div className="muted">Available delivery missions</div>
      <div className="panel" style={{marginTop:12,padding:12}}>
        {missions.length === 0 && <div className="muted">No missions available.</div>}
        {missions.map(m => (
          <div className="card" key={m.id} style={{marginBottom:8}}>
            <div><b>{m.itemId}</b> x{m.qty} — {m.risk}</div>
            <div className="muted">ETA {new Date(m.eta).toLocaleString()} | Status {m.status}</div>
            <button className="btn" onClick={()=>accept(m.id)}>Accept</button>
          </div>
        ))}
      </div>
      <style>{`
        .ae{color:#f1e5c8;font-family:ui-monospace,Menlo,Consolas,monospace}
        .muted{color:#c7b38a;font-size:12px}
        .panel{background:#32241d;border:4px solid #533b2c;border-radius:10px;box-shadow:0 4px 0 rgba(0,0,0,.4),inset 0 0 0 2px #1d1410}
        .card{background:#2e231d;border:2px solid #4b3527;border-radius:8px;padding:8px}
        .btn{margin-top:6px;background:#7b4b2d;color:#f1e5c8;border:2px solid #a36a43;padding:6px 10px;border-radius:8px;cursor:pointer}
        .btn:hover{filter:brightness(1.08)}
      `}</style>
    </div>
  );
}
