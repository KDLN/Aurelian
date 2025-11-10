# US-103: Resource Flow Explanation

**Priority**: P1 - CRITICAL
**Estimated Effort**: 3 hours

## User Story
As a **player**, I want to **understand where materials come from and where they go**, so that **I can plan my resource management strategy**.

## Solution

Add tooltips throughout the app:

### 1. Missions Page
Show which missions give which materials:

```typescript
{mission.itemRewards && mission.itemRewards.length > 0 && (
  <div className="game-small" style={{ marginTop: '0.5rem' }}>
    <strong>Rewards:</strong> {mission.baseReward}g +
    {mission.itemRewards.map(r => `${r.qty}x ${r.itemName}`).join(', ')}
  </div>
)}
```

### 2. Crafting Page
Show material acquisition methods:

```typescript
<HelpTooltip content={`
  Get ${material.itemName} from:
  • Missions (easiest)
  • Auction House (buy from players)
  • Guild Warehouse (if in guild)

  Current market price: ~${material.marketPrice || 15}g
`} />
```

### 3. Warehouse Page
Add "Where can I use this?" tooltips:

```typescript
<HelpTooltip content={`
  Uses for ${item.name}:
  • Craft ${item.usedInRecipes.join(', ')}
  • Sell on auction (~${item.marketPrice}g)
  • Contribute to server missions
`} />
```

## Testing
- [ ] All tooltips display correctly
- [ ] Information is accurate
- [ ] Helpful for new players
