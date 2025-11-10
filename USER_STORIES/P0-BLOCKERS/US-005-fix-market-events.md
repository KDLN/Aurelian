# US-005: Fix Market Events System

**Priority**: P0 - BLOCKER
**Estimated Effort**: 4 hours (remove) OR 2 days (implement)
**Category**: Trading Features

## User Story

As a **player**, I want **market signals to be accurate**, so that **I can trust the market intelligence system for trading decisions**.

## Problem Statement

Market events show fake signals:
- "🔥 HOT: Buy Iron Ore" - not based on real data
- "❄️ COLD: Sell Pearl" - static mock data
- Database has `MarketEvent` table with `priceMultiplier` but not connected

**Impact**: Players make trading decisions on false information.

## Solution: Option A (Recommended) - Remove for MVP

**File**: `apps/web/src/app/market/page.tsx`

Remove lines 82-127 (MarketEvents component).

Replace with:
```typescript
<div className="game-card">
  <h3>💡 Market Intelligence</h3>
  <p className="game-muted">
    Track price trends and volume to identify trading opportunities.
    Market events system coming post-MVP.
  </p>
</div>
```

## Solution: Option B - Implement Real System

1. Create event generation service
2. Connect events to actual price multipliers
3. Generate events based on supply/demand
4. Update auction prices based on active events

**Effort**: 2-3 days, not recommended for MVP.

## Implementation (Option A)

```typescript
// apps/web/src/app/market/page.tsx

// REMOVE:
{activeEvents.length > 0 && (
  <MarketEvents events={activeEvents} />
)}

// REPLACE WITH:
<div className="game-card">
  <div className="game-space-between">
    <h3>📊 Market Analysis</h3>
    <span className="game-pill game-pill-muted">Coming Soon</span>
  </div>
  <p className="game-muted">
    Advanced market events and price signals will be available post-MVP.
    For now, use price history and volume trends to guide your trades.
  </p>
</div>
```

## Testing

- [ ] Market page loads without events
- [ ] No console errors
- [ ] Help text displays correctly
- [ ] Other market features still work

## Timeline

**MVP**: Remove (1 hour)
**Post-MVP**: Implement properly (2-3 days)
