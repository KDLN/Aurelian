# US-302: Hub Dashboard Enhancements

**Priority**: P3 - MEDIUM
**Estimated Effort**: 3 hours

## Improvements

### 1. Add Quick Action Buttons

**File**: `apps/web/src/app/hub/page.tsx`

```typescript
<div className="game-card">
  <h3>⚡ Quick Actions</h3>
  <div className="game-grid-3">
    <button onClick={() => quickStartMission()} className="game-btn game-btn-primary">
      🎯 Quick Mission
      <div className="game-small">Start best available</div>
    </button>
    <button onClick={() => sellAllCommon()} className="game-btn game-btn-primary">
      💰 Sell Commons
      <div className="game-small">Quick liquidate</div>
    </button>
    <button onClick={() => craftRecommended()} className="game-btn game-btn-primary">
      🔨 Smart Craft
      <div className="game-small">Best profit margin</div>
    </button>
  </div>
</div>
```

### 2. Add Performance Dashboard

```typescript
<div className="game-card">
  <h3>📊 This Week's Performance</h3>
  <div className="game-grid-2">
    <div className="stat-card">
      <div className="stat-value game-good">+{weekStats.goldEarned}g</div>
      <div className="stat-label">Gold Earned</div>
    </div>
    <div className="stat-card">
      <div className="stat-value">{weekStats.missionsCompleted}</div>
      <div className="stat-label">Missions Complete</div>
    </div>
  </div>
</div>
```

### 3. Add Market Opportunities

Show best arbitrage opportunities:

```typescript
<div className="game-card">
  <h3>💡 Market Opportunities</h3>
  <p className="game-small game-muted">Based on current prices</p>

  {opportunities.map(opp => (
    <div className="game-card-nested">
      <h4>{opp.name}</h4>
      <div className="game-space-between">
        <span>Buy raw:</span>
        <span>{opp.rawCost}g</span>
      </div>
      <div className="game-space-between">
        <span>Craft cost:</span>
        <span>{opp.craftTime}min</span>
      </div>
      <div className="game-space-between">
        <span>Sell for:</span>
        <span className="game-good">{opp.sellPrice}g</span>
      </div>
      <div className="game-space-between">
        <strong>Profit:</strong>
        <strong className="game-good">+{opp.profit}g ({opp.margin}%)</strong>
      </div>
      <a href="/crafting" className="game-btn game-btn-small">
        Craft Now →
      </a>
    </div>
  ))}
</div>
```

## Testing
- [ ] Quick actions work correctly
- [ ] Stats are accurate
- [ ] Opportunities calculation correct
- [ ] Links navigate properly
