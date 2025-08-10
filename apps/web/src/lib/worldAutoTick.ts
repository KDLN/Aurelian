'use client';
import { gameWorld } from './game/world';

export function startWorldAutoTick(minutesPerTick = 10, ms = 1000){
  const id = setInterval(()=> gameWorld.tick(minutesPerTick), ms);
  return () => clearInterval(id);
}
