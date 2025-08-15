'use client';
import { useEffect, useRef, useState } from 'react';
import { CharacterSprite, CharacterAppearance } from '../../lib/sprites/characterSprites';
import {
  CHARACTER_OPTIONS,
  saveCharacterAppearance,
  loadCharacterAppearanceAsync
} from '../../lib/sprites/characterOptions';
import { supabase } from '../../lib/supabaseClient';

export default function CharacterCreator() {
  const [appearance, setAppearance] = useState<CharacterAppearance | null>(null);
  const [name, setName] = useState<string>('');
  const [sprite, setSprite] = useState<CharacterSprite | null>(null);
  const [loading, setLoading] = useState(true);
  const [animationType, setAnimationType] = useState<'idle' | 'walk' | 'run'>('idle');
  const [direction, setDirection] = useState<'south' | 'west' | 'east' | 'north'>('south');
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (appearance) {
      loadSprite();
    }
  }, [appearance]);

  // Load user authentication state
  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadUserProfile(session.user);
      }
    };
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserProfile(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load user profile and character data
  const loadUserProfile = async (authUser: any) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) return;

      // Load user profile
      const profileResponse = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let profile = null;
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        profile = profileData.profile;
        setUserProfile(profile);
      }

      // Load character appearance
      const dbAppearance = await loadCharacterAppearanceAsync();
      setAppearance(dbAppearance);
      
      // Set name priority: character name -> profile display name -> email -> default
      const characterName = dbAppearance.name;
      const profileName = profile?.display;
      const emailName = authUser.email?.split('@')[0]; // Use email prefix as fallback
      
      setName(characterName || profileName || emailName || 'Trader');
      
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Load default appearance if database fails
      const defaultAppearance = await loadCharacterAppearanceAsync();
      setAppearance(defaultAppearance);
      setName(user?.email?.split('@')[0] || 'Trader');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Setting animation:', animationType, direction);
    if (sprite) {
      sprite.setAnimation(animationType, direction);
    }
  }, [sprite, animationType, direction]);

  async function loadSprite() {
    if (!appearance) return;
    setLoading(true);
    console.log('Loading sprite with appearance:', appearance);
    try {
      const newSprite = new CharacterSprite(appearance);
      await newSprite.load();
      console.log('Sprite loaded successfully');
      // Set the initial animation explicitly
      newSprite.setAnimation('idle', 'south');
      setSprite(newSprite);
      startAnimation(newSprite);
    } catch (error) {
      console.error('Failed to load sprite:', error);
    }
    setLoading(false);
  }

  function startAnimation(spriteInstance: CharacterSprite) {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    let lastTime = 0;
    const animate = (time: number) => {
      if (!canvasRef.current) return;
      
      const deltaTime = time - lastTime;
      lastTime = time;

      const ctx = canvasRef.current.getContext('2d')!;
      const w = canvasRef.current.width = 320;
      const h = canvasRef.current.height = 240;
      
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#231913';
      ctx.fillRect(0, 0, w, h);

      spriteInstance.update(deltaTime);
      // Position character in center of canvas - sprites are 64x64 so scale down
      spriteInstance.draw(ctx, w/2, h/2, 2); // Scale 2x for 64px sprites = 128px display

      // Draw name
      ctx.fillStyle = '#f1e5c8';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(name, w/2, h - 40);

      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  function updateAppearance(key: keyof CharacterAppearance, value: string) {
    if (!appearance) return;
    setAppearance(prev => ({ ...prev!, [key]: value }));
  }

  async function save() {
    if (!appearance || !user) {
      setSaveMessage('❌ Please log in to save your character');
      return;
    }
    
    setSaveMessage('💾 Saving character...');
    
    try {
      const fullAppearance = { ...appearance, name };
      console.log('Saving character appearance:', fullAppearance);
      
      // Save character appearance
      await saveCharacterAppearance(fullAppearance);
      
      // Also update the user's display name if it changed
      if (name !== userProfile?.display) {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        
        if (token) {
          const profileResponse = await fetch('/api/user/profile', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: user.id,
              display: name
            })
          });
          
          if (profileResponse.ok) {
            console.log('Profile display name updated');
          }
        }
      }
      
      setSaveMessage('✅ Character saved! Redirecting to game...');
      
      // Auto-redirect to game after successful save
      setTimeout(() => {
        window.location.href = '/lobby';
      }, 2000);
      
    } catch (error) {
      console.error('Failed to save character:', error);
      setSaveMessage('❌ Failed to save character. Please try again.');
      
      // Clear error message after 5 seconds
      setTimeout(() => setSaveMessage(''), 5000);
    }
  }

  if (loading || !appearance) {
    return <div>Loading character...</div>;
  }

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '350px 1fr', gap: 20, background: '#1a1511', minHeight: '100vh', color: '#f1e5c8' }}>
      <div style={{ background: '#231913', padding: 20, borderRadius: 8, border: '2px solid #533b2c' }}>
        <h1 style={{ fontSize: 24, marginBottom: 20 }}>Character Creator</h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 5 }}>Name</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: 8, background: '#1a1511', border: '1px solid #533b2c', color: '#f1e5c8', borderRadius: 4 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 5 }}>Skin Tone</label>
            <select 
              value={appearance.base}
              onChange={e => updateAppearance('base', e.target.value)}
              style={{ width: '100%', padding: 8, background: '#1a1511', border: '1px solid #533b2c', color: '#f1e5c8', borderRadius: 4 }}
            >
              {CHARACTER_OPTIONS.base.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 5 }}>Outfit</label>
            <select 
              value={appearance.outfit || ''}
              onChange={e => updateAppearance('outfit', e.target.value)}
              style={{ width: '100%', padding: 8, background: '#1a1511', border: '1px solid #533b2c', color: '#f1e5c8', borderRadius: 4 }}
            >
              <option value="">None</option>
              {CHARACTER_OPTIONS.outfit.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 5 }}>Hair</label>
            <select 
              value={appearance.hair || ''}
              onChange={e => updateAppearance('hair', e.target.value)}
              style={{ width: '100%', padding: 8, background: '#1a1511', border: '1px solid #533b2c', color: '#f1e5c8', borderRadius: 4 }}
            >
              <option value="">Bald</option>
              {CHARACTER_OPTIONS.hair.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 5 }}>Hat</label>
            <select 
              value={appearance.hat || ''}
              onChange={e => updateAppearance('hat', e.target.value)}
              style={{ width: '100%', padding: 8, background: '#1a1511', border: '1px solid #533b2c', color: '#f1e5c8', borderRadius: 4 }}
            >
              {CHARACTER_OPTIONS.hat.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>

          {saveMessage && (
            <div style={{
              padding: '8px 12px',
              marginBottom: '12px',
              borderRadius: 4,
              backgroundColor: saveMessage.includes('❌') ? '#7f1d1d' : saveMessage.includes('✅') ? '#166534' : '#1e40af',
              color: '#f1e5c8',
              fontSize: 14,
              textAlign: 'center'
            }}>
              {saveMessage}
            </div>
          )}

          <button 
            onClick={save}
            disabled={!user || saveMessage.includes('💾')}
            style={{ 
              padding: '12px 20px', 
              background: (!user || saveMessage.includes('💾')) ? '#533b2c' : '#68b06e', 
              border: 'none', 
              borderRadius: 4, 
              color: (!user || saveMessage.includes('💾')) ? '#9b8c70' : '#1a1511', 
              fontWeight: 'bold',
              cursor: (!user || saveMessage.includes('💾')) ? 'not-allowed' : 'pointer',
              fontSize: 16,
              width: '100%'
            }}
          >
            {saveMessage.includes('💾') ? 'Saving...' : 'Save Character'}
          </button>

          {!user && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              backgroundColor: '#533b2c',
              borderRadius: 4,
              fontSize: 12,
              textAlign: 'center',
              color: '#9b8c70'
            }}>
              Please log in to save your character
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <canvas 
          ref={canvasRef} 
          style={{ 
            border: '4px solid #533b2c', 
            borderRadius: 8,
            background: '#231913',
            imageRendering: 'pixelated'
          }}
        />
        
        {loading && <div>Loading sprites...</div>}
        
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            onClick={() => setAnimationType('idle')}
            style={{ padding: '8px 16px', background: animationType === 'idle' ? '#68b06e' : '#533b2c', border: 'none', borderRadius: 4, color: '#f1e5c8', cursor: 'pointer' }}
          >
            Idle
          </button>
          <button 
            onClick={() => setAnimationType('walk')}
            style={{ padding: '8px 16px', background: animationType === 'walk' ? '#68b06e' : '#533b2c', border: 'none', borderRadius: 4, color: '#f1e5c8', cursor: 'pointer' }}
          >
            Walk
          </button>
          <button 
            onClick={() => setAnimationType('run')}
            style={{ padding: '8px 16px', background: animationType === 'run' ? '#68b06e' : '#533b2c', border: 'none', borderRadius: 4, color: '#f1e5c8', cursor: 'pointer' }}
          >
            Run
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            onClick={() => setDirection('south')}
            style={{ padding: '8px 16px', background: direction === 'south' ? '#68b06e' : '#533b2c', border: 'none', borderRadius: 4, color: '#f1e5c8', cursor: 'pointer' }}
          >
            South
          </button>
          <button 
            onClick={() => setDirection('west')}
            style={{ padding: '8px 16px', background: direction === 'west' ? '#68b06e' : '#533b2c', border: 'none', borderRadius: 4, color: '#f1e5c8', cursor: 'pointer' }}
          >
            West
          </button>
          <button 
            onClick={() => setDirection('east')}
            style={{ padding: '8px 16px', background: direction === 'east' ? '#68b06e' : '#533b2c', border: 'none', borderRadius: 4, color: '#f1e5c8', cursor: 'pointer' }}
          >
            East
          </button>
          <button 
            onClick={() => setDirection('north')}
            style={{ padding: '8px 16px', background: direction === 'north' ? '#68b06e' : '#533b2c', border: 'none', borderRadius: 4, color: '#f1e5c8', cursor: 'pointer' }}
          >
            North
          </button>
        </div>
      </div>
    </div>
  );
}