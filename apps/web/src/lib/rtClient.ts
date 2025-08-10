'use client';
import { Client } from 'colyseus.js';

let client: Client | null = null;
export function getRTClient(){
  if (!client){
    const raw = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8787';
    const url = raw.replace(/^http/, 'ws');
    client = new Client(url);
  }
  return client;
}
