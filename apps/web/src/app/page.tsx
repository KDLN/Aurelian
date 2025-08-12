'use client';
import { supabase } from '../lib/supabaseClient';
import { useEffect, useState, FormEvent } from 'react';
import './page.css';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'none' | 'signup' | 'login'>('none');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [needsUsername, setNeedsUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setIsLoading(false);
    });
  }, []);

  function validateUsername(name: string) {
    return /^[a-zA-Z0-9_]{3,20}$/.test(name);
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (!validateUsername(username)) {
      setErrorMsg('Username must be 3-20 characters and contain only letters, numbers, or _.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }

    // Check if username is already taken before creating account
    const { data: existingProfile } = await supabase
      .from('Profile')
      .select('id')
      .eq('display', username)
      .single();
    
    if (existingProfile) {
      setErrorMsg('Username already taken.');
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setErrorMsg('Sign up failed: ' + error.message);
      return;
    }
    
    const u = data.user;
    if (u) {
      try {
        // Sync user with our database using the sync-user endpoint
        const syncResponse = await fetch('/api/sync-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: u.id,
            email: u.email
          }),
        });

        if (!syncResponse.ok) {
          const errorData = await syncResponse.json();
          console.error('User sync error:', errorData);
          setErrorMsg('Failed to create user profile.');
          return;
        }

        // Update the profile with the chosen username
        const { error: profileError } = await supabase
          .from('Profile')
          .update({ display: username })
          .eq('userId', u.id);

        if (profileError) {
          if (profileError.code === '23505') {
            setErrorMsg('Username already taken.');
          } else {
            console.error('Profile update error:', profileError);
            setErrorMsg('Failed to save username: ' + profileError.message);
          }
          return;
        }

        setErrorMsg('Account created! Check your email to verify before logging in.');
        setEmail('');
        setPassword('');
        setUsername('');
        setAuthMode('login');
      } catch (err) {
        console.error('Sign-up error:', err);
        setErrorMsg('An unexpected error occurred. Please try again.');
      }
    }
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (!identifier || !password) {
      setErrorMsg('Missing credentials.');
      return;
    }
    let authResponse;
    if (identifier.includes('@')) {
      authResponse = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      });
    } else {
      const { data: profileUser, error } = await supabase
        .from('Profile')
        .select('user:User(email)')
        .eq('display', identifier)
        .single();
      if (error || !profileUser?.user || !Array.isArray(profileUser.user) || profileUser.user.length === 0 || !profileUser.user[0]?.email) {
        setErrorMsg('Invalid credentials.');
        return;
      }
      authResponse = await supabase.auth.signInWithPassword({
        email: profileUser.user[0].email,
        password,
      });
    }
    if (authResponse.error) {
      setErrorMsg('Invalid credentials.');
      return;
    }
    const loggedInUser = authResponse.data.user;
    if (loggedInUser) {
      // Ensure user is synced with our database
      try {
        await fetch('/api/sync-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: loggedInUser.id,
            email: loggedInUser.email
          }),
        });
      } catch (syncError) {
        console.warn('User sync failed on login:', syncError);
        // Continue with login even if sync fails
      }

      const { data: prof } = await supabase
        .from('Profile')
        .select('display')
        .eq('userId', loggedInUser.id)
        .single();
      if (!prof || !prof.display || prof.display.startsWith('Trader')) {
        setNeedsUsername(true);
      }
      setUser(loggedInUser);
      setAuthMode('none');
      setIdentifier('');
      setPassword('');
    }
  }

  async function saveUsername(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (!validateUsername(newUsername)) {
      setErrorMsg('Username must be 3-20 characters and contain only letters, numbers, or _.');
      return;
    }

    // Check if username is already taken
    const { data: existingProfile } = await supabase
      .from('Profile')
      .select('id')
      .eq('display', newUsername)
      .neq('userId', user.id)
      .single();
    
    if (existingProfile) {
      setErrorMsg('Username already taken.');
      return;
    }

    // Try to update existing profile first
    const { error: updateError } = await supabase
      .from('Profile')
      .update({ display: newUsername })
      .eq('userId', user.id);

    if (updateError) {
      // If update fails, try to create new profile
      const { error: insertError } = await supabase
        .from('Profile')
        .insert({ userId: user.id, display: newUsername });
      
      if (insertError) {
        if ((insertError as any).code === '23505') {
          setErrorMsg('Username already taken.');
        } else {
          setErrorMsg('Failed to save profile. Please try again.');
          console.error('Profile save error:', insertError);
        }
        return;
      }
    }

    setNeedsUsername(false);
    setNewUsername('');
    setUser({ ...user });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setAuthMode('none');
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
          needsUsername ? (
            <div className="sign-up-section">
              <h2>Choose a Username</h2>
              <form onSubmit={saveUsername} className="auth-form">
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Username"
                  required
                />
                <button type="submit" className="btn-primary btn-large">
                  Save
                </button>
              </form>
              {errorMsg && <p className="auth-error">{errorMsg}</p>}
            </div>
          ) : (
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
          )
        ) : (
          <div className="sign-up-section">
            <h2>Begin Your Trading Legacy</h2>
            <p>Join the frontier. Build trade routes. Shape the new world.</p>
            {authMode === 'signup' ? (
              <form onSubmit={handleSignUp} className="auth-form">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                />
                <button type="submit" className="btn-primary btn-large">
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('none');
                    setErrorMsg('');
                  }}
                  className="btn-secondary btn-large"
                >
                  Cancel
                </button>
              </form>
            ) : authMode === 'login' ? (
              <form onSubmit={handleSignIn} className="auth-form">
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email or Username"
                  required
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                />
                <button type="submit" className="btn-primary btn-large">
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('none');
                    setErrorMsg('');
                  }}
                  className="btn-secondary btn-large"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="auth-buttons">
                <button
                  onClick={() => setAuthMode('signup')}
                  className="btn-primary btn-large"
                >
                  Sign Up
                </button>
                <button
                  onClick={() => setAuthMode('login')}
                  className="btn-secondary btn-large"
                >
                  Log In
                </button>
              </div>
            )}
            {errorMsg && <p className="auth-error">{errorMsg}</p>}
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