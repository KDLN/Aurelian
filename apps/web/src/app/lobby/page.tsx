'use client';

import { useEffect, useState } from 'react';
import { getRTClient } from '../../lib/rtClient';
import { useUserSync } from '@/hooks/useUserSync';
import Link from 'next/link';

export default function Lobby(){
  const [status, setStatus] = useState('connecting...');
  const { user, authLoaded, isSynced, isLoading } = useUserSync();

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

  // Show loading state while auth and sync are happening
  if (!authLoaded || (user && !isSynced && isLoading)) {
    return (
      <div className="ae" style={{padding:16}}>
        <div className="panel">
          <div style={{padding:16,textAlign:'center'}}>
            <div>⏳ Setting up your account...</div>
            <div className="muted" style={{marginTop:8}}>
              {!authLoaded ? 'Checking authentication...' : 
               isLoading ? 'Syncing with database...' : 'Loading...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (authLoaded && !user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    return null;
  }

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
          
          <div className="main-nav-grid" style={{marginTop:'var(--space-md)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--space-md)'}}>
            <Link href="/hub" className="nav-btn">
              🏛️ Trading Hub
              <div className="nav-desc">Overview & dashboard</div>
            </Link>
            
            <Link href="/warehouse" className="nav-btn">
              📦 Warehouse
              <div className="nav-desc">Manage inventory</div>
            </Link>
            
            <Link href="/auction" className="nav-btn">
              🔨 Auction House
              <div className="nav-desc">Buy & sell goods</div>
            </Link>
            
            <Link href="/contracts" className="nav-btn">
              📋 Trade Contracts
              <div className="nav-desc">Automated buying</div>
            </Link>
            
            <Link href="/missions" className="nav-btn">
              🚛 Mission Control
              <div className="nav-desc">Send caravans</div>
            </Link>
            
            <Link href="/crafting" className="nav-btn">
              ⚒️ Crafting Workshop
              <div className="nav-desc">Transform materials</div>
            </Link>
          </div>
          
          <div style={{marginTop:'var(--space-xl)'}}>
            <h3>Other Features</h3>
            <div className="other-features" style={{display:'flex', gap:'var(--space-md)'}}>
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
        .muted{color:#c7b38a;font-size:var(--font-size-xs)}
        .good{color:#68b06e}
        .bad{color:#d73a49}
        
        .nav-btn {
          display: block;
          padding: var(--space-md);
          background: #1d1410;
          border: 2px solid #533b2c;
          border-radius: 6px;
          text-decoration: none;
          color: #f1e5c8;
          transition: all 0.2s;
          min-height: var(--touch-target-lg);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .nav-btn:hover {
          background: #2a1f18;
          border-color: #6b4d3a;
          transform: translateY(-1px);
        }
        .nav-desc {
          font-size: var(--font-size-xs);
          color: #c7b38a;
          margin-top: var(--space-xs);
        }
        
        .nav-btn-small {
          display: inline-block;
          padding: var(--space-sm) var(--space-md);
          background: #1d1410;
          border: 1px solid #533b2c;
          border-radius: 4px;
          text-decoration: none;
          color: #f1e5c8;
          font-size: var(--font-size-xs);
          transition: all 0.2s;
          min-height: var(--touch-target-md);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .nav-btn-small:hover {
          background: #2a1f18;
          border-color: #6b4d3a;
        }
        
        /* Responsive design */
        @media (max-width: 640px) {
          .panel {
            padding: var(--space-md);
          }
          
          .ae {
            padding: var(--space-md);
          }
          
          /* Stack navigation on mobile */
          .main-nav-grid {
            grid-template-columns: 1fr !important;
            gap: var(--space-sm) !important;
          }
          
          .nav-btn {
            min-height: var(--touch-target-lg);
            padding: var(--space-lg);
          }
          
          .other-features {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          
          .nav-btn-small {
            width: 100%;
            justify-content: center;
            margin-bottom: var(--space-sm);
          }
        }
      `}</style>
    </div>
  );
}
