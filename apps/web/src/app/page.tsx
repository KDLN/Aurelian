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
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  useEffect(() => {
    // Handle OAuth implicit flow tokens from URL fragment
    const handleImplicitAuth = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        console.log('🔄 Handling implicit OAuth flow tokens...');
        addDebugLog('Detected OAuth tokens in URL fragment');
        
        try {
          // Let Supabase handle the session from the URL
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.error('Error getting session from URL:', error);
            addDebugLog(`Session error: ${error.message}`);
          } else if (data.session) {
            console.log('✅ Session established from OAuth tokens');
            addDebugLog('✅ Session established successfully');
            // Clear the URL hash
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error('Error handling implicit auth:', error);
          addDebugLog(`Implicit auth error: ${error}`);
        }
      }
    };

    handleImplicitAuth();

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

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  async function signInWithDiscord() {
    setErrorMsg('');
    setDebugLogs([]);
    
    try {
      addDebugLog('🎮 Starting Discord OAuth flow...');
      addDebugLog(`Redirect URL: ${window.location.origin}/auth/callback`);
      addDebugLog('Calling supabase.auth.signInWithOAuth...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      addDebugLog(`OAuth response received - Error: ${error ? 'YES' : 'NO'}`);
      if (error) {
        addDebugLog(`Error details: ${JSON.stringify(error)}`);
      }
      if (data) {
        addDebugLog(`Data received: ${JSON.stringify(data)}`);
      }
      
      console.log('Discord OAuth response:', { data, error });
      
      if (error) {
        console.error('Discord OAuth error:', error);
        if (error.message.includes('Provider not enabled')) {
          setErrorMsg('Discord authentication is not configured in Supabase. Please try email/password signup instead.');
        } else if (error.message.includes('Invalid provider')) {
          setErrorMsg('Discord provider configuration issue. Please contact support.');
        } else {
          setErrorMsg(`Discord sign in failed: ${error.message}`);
        }
        addDebugLog(`Setting error message: ${error.message}`);
      } else {
        addDebugLog('✅ Discord OAuth initiated successfully, should redirect soon...');
        console.log('✅ Discord OAuth initiated successfully, redirecting...');
      }
      // If successful, user will be redirected to Discord and then back to callback
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      addDebugLog(`❌ Exception caught: ${errorMessage}`);
      console.error('Discord sign in error:', error);
      setErrorMsg('Unable to connect to Discord. Please try again or use email signup.');
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
        <h2>Empires Fall. Trade Endures.</h2>
        <p className="lore-text">
          The great kingdoms have crumbled. Their armies scattered, their treasuries empty. 
          But in the chaos, a new breed of merchant rises from the ashes.
        </p>
        <p className="lore-text">
          As a <strong>Frontier Trader</strong>, you'll navigate lawless roads and forge deals 
          in desperate cities. Where others fear to tread, you'll find fortune. 
          Every transaction reshapes a broken world.
        </p>
        <p className="lore-text">
          This is your chance to build something lasting. Not through conquest, 
          but through commerce. Not with armies, but with caravans.
        </p>
      </section>

      <section className="features-section">
        <h2>Command Your Trading Empire</h2>
        <div className="features-grid">
          <div className="feature-card live-feature">
            <div className="feature-status">✅ LIVE</div>
            <h3>📊 Master the Markets</h3>
            <p>Read supply and demand. Time your moves perfectly. Turn market chaos into consistent profit.</p>
          </div>
          <div className="feature-card live-feature">
            <div className="feature-status">✅ LIVE</div>
            <h3>🗺️ Risk Everything</h3>
            <p>Send caravans through bandit territory. The greater the danger, the sweeter the reward.</p>
          </div>
          <div className="feature-card live-feature">
            <div className="feature-status">✅ LIVE</div>
            <h3>👥 Build Your Organization</h3>
            <p>Hire Scouts, Guards, and Specialists. Equip them well. Your success depends on theirs.</p>
          </div>
          <div className="feature-card live-feature">
            <div className="feature-status">✅ LIVE</div>
            <h3>⚒️ Control Production</h3>
            <p>Turn raw ore into finished weapons. Transform herbs into potions. Create value from nothing.</p>
          </div>
          <div className="feature-card live-feature">
            <div className="feature-status">✅ LIVE</div>
            <h3>🏰 Unite or Dominate</h3>
            <p>Form powerful trade guilds. Share resources or hoard them. Shape the new world order.</p>
          </div>
          <div className="feature-card coming-soon">
            <div className="feature-status">🚧 COMING SOON</div>
            <h3>🗺️ Rule the Roads</h3>
            <p>Claim trading hubs. Build safer routes. Tax passage or grant free transit. Your roads, your rules.</p>
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
                  {user?.user_metadata?.full_name && (
                    <p className="auth-suggestion">
                      💡 Suggestion from Discord: <strong>{user.user_metadata.full_name}</strong>
                    </p>
                  )}
                </div>
                <form onSubmit={saveUsername} className="auth-form">
                  <div className="input-group">
                    <label className="input-label">Trading Name</label>
                    <input
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder={user?.user_metadata?.full_name || "Enter your trader name..."}
                      className="auth-input"
                      required
                    />
                    <div className="input-help">3-20 characters, letters, numbers, and underscores only</div>
                    {user?.user_metadata?.full_name && (
                      <button
                        type="button"
                        onClick={() => setNewUsername(user.user_metadata.full_name)}
                        className="suggestion-button"
                        style={{
                          background: 'none',
                          border: '1px solid #5865F2',
                          color: '#5865F2',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          marginTop: '0.25rem',
                          cursor: 'pointer'
                        }}
                      >
                        Use Discord name
                      </button>
                    )}
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
            <div className="auth-container">
              <div className="auth-card">
                <div className="auth-header">
                  <h2>🏛️ Welcome Back, {userProfile?.display || 'Trader'}</h2>
                  <p className="auth-subtitle">Your trading empire awaits</p>
                </div>
                <div className="auth-buttons auth-buttons-main">
                  <a href="/hub" className="auth-button auth-button-primary">
                    <span>🏛️ Enter Trading Hub</span>
                  </a>
                  <button
                    onClick={signOut}
                    className="auth-button auth-button-secondary"
                  >
                    <span>🚪 Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="auth-container">
            <div className="auth-intro">
              <h2>The Frontier Awaits Your Ambition</h2>
              <p>Fortunes are made by those bold enough to seize them. Will you rebuild this world through trade?</p>
            </div>
            
            {authMode === 'signup' ? (
              <div className="auth-card">
                <div className="auth-header">
                  <h3>⚔️ Create Your Account</h3>
                  <p className="auth-subtitle">Forge your path as a Frontier Trader</p>
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
                    <div style={{ textAlign: 'center', margin: '0.5rem 0', color: '#999' }}>OR</div>
                    <button
                      type="button"
                      onClick={signInWithDiscord}
                      className="auth-button auth-button-discord"
                      style={{
                        backgroundColor: '#5865F2',
                        color: 'white',
                        border: 'none',
                        marginBottom: '0.5rem'
                      }}
                    >
                      <span>🎮 Discord</span>
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
                    <div style={{ textAlign: 'center', margin: '0.5rem 0', color: '#999' }}>OR</div>
                    <button
                      type="button"
                      onClick={signInWithDiscord}
                      className="auth-button auth-button-discord"
                      style={{
                        backgroundColor: '#5865F2',
                        color: 'white',
                        border: 'none',
                        marginBottom: '0.5rem'
                      }}
                    >
                      <span>🎮 Discord</span>
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
                  <div style={{ textAlign: 'center', margin: '1rem 0', color: '#999' }}>OR</div>
                  <button
                    onClick={signInWithDiscord}
                    className="auth-button auth-button-discord"
                    style={{
                      backgroundColor: '#5865F2',
                      color: 'white',
                      border: 'none'
                    }}
                  >
                    <span>🎮 Discord</span>
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

            {debugLogs.length > 0 && (
              <div className="debug-panel" style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#f1e5c8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🔍 Debug Logs:</span>
                  <button 
                    onClick={() => setDebugLogs([])}
                    style={{
                      background: '#333',
                      border: '1px solid #555',
                      color: '#ccc',
                      padding: '2px 6px',
                      borderRadius: '2px',
                      fontSize: '0.7rem',
                      cursor: 'pointer'
                    }}
                  >
                    Clear
                  </button>
                </div>
                {debugLogs.map((log, index) => (
                  <div key={index} style={{ color: '#ccc', marginBottom: '0.25rem' }}>
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="game-links">
        <h3>Tools of the Trade</h3>
        <div className="link-grid">
          <div>
            <h4>💰 Commerce & Profit</h4>
            <ul>
              <li><a href="/auction">💰 Auction House</a> <span className="status-live">LIVE</span></li>
              <li><a href="/market">📊 Market Intelligence</a> <span className="status-new">NEW</span></li>
              <li><a href="/warehouse">📦 Warehouse Empire</a> <span className="status-live">LIVE</span></li>
              <li><a href="/crafting">🔨 Production Lines</a> <span className="status-live">LIVE</span></li>
            </ul>
          </div>
          <div>
            <h4>⚔️ Risk & Expansion</h4>
            <ul>
              <li><a href="/missions">🗺️ Dangerous Routes</a> <span className="status-live">LIVE</span></li>
              <li><a href="/agents">👥 Hire Specialists</a> <span className="status-live">LIVE</span></li>
              <li><a href="/guild">🏰 Guild Politics</a> <span className="status-live">LIVE</span></li>
              <li><a href="/play">⚔️ Living World</a> <span className="status-live">LIVE</span></li>
            </ul>
          </div>
          <div>
            <h4>🎮 Game Systems</h4>
            <ul>
              <li><a href="/creator">Character Design</a></li>
              <li><a href="/profile">Trading Reputation</a></li>
              <li><a href="/hub">Central Exchange</a></li>
              <li><a href="/lobby">Game Access</a></li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p className="footer-quote">
          "While kingdoms rise and fall, the merchant's ledger is the only true history."
        </p>
        <p className="footer-credit">
          Aurelian: The Exchange &copy; 2024 | A Trading Game of Risk and Reward
        </p>
      </footer>
    </main>
  );
}