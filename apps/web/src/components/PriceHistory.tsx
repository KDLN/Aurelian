'use client';

import { useState, useEffect } from 'react';

interface PriceTick {
  price: number;
  volume: number;
  high: number;
  low: number;
  trend: 'up' | 'down' | 'stable';
  volatility: number;
  supplyDemandRatio: number;
  priceMultiplier: number;
  at: string;
}

interface PriceAnalytics {
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  avgPrice: number;
  totalVolume: number;
  avgVolume: number;
  volatility: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  support: number;
  resistance: number;
}

interface PriceHistoryData {
  data: PriceTick[];
  analytics: PriceAnalytics;
  period: string;
  itemName: string;
  generatedAt: string;
}

interface PriceHistoryProps {
  itemKey: string;
  itemName?: string;
  period?: '1h' | '6h' | '24h' | '7d' | '30d';
  showChart?: boolean;
  compact?: boolean;
  className?: string;
}

export default function PriceHistory({ 
  itemKey, 
  itemName, 
  period = '24h', 
  showChart = true, 
  compact = false,
  className = ''
}: PriceHistoryProps) {
  const [data, setData] = useState<PriceHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  const fetchPriceHistory = async (fetchPeriod: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/market/price-history?itemKey=${itemKey}&period=${fetchPeriod}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Item not found');
        }
        throw new Error(`Failed to fetch price history: ${response.status}`);
      }
      const historyData = await response.json();
      setData(historyData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price history');
      console.error('Price history fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceHistory(selectedPeriod);
  }, [itemKey, selectedPeriod]);

  const handlePeriodChange = (newPeriod: '1h' | '6h' | '24h' | '7d' | '30d') => {
    setSelectedPeriod(newPeriod);
  };

  const formatPrice = (price: number) => `${price.toLocaleString()}g`;
  
  const formatPercent = (percent: number) => {
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
  };

  const renderSimpleChart = (ticks: PriceTick[]) => {
    if (ticks.length === 0) return null;

    const maxPrice = Math.max(...ticks.map(t => t.high));
    const minPrice = Math.min(...ticks.map(t => t.low));
    const priceRange = maxPrice - minPrice;
    
    if (priceRange === 0) return <div className="game-muted">No price variation</div>;

    return (
      <div className="price-chart" style={{ height: compact ? '60px' : '120px', position: 'relative', border: '1px solid #444', borderRadius: '4px', padding: '8px' }}>
        <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
          {ticks.map((tick, index) => {
            const x = (index / (ticks.length - 1)) * 100;
            const priceY = ((maxPrice - tick.price) / priceRange) * 80 + 10;
            const highY = ((maxPrice - tick.high) / priceRange) * 80 + 10;
            const lowY = ((maxPrice - tick.low) / priceRange) * 80 + 10;
            
            const color = tick.trend === 'up' ? '#4ade80' : tick.trend === 'down' ? '#ef4444' : '#94a3b8';
            
            return (
              <g key={index}>
                {/* High-Low line */}
                <line
                  x1={`${x}%`}
                  y1={`${highY}%`}
                  x2={`${x}%`}
                  y2={`${lowY}%`}
                  stroke="#666"
                  strokeWidth="1"
                />
                {/* Price point */}
                <circle
                  cx={`${x}%`}
                  cy={`${priceY}%`}
                  r="2"
                  fill={color}
                  stroke={color}
                  strokeWidth="1"
                />
                {/* Volume bar (bottom) */}
                <rect
                  x={`${x - 1}%`}
                  y="85%"
                  width="2%"
                  height={`${(tick.volume / Math.max(...ticks.map(t => t.volume))) * 10}%`}
                  fill="#666"
                  opacity="0.6"
                />
              </g>
            );
          })}
          
          {/* Price line */}
          <polyline
            points={ticks.map((tick, index) => {
              const x = (index / (ticks.length - 1)) * 100;
              const y = ((maxPrice - tick.price) / priceRange) * 80 + 10;
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke="#f1e5c8"
            strokeWidth="1.5"
          />
        </svg>
        
        {/* Price labels */}
        <div style={{ position: 'absolute', left: '2px', top: '5px', fontSize: '10px', color: '#888' }}>
          {formatPrice(maxPrice)}
        </div>
        <div style={{ position: 'absolute', left: '2px', bottom: '5px', fontSize: '10px', color: '#888' }}>
          {formatPrice(minPrice)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`game-card ${className}`}>
        {!compact && <h4>Price History - {itemName || itemKey}</h4>}
        <p className="game-muted">Loading price data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`game-card ${className}`}>
        {!compact && <h4>Price History - {itemName || itemKey}</h4>}
        <div className="game-error">
          <p>⚠️ {error || 'Failed to load price data'}</p>
          <button 
            className="game-btn game-btn-small"
            onClick={() => fetchPriceHistory(selectedPeriod)}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { analytics } = data;

  return (
    <div className={`game-card ${className}`}>
      {!compact && (
        <div className="game-space-between" style={{ marginBottom: '12px' }}>
          <h4>Price History - {data.itemName}</h4>
          <div className="game-flex" style={{ gap: '4px' }}>
            {(['1h', '6h', '24h', '7d', '30d'] as const).map(p => (
              <button
                key={p}
                className={`game-btn game-btn-small ${selectedPeriod === p ? 'game-btn-primary' : ''}`}
                onClick={() => handlePeriodChange(p)}
                style={{ fontSize: '10px', padding: '2px 6px' }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Price & Change */}
      <div className="game-flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {formatPrice(analytics.currentPrice)}
          </div>
          <div className={`game-small ${analytics.priceChangePercent > 0 ? 'game-good' : analytics.priceChangePercent < 0 ? 'game-bad' : 'game-muted'}`}>
            {formatPercent(analytics.priceChangePercent)} ({analytics.priceChange > 0 ? '+' : ''}{analytics.priceChange}g)
          </div>
        </div>
        
        {!compact && (
          <div className="game-right">
            <div className="game-small game-muted">Volume: {analytics.totalVolume.toLocaleString()}</div>
            <div className="game-small game-muted">Volatility: {(analytics.volatility * 100).toFixed(1)}%</div>
          </div>
        )}
      </div>

      {/* Price Chart */}
      {showChart && data.data.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          {renderSimpleChart(data.data)}
        </div>
      )}

      {/* Price Stats */}
      {!compact && (
        <div className="game-grid-3">
          <div className="game-stat">
            <div className="game-stat-value">{formatPrice(analytics.highPrice)}</div>
            <div className="game-stat-label">High</div>
          </div>
          <div className="game-stat">
            <div className="game-stat-value">{formatPrice(analytics.lowPrice)}</div>
            <div className="game-stat-label">Low</div>
          </div>
          <div className="game-stat">
            <div className="game-stat-value">{formatPrice(analytics.avgPrice)}</div>
            <div className="game-stat-label">Average</div>
          </div>
        </div>
      )}

      {/* Support/Resistance */}
      {!compact && analytics.support !== analytics.resistance && (
        <div className="game-flex" style={{ marginTop: '8px', gap: '12px', fontSize: '12px' }}>
          <span className="game-muted">Support: {formatPrice(analytics.support)}</span>
          <span className="game-muted">Resistance: {formatPrice(analytics.resistance)}</span>
          <span className={`${analytics.trend === 'bullish' ? 'game-good' : analytics.trend === 'bearish' ? 'game-bad' : 'game-muted'}`}>
            Trend: {analytics.trend}
          </span>
        </div>
      )}

      {data.data.length === 0 && (
        <p className="game-muted">No price data available for this period</p>
      )}
    </div>
  );
}