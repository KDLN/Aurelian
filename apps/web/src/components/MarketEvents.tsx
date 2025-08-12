'use client';

import { useState, useEffect } from 'react';

interface MarketEvent {
  id: string;
  type: 'shortage' | 'surplus' | 'discovery' | 'disruption';
  severity: 'low' | 'medium' | 'high';
  description: string;
  priceMultiplier: number;
  isActive: boolean;
  startedAt: string;
  endsAt: string | null;
  timeRemaining: number | null; // in minutes
  duration: number | null; // in minutes
  item: {
    id: string;
    key: string;
    name: string;
    rarity: string;
  } | null;
  hub: {
    id: string;
    key: string;
    name: string;
  } | null;
  scope: 'item' | 'hub' | 'global';
}

interface MarketEventSummary {
  [eventType: string]: {
    total: number;
    active: number;
    expired: number;
    avgMultiplier: number;
  };
}

interface MarketImpact {
  totalActiveEvents: number;
  affectedItems: number;
  affectedHubs: number;
  globalEvents: number;
  priceIncreasing: number;
  priceDecreasing: number;
  strongEvents: number;
}

interface MarketEventsData {
  events: MarketEvent[];
  summary: MarketEventSummary;
  marketImpact: MarketImpact;
  generatedAt: string;
}

interface MarketEventsProps {
  showOnlyActive?: boolean;
  maxEvents?: number;
  compact?: boolean;
  className?: string;
}

export default function MarketEvents({ 
  showOnlyActive = true, 
  maxEvents = 10, 
  compact = false,
  className = ''
}: MarketEventsProps) {
  const [data, setData] = useState<MarketEventsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketEvents = async () => {
    try {
      const params = new URLSearchParams();
      if (showOnlyActive) params.set('active', 'true');
      params.set('limit', maxEvents.toString());
      
      const response = await fetch(`/api/market/events?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch market events: ${response.status}`);
      }
      const eventsData = await response.json();
      setData(eventsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market events');
      console.error('Market events fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketEvents();
    
    // Auto-refresh every minute
    const interval = setInterval(fetchMarketEvents, 60000);
    
    return () => clearInterval(interval);
  }, [showOnlyActive, maxEvents]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'shortage': return '📉';
      case 'surplus': return '📈';
      case 'discovery': return '💎';
      case 'disruption': return '⚡';
      default: return '📊';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'game-bad';
      case 'medium': return 'game-warn';
      default: return 'game-muted';
    }
  };

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier > 1.1) return 'game-bad';
    if (multiplier < 0.9) return 'game-good';
    return 'game-muted';
  };

  const formatTimeRemaining = (minutes: number | null) => {
    if (!minutes) return 'Indefinite';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatMultiplier = (multiplier: number) => {
    const percent = ((multiplier - 1) * 100);
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(0)}%`;
  };

  if (loading) {
    return (
      <div className={`game-card ${className}`}>
        {!compact && <h3>Market Events</h3>}
        <p className="game-muted">Loading market events...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`game-card ${className}`}>
        {!compact && <h3>Market Events</h3>}
        <div className="game-error">
          <p>⚠️ {error || 'Failed to load market events'}</p>
          <button 
            className="game-btn game-btn-small"
            onClick={fetchMarketEvents}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (data.events.length === 0) {
    return (
      <div className={`game-card ${className}`}>
        {!compact && <h3>Market Events</h3>}
        <p className="game-muted">
          {showOnlyActive ? 'No active market events' : 'No market events found'}
        </p>
      </div>
    );
  }

  return (
    <div className={`game-card ${className}`}>
      {!compact && (
        <div className="game-space-between" style={{ alignItems: 'center', marginBottom: '12px' }}>
          <h3>Market Events</h3>
          <span className="game-pill game-pill-warn" style={{ fontSize: '12px' }}>
            {data.marketImpact.totalActiveEvents} Active
          </span>
        </div>
      )}

      {/* Market Impact Summary */}
      {!compact && data.marketImpact.totalActiveEvents > 0 && (
        <div className="game-grid-3" style={{ marginBottom: '16px' }}>
          <div className="game-stat">
            <div className="game-stat-value">{data.marketImpact.affectedItems}</div>
            <div className="game-stat-label">Items Affected</div>
          </div>
          <div className="game-stat">
            <div className="game-stat-value">{data.marketImpact.priceIncreasing}</div>
            <div className="game-stat-label">Price Increasing</div>
          </div>
          <div className="game-stat">
            <div className="game-stat-value">{data.marketImpact.strongEvents}</div>
            <div className="game-stat-label">High Impact</div>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="game-events-list">
        {data.events.map(event => (
          <div 
            key={event.id} 
            className={`game-event ${getSeverityColor(event.severity)}`}
            style={{
              padding: '8px',
              marginBottom: '8px',
              border: '1px solid #444',
              borderRadius: '4px',
              backgroundColor: event.isActive ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.01)'
            }}
          >
            <div className="game-flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="game-flex" style={{ alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>{getEventIcon(event.type)}</span>
                <div>
                  <div className="game-flex" style={{ alignItems: 'center', gap: '6px' }}>
                    <strong>{event.type.charAt(0).toUpperCase() + event.type.slice(1)}</strong>
                    <span className={`game-pill ${getSeverityColor(event.severity)}`} style={{ fontSize: '10px' }}>
                      {event.severity.toUpperCase()}
                    </span>
                    {event.scope === 'global' && (
                      <span className="game-pill game-pill-warn" style={{ fontSize: '10px' }}>
                        GLOBAL
                      </span>
                    )}
                  </div>
                  <div className="game-small game-muted">
                    {event.description}
                  </div>
                  {event.item && (
                    <div className="game-small">
                      Affects: <span className="game-good">{event.item.name}</span>
                    </div>
                  )}
                  {event.hub && (
                    <div className="game-small">
                      Location: <span className="game-good">{event.hub.name}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="game-right">
                <div className={`game-small ${getMultiplierColor(event.priceMultiplier)}`}>
                  {formatMultiplier(event.priceMultiplier)} price
                </div>
                {event.isActive && event.timeRemaining && (
                  <div className="game-small game-muted">
                    {formatTimeRemaining(event.timeRemaining)} left
                  </div>
                )}
                {!event.isActive && (
                  <div className="game-small game-muted">Expired</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Event Type Summary */}
      {!compact && Object.keys(data.summary).length > 0 && (
        <div className="game-small game-muted" style={{ marginTop: '12px' }}>
          <strong>Event Summary:</strong>{' '}
          {Object.entries(data.summary).map(([type, stats], index) => (
            <span key={type}>
              {index > 0 && ' • '}
              {type}: {stats.active} active, {stats.expired} expired
            </span>
          ))}
        </div>
      )}
    </div>
  );
}