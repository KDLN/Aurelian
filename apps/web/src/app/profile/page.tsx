'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function Profile(){
  const [user, setUser] = useState<any>(null);
  const [av, setAv] = useState({ name:'Trader', color:'#68b06e', hat:false });
  useEffect(()=>{
    supabase.auth.getUser().then(({data})=> setUser(data.user));
    setAv({
      name: localStorage.getItem('av_name') || 'Trader',
      color: localStorage.getItem('av_color') || '#68b06e',
      hat: localStorage.getItem('av_hat') === 'true'
    } as any);
  },[]);
  return (
    <div className="ae" style={{padding:16}}>
      <h1>Profile</h1>
      <div className="muted">{user ? `Signed in as ${user.email}` : 'Not signed in (use magic link on Home)'}</div>
      <div className="panel" style={{padding:12, display:'flex', gap:16, marginTop:12}}>
        <div>
          <div className="muted">Avatar</div>
          <div style={{width:128,height:128,background:'#2e231d',border:'4px solid #533b2c',borderRadius:12}}>
            {/* simple preview block */}
          </div>
          <div className="muted" style={{marginTop:6}}>{av.name} — {av.color} {av.hat ? '(hat)' : ''}</div>
          <a className="btn" href="/creator" style={{display:'inline-block',marginTop:8,padding:'6px 10px',border:'2px solid #a36a43',background:'#7b4b2d',borderRadius:8,color:'#f1e5c8'}}>Edit in Creator</a>
        </div>
        <div>
          <div className="muted">Account</div>
          <div className="card">User ID: <b>{user?.id || '—'}</b></div>
          <div className="card">Project: Supabase</div>
          <div className="card">Roles: Merchant</div>
        </div>
      </div>
      <style>{`
        .ae{color:#f1e5c8;font-family:ui-monospace,Menlo,Consolas,monospace}
        .muted{color:#c7b38a;font-size:12px}
        .panel{background:#32241d;border:4px solid #533b2c;border-radius:10px;box-shadow:0 4px 0 rgba(0,0,0,.4),inset 0 0 0 2px #1d1410}
        .card{background:#2e231d;border:2px solid #4b3527;border-radius:8px;padding:8px;margin-top:8px}
      `}</style>
    </div>
  );
}
