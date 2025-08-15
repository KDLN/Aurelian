import { MinimapArea, MinimapPlayer, MinimapConfig, ACTION_COLORS, ACTION_ICONS, GAME_AREAS } from './minimapTypes';

export class MinimapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: MinimapConfig;
  private areas: MinimapArea[];
  private players: Map<string, MinimapPlayer> = new Map();
  private viewOffset = { x: 0, y: 0 };
  private isDragging = false;
  private lastMousePos = { x: 0, y: 0 };
  private animationFrameId: number | null = null;
  private selectedPath: { from: string; to: string } | null = null;

  constructor(canvas: HTMLCanvasElement, config: MinimapConfig) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    this.ctx = context;
    this.config = config;
    this.areas = GAME_AREAS;
    
    this.setupEventListeners();
    this.resize();
    this.startAnimation();
  }

  private setupEventListeners() {
    // Mouse controls for panning
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      
      const deltaX = e.clientX - this.lastMousePos.x;
      const deltaY = e.clientY - this.lastMousePos.y;
      
      this.viewOffset.x += deltaX;
      this.viewOffset.y += deltaY;
      
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.render();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    });

    // Zoom with mouse wheel
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.config.scale = Math.max(0.1, Math.min(3, this.config.scale * zoomFactor));
      this.render();
    });

    // Click to select paths or areas
    this.canvas.addEventListener('click', (e) => {
      if (this.isDragging) return; // Don't select if we were dragging
      
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - this.viewOffset.x) / this.config.scale;
      const y = (e.clientY - rect.top - this.viewOffset.y) / this.config.scale;
      
      // Check for path clicks first
      const clickedPath = this.getPathAtPoint(x, y);
      if (clickedPath) {
        this.selectedPath = clickedPath;
        return;
      }
      
      // Clear path selection if clicking elsewhere
      this.selectedPath = null;
    });

    // Double-click to center on area
    this.canvas.addEventListener('dblclick', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - this.viewOffset.x) / this.config.scale;
      const y = (e.clientY - rect.top - this.viewOffset.y) / this.config.scale;
      
      const clickedArea = this.areas.find(area => 
        x >= area.bounds.x && x <= area.bounds.x + area.bounds.width &&
        y >= area.bounds.y && y <= area.bounds.y + area.bounds.height
      );
      
      if (clickedArea) {
        this.centerOnArea(clickedArea.id);
      }
    });
  }

  resize() {
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    this.canvas.style.cursor = 'grab';
    this.render();
  }

  updatePlayers(players: MinimapPlayer[]) {
    this.players.clear();
    players.forEach(player => {
      this.players.set(player.id, player);
    });
    this.render();
  }

  addPlayer(player: MinimapPlayer) {
    this.players.set(player.id, player);
    this.render();
  }

  removePlayer(playerId: string) {
    this.players.delete(playerId);
    this.render();
  }

  updatePlayerAction(playerId: string, action: MinimapPlayer['action']) {
    const player = this.players.get(playerId);
    if (player) {
      player.action = action;
      player.lastSeen = Date.now();
      this.render();
    }
  }

  centerOnArea(areaId: string) {
    const area = this.areas.find(a => a.id === areaId);
    if (!area) return;

    const centerX = area.bounds.x + area.bounds.width / 2;
    const centerY = area.bounds.y + area.bounds.height / 2;
    
    this.viewOffset.x = this.canvas.width / 2 - centerX * this.config.scale;
    this.viewOffset.y = this.canvas.height / 2 - centerY * this.config.scale;
    
    this.render();
  }

  centerOnPlayer(playerId: string) {
    const player = this.players.get(playerId);
    if (!player) return;

    this.viewOffset.x = this.canvas.width / 2 - player.x * this.config.scale;
    this.viewOffset.y = this.canvas.height / 2 - player.y * this.config.scale;
    
    this.render();
  }

  render() {
    const { ctx, canvas, config, areas, players } = this;
    
    // Clear canvas
    ctx.fillStyle = '#1a1511';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(this.viewOffset.x, this.viewOffset.y);
    ctx.scale(config.scale, config.scale);

    // Draw area connections first (behind areas)
    this.drawConnections();
    
    // Draw areas
    this.drawAreas();
    
    // Draw players
    this.drawPlayers();
    
    ctx.restore();
    
    // Draw UI overlay (not affected by transforms)
    this.drawUI();
  }

  private drawConnections() {
    const { ctx } = this;
    
    // Draw road/path base layer first (wider, darker)
    ctx.strokeStyle = 'rgba(139, 140, 121, 0.4)';
    ctx.lineWidth = 8;
    ctx.setLineDash([]);
    
    this.areas.forEach(area => {
      const centerX = area.bounds.x + area.bounds.width / 2;
      const centerY = area.bounds.y + area.bounds.height / 2;
      
      area.connections.forEach(connectionId => {
        const connectedArea = this.areas.find(a => a.id === connectionId);
        if (!connectedArea) return;
        
        const targetX = connectedArea.bounds.x + connectedArea.bounds.width / 2;
        const targetY = connectedArea.bounds.y + connectedArea.bounds.height / 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
      });
    });
    
    // Draw road/path center line (brighter, thinner)
    ctx.strokeStyle = 'rgba(241, 229, 200, 0.8)';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    
    this.areas.forEach(area => {
      const centerX = area.bounds.x + area.bounds.width / 2;
      const centerY = area.bounds.y + area.bounds.height / 2;
      
      area.connections.forEach(connectionId => {
        const connectedArea = this.areas.find(a => a.id === connectionId);
        if (!connectedArea) return;
        
        const targetX = connectedArea.bounds.x + connectedArea.bounds.width / 2;
        const targetY = connectedArea.bounds.y + connectedArea.bounds.height / 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
      });
    });
    
    // Draw travel direction markers (animated dashes)
    const time = Date.now() * 0.001; // Convert to seconds
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);
    ctx.lineDashOffset = (time * 20) % 20; // Animate the dash pattern
    
    this.areas.forEach(area => {
      const centerX = area.bounds.x + area.bounds.width / 2;
      const centerY = area.bounds.y + area.bounds.height / 2;
      
      area.connections.forEach(connectionId => {
        const connectedArea = this.areas.find(a => a.id === connectionId);
        if (!connectedArea) return;
        
        const targetX = connectedArea.bounds.x + connectedArea.bounds.width / 2;
        const targetY = connectedArea.bounds.y + connectedArea.bounds.height / 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
      });
    });
    
    // Highlight selected path
    if (this.selectedPath) {
      const fromArea = this.areas.find(a => a.id === this.selectedPath!.from);
      const toArea = this.areas.find(a => a.id === this.selectedPath!.to);
      
      if (fromArea && toArea) {
        const fromX = fromArea.bounds.x + fromArea.bounds.width / 2;
        const fromY = fromArea.bounds.y + fromArea.bounds.height / 2;
        const toX = toArea.bounds.x + toArea.bounds.width / 2;
        const toY = toArea.bounds.y + toArea.bounds.height / 2;
        
        // Bright highlighted path
        ctx.strokeStyle = 'rgba(255, 215, 0, 1)';
        ctx.lineWidth = 6;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        
        // Pulsing effect
        const pulse = Math.sin(time * 4) * 0.3 + 0.7;
        ctx.strokeStyle = `rgba(255, 255, 255, ${pulse * 0.8})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
      }
    }
    
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }

  private drawAreas() {
    const { ctx } = this;
    
    this.areas.forEach(area => {
      const { x, y, width, height } = area.bounds;
      
      // Area background
      ctx.fillStyle = area.color + '40'; // Add transparency
      ctx.fillRect(x, y, width, height);
      
      // Area border
      ctx.strokeStyle = area.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      
      // Area label
      ctx.fillStyle = '#f1e5c8';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      
      // Background for text
      const textMetrics = ctx.measureText(area.name);
      ctx.fillStyle = 'rgba(26, 21, 17, 0.8)';
      ctx.fillRect(
        centerX - textMetrics.width / 2 - 5,
        centerY - 8,
        textMetrics.width + 10,
        16
      );
      
      // Text
      ctx.fillStyle = '#f1e5c8';
      ctx.fillText(area.name, centerX, centerY);
    });
  }

  private drawPlayers() {
    const { ctx, config } = this;
    const now = Date.now();
    
    this.players.forEach(player => {
      // Fade out inactive players
      const timeSinceLastSeen = now - player.lastSeen;
      const maxInactiveTime = 30000; // 30 seconds
      const alpha = Math.max(0.3, 1 - (timeSinceLastSeen / maxInactiveTime));
      
      // Get area for context
      const area = this.areas.find(a => a.id === player.areaId);
      if (!area) return;
      
      // Player position (relative to area if needed, or absolute world coordinates)
      const playerX = player.x;
      const playerY = player.y;
      
      // Action-based appearance
      const actionColor = ACTION_COLORS[player.action.type];
      const actionIcon = ACTION_ICONS[player.action.type];
      
      // Player dot size based on action intensity
      const baseSize = 6;
      const pulseSize = baseSize + (player.action.intensity * 4);
      
      ctx.save();
      ctx.globalAlpha = alpha;
      
      // Action pulse effect for active players
      if (player.action.intensity > 0.5) {
        const pulse = Math.sin(now * 0.01) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(playerX, playerY, pulseSize * pulse, 0, Math.PI * 2);
        ctx.fillStyle = actionColor + '40';
        ctx.fill();
      }
      
      // Main player dot
      ctx.beginPath();
      ctx.arc(playerX, playerY, baseSize, 0, Math.PI * 2);
      ctx.fillStyle = actionColor;
      ctx.fill();
      
      // Player outline (skin tone or team color)
      ctx.beginPath();
      ctx.arc(playerX, playerY, baseSize, 0, Math.PI * 2);
      ctx.strokeStyle = player.appearance?.primaryColor || '#f1e5c8';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Action indicator
      if (config.showActionIndicators && player.action.type !== 'idle') {
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f1e5c8';
        
        // Background for action icon
        ctx.fillStyle = 'rgba(26, 21, 17, 0.8)';
        ctx.fillRect(playerX - 8, playerY - 20, 16, 12);
        
        ctx.fillStyle = actionColor;
        ctx.fillText(actionIcon, playerX, playerY - 14);
      }
      
      // Player name
      if (config.showPlayerNames) {
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        const textY = playerY + baseSize + 4;
        const textMetrics = ctx.measureText(player.name);
        
        // Background for name
        ctx.fillStyle = 'rgba(26, 21, 17, 0.8)';
        ctx.fillRect(
          playerX - textMetrics.width / 2 - 2,
          textY - 2,
          textMetrics.width + 4,
          12
        );
        
        // Name text
        ctx.fillStyle = '#f1e5c8';
        ctx.fillText(player.name, playerX, textY);
      }
      
      ctx.restore();
    });
  }

  private drawUI() {
    const { ctx, canvas, config } = this;
    
    // Minimap controls
    ctx.fillStyle = 'rgba(26, 21, 17, 0.9)';
    ctx.fillRect(10, 10, 200, 100);
    ctx.strokeStyle = '#533b2c';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 200, 100);
    
    ctx.fillStyle = '#f1e5c8';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    let yOffset = 20;
    ctx.fillText(`Players: ${this.players.size}`, 20, yOffset);
    yOffset += 15;
    ctx.fillText(`Zoom: ${(config.scale * 100).toFixed(0)}%`, 20, yOffset);
    yOffset += 15;
    ctx.fillText('Drag to pan', 20, yOffset);
    yOffset += 15;
    ctx.fillText('Scroll to zoom', 20, yOffset);
    yOffset += 15;
    ctx.fillText('Double-click area to center', 20, yOffset);
    
    // Legend for action colors
    ctx.fillStyle = 'rgba(26, 21, 17, 0.9)';
    ctx.fillRect(canvas.width - 150, 10, 140, 200);
    ctx.strokeStyle = '#533b2c';
    ctx.strokeRect(canvas.width - 150, 10, 140, 200);
    
    ctx.fillStyle = '#f1e5c8';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Actions:', canvas.width - 140, 25);
    
    yOffset = 45;
    Object.entries(ACTION_COLORS).forEach(([action, color]) => {
      // Color dot
      ctx.beginPath();
      ctx.arc(canvas.width - 130, yOffset, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      
      // Action name
      ctx.fillStyle = '#f1e5c8';
      ctx.fillText(action, canvas.width - 120, yOffset - 6);
      
      yOffset += 18;
    });
    
    // Selected path information
    if (this.selectedPath) {
      const fromArea = this.areas.find(a => a.id === this.selectedPath!.from);
      const toArea = this.areas.find(a => a.id === this.selectedPath!.to);
      
      if (fromArea && toArea) {
        // Calculate travel distance and time
        const fromX = fromArea.bounds.x + fromArea.bounds.width / 2;
        const fromY = fromArea.bounds.y + fromArea.bounds.height / 2;
        const toX = toArea.bounds.x + toArea.bounds.width / 2;
        const toY = toArea.bounds.y + toArea.bounds.height / 2;
        const distance = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
        const travelTime = Math.round(distance / 10); // Arbitrary conversion to minutes
        
        // Path info panel
        ctx.fillStyle = 'rgba(26, 21, 17, 0.95)';
        ctx.fillRect(canvas.width - 300, canvas.height - 150, 290, 140);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width - 300, canvas.height - 150, 290, 140);
        
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('🛤️ Selected Route', canvas.width - 290, canvas.height - 130);
        
        ctx.fillStyle = '#f1e5c8';
        ctx.font = '12px monospace';
        
        yOffset = canvas.height - 110;
        ctx.fillText(`From: ${fromArea.name}`, canvas.width - 290, yOffset);
        yOffset += 15;
        ctx.fillText(`To: ${toArea.name}`, canvas.width - 290, yOffset);
        yOffset += 15;
        ctx.fillText(`Distance: ${Math.round(distance)} units`, canvas.width - 290, yOffset);
        yOffset += 15;
        ctx.fillText(`Est. Travel: ${travelTime} minutes`, canvas.width - 290, yOffset);
        yOffset += 15;
        
        // Travel conditions
        const riskLevel = distance > 200 ? 'HIGH' : distance > 150 ? 'MEDIUM' : 'LOW';
        const riskColor = riskLevel === 'HIGH' ? '#d73a49' : riskLevel === 'MEDIUM' ? '#e36209' : '#28a745';
        ctx.fillStyle = riskColor;
        ctx.fillText(`Risk: ${riskLevel}`, canvas.width - 290, yOffset);
        
        ctx.fillStyle = '#9b8c70';
        ctx.font = '10px monospace';
        ctx.fillText('Click elsewhere to deselect', canvas.width - 290, canvas.height - 20);
      }
    }
  }

  updateConfig(newConfig: Partial<MinimapConfig>) {
    Object.assign(this.config, newConfig);
    this.render();
  }

  private startAnimation() {
    const animate = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  destroy() {
    this.stopAnimation();
  }

  private getPathAtPoint(x: number, y: number): { from: string; to: string } | null {
    const threshold = 15; // Click detection threshold

    for (const area of this.areas) {
      const centerX = area.bounds.x + area.bounds.width / 2;
      const centerY = area.bounds.y + area.bounds.height / 2;
      
      for (const connectionId of area.connections) {
        const connectedArea = this.areas.find(a => a.id === connectionId);
        if (!connectedArea) continue;
        
        const targetX = connectedArea.bounds.x + connectedArea.bounds.width / 2;
        const targetY = connectedArea.bounds.y + connectedArea.bounds.height / 2;
        
        // Calculate distance from point to line segment
        const distanceToLine = this.pointToLineDistance(x, y, centerX, centerY, targetX, targetY);
        
        if (distanceToLine < threshold) {
          return { from: area.id, to: connectionId };
        }
      }
    }
    
    return null;
  }

  private pointToLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));

    const xx = x1 + param * C;
    const yy = y1 + param * D;

    const dx = px - xx;
    const dy = py - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  }
}