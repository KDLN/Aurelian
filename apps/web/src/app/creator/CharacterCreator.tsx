'use client';
import { useEffect, useRef, useState } from 'react';
import GameButton from '@/components/ui/GameButton';
import GamePanel from '@/components/ui/GamePanel';
import { CharacterSprite, CharacterAppearance } from '../../lib/sprites/characterSprites';
import {
  CHARACTER_OPTIONS,
  saveCharacterAppearance,
  loadCharacterAppearanceAsync
} from '../../lib/sprites/characterOptions';
import { supabase } from '../../lib/supabaseClient';

export default function CharacterCreator() {
  const [appearance, setAppearance] = useState<CharacterAppearance | null>(null);
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
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await loadUserProfile(session.user);
        } else {
          // No user logged in, load default appearance
          const defaultAppearance = {
            base: 'v01',
            outfit: 'fstr_v01',
            hair: 'bob1_v01',
            hat: ''
          };
          setAppearance(defaultAppearance);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        // Fallback to default
        setAppearance({
          base: 'v01',
          outfit: 'fstr_v01',
          hair: 'bob1_v01',
          hat: ''
        });
        setLoading(false);
      }
    };

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('Loading timeout - setting defaults');
      if (loading) {
        setAppearance({
          base: 'v01',
          outfit: 'fstr_v01',
          hair: 'bob1_v01',
          hat: ''
        });
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserProfile(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  // Load user profile and character data
  const loadUserProfile = async (authUser: any) => {
    try {
      console.log('Loading profile for user:', authUser.id);
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) {
        console.log('No token available, loading defaults');
        setAppearance({
          base: 'v01',
          outfit: 'fstr_v01',
          hair: 'bob1_v01',
          hat: ''
        });
        setLoading(false);
        return;
      }

      // Load user profile
      let profile = null;
      try {
        const profileResponse = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          profile = profileData.profile;
          setUserProfile(profile);
        }
      } catch (profileError) {
        console.log('Profile fetch failed, continuing with defaults:', profileError);
      }

      // Load character appearance
      let dbAppearance;
      try {
        dbAppearance = await loadCharacterAppearanceAsync();
      } catch (appearanceError) {
        console.log('Appearance fetch failed, using defaults:', appearanceError);
        dbAppearance = {
          base: 'v01',
          outfit: 'fstr_v01',
          hair: 'bob1_v01',
          hat: ''
        };
      }
      
      setAppearance(dbAppearance);
      console.log('Character creator loaded successfully');
      
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Load default appearance if everything fails
      setAppearance({
        name: '',
        base: 'v01',
        outfit: 'fstr_v01',
        hair: 'bob1_v01',
        hat: ''
      });
      setName(authUser?.email?.split('@')[0] || '');
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

      // Draw character label
      ctx.fillStyle = '#f1e5c8';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(userProfile?.display || 'Character Preview', w/2, h - 40);

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
      console.log('Saving character appearance:', appearance);
      
      // Save character appearance
      await saveCharacterAppearance(appearance);
      
      setSaveMessage('✅ Character appearance saved!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000);
      
    } catch (error) {
      console.error('Failed to save character:', error);
      setSaveMessage('❌ Failed to save character. Please try again.');
      
      // Clear error message after 5 seconds
      setTimeout(() => setSaveMessage(''), 5000);
    }
  }

  if (loading || !appearance) {
    return (
      <div style={{ padding: 20, background: '#1a1511', minHeight: '100vh', color: '#f1e5c8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, marginBottom: 10 }}>Loading character creator...</div>
          <div style={{ fontSize: 14, color: '#9b8c70' }}>
            {loading ? 'Loading user data...' : 'Setting up character...'}
          </div>
          {/* Fallback button if loading takes too long */}
          <GameButton 
            onClick={() => {
              setLoading(false);
              setAppearance({
                name: '',
                base: 'v01',
                outfit: 'fstr_v01',
                hair: 'bob1_v01',
                hat: ''
              });
            }}
            size="small"
            style={{ marginTop: 20 }}
          >
            Skip Loading (Use Defaults)
          </GameButton>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '350px 1fr', gap: 20, background: '#1a1511', minHeight: '100vh', color: '#f1e5c8' }}>
      <div style={{ background: '#231913', padding: 20, borderRadius: 8, border: '2px solid #533b2c' }}>
        <h1 style={{ fontSize: 24, marginBottom: 20 }}>Character Appearance</h1>
        <p style={{ fontSize: 14, color: '#9b8c70', marginBottom: 20 }}>
          Customize your character's appearance. Your trading name is managed in your profile settings.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>

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

          <GameButton 
            onClick={save}
            disabled={!user || saveMessage.includes('💾')}
            variant="primary"
            style={{ width: '100%' }}
          >
            {saveMessage.includes('💾') ? 'Saving...' : 'Save Appearance'}
          </GameButton>

          <div style={{ display: 'flex', gap: 10 }}>
            <GameButton href="/profile" variant="secondary" style={{ flex: 1, textAlign: 'center' }}>
              📝 Edit Profile Name
            </GameButton>
            <GameButton href="/hub" style={{ flex: 1, textAlign: 'center' }}>
              ← Back to Hub
            </GameButton>
          </div>

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
          <GameButton 
            onClick={() => setAnimationType('idle')}
            variant={animationType === 'idle' ? 'primary' : 'default'}
          >
            Idle
          </GameButton>
          <GameButton 
            onClick={() => setAnimationType('walk')}
            variant={animationType === 'walk' ? 'primary' : 'default'}
          >
            Walk
          </GameButton>
          <GameButton 
            onClick={() => setAnimationType('run')}
            variant={animationType === 'run' ? 'primary' : 'default'}
          >
            Run
          </GameButton>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <GameButton 
            onClick={() => setDirection('south')}
            variant={direction === 'south' ? 'primary' : 'default'}
          >
            South
          </GameButton>
          <GameButton 
            onClick={() => setDirection('west')}
            variant={direction === 'west' ? 'primary' : 'default'}
          >
            West
          </GameButton>
          <GameButton 
            onClick={() => setDirection('east')}
            variant={direction === 'east' ? 'primary' : 'default'}
          >
            East
          </GameButton>
          <GameButton 
            onClick={() => setDirection('north')}
            variant={direction === 'north' ? 'primary' : 'default'}
          >
            North
          </GameButton>
        </div>
      </div>
    </div>
  );
}