# US-205: Starter Package Automation

**Priority**: P2 - HIGH
**Estimated Effort**: 3 hours

## Problem
New users must manually click "Populate Starter Inventory" button.

## Solution
Automatically grant starter package on account creation.

### Implementation

**File**: `apps/web/src/lib/auth/auto-sync.ts`

Update `ensureUserExistsOptimized` to call starter package:

```typescript
import { createStarterPackage, hasStarterPackage } from '@/lib/services/userOnboarding';

export async function ensureUserExistsOptimized(authUser: any) {
  // ... existing user creation logic ...

  // Check if needs starter package
  const hasStarter = await hasStarterPackage(authUser.id, prisma);

  if (!hasStarter) {
    await createStarterPackage(authUser.id, prisma);
    console.log(`✅ Granted starter package to user ${authUser.id}`);
  }

  return dbUser;
}
```

### Remove Manual Button

**File**: `apps/web/src/app/warehouse/page.tsx`

Remove "Populate Starter Inventory" button since it's automatic now.

### Add Welcome Message

Show one-time welcome message:

```typescript
{isFirstLogin && (
  <div className="game-card" style={{ background: '#2a4a2a' }}>
    <h3>🎉 Welcome to Aurelian!</h3>
    <p>You've been granted:</p>
    <ul>
      <li>2000 gold</li>
      <li>Starter materials (iron ore, herbs, hides)</li>
      <li>Basic equipment</li>
      <li>Unlocked starter recipes</li>
    </ul>
    <button onClick={() => setIsFirstLogin(false)} className="game-btn game-btn-primary">
      Let's Get Started!
    </button>
  </div>
)}
```

## Testing
- [ ] New accounts get starter package automatically
- [ ] Existing accounts unaffected
- [ ] Manual button removed
- [ ] Welcome message shows once
