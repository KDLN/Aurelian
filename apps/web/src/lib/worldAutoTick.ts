'use client';
import { world } from '../app/ae2/_shared/world';

export function startWorldAutoTick(minutesPerTick = 10, ms = 1000){
  const id = setInterval(()=> world.tick(minutesPerTick), ms);
  return () => clearInterval(id);
}
