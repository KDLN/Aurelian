'use client';

import { useEffect, useState } from 'react';
import { getRTClient } from '../../lib/rtClient';
import Link from 'next/link';

export default function Lobby(){
  const [status, setStatus] = useState('connecting...');

  useEffect(()=>{
    const client = getRTClient();
    async function run(){
      try{
        // Test connection to realtime server
        const room = await client.joinOrCreate('movement', { probe: true });
        setStatus('connected');
        setTimeout(() => room.leave(), 1000); // Quick probe then disconnect
      }catch(e:any){
        setStatus('failed: '+(e?.message||'unknown'));
      }
    }
    run();
  },[]);

  return (
    <div className="ae" style={{padding:16}}>
      <h1>Aurelian Trading Hub</h1>
      <div className="muted">Multiplayer Status: <b className={status === 'connected' ? 'good' : 'bad'}>{status}</b></div>
      
      <div style={{marginTop:24}} className="panel">
        <div style={{padding:16}}>
          <h2>Welcome, Trader</h2>
          <p className="muted">
            Choose your path in the world of Aurelian. Manage your warehouse, 
            trade goods, send caravans on missions, and craft valuable items.
          </p>
          
          <div style={{marginTop:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <Link href="/game" className="nav-btn">
              🏛️ Trading Hub
              <div className="nav-desc">Overview & dashboard</div>
            </Link>
            
            <Link href="/game/warehouse" className="nav-btn">
              📦 Warehouse
              <div className="nav-desc">Manage inventory</div>
            </Link>
            
            <Link href="/game/auction" className="nav-btn">
              🔨 Auction House
              <div className="nav-desc">Buy & sell goods</div>
            </Link>
            
            <Link href="/game/contracts" className="nav-btn">
              📋 Trade Contracts
              <div className="nav-desc">Automated buying</div>
            </Link>
            
            <Link href="/game/missions" className="nav-btn">
              🚛 Mission Control
              <div className="nav-desc">Send caravans</div>
            </Link>
            
            <Link href="/game/crafting" className="nav-btn">
              ⚒️ Crafting Workshop
              <div className="nav-desc">Transform materials</div>
            </Link>
          </div>
          
          <div style={{marginTop:24}}>
            <h3>Other Features</h3>
            <div style={{display:'flex', gap:12}}>
              <Link href="/creator" className="nav-btn-small">
                👤 Character Creator
              </Link>
              <Link href="/play" className="nav-btn-small">
                🎮 Multiplayer Game
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .panel{background:#32241d;border:4px solid #533b2c;border-radius:10px;box-shadow:0 4px 0 rgba(0,0,0,.4),inset 0 0 0 2px #1d1410}
        .ae{color:#f1e5c8;font-family:ui-monospace,Menlo,Consolas,monospace;max-width:800px}
        .muted{color:#c7b38a;font-size:12px}
        .good{color:#68b06e}
        .bad{color:#d73a49}
        
        .nav-btn {
          display: block;
          padding: 12px;
          background: #1d1410;
          border: 2px solid #533b2c;
          border-radius: 6px;
          text-decoration: none;
          color: #f1e5c8;
          transition: all 0.2s;
        }
        .nav-btn:hover {
          background: #2a1f18;
          border-color: #6b4d3a;
          transform: translateY(-1px);
        }
        .nav-desc {
          font-size: 11px;
          color: #c7b38a;
          margin-top: 4px;
        }
        
        .nav-btn-small {
          display: inline-block;
          padding: 8px 12px;
          background: #1d1410;
          border: 1px solid #533b2c;
          border-radius: 4px;
          text-decoration: none;
          color: #f1e5c8;
          font-size: 12px;
          transition: all 0.2s;
        }
        .nav-btn-small:hover {
          background: #2a1f18;
          border-color: #6b4d3a;
        }
      `}</style>
    </div>
  );
}
