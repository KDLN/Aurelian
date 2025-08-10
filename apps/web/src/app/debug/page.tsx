'use client';
import { useEffect, useRef, useState } from 'react';

export default function DebugSprites() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spriteSheet, setSpriteSheet] = useState<HTMLImageElement | null>(null);
  const [selectedRow, setSelectedRow] = useState(4);
  const [selectedCol, setSelectedCol] = useState(0);
  const [scale, setScale] = useState(4);
  const [offsetX, setOffsetX] = useState(2);
  const [offsetY, setOffsetY] = useState(2);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setSpriteSheet(img);
    };
    img.src = '/sprites/FREE Mana Seed Character Base Demo 2.0/char_a_p1/char_a_p1_0bas_humn_v01.png';
  }, []);

  useEffect(() => {
    if (!spriteSheet || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width = 800;
    const h = canvas.height = 600;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#231913';
    ctx.fillRect(0, 0, w, h);

    // Draw center crosshairs
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w/2 - 20, h/2);
    ctx.lineTo(w/2 + 20, h/2);
    ctx.moveTo(w/2, h/2 - 20);
    ctx.lineTo(w/2, h/2 + 20);
    ctx.stroke();

    // Draw grid lines every 32 pixels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Extract sprite frame - Mana Seed sprites are 64x64!
    const frameWidth = 64;
    const frameHeight = 64;
    const sourceX = selectedCol * frameWidth;
    const sourceY = selectedRow * frameHeight;

    // Draw sprite at different positions for comparison
    const positions = [
      { x: w/4, y: h/4, label: 'Top-Left' },
      { x: w/2, y: h/2, label: 'Center' },
      { x: 3*w/4, y: 3*h/4, label: 'Bottom-Right' }
    ];

    positions.forEach(pos => {
      // Method: Center-anchored positioning with offset adjustment
      const drawX = pos.x - (frameWidth * scale) / 2 + (offsetX * scale);
      const drawY = pos.y - (frameHeight * scale) / 2 + (offsetY * scale);
      
      ctx.drawImage(
        spriteSheet,
        sourceX, sourceY, frameWidth, frameHeight,
        drawX, drawY, frameWidth * scale, frameHeight * scale
      );

      // Draw position marker (center of sprite)
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(pos.x - 2, pos.y - 2, 4, 4);
      
      // Draw label
      ctx.fillStyle = '#f1e5c8';
      ctx.font = '12px monospace';
      ctx.fillText(pos.label, pos.x - 30, pos.y - 40);
      ctx.fillText(`${pos.x}, ${pos.y}`, pos.x - 20, pos.y - 25);
    });

    // Draw sprite sheet preview in corner
    ctx.drawImage(spriteSheet, 10, 10, 128, 128);
    
    // Highlight selected frame
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      10 + selectedCol * 16,
      10 + selectedRow * 16,
      16, 16
    );

    // Show extraction info
    ctx.fillStyle = '#f1e5c8';
    ctx.font = '14px monospace';
    ctx.fillText(`Row: ${selectedRow}, Col: ${selectedCol}`, 150, 30);
    ctx.fillText(`Source: ${sourceX}, ${sourceY}`, 150, 50);
    ctx.fillText(`Frame: ${frameWidth}x${frameHeight}`, 150, 70);
    ctx.fillText(`Scale: ${scale}x`, 150, 90);
    ctx.fillText(`Final: ${frameWidth * scale}x${frameHeight * scale}`, 150, 110);
    ctx.fillText(`Offset: ${offsetX}, ${offsetY}`, 150, 130);

  }, [spriteSheet, selectedRow, selectedCol, scale, offsetX, offsetY]);

  return (
    <div style={{ padding: 20, background: '#1a1511', color: '#f1e5c8', minHeight: '100vh' }}>
      <h1>Sprite Debug Tool</h1>
      
      <div style={{ marginBottom: 20, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <label>
          Row: 
          <select value={selectedRow} onChange={e => setSelectedRow(Number(e.target.value))} style={{ marginLeft: 10, padding: 5 }}>
            {Array.from({length: 8}, (_, i) => (
              <option key={i} value={i}>Row {i} {i === 4 ? '(South)' : i === 5 ? '(West)' : i === 6 ? '(East)' : i === 7 ? '(North)' : ''}</option>
            ))}
          </select>
        </label>
        
        <label>
          Col: 
          <select value={selectedCol} onChange={e => setSelectedCol(Number(e.target.value))} style={{ marginLeft: 10, padding: 5 }}>
            {Array.from({length: 8}, (_, i) => (
              <option key={i} value={i}>Col {i}</option>
            ))}
          </select>
        </label>
        
        <label>
          Scale: 
          <input 
            type="range" 
            min="1" 
            max="8" 
            value={scale} 
            onChange={e => setScale(Number(e.target.value))}
            style={{ marginLeft: 10 }}
          />
          <span style={{ marginLeft: 10 }}>{scale}x</span>
        </label>

        <label>
          Offset X: 
          <input 
            type="range" 
            min="-8" 
            max="8" 
            value={offsetX} 
            onChange={e => setOffsetX(Number(e.target.value))}
            style={{ marginLeft: 10 }}
          />
          <span style={{ marginLeft: 10 }}>{offsetX}px</span>
        </label>

        <label>
          Offset Y: 
          <input 
            type="range" 
            min="-8" 
            max="8" 
            value={offsetY} 
            onChange={e => setOffsetY(Number(e.target.value))}
            style={{ marginLeft: 10 }}
          />
          <span style={{ marginLeft: 10 }}>{offsetY}px</span>
        </label>
      </div>

      <canvas 
        ref={canvasRef}
        style={{ 
          border: '2px solid #533b2c',
          borderRadius: 8,
          imageRendering: 'pixelated'
        }}
      />
      
      <div style={{ marginTop: 20 }}>
        <h3>Instructions:</h3>
        <ul>
          <li>Red crosshairs mark center points</li>
          <li>Green dots mark sprite anchor points</li>
          <li>Grid lines are every 32 pixels</li>
          <li>Top-left shows the sprite sheet with selected frame highlighted</li>
          <li>Use controls above to test different rows, columns, and scales</li>
        </ul>
      </div>
    </div>
  );
}