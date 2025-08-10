'use client';
import { useEffect, useRef, useState } from 'react';
import { SpriteAligner } from '../../lib/sprites/spriteAlignment';

export default function SpriteAnalyzer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spriteSheet, setSpriteSheet] = useState<HTMLImageElement | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showBBox, setShowBBox] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showOffsets, setShowOffsets] = useState(true);
  const [pivotMode, setPivotMode] = useState<'center' | 'feet'>('center');
  const [selectedFrame, setSelectedFrame] = useState<{row: number, col: number} | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setSpriteSheet(img);
      analyzeSheet(img);
    };
    img.src = '/sprites/FREE Mana Seed Character Base Demo 2.0/char_a_p1/char_a_p1_0bas_humn_v01.png';
  }, []);

  async function analyzeSheet(img: HTMLImageElement) {
    const aligner = new SpriteAligner(16, 16, pivotMode);
    const result = await aligner.analyze(img);
    setAnalysis(result);
    console.log('Sprite Analysis:', result);
  }

  useEffect(() => {
    if (spriteSheet) {
      analyzeSheet(spriteSheet);
    }
  }, [pivotMode]);

  useEffect(() => {
    if (!spriteSheet || !canvasRef.current || !analysis) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const scale = 4; // Scale up for better visibility
    const frameW = 16;
    const frameH = 16;
    
    // Set canvas size to fit scaled sprite sheet
    canvas.width = spriteSheet.width * scale + 300; // Extra space for info
    canvas.height = spriteSheet.height * scale;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#231913';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw scaled sprite sheet
    ctx.drawImage(spriteSheet, 0, 0, spriteSheet.width * scale, spriteSheet.height * scale);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= spriteSheet.width * scale; x += frameW * scale) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, spriteSheet.height * scale);
        ctx.stroke();
      }
      for (let y = 0; y <= spriteSheet.height * scale; y += frameH * scale) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(spriteSheet.width * scale, y);
        ctx.stroke();
      }
    }

    // Draw analysis overlays
    analysis.frames.forEach((frame: any) => {
      const x = frame.col * frameW * scale;
      const y = frame.row * frameH * scale;
      
      if (frame.empty) {
        // Mark empty frames
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fillRect(x, y, frameW * scale, frameH * scale);
        return;
      }

      // Draw target position (where we want the sprite to be centered)
      const targetX = x + (analysis.targetInFrame.x * scale);
      const targetY = y + (analysis.targetInFrame.y * scale);
      
      if (showOffsets) {
        // Draw green crosshair at target position
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(targetX - 5, targetY);
        ctx.lineTo(targetX + 5, targetY);
        ctx.moveTo(targetX, targetY - 5);
        ctx.lineTo(targetX, targetY + 5);
        ctx.stroke();

        // Draw offset vector
        if (frame.offsetX !== 0 || frame.offsetY !== 0) {
          ctx.strokeStyle = '#ff00ff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(targetX, targetY);
          ctx.lineTo(targetX - frame.offsetX * scale, targetY - frame.offsetY * scale);
          ctx.stroke();
          
          // Draw offset values
          ctx.fillStyle = '#ffff00';
          ctx.font = '10px monospace';
          ctx.fillText(`${frame.offsetX},${frame.offsetY}`, x + 2, y + 10);
        }
      }

      // Highlight selected frame
      if (selectedFrame && selectedFrame.row === frame.row && selectedFrame.col === frame.col) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, frameW * scale, frameH * scale);
      }
    });

    // Draw info panel
    const infoX = spriteSheet.width * scale + 20;
    ctx.fillStyle = '#f1e5c8';
    ctx.font = '14px monospace';
    ctx.fillText('Sprite Alignment Analysis', infoX, 30);
    ctx.fillText(`Frames: ${analysis.cols}x${analysis.rows}`, infoX, 50);
    ctx.fillText(`Frame Size: ${frameW}x${frameH}`, infoX, 70);
    ctx.fillText(`Pivot Mode: ${pivotMode}`, infoX, 90);
    ctx.fillText(`Target: ${analysis.targetInFrame.x}, ${analysis.targetInFrame.y}`, infoX, 110);
    
    if (selectedFrame && analysis.frames) {
      const frame = analysis.frames.find((f: any) => 
        f.row === selectedFrame.row && f.col === selectedFrame.col
      );
      if (frame) {
        ctx.fillText('Selected Frame:', infoX, 150);
        ctx.fillText(`  Row: ${frame.row}, Col: ${frame.col}`, infoX, 170);
        ctx.fillText(`  Offset: ${frame.offsetX}, ${frame.offsetY}`, infoX, 190);
        ctx.fillText(`  Empty: ${frame.empty || false}`, infoX, 210);
      }
    }

    // Legend
    ctx.fillText('Legend:', infoX, 250);
    ctx.fillStyle = '#00ff00';
    ctx.fillText('Green + = Target position', infoX, 270);
    ctx.fillStyle = '#ff00ff';
    ctx.fillText('Purple = Offset vector', infoX, 290);
    ctx.fillStyle = '#ffff00';
    ctx.fillText('Yellow = Offset values', infoX, 310);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.fillRect(infoX, 320, 20, 20);
    ctx.fillStyle = '#f1e5c8';
    ctx.fillText('= Empty frame', infoX + 25, 335);

  }, [spriteSheet, analysis, showBBox, showGrid, showOffsets, selectedFrame]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scale = 4;
    const col = Math.floor(x / (16 * scale));
    const row = Math.floor(y / (16 * scale));
    setSelectedFrame({ row, col });
  };

  return (
    <div style={{ padding: 20, background: '#1a1511', color: '#f1e5c8', minHeight: '100vh' }}>
      <h1>Sprite Alignment Analyzer</h1>
      
      <div style={{ marginBottom: 20, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <label>
          <input 
            type="checkbox" 
            checked={showGrid} 
            onChange={e => setShowGrid(e.target.checked)}
          /> Show Grid
        </label>
        
        <label>
          <input 
            type="checkbox" 
            checked={showOffsets} 
            onChange={e => setShowOffsets(e.target.checked)}
          /> Show Offsets
        </label>
        
        <label>
          Pivot Mode:
          <select 
            value={pivotMode} 
            onChange={e => setPivotMode(e.target.value as 'center' | 'feet')}
            style={{ marginLeft: 10, padding: 5 }}
          >
            <option value="center">Center</option>
            <option value="feet">Feet</option>
          </select>
        </label>

        <button 
          onClick={() => {
            if (analysis) {
              const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'sprite-alignment.json';
              a.click();
            }
          }}
          style={{ padding: '5px 15px', background: '#68b06e', border: 'none', borderRadius: 4, color: '#1a1511', cursor: 'pointer' }}
        >
          Export JSON
        </button>
      </div>

      <canvas 
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ 
          border: '2px solid #533b2c',
          borderRadius: 8,
          imageRendering: 'pixelated',
          cursor: 'crosshair'
        }}
      />
      
      <div style={{ marginTop: 20 }}>
        <h3>Instructions:</h3>
        <ul>
          <li>Click on any frame to see its details</li>
          <li>Green crosshairs show where the sprite SHOULD be centered</li>
          <li>Purple lines show the offset needed to center the sprite</li>
          <li>Yellow numbers show the X,Y offset values for each frame</li>
          <li>Red overlay indicates empty frames</li>
          <li>The system finds non-transparent pixels and calculates how to center them</li>
        </ul>
        
        {analysis && (
          <div style={{ marginTop: 20 }}>
            <h3>Analysis Summary:</h3>
            <pre style={{ background: '#231913', padding: 10, borderRadius: 4, overflow: 'auto' }}>
              {JSON.stringify(analysis, null, 2).slice(0, 500)}...
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}