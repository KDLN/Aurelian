'use client';

import { useState } from 'react';
import GameLayout from '@/components/GameLayout';
import MarketOverview from '@/components/MarketOverview';
import PriceHistory from '@/components/PriceHistory';
import MarketEvents from '@/components/MarketEvents';

export default function MarketDashboard() {
  const [selectedItem, setSelectedItem] = useState<string>('iron_ore');
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');

  // Available trading items
  const tradingItems = [
    { key: 'iron_ore', name: 'Iron Ore' },
    { key: 'herb', name: 'Herb' },
    { key: 'hide', name: 'Hide' },
    { key: 'pearl', name: 'Pearl' },
    { key: 'relic_fragment', name: 'Relic Fragment' }
  ];

  const sidebar = (
    <div>
      <h3>Market Analysis</h3>
      <p className="game-muted game-small">
        Real-time market data, price trends, and trading insights for all commodities.
      </p>
      
      <h3>Quick Analysis</h3>
      <div className="game-flex-col">
        {tradingItems.map(item => (
          <button
            key={item.key}
            className={`game-btn game-btn-small ${selectedItem === item.key ? 'game-btn-primary' : ''}`}
            onClick={() => setSelectedItem(item.key)}
            style={{ width: '100%', marginBottom: '4px', textAlign: 'left' }}
          >
            {item.name}
          </button>
        ))}
      </div>

      <h3>Time Period</h3>
      <div className="game-flex-col">
        {(['1h', '6h', '24h', '7d', '30d'] as const).map(period => (
          <button
            key={period}
            className={`game-btn game-btn-small ${selectedPeriod === period ? 'game-btn-primary' : ''}`}
            onClick={() => setSelectedPeriod(period)}
            style={{ width: '100%', marginBottom: '4px' }}
          >
            {period}
          </button>
        ))}
      </div>

      <div className="game-small game-muted" style={{ marginTop: '16px' }}>
        💡 <strong>Tip:</strong> Watch for market events that can cause sudden price changes.
      </div>
    </div>
  );

  return (
    <GameLayout 
      title="Market Dashboard" 
      characterActivity="trading" 
      characterLocation="Trading Floor"
      sidebar={sidebar}
    >
      <div className="game-flex-col">
        {/* Market Overview */}
        <MarketOverview showDetailedStats={true} />

        <div className="game-grid-2">
          {/* Price History */}
          <PriceHistory 
            itemKey={selectedItem}
            itemName={tradingItems.find(item => item.key === selectedItem)?.name}
            period={selectedPeriod}
            showChart={true}
            compact={false}
          />

          {/* Market Events */}
          <MarketEvents 
            showOnlyActive={true}
            maxEvents={8}
            compact={false}
          />
        </div>

        {/* Detailed Analytics Cards */}
        <div className="game-grid-3">
          {/* Top Movers */}
          <div className="game-card">
            <h4>Top Movers (24h)</h4>
            <div className="game-small game-muted">Most volatile items today</div>
            <div style={{ marginTop: '8px' }}>
              {tradingItems.map(item => (
                <PriceHistory
                  key={item.key}
                  itemKey={item.key}
                  itemName={item.name}
                  period="24h"
                  showChart={false}
                  compact={true}
                  className="compact-price-card"
                />
              ))}
            </div>
          </div>

          {/* Trading Opportunities */}
          <div className="game-card">
            <h4>Trading Signals</h4>
            <div className="game-small game-muted">Algorithmic buy/sell recommendations</div>
            <div style={{ marginTop: '12px' }}>
              <div className="game-alert game-alert-good">
                <strong>📈 BUY:</strong> Iron Ore<br/>
                <span className="game-small">Price near support level</span>
              </div>
              <div className="game-alert game-alert-warn" style={{ marginTop: '8px' }}>
                <strong>⚠️ HOLD:</strong> Herb<br/>
                <span className="game-small">High volatility detected</span>
              </div>
              <div className="game-alert game-alert-bad" style={{ marginTop: '8px' }}>
                <strong>📉 SELL:</strong> Pearl<br/>
                <span className="game-small">Price near resistance</span>
              </div>
            </div>
          </div>

          {/* Market Health */}
          <div className="game-card">
            <h4>Market Health</h4>
            <div className="game-small game-muted">Overall market indicators</div>
            <div style={{ marginTop: '12px' }}>
              <div className="game-space-between">
                <span>Liquidity:</span>
                <span className="game-good">High</span>
              </div>
              <div className="game-space-between">
                <span>Volatility:</span>
                <span className="game-warn">Medium</span>
              </div>
              <div className="game-space-between">
                <span>Activity:</span>
                <span className="game-good">Active</span>
              </div>
              <div className="game-space-between">
                <span>Sentiment:</span>
                <span className="game-muted">Neutral</span>
              </div>
            </div>
            
            <div className="game-small game-muted" style={{ marginTop: '12px', padding: '8px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
              📊 Market conditions are stable with moderate trading activity. Good time for strategic positioning.
            </div>
          </div>
        </div>

        {/* Market Disclaimer */}
        <div className="game-card game-muted" style={{ textAlign: 'center', padding: '12px' }}>
          <div className="game-small">
            ⚠️ <strong>Disclaimer:</strong> Market analysis is for informational purposes only. 
            Trading involves risk. Past performance doesn't guarantee future results.
          </div>
        </div>
      </div>
    </GameLayout>
  );
}