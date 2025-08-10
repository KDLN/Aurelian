'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { MissionRisk, JobStatus } from '@prisma/client';

interface Mission {
  id: string;
  itemId: string;
  itemName: string;
  qty: number;
  risk: MissionRisk;
  eta: Date;
  status: JobStatus;
}

interface MissionRow {
  id: string;
  itemId: string;
  qty: number;
  risk: MissionRisk;
  eta: string;
  status: JobStatus;
  item?: { name: string } | null;
}

export default function MissionsPage(){
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string|null>(null);
  const [userId, setUserId] = useState<string|null>(null);
  const [acceptingId, setAcceptingId] = useState<string|null>(null);

  useEffect(()=>{
    const fetchMissions = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setErrorMsg('Not authenticated');
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data, error } = await supabase
        .from('Mission')
        .select('id, itemId, qty, risk, eta, status, item:ItemDef(name)')
        .eq('userId', user.id)
        .returns<MissionRow[]>();

      if (error) {
        console.error('Failed to fetch missions:', error);
        setErrorMsg('Failed to fetch missions');
        setLoading(false);
        return;
      }

      const normalized: Mission[] = (data || []).map(m => ({
        id: m.id,
        itemId: m.itemId,
        itemName: m.item?.name || m.itemId,
        qty: m.qty,
        risk: m.risk,
        eta: new Date(m.eta),
        status: m.status,
      }));

      setMissions(normalized);
      setLoading(false);
    };

    fetchMissions();
  },[]);

  async function accept(id:string){
    if (!userId) return;
    setAcceptingId(id);
    const { error } = await supabase
      .from('Mission')
      .update({ status:'running' })
      .eq('id', id)
      .eq('userId', userId);

    if (error) {
      console.error('Failed to accept mission:', error);
      setErrorMsg('Failed to accept mission');
      setAcceptingId(null);
      return;
    }

    setMissions(m => m.filter(x => x.id !== id));
    setAcceptingId(null);
  }

  return (
    <div className="ae">
      <h1>Mission Board</h1>
      <div className="muted">Available delivery missions</div>
      <div className="panel" style={{marginTop:12}} aria-busy={loading}>
        {loading && <div className="muted" aria-live="polite">Loading...</div>}
        {errorMsg && <div className="muted" role="alert">{errorMsg}</div>}
        {!loading && !errorMsg && missions.length === 0 && <div className="muted">No missions available.</div>}
        {!loading && !errorMsg && missions.map(m => (
          <div className="card" key={m.id}>
            <div><b>{m.itemName}</b> x{m.qty} — {m.risk}</div>
            <div className="muted">ETA {m.eta.toLocaleString()} | Status {m.status}</div>
            <button
              className="btn"
              onClick={()=>accept(m.id)}
              disabled={acceptingId === m.id}
              aria-label={`Accept mission for ${m.itemName}`}
            >
              {acceptingId === m.id ? 'Accepting...' : 'Accept'}
            </button>
          </div>
        ))}
      </div>
      <style>{`
:root{--bg:#231913;--panel:#32241d;--edge:#533b2c;--text:#f1e5c8;--muted:#c7b38a;--accent:#d65b5b;--good:#68b06e;--warn:#b7b34d;--bad:#d66a5b}
.ae{color:var(--text);font-family:ui-monospace,Menlo,Consolas,monospace;padding:16px;box-sizing:border-box}
.ae .muted{color:var(--muted);font-size:12px}
.ae .panel{background:var(--panel);border:4px solid var(--edge);border-radius:10px;padding:12px;box-shadow:0 4px 0 rgba(0,0,0,.4),inset 0 0 0 2px #1d1410}
.ae .card{background:#2e231d;border:2px solid #4b3527;border-radius:8px;padding:8px;margin-bottom:8px}
.ae .btn{margin-top:6px;background:#7b4b2d;color:var(--text);border:2px solid #a36a43;padding:6px 10px;border-radius:8px;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,.4)}
.ae .btn:hover{filter:brightness(1.08)}
      `}</style>
    </div>
  );
}
