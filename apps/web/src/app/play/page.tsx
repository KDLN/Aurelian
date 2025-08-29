
'use client';
import { Client, Room } from 'colyseus.js';
import { useEffect, useRef, useState } from 'react';
import { GameRenderer } from '../../lib/sprites/gameRenderer';
import { loadCharacterAppearance } from '../../lib/sprites/characterOptions';
import { FloatingChatWidget } from '@/components/chat';
import PageErrorBoundary from '@/components/PageErrorBoundary';

type P = { id:string; x:number; y:number; color?:string; name?:string };

export default function Play(){
  const [status, setStatus] = useState('connecting...');
  const [players, setPlayers] = useState<Record<string,P>>({});
  const roomRef = useRef<Room|null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GameRenderer|null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(()=>{
    const url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8787';
    const client = new Client(url.replace(/^http/,'ws'));
    
    // Use character appearance instead of simple avatar data
    const appearance = loadCharacterAppearance();
    const avatar = {
      name: appearance.name || 'Trader',
      color: '#68b06e', // Keep for backwards compatibility
      hat: false // Keep for backwards compatibility
    };

    client.joinOrCreate('movement', avatar).then(room=>{
      roomRef.current = room;
      setStatus('connected');
      
      room.onMessage('leave', (msg:any)=>{
        setPlayers(prev=>{ const cp={...prev}; delete cp[msg.id]; return cp; });
        rendererRef.current?.removePlayer(msg.id);
      });
      
      room.onMessage('pos', (msg:any)=>{
        setPlayers(prev=> ({ ...prev, [msg.id]: {...(prev[msg.id]||{id:msg.id, x:100, y:100}), x: msg.x, y: msg.y } }));
        rendererRef.current?.updatePlayerPosition(msg.id, msg.x, msg.y);
      });
      
      room.onMessage('state', (msg:any)=>{
        setPlayers(msg.players);
        // Add all players to renderer
        Object.entries(msg.players).forEach(([id, player]: [string, any]) => {
          rendererRef.current?.addPlayer(id, player.x, player.y, loadCharacterAppearance());
        });
      });
      
      room.onMessage('meta', (msg:any)=>{
        setPlayers(prev=> ({ ...prev, [msg.id]: {...(prev[msg.id]||{id:msg.id, x:msg.x, y:msg.y}), color: msg.color, name: msg.name } }));
      });
    }).catch(err=>{
      console.error(err);
      setStatus('failed');
    });

    const onKey = (e: KeyboardEvent)=>{
      const room = roomRef.current; if (!room) return;
      const step = 32; // Match grid size for smoother movement
      if (e.key==='ArrowUp') room.send('move', { dy: -step });
      if (e.key==='ArrowDown') room.send('move', { dy: step });
      if (e.key==='ArrowLeft') room.send('move', { dx: -step });
      if (e.key==='ArrowRight') room.send('move', { dx: step });
    };
    window.addEventListener('keydown', onKey);
    return ()=>{
      window.removeEventListener('keydown', onKey);
      roomRef.current?.leave();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  },[]);

  useEffect(()=>{
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const w = c.width = 900, h = c.height = 600;
    
    // Initialize game renderer
    const renderer = new GameRenderer(ctx, w, h);
    rendererRef.current = renderer;

    let lastTime = 0;
    const gameLoop = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      renderer.update(deltaTime);
      renderer.render();

      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  },[]);

  // Update renderer when players change
  useEffect(() => {
    if (!rendererRef.current) return;
    
    Object.entries(players).forEach(([id, player]) => {
      const existingPlayer = rendererRef.current!.getPlayer(id);
      if (!existingPlayer) {
        rendererRef.current!.addPlayer(id, player.x, player.y, loadCharacterAppearance());
      }
    });
  }, [players]);

  return (
    <PageErrorBoundary pageName="Play Game">
      <div style={{padding:16, background: '#1a1511', minHeight: '100vh', color: '#f1e5c8'}}>
        <h1>Aurelian Trading World</h1>
        <div style={{marginBottom: 10}}>
          Status: <b style={{color: status === 'connected' ? '#68b06e' : '#d4621d'}}>{status}</b> — Use Arrow Keys to move
        </div>
        <canvas 
          ref={canvasRef} 
          style={{
            border:'4px solid #533b2c', 
            borderRadius:8, 
            imageRendering: 'pixelated',
            background: '#231913'
          }} 
        />
        
        {/* Floating Chat Widget */}
        <FloatingChatWidget />
      </div>
    </PageErrorBoundary>
  );
}
