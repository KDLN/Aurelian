'use client';
import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import '../../page.css';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Get the current session to check if user is authenticated for password reset
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
      
      if (!session) {
        // If no session, redirect to home page
        router.push('/');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setSession(session);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  async function handlePasswordReset(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setErrorMsg('Failed to update password: ' + error.message);
    } else {
      setSuccessMsg('Password updated successfully! Redirecting to home...');
      setTimeout(() => {
        router.push('/');
      }, 2000);
    }
  }

  if (isLoading) {
    return (
      <main className="landing-page">
        <div className="auth-container">
          <div className="auth-status">Loading...</div>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="landing-page">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h3>⚠️ Invalid Reset Link</h3>
              <p className="auth-subtitle">This password reset link is invalid or expired</p>
            </div>
            <div className="auth-buttons">
              <button
                onClick={() => router.push('/')}
                className="auth-button auth-button-primary"
              >
                <span>← Return Home</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    );
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
          <p className="hero-subtitle">Password Recovery</p>
        </div>
      </div>

      <section className="cta-section">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h3>🔐 Set New Password</h3>
              <p className="auth-subtitle">Choose a strong password to secure your trading account</p>
            </div>
            <form onSubmit={handlePasswordReset} className="auth-form">
              <div className="input-group">
                <label className="input-label">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="auth-input"
                  required
                />
                <div className="input-help">Minimum 8 characters</div>
              </div>
              
              <div className="input-group">
                <label className="input-label">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="auth-input"
                  required
                />
                <div className="input-help">Must match the password above</div>
              </div>
              
              <div className="auth-buttons">
                <button type="submit" className="auth-button auth-button-primary">
                  <span>🔒 Update Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="auth-button auth-button-secondary"
                >
                  <span>← Cancel</span>
                </button>
              </div>
            </form>
            
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
        </div>
      </section>
    </main>
  );
}