import { Room } from 'colyseus';
import type { Client } from 'colyseus';

type Player = { id:string; x:number; y:number; color?:string; name?:string };

export class MovementRoom extends Room {
  maxClients = 200;
  players: Map<string, Player> = new Map();


  onJoin(client: Client, options: any){
    const p: Player = {
      id: client.sessionId,
      x: 100 + Math.random()*600,
      y: 100 + Math.random()*350,
      color: options?.color || '#68b06e',
      name: options?.name || 'Trader'
    };
    this.players.set(client.sessionId, p);
    this.broadcast('meta', { id: client.sessionId, color: p.color, name: p.name, x: p.x, y: p.y });
  }

  onLeave(client: Client){
    this.players.delete(client.sessionId);
    this.broadcast('leave', { id: client.sessionId });
  }

  onCreate(){
    this.clock.setInterval(()=>{
      const payload = { players: Object.fromEntries(this.players) };
      this.broadcast('state', payload);
    }, 1000);

    this.onMessage('move', (client, message) => {
      const p = this.players.get(client.sessionId);
      if (!p) return;
      const dx = Number(message.dx||0);
      const dy = Number(message.dy||0);
      p.x = Math.max(12, Math.min(888, p.x + dx));
      p.y = Math.max(12, Math.min(588, p.y + dy));
      this.broadcast('pos', { id: client.sessionId, x: p.x, y: p.y });
    });
  }
}
