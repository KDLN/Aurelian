'use client';
import { supabase } from '../lib/supabaseClient';
import { useEffect, useState, FormEvent } from 'react';
import './page.css';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'none' | 'signup' | 'login' | 'reset'>('none');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [needsUsername, setNeedsUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      
      // If user exists, fetch their profile
      if (data.user) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const response = await fetch('/api/user/profile', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            });

            const result = await response.json();
            console.log('Initial profile fetch:', result);
            
            const prof = result.profile;
            setUserProfile(prof);
            
            // Check if we need username prompt on initial load
            if (!prof || !prof.display) {
              console.log('Initial load: Setting needsUsername to true because:', !prof ? 'no profile' : 'no display name');
              setNeedsUsername(true);
            } else {
              console.log('Initial load: User has valid display name:', prof.display);
              setNeedsUsername(false);
            }
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          setNeedsUsername(true);
        }
      }
      
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

    // Use proper Supabase pattern: pass metadata during signup
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          username: username,
          display_name: username
        }
      }
    });
    
    if (error) {
      setErrorMsg('Sign up failed: ' + error.message);
      return;
    }
    
    // With proper triggers, the User, Profile, and Wallet should be created automatically
    setErrorMsg('Account created! Check your email to verify before logging in.');
    setEmail('');
    setPassword('');
    setUsername('');
    setAuthMode('login');
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
      try {
        // Get fresh session after login
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const response = await fetch('/api/user/profile', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });

          const result = await response.json();
          console.log('Login profile check:', result);
          
          const prof = result.profile;
          setUserProfile(prof);
          
          // Only ask for username if profile doesn't exist or display is null/empty
          if (!prof || !prof.display) {
            console.log('Setting needsUsername to true because:', !prof ? 'no profile' : 'no display name');
            setNeedsUsername(true);
          } else {
            console.log('User has valid display name:', prof.display);
            setNeedsUsername(false);
          }
        }
      } catch (error) {
        console.error('Error fetching profile on login:', error);
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

    try {
      // Get the auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setErrorMsg('Please log in again.');
        return;
      }

      // Use our API endpoint to update the username
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          display: newUsername
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error?.includes('already taken') || result.error?.includes('23505')) {
          setErrorMsg('Username already taken.');
        } else {
          setErrorMsg('Failed to save username. Please try again.');
          console.error('Profile save error:', result);
        }
        return;
      }

      setNeedsUsername(false);
      setNewUsername('');
      
      // Update the profile state with the new username
      setUserProfile({ display: newUsername });
    } catch (error) {
      console.error('Username save error:', error);
      setErrorMsg('An error occurred. Please try again.');
    }
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setErrorMsg('Failed to send reset email: ' + error.message);
    } else {
      setSuccessMsg('Password reset email sent! Check your inbox and spam folder.');
      // Clear form and go back to login after a delay
      setTimeout(() => {
        setEmail('');
        setAuthMode('login');
        setSuccessMsg('');
      }, 4000);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
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
          <div className="feature-card live-feature">
            <div className="feature-status">✅ LIVE</div>
            <h3>⚖️ Dynamic Markets</h3>
            <p>Real-time prices fluctuate based on supply and demand. Advanced market analytics and trading intelligence available now.</p>
          </div>
          <div className="feature-card coming-soon">
            <div className="feature-status">🚧 COMING SOON</div>
            <h3>🗺️ Dangerous Routes</h3>
            <p>Chart paths through lawless territories. Higher risks bring higher rewards—if you survive.</p>
          </div>
          <div className="feature-card live-feature">
            <div className="feature-status">✅ LIVE</div>
            <h3>⚔️ Strategic Missions</h3>
            <p>Send caravans on expeditions. Balance speed against safety. Time your arrivals perfectly.</p>
          </div>
          <div className="feature-card live-feature">
            <div className="feature-status">✅ LIVE</div>
            <h3>🔨 Master Crafting</h3>
            <p>Transform raw materials into valuable goods. Complete crafting system with blueprints and quality bonuses.</p>
          </div>
          <div className="feature-card coming-soon">
            <div className="feature-status">🚧 COMING SOON</div>
            <h3>📜 Binding Contracts</h3>
            <p>Negotiate deals with other traders. Honor your word or face the consequences.</p>
          </div>
          <div className="feature-card live-feature">
            <div className="feature-status">✅ LIVE</div>
            <h3>🏛️ Living Economy</h3>
            <p>Every transaction matters. Real-time auction house with market events and price intelligence.</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        {isLoading ? (
          <div className="auth-status">Loading...</div>
        ) : user ? (
          needsUsername ? (
            <div className="auth-container">
              <div className="auth-card">
                <div className="auth-header">
                  <h2>🏺 Choose Your Trading Name</h2>
                  <p className="auth-subtitle">Your reputation in the frontier begins here</p>
                </div>
                <form onSubmit={saveUsername} className="auth-form">
                  <div className="input-group">
                    <label className="input-label">Trading Name</label>
                    <input
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Enter your trader name..."
                      className="auth-input"
                      required
                    />
                    <div className="input-help">3-20 characters, letters, numbers, and underscores only</div>
                  </div>
                  <button type="submit" className="auth-button auth-button-primary">
                    <span>Establish Identity</span>
                  </button>
                </form>
                {errorMsg && (
                  <div className="auth-error">
                    <span>⚠️ {errorMsg}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="logged-in-section">
              <div className="auth-status">
                Trading as <strong>{userProfile?.display || user.email}</strong>
                <button onClick={signOut} className="btn-secondary">Sign Out</button>
              </div>
              <h2>Continue Your Journey</h2>
              <div className="quick-links">
                <a href="/warehouse" className="btn-primary">📦 Warehouse</a>
                <a href="/auction" className="btn-primary">💰 Auction House</a>
                <a href="/market" className="btn-primary featured-link">📊 Market Dashboard</a>
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
          <div className="auth-container">
            <div className="auth-intro">
              <h2>Begin Your Trading Legacy</h2>
              <p>Join the frontier. Build trade routes. Shape the new world.</p>
            </div>
            
            {authMode === 'signup' ? (
              <div className="auth-card">
                <div className="auth-header">
                  <h3>⚔️ Create Your Account</h3>
                  <p className="auth-subtitle">Forge your path as a Beacon Trader</p>
                </div>
                <form onSubmit={handleSignUp} className="auth-form">
                  <div className="input-group">
                    <label className="input-label">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="auth-input"
                      required
                    />
                  </div>
                  
                  <div className="input-group">
                    <label className="input-label">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="auth-input"
                      required
                    />
                    <div className="input-help">Minimum 8 characters</div>
                  </div>
                  
                  <div className="input-group">
                    <label className="input-label">Trading Name</label>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Your unique trader name"
                      className="auth-input"
                      required
                    />
                    <div className="input-help">3-20 characters, letters, numbers, and underscores only</div>
                  </div>
                  
                  <div className="auth-buttons">
                    <button type="submit" className="auth-button auth-button-primary">
                      <span>🚀 Create Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('none');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="auth-button auth-button-secondary"
                    >
                      <span>Cancel</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : authMode === 'login' ? (
              <div className="auth-card">
                <div className="auth-header">
                  <h3>🏛️ Welcome Back</h3>
                  <p className="auth-subtitle">Continue your trading empire</p>
                </div>
                <form onSubmit={handleSignIn} className="auth-form">
                  <div className="input-group">
                    <label className="input-label">Email or Trading Name</label>
                    <input
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="your@email.com or username"
                      className="auth-input"
                      required
                    />
                  </div>
                  
                  <div className="input-group">
                    <label className="input-label">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="auth-input"
                      required
                    />
                  </div>
                  
                  <div className="auth-buttons">
                    <button type="submit" className="auth-button auth-button-primary">
                      <span>🔓 Sign In</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('none');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="auth-button auth-button-secondary"
                    >
                      <span>Cancel</span>
                    </button>
                  </div>
                  
                  <div className="auth-links">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('reset');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="auth-link"
                    >
                      🔑 Forgot your password?
                    </button>
                  </div>
                </form>
              </div>
            ) : authMode === 'reset' ? (
              <div className="auth-card">
                <div className="auth-header">
                  <h3>🔑 Reset Password</h3>
                  <p className="auth-subtitle">We'll send you a recovery link</p>
                </div>
                <form onSubmit={handleForgotPassword} className="auth-form">
                  <div className="input-group">
                    <label className="input-label">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="auth-input"
                      required
                    />
                    <div className="input-help">We'll send a password reset link to this email</div>
                  </div>
                  
                  <div className="auth-buttons">
                    <button type="submit" className="auth-button auth-button-primary">
                      <span>📧 Send Reset Link</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="auth-button auth-button-secondary"
                    >
                      <span>← Back to Sign In</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="auth-card">
                <div className="auth-header">
                  <h3>🗺️ Join the Frontier</h3>
                  <p className="auth-subtitle">Choose your path to begin</p>
                </div>
                <div className="auth-buttons auth-buttons-main">
                  <button
                    onClick={() => setAuthMode('signup')}
                    className="auth-button auth-button-primary"
                  >
                    <span>⚔️ Create New Account</span>
                  </button>
                  <button
                    onClick={() => setAuthMode('login')}
                    className="auth-button auth-button-secondary"
                  >
                    <span>🏛️ Sign In</span>
                  </button>
                </div>
              </div>
            )}
            
            {errorMsg && (
              <div className="auth-error">
                <span>⚠️ {errorMsg}</span>
              </div>
            )}
            
            {successMsg && (
              <div className="auth-success">
                <span>✅ {successMsg}</span>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="game-links">
        <h3>Explore Aurelian</h3>
        <div className="link-grid">
          <div>
            <h4>Trading Posts</h4>
            <ul>
              <li><a href="/warehouse">📦 Warehouse Management</a> <span className="status-live">LIVE</span></li>
              <li><a href="/auction">💰 Live Auction House</a> <span className="status-live">LIVE</span></li>
              <li><a href="/market">📊 Market Dashboard</a> <span className="status-new">NEW</span></li>
              <li><a href="/crafting">🔨 Crafting Workshop</a> <span className="status-live">LIVE</span></li>
              <li><a href="/contracts">📜 Trade Contracts</a> <span className="status-soon">SOON</span></li>
            </ul>
          </div>
          <div>
            <h4>The Frontier</h4>
            <ul>
              <li><a href="/missions">🗺️ Caravan Missions</a> <span className="status-live">LIVE</span></li>
              <li><a href="/hub">🏛️ Trading Hub</a> <span className="status-live">LIVE</span></li>
              <li><a href="/play">⚔️ Multiplayer World</a> <span className="status-live">LIVE</span></li>
              <li><a href="/minimap">🗺️ World Map</a> <span className="status-soon">SOON</span></li>
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