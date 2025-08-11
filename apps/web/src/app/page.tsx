'use client';
import { supabase } from '../lib/supabaseClient';
import { useEffect, useState } from 'react';

export default function Home() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function signIn() {
    const email = prompt('Email for magic link?') || '';
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message); else alert('Check your email.');
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <main style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <img
        src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80"
        alt="Merchant caravan exploring new horizons"
        style={{ width: '100%', height: 'auto', borderRadius: 8 }}
      />

      <h1>Becoming a Beacon Trader</h1>
      <p>
        The empires have crumbled and fresh horizons beckon. You long to branch
        out as a beacon trader&mdash;roaming the frontier, forging routes and
        deals that will shape this new world.
      </p>

      <div>
        {user ? (
          <>Signed in as <b>{user.email}</b> <button onClick={signOut}>Sign out</button></>
        ) : (
          <button onClick={signIn}>Sign in (Magic Link)</button>
        )}
      </div>

      <h2>Begin Your Journey</h2>
      <ul>
        <li><a href="/creator">Character Creator</a></li>
        <li><a href="/lobby">Lobby</a></li>
        <li><a href="/play">Play</a></li>
        <li><a href="/missions">Missions</a></li>
        <li><a href="/profile">Profile</a></li>
        <li><a href="/minimap">Minimap</a></li>
        <li><a href="/warehouse">Warehouse</a></li>
        <li><a href="/auction">Auction</a></li>
        <li><a href="/crafting">Crafting</a></li>
        <li><a href="/contracts">Contracts</a></li>
      </ul>

      <h2>Development Tools</h2>
      <ul>
        <li><a href="/debug">Debug</a></li>
        <li><a href="/layer-debug">Layer Debug</a></li>
        <li><a href="/sheet-debug">Sheet Debug</a></li>
        <li><a href="/sprite-analyzer">Sprite Analyzer</a></li>
        <li><a href="/character-viewer-test">Character Viewer Test</a></li>
        <li><a href="/admin/sprites">Admin Sprites</a></li>
      </ul>
    </main>
  );
}
