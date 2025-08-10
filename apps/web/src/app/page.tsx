
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
      <ul>
        <li><a href="/creator">Character Creator</a></li>
        <li><a href="/play">Play (movement)</a></li>
      </ul>
    </div>
  );
}
