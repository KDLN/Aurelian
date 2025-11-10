# US-102: Clear Equipment Benefits

**Priority**: P1 - CRITICAL
**Estimated Effort**: 2 hours

## User Story
As a **player**, I want to **understand exactly how equipment improves my agents**, so that **I can make informed purchasing decisions**.

## Problem
Equipment shows "+5% Success" but unclear if that's +5 percentage points (85%→90%) or 5% relative (85%→89.25%).

## Solution

**File**: `apps/web/src/app/agents/page.tsx`

Change tooltips to show absolute values:

```typescript
<HelpTooltip content={`
  Increases mission success rate by ${eq.successBonus} percentage points.
  Example: LOW risk 85% → ${85 + eq.successBonus}%
`} />
```

Show numerical impact:
```typescript
<div className="game-space-between">
  <span>Success Bonus:</span>
  <span className="game-good">
    +{eq.successBonus}% (85% → {85 + eq.successBonus}%)
  </span>
</div>
```

## Testing
- [ ] Tooltips show calculations
- [ ] Examples are accurate
- [ ] Mobile-friendly tooltips
