'use client';

import { useState, useEffect } from 'react';

interface MarketSummaryItem {
  itemId: string;
  itemKey: string;
  itemName: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  trend: 'up' | 'down' | 'stable';
  volatility: number;
  volume24h: number;
  volume1h: number;
  activeListings: number;
  totalSupply: number;
  recentSales: number;
  activityLevel: 'low' | 'medium' | 'high';
  lastUpdated: string | null;
}

interface MarketStats {
  totalItems: number;
  totalActiveListings: number;
  totalSupply: number;
  totalVolume24h: number;
  averageVolatility: number;
  itemsRising: number;
  itemsFalling: number;
  itemsStable: number;
}

interface MarketData {
  summary: MarketSummaryItem[];
  marketStats: MarketStats;
  generatedAt: string;
}

interface MarketOverviewProps {
  className?: string;
  showDetailedStats?: boolean;
}

export default function MarketOverview({ className = '', showDetailedStats = true }: MarketOverviewProps) {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMarketData = async () => {
    try {
      const response = await fetch('/api/market/summary');
      if (!response.ok) {
        throw new Error(`Failed to fetch market data: ${response.status}`);
      }
      const data = await response.json();
      setMarketData(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
      console.error('Market data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMarketData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number | undefined | null) => `${(price || 0).toLocaleString()}g`;
  
  const formatPercent = (percent: number | undefined | null) => {
    const value = percent || 0;
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getActivityColor = (activity: string) => {
    switch (activity) {
      case 'high': return 'game-good';
      case 'medium': return 'game-warn';
      default: return 'game-muted';
    }
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 2) return 'game-good';
    if (change < -2) return 'game-bad';
    return 'game-muted';
  };

  if (loading) {
    return (
      <div className={`game-card ${className}`}>
        <h3>Market Overview</h3>
        <p className="game-muted">Loading market data...</p>
      </div>
    );
  }

  if (error || !marketData) {
    return (
      <div className={`game-card ${className}`}>
        <h3>Market Overview</h3>
        <div className="game-error">
          <p>⚠️ {error || 'Failed to load market data'}</p>
          <button 
            className="game-btn game-btn-small"
            onClick={fetchMarketData}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`game-card ${className}`}>
      <div className="game-space-between" style={{ alignItems: 'center', marginBottom: '12px' }}>
        <h3>Market Overview</h3>
        <div className="game-flex" style={{ alignItems: 'center', gap: '8px' }}>
          <span className="game-small game-muted">
            Updated {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
          </span>
          <button 
            className="game-btn game-btn-small"
            onClick={fetchMarketData}
            title="Refresh market data"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Market Statistics */}
      {showDetailedStats && (
        <div className="game-grid-3" style={{ marginBottom: '16px' }}>
          <div className="game-stat">
            <div className="game-stat-value">{marketData.marketStats.totalActiveListings}</div>
            <div className="game-stat-label">Active Listings</div>
          </div>
          <div className="game-stat">
            <div className="game-stat-value">{formatPrice(marketData.marketStats.totalVolume24h)}</div>
            <div className="game-stat-label">24h Volume</div>
          </div>
          <div className="game-stat">
            <div className="game-stat-value">{marketData.marketStats.averageVolatility.toFixed(2)}%</div>
            <div className="game-stat-label">Avg Volatility</div>
          </div>
        </div>
      )}

      {/* Market Sentiment */}
      <div className="game-flex" style={{ marginBottom: '16px', gap: '12px' }}>
        <div className="game-pill game-pill-good" style={{ fontSize: '12px' }}>
          📈 {marketData.marketStats.itemsRising} Rising
        </div>
        <div className="game-pill game-pill-bad" style={{ fontSize: '12px' }}>
          📉 {marketData.marketStats.itemsFalling} Falling
        </div>
        <div className="game-pill" style={{ fontSize: '12px' }}>
          ➡️ {marketData.marketStats.itemsStable} Stable
        </div>
      </div>

      {/* Item List */}
      <div className="game-table-container">
        <table className="game-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Price</th>
              <th>24h Change</th>
              <th>Volume</th>
              <th>Activity</th>
            </tr>
          </thead>
          <tbody>
            {marketData.summary.map(item => (
              <tr key={item.itemId}>
                <td>
                  <div className="game-flex" style={{ alignItems: 'center', gap: '6px' }}>
                    {getTrendIcon(item.trend)}
                    <span>{item.itemName}</span>
                  </div>
                </td>
                <td className="game-right">
                  {formatPrice(item.currentPrice)}
                </td>
                <td className={`game-right ${getPriceChangeColor(item.priceChangePercent)}`}>
                  {formatPercent(item.priceChangePercent)}
                </td>
                <td className="game-right">
                  {(item.volume24h || 0).toLocaleString()}
                </td>
                <td className={getActivityColor(item.activityLevel)}>
                  <div className="game-center">
                    {item.activityLevel.toUpperCase()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetailedStats && (
        <div className="game-small game-muted" style={{ marginTop: '12px', textAlign: 'center' }}>
          Market data updates every minute • 
          <span className={marketData.marketStats.totalActiveListings > 10 ? 'game-good' : 'game-warn'}>
            {' '}{marketData.marketStats.totalActiveListings > 10 ? 'Active' : 'Quiet'} market
          </span>
        </div>
      )}
    </div>
  );
}