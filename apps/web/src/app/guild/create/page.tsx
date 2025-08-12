'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import { supabase } from '@/lib/supabaseClient';

export default function CreateGuildPage() {
  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    description: '',
    emblem: {
      color: '#533b2c',
      symbol: '⚔️'
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);

  const emblemSymbols = ['⚔️', '🛡️', '🏛️', '🗡️', '👑', '🦅', '🐺', '🦄', '🌟', '🔥', '⚡', '💎', '🗲', '☽', '☀️'];
  const emblemColors = [
    { name: 'Brown', value: '#533b2c' },
    { name: 'Red', value: '#8b0000' },
    { name: 'Blue', value: '#1e3a8a' },
    { name: 'Green', value: '#166534' },
    { name: 'Purple', value: '#581c87' },
    { name: 'Gold', value: '#b45309' },
    { name: 'Silver', value: '#6b7280' },
    { name: 'Black', value: '#1f2937' }
  ];

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Guild name is required');
      return;
    }

    if (!formData.tag.trim()) {
      setError('Guild tag is required');
      return;
    }

    if (formData.tag.length < 3 || formData.tag.length > 5) {
      setError('Guild tag must be 3-5 characters');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch('/api/guild/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          tag: formData.tag.trim().toUpperCase(),
          description: formData.description.trim() || null,
          emblem: formData.emblem
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create guild');
      }

      const result = await response.json();
      alert(`Guild "${result.guild.name}" created successfully!`);
      
      // Redirect to guild page
      window.location.href = '/guild';

    } catch (err) {
      console.error('Error creating guild:', err);
      setError(err instanceof Error ? err.message : 'Failed to create guild');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEmblemChange = (field: 'color' | 'symbol', value: string) => {
    setFormData(prev => ({
      ...prev,
      emblem: {
        ...prev.emblem,
        [field]: value
      }
    }));
  };

  const isTagValid = formData.tag.length >= 3 && formData.tag.length <= 5;
  const isFormValid = formData.name.trim() && isTagValid;

  const sidebar = (
    <div>
      <h3>Guild Creation</h3>
      <p className="game-muted game-small">
        Create your own guild to lead a community of traders and adventurers.
      </p>

      <h3>Requirements</h3>
      <div className="game-flex-col">
        <div className={formData.name.trim() ? 'game-good' : 'game-muted'}>
          ✓ Guild name (unique)
        </div>
        <div className={isTagValid ? 'game-good' : 'game-muted'}>
          ✓ Guild tag (3-5 chars, unique)
        </div>
        <div className="game-muted">
          ✓ Description (optional)
        </div>
        <div className="game-muted">
          ✓ Emblem design
        </div>
      </div>

      <h3>Guild Benefits</h3>
      <div className="game-flex-col game-small">
        <div>👑 Leadership privileges</div>
        <div>📦 Shared warehouse</div>
        <div>💰 Guild treasury</div>
        <div>🏆 Achievement system</div>
        <div>⚔️ War declarations</div>
        <div>👥 Up to 50 members</div>
      </div>

      <div className="game-card" style={{ marginTop: '16px' }}>
        <h4>Emblem Preview</h4>
        <div className="game-center">
          <div style={{
            width: '80px',
            height: '80px',
            background: formData.emblem.color,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            border: '2px solid #533b2c'
          }}>
            {formData.emblem.symbol}
          </div>
          <div className="game-small game-muted" style={{ marginTop: '8px' }}>
            [{formData.tag.toUpperCase() || 'TAG'}]
          </div>
        </div>
      </div>
    </div>
  );

  if (!isClient) {
    return (
      <GameLayout title="Create Guild" sidebar={<div>Loading...</div>}>
        <div>Loading guild creation form...</div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Create Guild" sidebar={sidebar}>
      <div className="game-flex-col">
        <div className="game-card">
          <h3>Guild Information</h3>
          <form onSubmit={handleSubmit}>
            <div className="game-flex-col" style={{ gap: '16px' }}>
              <div>
                <label className="game-small" style={{ display: 'block', marginBottom: '4px' }}>
                  Guild Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter guild name..."
                  maxLength={50}
                  style={{ width: '100%' }}
                  disabled={loading}
                />
                <div className="game-small game-muted">
                  Must be unique across all guilds
                </div>
              </div>

              <div>
                <label className="game-small" style={{ display: 'block', marginBottom: '4px' }}>
                  Guild Tag *
                </label>
                <input
                  type="text"
                  value={formData.tag}
                  onChange={(e) => handleInputChange('tag', e.target.value.toUpperCase())}
                  placeholder="ABC"
                  minLength={3}
                  maxLength={5}
                  style={{ width: '100px' }}
                  disabled={loading}
                />
                <div className="game-small game-muted">
                  3-5 characters, displayed as [{formData.tag.toUpperCase() || 'TAG'}]
                </div>
              </div>

              <div>
                <label className="game-small" style={{ display: 'block', marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your guild's purpose and goals..."
                  maxLength={500}
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                  disabled={loading}
                />
                <div className="game-small game-muted">
                  Optional: Tell others what your guild is about
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="game-card">
          <h3>Guild Emblem</h3>
          
          <div className="game-grid-2" style={{ gap: '16px' }}>
            <div>
              <label className="game-small" style={{ display: 'block', marginBottom: '8px' }}>
                Symbol
              </label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(5, 1fr)', 
                gap: '8px',
                maxWidth: '200px'
              }}>
                {emblemSymbols.map(symbol => (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => handleEmblemChange('symbol', symbol)}
                    style={{
                      width: '32px',
                      height: '32px',
                      fontSize: '16px',
                      border: formData.emblem.symbol === symbol ? '2px solid #6eb5ff' : '1px solid #533b2c',
                      background: formData.emblem.symbol === symbol ? 'rgba(110, 181, 255, 0.1)' : '#1a1511',
                      color: '#f1e5c8',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    disabled={loading}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="game-small" style={{ display: 'block', marginBottom: '8px' }}>
                Color
              </label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '8px',
                maxWidth: '160px'
              }}>
                {emblemColors.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => handleEmblemChange('color', color.value)}
                    style={{
                      width: '32px',
                      height: '32px',
                      border: formData.emblem.color === color.value ? '2px solid #6eb5ff' : '1px solid #533b2c',
                      background: color.value,
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    title={color.name}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="game-card game-bad">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="game-card">
          <div className="game-flex" style={{ gap: '12px' }}>
            <button
              type="submit"
              onClick={handleSubmit}
              className="game-btn game-btn-primary"
              disabled={loading || !isFormValid}
            >
              {loading ? 'Creating Guild...' : 'Create Guild'}
            </button>
            
            <a href="/guild" className="game-btn">
              Cancel
            </a>
          </div>

          <div className="game-small game-muted" style={{ marginTop: '12px' }}>
            By creating a guild, you become the guild leader with full management privileges.
            You can invite up to 49 other members to join your guild.
          </div>
        </div>
      </div>
    </GameLayout>
  );
}