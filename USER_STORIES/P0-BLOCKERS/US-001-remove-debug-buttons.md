# US-001: Remove Debug Buttons from Player-Facing Pages

**Priority**: P0 - BLOCKER
**Estimated Effort**: 1 hour
**Category**: Security & Game Balance

## User Story

As a **game developer**, I want to **remove all debug buttons from player-facing pages**, so that **players cannot exploit instant mission completion or crafting to break the economy**.

## Problem Statement

Debug buttons are currently visible and functional on production pages:
1. Missions page: "🚀 DEBUG: Speed Up Missions" (sets missions to 2 seconds)
2. Crafting page: "🚀 DEBUG: Start 2s Craft" (instant crafting)
3. Crafting page: "Add Starter Recipes (Debug)" button

**Impact**: Players can cheat by instantly completing missions and crafts, breaking progression and economy.

## Acceptance Criteria

- [ ] Debug speed-up button removed from missions page
- [ ] Debug craft button removed from crafting page
- [ ] "Add Starter Recipes" button removed from crafting page
- [ ] No console warnings about removed functions
- [ ] Normal mission/craft buttons still work correctly
- [ ] Verified in production build (`npm run build`)

## Technical Solution

### Option 1: Complete Removal (Recommended)

Remove debug buttons entirely from production code.

### Option 2: Admin-Only Access

Keep debug features but only show to admin users.

## Files to Modify

1. `apps/web/src/app/missions/page.tsx` (Lines 266-277, 369-409)
2. `apps/web/src/app/crafting/page.tsx` (Lines 337-349, 520-530)

## Implementation

### Step 1: Remove Debug Speed-Up from Missions Page

**File**: `apps/web/src/app/missions/page.tsx`

**Remove Lines 266-277**:
```typescript
// DELETE THIS ENTIRE BLOCK
<button
  onClick={handleDebugSpeedUp}
  className="game-btn game-btn-warning"
  style={{ width: '100%', fontSize: 'var(--font-size-xs)' }}
  disabled={activeMissions.length === 0}
>
  🚀 DEBUG: Speed Up Missions
</button>
<div className="game-muted game-small" style={{ textAlign: 'center', marginTop: '0.25rem' }}>
  Sets active missions to 2s left
</div>
```

**Remove Lines 369-409** (handleDebugSpeedUp function):
```typescript
// DELETE THIS ENTIRE FUNCTION
const handleDebugSpeedUp = async () => {
  // ... entire function body
};
```

### Step 2: Remove Debug Craft from Crafting Page

**File**: `apps/web/src/app/crafting/page.tsx`

**Remove Lines 520-530**:
```typescript
// DELETE THIS ENTIRE BLOCK
<button
  onClick={handleDebugCraft}
  disabled={!selectedBlueprint.isUnlocked || !selectedBlueprint.canCraft || isLoading || selectedBlueprint.maxCraftable === 0}
  className="game-btn game-btn-warning"
  style={{ width: '100%', fontSize: '12px' }}
>
  🚀 DEBUG: Start 2s Craft
</button>
```

**Remove the handleDebugCraft function** (search for it in the file).

### Step 3: Remove Populate Starter Recipes Button

**File**: `apps/web/src/app/crafting/page.tsx`

**Remove Lines 337-349**:
```typescript
// DELETE THIS ENTIRE BLOCK
{blueprints.length === 0 && (
  <button
    onClick={handlePopulateBlueprints}
    disabled={isPopulating}
    className="game-btn game-btn-secondary"
    style={{ marginTop: '12px' }}
  >
    {isPopulating ? '⏳ Populating...' : '📦 Add Starter Recipes (Debug)'}
  </button>
)}
```

**Remove handlePopulateBlueprints function**.

### Step 4: Clean Up Unused State

After removing functions, check for unused state variables:
- `handleDebugSpeedUp` dependencies
- `handleDebugCraft` dependencies
- `isPopulating` state (if only used for debug)

## Alternative: Admin-Only Implementation

If you want to keep debug features for admin testing:

```typescript
// Add to missions/page.tsx
const [isAdmin, setIsAdmin] = useState(false);

useEffect(() => {
  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const adminEmails = ['kdln@live.com']; // Your admin email
    setIsAdmin(adminEmails.includes(session?.user.email || ''));
  };
  checkAdmin();
}, []);

// Wrap debug button in conditional
{isAdmin && (
  <button onClick={handleDebugSpeedUp} className="game-btn game-btn-warning">
    🚀 ADMIN: Speed Up Missions
  </button>
)}
```

## Testing Checklist

1. **Missions Page**:
   - [ ] No debug button visible
   - [ ] "Start Mission" button still works
   - [ ] Mission countdown displays correctly
   - [ ] Mission completion works normally

2. **Crafting Page**:
   - [ ] No debug buttons visible
   - [ ] "Start Craft" button works normally
   - [ ] Crafting timer counts down correctly
   - [ ] Can collect completed crafts

3. **Build Test**:
   ```bash
   npm --prefix apps/web run build
   ```
   - [ ] No TypeScript errors
   - [ ] No unused variable warnings
   - [ ] Production build succeeds

4. **Manual Testing**:
   - [ ] Log in as regular user - no debug buttons
   - [ ] (If admin-only) Log in as admin - debug buttons appear
   - [ ] Complete a mission normally - takes expected time
   - [ ] Craft an item normally - takes expected time

## Rollback Plan

If issues occur after removal:
1. Revert commit with: `git revert <commit-hash>`
2. Debug buttons will be restored
3. Test admin-only approach instead

## Related Stories

- US-102: Equipment tooltips (may use similar admin pattern)
- US-204: Character progression (needs fair testing without debug shortcuts)

## Notes

- Consider adding a proper admin panel instead of inline debug buttons
- Future debug features should use environment variables or admin-only routes
- Document debug features in `DEVELOPMENT.md` for team reference
