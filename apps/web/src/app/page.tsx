'use client';
import { supabase } from '../lib/supabaseClient';
import { useEffect, useState } from 'react';
import './page.css';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setIsLoading(false);
    });
  }, []);

  async function signUp() {
    const email = prompt('Enter your email:') || '';
    const password = prompt('Create a password:') || '';
    const username = prompt('Choose a username:') || '';
    if (!email || !password || !username) return;

    const { data: existing } = await supabase
      .from('Profile')
      .select('id')
      .eq('display', username);
    if (existing && existing.length > 0) {
      alert('Username already taken.');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      alert(error.message);
      return;
    }
    const user = data.user;
    if (user) {
      await supabase.from('Profile').upsert({
        userId: user.id,
        display: username,
      });
      alert('Account created! Please verify your email before logging in.');
    }
  }

  async function signIn() {
    const identifier = prompt('Enter email or username:') || '';
    const password = prompt('Enter your password:') || '';
    if (!identifier || !password) return;

    let authResponse;
    if (identifier.includes('@')) {
      authResponse = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      });
    } else {
      const { data: profile, error: profileError } = await supabase
        .from('Profile')
        .select('userId')
        .eq('display', identifier)
        .single();
      if (profileError || !profile) {
        alert('User not found.');
        return;
      }
      const { data: userRow, error: userError } = await supabase
        .from('User')
        .select('email')
        .eq('id', profile.userId)
        .single();
      if (userError || !userRow) {
        alert('User not found.');
        return;
      }
      authResponse = await supabase.auth.signInWithPassword({
        email: userRow.email,
        password,
      });
    }

    if (authResponse.error) {
      alert(authResponse.error.message);
      return;
    }

    const loggedInUser = authResponse.data.user;
    if (loggedInUser) {
      const { data: prof } = await supabase
        .from('Profile')
        .select('display')
        .eq('userId', loggedInUser.id)
        .single();
      if (!prof || !prof.display || prof.display === 'Trader') {
        const newName = prompt('Choose a username:') || '';
        if (newName) {
          const { data: existingName } = await supabase
            .from('Profile')
            .select('id')
            .eq('display', newName);
          if (existingName && existingName.length > 0) {
            alert('Username already taken.');
          } else {
            await supabase.from('Profile').upsert({
              userId: loggedInUser.id,
              display: newName,
            });
          }
        }
      }
      setUser(loggedInUser);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <main className="landing-page">
      <div className="hero-section">
        <div className="hero-overlay"></div>
        <img
          src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80"
          alt="The vast frontier of Aurelian awaits"
          className="hero-image"
        />
        <div className="hero-content">
          <h1 className="hero-title">AURELIAN</h1>
          <p className="hero-subtitle">The Exchange</p>
        </div>
      </div>

      <section className="intro-section">
        <h2>The World Has Changed</h2>
        <p className="lore-text">
          The great empires have fallen. Their trade routes lie broken, their markets silent. 
          But where others see ruin, you see opportunity.
        </p>
        <p className="lore-text">
          As a <strong>Beacon Trader</strong>, you'll venture into the frontier, establishing new trade 
          routes where none existed before. Buy low in forgotten settlements. Sell high in desperate cities. 
          Navigate the dangers between.
        </p>
        <p className="lore-text">
          Every journey is a calculated risk. Every trade shapes the emerging economy. 
          Every decision echoes across a world struggling to rebuild.
        </p>
      </section>

      <section className="features-section">
        <h2>Forge Your Trading Empire</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>⚖️ Dynamic Markets</h3>
            <p>Real-time prices fluctuate based on supply and demand. What's worthless here might be precious there.</p>
          </div>
          <div className="feature-card">
            <h3>🗺️ Dangerous Routes</h3>
            <p>Chart paths through lawless territories. Higher risks bring higher rewards—if you survive.</p>
          </div>
          <div className="feature-card">
            <h3>⚔️ Strategic Missions</h3>
            <p>Send caravans on expeditions. Balance speed against safety. Time your arrivals perfectly.</p>
          </div>
          <div className="feature-card">
            <h3>🔨 Master Crafting</h3>
            <p>Transform raw materials into valuable goods. Corner markets with exclusive products.</p>
          </div>
          <div className="feature-card">
            <h3>📜 Binding Contracts</h3>
            <p>Negotiate deals with other traders. Honor your word or face the consequences.</p>
          </div>
          <div className="feature-card">
            <h3>🏛️ Living Economy</h3>
            <p>Every transaction matters. Watch cities rise or fall based on trade flow.</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        {isLoading ? (
          <div className="auth-status">Loading...</div>
        ) : user ? (
          <div className="logged-in-section">
            <div className="auth-status">
              Trading as <strong>{user.email}</strong>
              <button onClick={signOut} className="btn-secondary">Sign Out</button>
            </div>
            <h2>Continue Your Journey</h2>
            <div className="quick-links">
              <a href="/warehouse" className="btn-primary">📦 Warehouse</a>
              <a href="/auction" className="btn-primary">💰 Auction House</a>
              <a href="/missions" className="btn-primary">🗺️ Missions</a>
              <a href="/crafting" className="btn-primary">🔨 Crafting</a>
            </div>
            <div className="secondary-links">
              <a href="/profile">Profile</a>
              <a href="/contracts">Contracts</a>
              <a href="/hub">Trading Hub</a>
              <a href="/creator">Character Creator</a>
            </div>
          </div>
        ) : (
          <div className="sign-up-section">
            <h2>Begin Your Trading Legacy</h2>
            <p>Join the frontier. Build trade routes. Shape the new world.</p>
            <div className="auth-buttons">
              <button onClick={signUp} className="btn-primary btn-large">
                Sign Up
              </button>
              <button onClick={signIn} className="btn-secondary btn-large">
                Log In
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="game-links">
        <h3>Explore Aurelian</h3>
        <div className="link-grid">
          <div>
            <h4>Trading Posts</h4>
            <ul>
              <li><a href="/warehouse">Warehouse Management</a></li>
              <li><a href="/auction">Live Auction House</a></li>
              <li><a href="/crafting">Crafting Workshop</a></li>
              <li><a href="/contracts">Trade Contracts</a></li>
            </ul>
          </div>
          <div>
            <h4>The Frontier</h4>
            <ul>
              <li><a href="/missions">Caravan Missions</a></li>
              <li><a href="/hub">Trading Hub</a></li>
              <li><a href="/play">Multiplayer World</a></li>
              <li><a href="/minimap">World Map</a></li>
            </ul>
          </div>
          <div>
            <h4>Your Character</h4>
            <ul>
              <li><a href="/creator">Character Creator</a></li>
              <li><a href="/profile">Trader Profile</a></li>
              <li><a href="/lobby">Game Lobby</a></li>
              <li><a href="/test-db">System Status</a></li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p className="footer-quote">
          "In the ruins of empire, the bold write history with ledgers and caravans."
        </p>
        <p className="footer-credit">
          Aurelian: The Exchange &copy; 2024 | A Trading Game of Risk and Reward
        </p>
      </footer>
    </main>
  );
}