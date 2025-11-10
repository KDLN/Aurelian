# US-301: Landing Page Improvements

**Priority**: P3 - MEDIUM
**Estimated Effort**: 2 hours

## Improvements

### 1. Add Specific Launch Dates

**File**: `apps/web/src/app/page.tsx`

Replace "COMING SOON" with actual timelines:

```typescript
<div className="feature-status">🚧 POST-MVP: Q2 2025</div>
<h3>🗺️ Hub Travel & Territory Control</h3>
```

### 2. Add Player Count / Activity

```typescript
<div className="stats-bar">
  <div className="stat">
    <span className="stat-number">{playerCount}</span>
    <span className="stat-label">Active Traders</span>
  </div>
  <div className="stat">
    <span className="stat-number">{tradesLastWeek}</span>
    <span className="stat-label">Trades This Week</span>
  </div>
  <div className="stat">
    <span className="stat-number">{totalGold}</span>
    <span className="stat-label">Gold in Economy</span>
  </div>
</div>
```

### 3. Add Screenshots/GIFs

Show actual gameplay:
- Mission completion animation
- Crafting UI
- Auction house bidding
- Guild treasury management

## Testing
- [ ] Stats update correctly
- [ ] Timeline dates are accurate
- [ ] Images load properly
- [ ] Mobile responsive
