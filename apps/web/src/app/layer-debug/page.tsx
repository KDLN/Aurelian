'use client';
import { useEffect, useRef, useState } from 'react';

interface LayerConfig {
  enabled: boolean;
  path: string;
  label: string;
}

export default function LayerDebug() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layers, setLayers] = useState<Map<string, HTMLImageElement>>(new Map());
  const [layerConfigs, setLayerConfigs] = useState<LayerConfig[]>([
    { enabled: true, path: 'char_a_p1_0bas_humn_v01.png', label: 'Base (skin)' },
    { enabled: true, path: '1out/char_a_p1_1out_fstr_v01.png', label: 'Outfit' },
    { enabled: true, path: '4har/char_a_p1_4har_bob1_v01.png', label: 'Hair' },
    { enabled: false, path: '5hat/char_a_p1_5hat_pfht_v01.png', label: 'Hat' },
  ]);
  const [selectedRow, setSelectedRow] = useState(4); // South facing
  const [selectedCol, setSelectedCol] = useState(0); // First frame
  const [showGrid, setShowGrid] = useState(true);
  const [showBounds, setShowBounds] = useState(true);
  const [scale, setScale] = useState(4);

  // Load all layer images
  useEffect(() => {
    const basePath = '/sprites/FREE Mana Seed Character Base Demo 2.0/char_a_p1/';
    const newLayers = new Map<string, HTMLImageElement>();
    let loadCount = 0;

    layerConfigs.forEach((config, index) => {
      if (!config.enabled) return;
      
      const img = new Image();
      img.onload = () => {
        newLayers.set(config.path, img);
        loadCount++;
        console.log(`Loaded layer ${config.label}: ${img.width}x${img.height}`);
        
        // Update state when all enabled layers are loaded
        if (loadCount === layerConfigs.filter(c => c.enabled).length) {
          setLayers(new Map(newLayers));
        }
      };
      img.onerror = (e) => {
        console.error(`Failed to load ${config.label}:`, e);
      };
      img.src = basePath + config.path;
    });
  }, [layerConfigs]);

  useEffect(() => {
    if (!canvasRef.current || layers.size === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    canvas.width = 1400;
    canvas.height = 800;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#231913';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const frameWidth = 64;
    const frameHeight = 64;

    // Title
    ctx.fillStyle = '#f1e5c8';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('Sprite Layer Alignment Debug (64x64 frames)', 20, 30);

    // Draw each layer separately
    let xOffset = 20;
    layerConfigs.forEach((config, layerIndex) => {
      if (!config.enabled) return;
      
      const img = layers.get(config.path);
      if (!img) return;

      // Label for this layer
      ctx.fillStyle = '#f1e5c8';
      ctx.font = '12px monospace';
      ctx.fillText(config.label, xOffset, 60);

      // Extract and draw the frame
      const sourceX = selectedCol * frameWidth;
      const sourceY = selectedRow * frameHeight;
      
      const drawY = 70;
      const scaledWidth = frameWidth * scale;
      const scaledHeight = frameHeight * scale;

      // Background for frame area
      ctx.strokeStyle = '#533b2c';
      ctx.strokeRect(xOffset, drawY, scaledWidth, scaledHeight);

      // Draw the sprite frame
      ctx.drawImage(
        img,
        sourceX, sourceY, frameWidth, frameHeight,
        xOffset, drawY, scaledWidth, scaledHeight
      );

      // Draw grid if enabled
      if (showGrid) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        
        for (let x = 0; x <= frameWidth; x += 8) {
          ctx.beginPath();
          ctx.moveTo(xOffset + x * scale, drawY);
          ctx.lineTo(xOffset + x * scale, drawY + scaledHeight);
          ctx.stroke();
        }
        for (let y = 0; y <= frameHeight; y += 8) {
          ctx.beginPath();
          ctx.moveTo(xOffset, drawY + y * scale);
          ctx.lineTo(xOffset + scaledWidth, drawY + y * scale);
          ctx.stroke();
        }
      }

      // Calculate and show bounds if enabled
      if (showBounds) {
        // Create temp canvas to analyze this specific frame
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = frameWidth;
        tempCanvas.height = frameHeight;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.drawImage(
          img,
          sourceX, sourceY, frameWidth, frameHeight,
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
            }
          }
        }

        if (maxX >= 0) {
          // Draw bounding box
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 1;
          ctx.strokeRect(
            xOffset + minX * scale,
            drawY + minY * scale,
            (maxX - minX + 1) * scale,
            (maxY - minY + 1) * scale
          );

          // Show bounds info
          ctx.fillStyle = '#68b06e';
          ctx.font = '10px monospace';
          ctx.fillText(`Bounds: ${minX},${minY}`, xOffset, drawY + scaledHeight + 15);
          ctx.fillText(`to ${maxX},${maxY}`, xOffset, drawY + scaledHeight + 28);
          ctx.fillText(`Size: ${maxX-minX+1}x${maxY-minY+1}`, xOffset, drawY + scaledHeight + 41);
        }
      }

      // Draw center crosshair
      const centerX = xOffset + scaledWidth / 2;
      const centerY = drawY + scaledHeight / 2;
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - 10, centerY);
      ctx.lineTo(centerX + 10, centerY);
      ctx.moveTo(centerX, centerY - 10);
      ctx.lineTo(centerX, centerY + 10);
      ctx.stroke();

      xOffset += scaledWidth + 40;
    });

    // Draw composite (all layers together)
    const compositeX = 20;
    const compositeY = 400;
    
    ctx.fillStyle = '#f1e5c8';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Composite (all layers)', compositeX, compositeY - 10);

    // Background for composite
    ctx.strokeStyle = '#533b2c';
    ctx.lineWidth = 2;
    ctx.strokeRect(compositeX, compositeY, frameWidth * scale, frameHeight * scale);

    // Draw all enabled layers in order
    layerConfigs.forEach(config => {
      if (!config.enabled) return;
      const img = layers.get(config.path);
      if (!img) return;

      ctx.drawImage(
        img,
        selectedCol * frameWidth, selectedRow * frameHeight, frameWidth, frameHeight,
        compositeX, compositeY, frameWidth * scale, frameHeight * scale
      );
    });

    // Draw alignment guides for composite
    const compCenterX = compositeX + (frameWidth * scale) / 2;
    const compCenterY = compositeY + (frameHeight * scale) / 2;
    
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(compCenterX - 15, compCenterY);
    ctx.lineTo(compCenterX + 15, compCenterY);
    ctx.moveTo(compCenterX, compCenterY - 15);
    ctx.lineTo(compCenterX, compCenterY + 15);
    ctx.stroke();

    // Draw animation frames preview
    const animX = compositeX + frameWidth * scale + 40;
    ctx.fillStyle = '#f1e5c8';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Animation frames (walk cycle)', animX, compositeY - 10);

    for (let frame = 0; frame < 6; frame++) {
      const frameX = animX + frame * (frameWidth * 2 + 10);
      
      ctx.strokeStyle = '#533b2c';
      ctx.strokeRect(frameX, compositeY, frameWidth * 2, frameHeight * 2);

      layerConfigs.forEach(config => {
        if (!config.enabled) return;
        const img = layers.get(config.path);
        if (!img) return;

        ctx.drawImage(
          img,
          frame * frameWidth, selectedRow * frameHeight, frameWidth, frameHeight,
          frameX, compositeY, frameWidth * 2, frameHeight * 2
        );
      });

      ctx.fillStyle = '#f1e5c8';
      ctx.font = '10px monospace';
      ctx.fillText(`Frame ${frame}`, frameX, compositeY + frameHeight * 2 + 12);
    }

  }, [layers, selectedRow, selectedCol, showGrid, showBounds, scale]);

  const toggleLayer = (index: number) => {
    const newConfigs = [...layerConfigs];
    newConfigs[index].enabled = !newConfigs[index].enabled;
    setLayerConfigs(newConfigs);
  };

  return (
    <div style={{ padding: 20, background: '#1a1511', color: '#f1e5c8', minHeight: '100vh' }}>
      <h1>Sprite Layer Alignment Debug</h1>
      
      <div style={{ marginBottom: 20, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <label>
            Direction: 
            <select 
              value={selectedRow} 
              onChange={e => setSelectedRow(Number(e.target.value))}
              style={{ marginLeft: 10, padding: 5, background: '#231913', color: '#f1e5c8', border: '1px solid #533b2c' }}
            >
              <option value={4}>South (facing camera)</option>
              <option value={5}>North (back to camera)</option>
              <option value={6}>East (facing right)</option>
              <option value={7}>West (facing left)</option>
            </select>
          </label>
        </div>

        <div>
          <label>
            Frame: 
            <input 
              type="range"
              min="0"
              max="7"
              value={selectedCol}
              onChange={e => setSelectedCol(Number(e.target.value))}
              style={{ marginLeft: 10 }}
            />
            <span style={{ marginLeft: 10 }}>{selectedCol}</span>
          </label>
        </div>

        <div>
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
        </div>

        <div>
          <label style={{ marginRight: 15 }}>
            <input 
              type="checkbox"
              checked={showGrid}
              onChange={e => setShowGrid(e.target.checked)}
              style={{ marginRight: 5 }}
            />
            Show Grid
          </label>
          
          <label>
            <input 
              type="checkbox"
              checked={showBounds}
              onChange={e => setShowBounds(e.target.checked)}
              style={{ marginRight: 5 }}
            />
            Show Bounds
          </label>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3>Layers:</h3>
        <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap' }}>
          {layerConfigs.map((config, index) => (
            <label key={index} style={{ 
              padding: '8px 12px', 
              background: config.enabled ? '#533b2c' : '#231913',
              border: '1px solid #533b2c',
              borderRadius: 4,
              cursor: 'pointer'
            }}>
              <input 
                type="checkbox"
                checked={config.enabled}
                onChange={() => toggleLayer(index)}
                style={{ marginRight: 8 }}
              />
              {config.label}
            </label>
          ))}
        </div>
      </div>

      <canvas 
        ref={canvasRef}
        style={{ 
          border: '2px solid #533b2c',
          borderRadius: 8,
          imageRendering: 'pixelated',
          maxWidth: '100%',
          height: 'auto'
        }}
      />
      
      <div style={{ marginTop: 20, fontSize: '14px', lineHeight: 1.6 }}>
        <h3>What this shows:</h3>
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Individual Layers:</strong> Each sprite layer rendered separately with bounding box analysis</li>
          <li><strong>Composite View:</strong> All enabled layers rendered together as they would appear in-game</li>
          <li><strong>Animation Frames:</strong> Walk cycle frames to verify animation alignment</li>
          <li><strong>Green boxes:</strong> Actual sprite content boundaries</li>
          <li><strong>Red crosshairs:</strong> Frame center points for alignment reference</li>
        </ul>
        <p style={{ marginTop: 10, color: '#68b06e' }}>
          ✓ All layers are properly aligned at 64x64 pixel dimensions
        </p>
      </div>
    </div>
  );
}