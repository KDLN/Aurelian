
'use client';
import { supabase } from '../lib/supabaseClient';
import { useEffect, useState } from 'react';

export default function Home(){
  const [user, setUser] = useState<any>(null);
  useEffect(()=>{ supabase.auth.getUser().then(({data})=> setUser(data.user)); },[]);
  async function signIn(){
    const email = prompt('Email for magic link?')||'';
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message); else alert('Check your email.');
  }
  async function signOut(){ await supabase.auth.signOut(); setUser(null); }

  return (
    <div style={{padding:16}}>
      <h1>Welcome to Aurelian</h1>
      <p>Create your 2D character, then hop into the shared room.</p>
      <div>{user ? <>Signed in as <b>{user.email}</b> <button onClick={signOut}>Sign out</button></> : <button onClick={signIn}>Sign in (Magic Link)</button>}</div>
      
      <h2>Main Features</h2>
      <ul>
        <li><a href="/creator">Character Creator</a></li>
        <li><a href="/play">Play (movement)</a></li>
        <li><a href="/lobby">Lobby</a></li>
        <li><a href="/profile">Profile</a></li>
        <li><a href="/missions">Missions</a></li>
      </ul>

      <h2>Game UI (AE2)</h2>
      <ul>
        <li><a href="/ae2">Main Game UI</a></li>
        <li><a href="/ae2/analytics">Analytics</a></li>
        <li><a href="/ae2/auction">Auction</a></li>
        <li><a href="/ae2/contracts">Contracts</a></li>
        <li><a href="/ae2/crafting">Crafting</a></li>
        <li><a href="/ae2/paths">Paths</a></li>
        <li><a href="/ae2/scouts">Scouts</a></li>
      </ul>

      <h2>UI Mockups (AE Mock)</h2>
      <ul>
        <li><a href="/ae_mock">Main Mockup</a></li>
        <li><a href="/ae_mock/analytics">Analytics Mock</a></li>
        <li><a href="/ae_mock/auction">Auction Mock</a></li>
        <li><a href="/ae_mock/contracts">Contracts Mock</a></li>
        <li><a href="/ae_mock/cosmetics">Cosmetics Mock</a></li>
        <li><a href="/ae_mock/crafting">Crafting Mock</a></li>
        <li><a href="/ae_mock/events">Events Mock</a></li>
        <li><a href="/ae_mock/guild">Guild Mock</a></li>
        <li><a href="/ae_mock/insurance">Insurance Mock</a></li>
        <li><a href="/ae_mock/logistics">Logistics Mock</a></li>
        <li><a href="/ae_mock/scouts">Scouts Mock</a></li>
      </ul>

      <h2>Debug & Development Tools</h2>
      <ul>
        <li><a href="/debug">Debug</a></li>
        <li><a href="/layer-debug">Layer Debug</a></li>
        <li><a href="/sheet-debug">Sheet Debug</a></li>
        <li><a href="/sprite-analyzer">Sprite Analyzer</a></li>
        <li><a href="/minimap">Minimap</a></li>
        <li><a href="/admin/sprites">Admin Sprites</a></li>
      </ul>
    </div>
  );
}
