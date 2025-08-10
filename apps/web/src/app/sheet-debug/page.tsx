'use client';
import { useEffect, useRef, useState } from 'react';

export default function SheetDebug() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spriteSheet, setSpriteSheet] = useState<HTMLImageElement | null>(null);
  const [selectedCell, setSelectedCell] = useState({ row: 4, col: 0 });
  const [frameWidth, setFrameWidth] = useState(64);  // Try 64x64 first
  const [frameHeight, setFrameHeight] = useState(64);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setSpriteSheet(img);
      console.log(`Loaded sprite sheet: ${img.width}x${img.height}`);
      console.log(`Grid: ${img.width/frameWidth} cols x ${img.height/frameHeight} rows`);
      // Auto-detect frame size based on sheet dimensions
      if (img.width === 512 && img.height === 512) {
        setFrameWidth(64);
        setFrameHeight(64);
      } else if (img.width === 256 && img.height === 256) {
        setFrameWidth(32);
        setFrameHeight(32);
      } else if (img.width === 128 && img.height === 128) {
        setFrameWidth(16);
        setFrameHeight(16);
      }
    };
    img.src = '/sprites/FREE Mana Seed Character Base Demo 2.0/char_a_p1/char_a_p1_0bas_humn_v01.png';
  }, []);

  useEffect(() => {
    if (!spriteSheet || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    canvas.width = 1200;
    canvas.height = 600;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#231913';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // SECTION 1: Original sprite sheet at 4x scale
    const scale1 = 4;
    ctx.fillStyle = '#f1e5c8';
    ctx.font = '14px monospace';
    ctx.fillText('1. Original Sprite Sheet (4x scale)', 10, 20);
    
    // Draw the sprite sheet
    ctx.drawImage(spriteSheet, 10, 30, spriteSheet.width * scale1, spriteSheet.height * scale1);
    
    // Draw grid overlay
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.lineWidth = 1;
    const cols = Math.floor(spriteSheet.width / frameWidth);
    const rows = Math.floor(spriteSheet.height / frameHeight);
    
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(10, 30 + r * frameHeight * scale1);
      ctx.lineTo(10 + cols * frameWidth * scale1, 30 + r * frameHeight * scale1);
      ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(10 + c * frameWidth * scale1, 30);
      ctx.lineTo(10 + c * frameWidth * scale1, 30 + rows * frameHeight * scale1);
      ctx.stroke();
    }

    // Highlight selected cell
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      10 + selectedCell.col * frameWidth * scale1,
      30 + selectedCell.row * frameHeight * scale1,
      frameWidth * scale1,
      frameHeight * scale1
    );

    // SECTION 2: Extracted frame at various scales
    const extractX = selectedCell.col * frameWidth;
    const extractY = selectedCell.row * frameHeight;
    
    ctx.fillStyle = '#f1e5c8';
    ctx.fillText(`2. Extracted Frame [Row ${selectedCell.row}, Col ${selectedCell.col}]`, 600, 20);
    ctx.fillText(`Source coords: ${extractX}, ${extractY}`, 600, 40);
    
    // Draw at different scales to see the extraction
    const scales = [1, 2, 4, 8, 16];
    let yOffset = 60;
    
    scales.forEach(scale => {
      // Draw background box
      ctx.strokeStyle = '#533b2c';
      ctx.strokeRect(600, yOffset, frameWidth * scale, frameHeight * scale);
      
      // Draw extracted sprite
      ctx.drawImage(
        spriteSheet,
        extractX, extractY, frameWidth, frameHeight,
        600, yOffset, frameWidth * scale, frameHeight * scale
      );
      
      // Label
      ctx.fillStyle = '#f1e5c8';
      ctx.fillText(`${scale}x`, 550, yOffset + frameHeight * scale / 2);
      
      // Draw center crosshair
      const centerX = 600 + (frameWidth * scale) / 2;
      const centerY = yOffset + (frameHeight * scale) / 2;
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - 5, centerY);
      ctx.lineTo(centerX + 5, centerY);
      ctx.moveTo(centerX, centerY - 5);
      ctx.lineTo(centerX, centerY + 5);
      ctx.stroke();
      
      yOffset += frameHeight * scale + 10;
    });

    // SECTION 3: Pixel data analysis
    ctx.fillStyle = '#f1e5c8';
    ctx.fillText('3. Pixel Analysis (16x scale with grid)', 850, 20);
    
    const bigScale = 16;
    const analysisX = 850;
    const analysisY = 60;
    
    // Draw big version with pixel grid
    ctx.drawImage(
      spriteSheet,
      extractX, extractY, frameWidth, frameHeight,
      analysisX, analysisY, frameWidth * bigScale, frameHeight * bigScale
    );
    
    // Draw pixel grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= frameWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(analysisX + x * bigScale, analysisY);
      ctx.lineTo(analysisX + x * bigScale, analysisY + frameHeight * bigScale);
      ctx.stroke();
    }
    for (let y = 0; y <= frameHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(analysisX, analysisY + y * bigScale);
      ctx.lineTo(analysisX + frameWidth * bigScale, analysisY + y * bigScale);
      ctx.stroke();
    }

    // Analyze pixels to find bounds
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = frameWidth;
    tempCanvas.height = frameHeight;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(
      spriteSheet,
      extractX, extractY, frameWidth, frameHeight,
      0, 0, frameWidth, frameHeight
    );
    
    const imageData = tempCtx.getImageData(0, 0, frameWidth, frameHeight);
    let minX = frameWidth, minY = frameHeight, maxX = -1, maxY = -1;
    
    for (let y = 0; y < frameHeight; y++) {
      for (let x = 0; x < frameWidth; x++) {
        const alpha = imageData.data[(y * frameWidth + x) * 4 + 3];
        if (alpha > 0) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
          
          // Mark non-transparent pixels
          ctx.fillStyle = `rgba(0, 255, 0, 0.3)`;
          ctx.fillRect(
            analysisX + x * bigScale,
            analysisY + y * bigScale,
            bigScale,
            bigScale
          );
        }
      }
    }
    
    // Draw bounding box
    if (maxX >= 0) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        analysisX + minX * bigScale,
        analysisY + minY * bigScale,
        (maxX - minX + 1) * bigScale,
        (maxY - minY + 1) * bigScale
      );
      
      // Draw center of bounding box
      const bboxCenterX = analysisX + (minX + (maxX - minX + 1) / 2) * bigScale;
      const bboxCenterY = analysisY + (minY + (maxY - minY + 1) / 2) * bigScale;
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bboxCenterX, bboxCenterY, 5, 0, Math.PI * 2);
      ctx.stroke();
      
      // Info
      ctx.fillStyle = '#f1e5c8';
      ctx.fillText(`Bounds: ${minX},${minY} to ${maxX},${maxY}`, analysisX, analysisY + frameHeight * bigScale + 20);
      ctx.fillText(`Size: ${maxX - minX + 1}x${maxY - minY + 1}`, analysisX, analysisY + frameHeight * bigScale + 40);
      ctx.fillText(`Center: ${(minX + maxX) / 2}, ${(minY + maxY) / 2}`, analysisX, analysisY + frameHeight * bigScale + 60);
    } else {
      ctx.fillStyle = '#ff0000';
      ctx.fillText('EMPTY FRAME (no pixels)', analysisX, analysisY + frameHeight * bigScale + 20);
    }

    // Draw frame center
    const frameCenterX = analysisX + (frameWidth * bigScale) / 2;
    const frameCenterY = analysisY + (frameHeight * bigScale) / 2;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(frameCenterX - 10, frameCenterY);
    ctx.lineTo(frameCenterX + 10, frameCenterY);
    ctx.moveTo(frameCenterX, frameCenterY - 10);
    ctx.lineTo(frameCenterX, frameCenterY + 10);
    ctx.stroke();

    // Legend
    ctx.fillStyle = '#f1e5c8';
    ctx.fillText('Legend:', 850, 420);
    ctx.fillStyle = '#00ff00';
    ctx.fillText('Green = Non-transparent pixels & bounding box', 850, 440);
    ctx.fillStyle = '#ffff00';
    ctx.fillText('Yellow = Center of sprite content', 850, 460);
    ctx.fillStyle = '#ff0000';
    ctx.fillText('Red = Frame center (16x16)', 850, 480);

  }, [spriteSheet, selectedCell]);

  return (
    <div style={{ padding: 20, background: '#1a1511', color: '#f1e5c8', minHeight: '100vh' }}>
      <h1>Sprite Sheet Debug Tool</h1>
      
      <div style={{ marginBottom: 20, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <label>
          Frame W: 
          <input 
            type="number" 
            value={frameWidth}
            onChange={e => setFrameWidth(parseInt(e.target.value) || 16)}
            style={{ marginLeft: 10, width: 60, padding: 5 }}
          />
        </label>
        
        <label>
          Frame H: 
          <input 
            type="number" 
            value={frameHeight}
            onChange={e => setFrameHeight(parseInt(e.target.value) || 16)}
            style={{ marginLeft: 10, width: 60, padding: 5 }}
          />
        </label>

        <label>
          Row: 
          <input 
            type="number" 
            min="0" 
            max="15" 
            value={selectedCell.row}
            onChange={e => setSelectedCell({...selectedCell, row: parseInt(e.target.value) || 0})}
            style={{ marginLeft: 10, width: 60, padding: 5 }}
          />
        </label>
        
        <label>
          Col: 
          <input 
            type="number" 
            min="0" 
            max="15" 
            value={selectedCell.col}
            onChange={e => setSelectedCell({...selectedCell, col: parseInt(e.target.value) || 0})}
            style={{ marginLeft: 10, width: 60, padding: 5 }}
          />
        </label>

        <div>
          Quick select:
          <button onClick={() => setSelectedCell({row: 4, col: 0})} style={{ marginLeft: 10 }}>Row 4</button>
          <button onClick={() => setSelectedCell({row: 5, col: 0})} style={{ marginLeft: 5 }}>Row 5</button>
          <button onClick={() => setSelectedCell({row: 6, col: 0})} style={{ marginLeft: 5 }}>Row 6</button>
          <button onClick={() => setSelectedCell({row: 7, col: 0})} style={{ marginLeft: 5 }}>Row 7</button>
        </div>
        <div style={{ color: '#68b06e' }}>
          Check each row to identify: South (facing camera), North (back to camera), East (facing right), West (facing left)
        </div>
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
        <h3>What this shows:</h3>
        <ul>
          <li><strong>Section 1:</strong> The full sprite sheet with a grid showing 16x16 cells</li>
          <li><strong>Section 2:</strong> The extracted frame at different scales with center crosshairs</li>
          <li><strong>Section 3:</strong> Pixel-by-pixel analysis showing which pixels are non-transparent</li>
          <li>Green highlights show actual sprite content</li>
          <li>The system finds the bounding box and calculates offsets from there</li>
        </ul>
      </div>
    </div>
  );
}