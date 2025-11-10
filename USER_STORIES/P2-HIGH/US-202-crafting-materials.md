# US-202: Crafting Material Sources

**Priority**: P2 - HIGH
**Estimated Effort**: 2 hours

## Problem
Players don't know where to get crafting materials.

## Solution
Add "Get Materials" helper to crafting page showing specific missions that drop needed items.

**File**: `apps/web/src/app/crafting/page.tsx`

```typescript
<div className="game-card">
  <h4>📦 Need Materials?</h4>
  <div className="game-flex-col">
    {missingMaterials.map(material => (
      <div key={material.key}>
        <strong>{material.name}</strong> - Need {material.needed}x
        <div className="game-small game-muted">
          Available from missions:
          {getMissionsWithItem(material.key).map(m => (
            <a href="/missions" className="game-link">{m.name}</a>
          ))}
        </div>
        <div className="game-small">
          Or <a href="/auction" className="game-link">buy on auction</a> (~{material.marketPrice}g each)
        </div>
      </div>
    ))}
  </div>
</div>
```
