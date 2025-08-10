'use client';
import { useEffect, useRef, useState } from 'react';
import { CHARACTER_OPTIONS } from '../../../lib/sprites/characterOptions';

interface SpritePreview {
  type: 'base' | 'outfit' | 'hair' | 'hat';
  id: string;
  name: string;
  image?: HTMLImageElement;
  loaded: boolean;
}

interface EditableOption {
  id: string;
  name: string;
  originalName: string;
  changed: boolean;
}

export default function SpriteManagementPage() {
  const [sprites, setSprites] = useState<SpritePreview[]>([]);
  const [selectedType, setSelectedType] = useState<'base' | 'outfit' | 'hair' | 'hat'>('base');
  const [selectedSprite, setSelectedSprite] = useState<string>('');
  const [editableOptions, setEditableOptions] = useState<EditableOption[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize editable options when type changes
  useEffect(() => {
    const options = CHARACTER_OPTIONS[selectedType].map(opt => ({
      id: opt.id,
      name: opt.name,
      originalName: opt.name,
      changed: false
    }));
    setEditableOptions(options);
    setSelectedSprite(options[0]?.id || '');
  }, [selectedType]);

  // Load sprite previews
  useEffect(() => {
    const loadSprites = async () => {
      const basePath = '/sprites/FREE Mana Seed Character Base Demo 2.0/char_a_p1';
      const newSprites: SpritePreview[] = [];

      for (const option of CHARACTER_OPTIONS[selectedType]) {
        let fullPath = '';
        
        switch (selectedType) {
          case 'base':
            fullPath = `${basePath}/char_a_p1_0bas_humn_${option.id}.png`;
            break;
          case 'outfit':
            fullPath = `${basePath}/1out/char_a_p1_1out_${option.id}.png`;
            break;
          case 'hair':
            fullPath = `${basePath}/4har/char_a_p1_4har_${option.id}.png`;
            break;
          case 'hat':
            if (option.id === '') continue; // Skip "None" option
            fullPath = `${basePath}/5hat/char_a_p1_5hat_${option.id}.png`;
            break;
        }

        const sprite: SpritePreview = {
          type: selectedType,
          id: option.id,
          name: option.name,
          loaded: false
        };

        const img = new Image();
        img.onload = () => {
          sprite.image = img;
          sprite.loaded = true;
          setSprites(prev => [...prev.filter(s => s.id !== option.id), sprite]);
        };
        img.onerror = () => {
          console.warn(`Failed to load sprite: ${fullPath}`);
        };
        img.src = fullPath;

        newSprites.push(sprite);
      }
    };

    setSprites([]);
    loadSprites();
  }, [selectedType]);

  // Draw sprite preview
  useEffect(() => {
    if (!canvasRef.current || !selectedSprite) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    canvas.width = 400;
    canvas.height = 600;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#231913';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sprite = sprites.find(s => s.id === selectedSprite && s.loaded);
    if (!sprite?.image) {
      ctx.fillStyle = '#f1e5c8';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Draw sprite sheet overview
    const scale = Math.min(380 / sprite.image.width, 200 / sprite.image.height);
    const drawWidth = sprite.image.width * scale;
    const drawHeight = sprite.image.height * scale;
    const startX = (canvas.width - drawWidth) / 2;
    
    ctx.drawImage(sprite.image, startX, 20, drawWidth, drawHeight);

    // Draw grid overlay
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.lineWidth = 1;
    const frameWidth = 64;
    const frameHeight = 64;
    const cols = sprite.image.width / frameWidth;
    const rows = sprite.image.height / frameHeight;
    
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(startX, 20 + r * frameHeight * scale);
      ctx.lineTo(startX + drawWidth, 20 + r * frameHeight * scale);
      ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(startX + c * frameWidth * scale, 20);
      ctx.lineTo(startX + c * frameWidth * scale, 20 + drawHeight);
      ctx.stroke();
    }

    // Draw individual frames (south-facing row 4)
    ctx.fillStyle = '#f1e5c8';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('South-facing frames (Row 4)', canvas.width / 2, 250);

    const frameY = 270;
    const frameScale = 3;
    const frameDisplayWidth = frameWidth * frameScale;
    const frameDisplayHeight = frameHeight * frameScale;
    const framesPerRow = Math.floor(canvas.width / (frameDisplayWidth + 10));
    
    for (let col = 0; col < Math.min(cols, 8); col++) {
      const x = 20 + (col % framesPerRow) * (frameDisplayWidth + 10);
      const y = frameY + Math.floor(col / framesPerRow) * (frameDisplayHeight + 30);
      
      // Background
      ctx.fillStyle = '#533b2c';
      ctx.fillRect(x - 2, y - 2, frameDisplayWidth + 4, frameDisplayHeight + 4);
      
      // Frame
      ctx.drawImage(
        sprite.image,
        col * frameWidth, 4 * frameHeight, frameWidth, frameHeight,
        x, y, frameDisplayWidth, frameDisplayHeight
      );
      
      // Label
      ctx.fillStyle = '#f1e5c8';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Frame ${col}`, x + frameDisplayWidth / 2, y + frameDisplayHeight + 15);
    }

  }, [sprites, selectedSprite]);

  const updateOptionName = (id: string, newName: string) => {
    setEditableOptions(prev => 
      prev.map(opt => 
        opt.id === id 
          ? { ...opt, name: newName, changed: newName !== opt.originalName }
          : opt
      )
    );
  };

  const exportUpdatedOptions = () => {
    const changedOptions = editableOptions.filter(opt => opt.changed);
    if (changedOptions.length === 0) {
      alert('No changes to export');
      return;
    }

    const updatedSection = `${selectedType}: [\n` +
      editableOptions.map(opt => 
        `    { id: '${opt.id}', name: '${opt.name}' },`
      ).join('\n') +
      '\n  ]';

    console.log('Updated options for', selectedType, ':', updatedSection);
    
    // Copy to clipboard
    navigator.clipboard.writeText(updatedSection).then(() => {
      alert(`Updated ${selectedType} options copied to clipboard!\nPaste this into characterOptions.ts`);
    });
  };

  const resetChanges = () => {
    setEditableOptions(prev => 
      prev.map(opt => ({
        ...opt,
        name: opt.originalName,
        changed: false
      }))
    );
  };

  return (
    <div style={{ 
      padding: 20, 
      background: '#1a1511', 
      color: '#f1e5c8', 
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '400px 1fr',
      gap: 20
    }}>
      <div>
        <h1 style={{ fontSize: 24, marginBottom: 20 }}>Sprite Management</h1>
        
        {/* Type selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold' }}>
            Sprite Type:
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(['base', 'outfit', 'hair', 'hat'] as const).map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                style={{
                  padding: '8px 12px',
                  background: selectedType === type ? '#68b06e' : '#533b2c',
                  border: 'none',
                  borderRadius: 4,
                  color: '#f1e5c8',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Sprite list */}
        <div style={{ marginBottom: 20 }}>
          <h3>Available Sprites ({editableOptions.length})</h3>
          <div style={{ 
            maxHeight: 300, 
            overflowY: 'auto', 
            border: '1px solid #533b2c',
            borderRadius: 4,
            background: '#231913'
          }}>
            {editableOptions.map(option => (
              <div 
                key={option.id}
                onClick={() => setSelectedSprite(option.id)}
                style={{
                  padding: 10,
                  borderBottom: '1px solid #533b2c',
                  cursor: 'pointer',
                  background: selectedSprite === option.id ? '#533b2c' : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: '#999' }}>{option.id}</div>
                  <div style={{ color: option.changed ? '#68b06e' : '#f1e5c8' }}>
                    {option.name} {option.changed && '*'}
                  </div>
                </div>
                <div style={{ 
                  width: 10, 
                  height: 10, 
                  borderRadius: '50%',
                  background: sprites.find(s => s.id === option.id)?.loaded ? '#68b06e' : '#999'
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <button
            onClick={exportUpdatedOptions}
            disabled={!editableOptions.some(opt => opt.changed)}
            style={{
              padding: '10px 15px',
              background: editableOptions.some(opt => opt.changed) ? '#68b06e' : '#533b2c',
              border: 'none',
              borderRadius: 4,
              color: '#f1e5c8',
              cursor: editableOptions.some(opt => opt.changed) ? 'pointer' : 'not-allowed',
              fontWeight: 'bold'
            }}
          >
            Export Changes ({editableOptions.filter(opt => opt.changed).length})
          </button>
          
          <button
            onClick={resetChanges}
            style={{
              padding: '8px 12px',
              background: '#533b2c',
              border: 'none',
              borderRadius: 4,
              color: '#f1e5c8',
              cursor: 'pointer'
            }}
          >
            Reset All Changes
          </button>
        </div>
      </div>

      <div>
        <div style={{ marginBottom: 20 }}>
          <h2>Sprite Preview: {selectedType}</h2>
          {selectedSprite && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 10 }}>
              <strong>ID:</strong> {selectedSprite}
            </div>
          )}
        </div>

        <canvas 
          ref={canvasRef}
          style={{ 
            border: '2px solid #533b2c',
            borderRadius: 8,
            imageRendering: 'pixelated',
            marginBottom: 20
          }}
        />

        {selectedSprite && (
          <div style={{ background: '#231913', padding: 15, borderRadius: 8, border: '1px solid #533b2c' }}>
            <h3>Edit Name</h3>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', marginBottom: 5 }}>
                Display Name:
              </label>
              <input
                type="text"
                value={editableOptions.find(opt => opt.id === selectedSprite)?.name || ''}
                onChange={e => updateOptionName(selectedSprite, e.target.value)}
                style={{
                  width: '100%',
                  padding: 8,
                  background: '#1a1511',
                  border: '1px solid #533b2c',
                  borderRadius: 4,
                  color: '#f1e5c8',
                  fontSize: 14
                }}
                placeholder="Enter display name..."
              />
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>
              Original: {editableOptions.find(opt => opt.id === selectedSprite)?.originalName}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}