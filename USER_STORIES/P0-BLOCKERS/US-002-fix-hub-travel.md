# US-002: Fix or Hide Hub Travel System

**Priority**: P0 - BLOCKER
**Estimated Effort**: 2 hours (hide) OR 2 weeks (implement)
**Category**: Core Functionality

## User Story

As a **player**, I want the **hub travel system to either work or be hidden**, so that **I don't get frustrated clicking non-functional buttons**.

## Problem Statement

The hub travel page (`/hub-travel`) has a complete UI with:
- Interactive map showing hubs, roads, and territories
- Buttons: "Take Safe Road", "Forge New Path", "Declare Contest", "Challenge Control"
- Mock data showing guild ownership, trade volumes, taxes
- **ZERO functional onClick handlers**

**Current State**: 100% visual mockup, 0% implementation
**Impact**: Players click buttons → nothing happens → confusion and frustration

## Acceptance Criteria

### Option A: Hide System (Recommended for MVP)
- [ ] Remove "Hub Travel" from all navigation menus
- [ ] Add redirect from `/hub-travel` to `/hub` with message
- [ ] Update landing page to remove hub-related features
- [ ] Add to "Coming Soon" section

### Option B: Complete Implementation (Post-MVP)
- [ ] Connect to real Hub, Link, TrailNode database tables
- [ ] Implement road navigation logic
- [ ] Implement territory contest system
- [ ] Add guild taxation mechanics
- [ ] Create API endpoints for hub actions

## Recommended Approach: Option A (Hide)

Given the complexity of implementing territory control, recommend hiding for MVP and focusing on core trading loop.

## Implementation - Option A: Hide System

### Step 1: Remove from Navigation

**File**: `apps/web/src/components/GameLayout.tsx` (Lines 169-184)

**Before**:
```typescript
const navigation = [
  { href: '/hub', label: 'Hub' },
  { href: '/auction', label: 'Auction' },
  { href: '/hub-travel', label: 'Travel' }, // REMOVE THIS
  // ...
];
```

**After**:
```typescript
const navigation = [
  { href: '/hub', label: 'Hub' },
  { href: '/auction', label: 'Auction' },
  // Travel removed - coming post-MVP
  { href: '/missions', label: 'Missions' },
  // ...
];
```

### Step 2: Add Redirect with Message

**File**: `apps/web/src/app/hub-travel/page.tsx`

**Replace entire file with**:
```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GameLayout from '@/components/GameLayout';

export default function HubTravelRedirect() {
  const router = useRouter();

  return (
    <GameLayout title="Hub Travel - Coming Soon">
      <div className="game-flex-col">
        <div className="game-card">
          <h2>🗺️ Hub Travel System</h2>
          <p className="game-muted" style={{ marginTop: '1rem' }}>
            The hub travel and territory control system is currently under development.
          </p>

          <div className="game-card-nested" style={{ marginTop: '1rem' }}>
            <h3>Planned Features:</h3>
            <ul>
              <li>🛣️ <strong>Road Navigation</strong>: Travel between hubs via safe or risky paths</li>
              <li>⚔️ <strong>Territory Contests</strong>: Guilds can challenge for hub control</li>
              <li>💰 <strong>Trade Taxation</strong>: Controlling guilds earn revenue from trade</li>
              <li>📊 <strong>Economic Strategy</strong>: Optimize trade routes for maximum profit</li>
            </ul>
          </div>

          <p style={{ marginTop: '1rem' }}>
            In the meantime, focus on:
          </p>
          <div className="game-grid-2" style={{ marginTop: '0.5rem', gap: '0.5rem' }}>
            <a href="/missions" className="game-btn game-btn-primary">
              🎯 Run Missions
            </a>
            <a href="/crafting" className="game-btn game-btn-primary">
              🔨 Craft Items
            </a>
            <a href="/auction" className="game-btn game-btn-primary">
              💰 Trade Goods
            </a>
            <a href="/guild" className="game-btn game-btn-primary">
              🏛️ Join Guild
            </a>
          </div>

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <a href="/hub" className="game-btn game-btn-secondary">
              ← Back to Hub
            </a>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
```

### Step 3: Update Landing Page

**File**: `apps/web/src/app/page.tsx` (Lines 496-500)

**Before**:
```typescript
<div className="feature-card coming-soon">
  <div className="feature-status">🚧 COMING SOON</div>
  <h3>🗺️ Rule the Roads</h3>
  <p>Claim trading hubs. Build safer routes. Tax passage or grant free transit. Your roads, your rules.</p>
</div>
```

**After** - Add launch timeline:
```typescript
<div className="feature-card coming-soon">
  <div className="feature-status">🚧 POST-MVP: Q2 2025</div>
  <h3>🗺️ Hub Travel & Territory Control</h3>
  <p>Claim trading hubs. Build safer routes. Tax passage or grant free transit. Your roads, your rules.</p>
  <p className="game-small" style={{ marginTop: '0.5rem', opacity: 0.8 }}>
    Coming after we perfect the core trading experience.
  </p>
</div>
```

### Step 4: Update Help Page

**File**: `apps/web/src/app/help/page.tsx` (Lines 210-214)

Remove references to hub travel being functional:

**Before**:
```typescript
<li><a href="/hub-travel">Hub Travel</a> - Fast travel between major cities</li>
```

**After**:
```typescript
<li><a href="/world-map">🗺️ World Map</a> - Explore the realm (visual reference)</li>
<li><span className="game-muted">Hub Travel - Coming post-MVP</span></li>
```

### Step 5: Remove from Game Links Section

**File**: `apps/web/src/app/page.tsx` (Lines 830-858)

Remove or mark as "Coming Soon" in the tools section.

## Implementation - Option B: Full Implementation

**NOTE**: This is a 2-week project, not recommended for MVP.

### Required Components:

1. **Database Setup**:
   - Hub, Link, TrailNode, TrailSeg tables already exist
   - Need to populate with actual game world data

2. **API Endpoints** (create in `apps/web/src/app/api/hubs/`):
   ```
   POST /api/hubs/travel - Initiate travel between hubs
   GET  /api/hubs/[id] - Get hub details
   POST /api/hubs/[id]/contest - Start territory contest
   GET  /api/hubs/routes - Get available routes
   ```

3. **Real-time Features** (Colyseus):
   - Create `HubTravelRoom` for live caravan positions
   - Create `TerritoryContestRoom` for guild battles

4. **Game Mechanics**:
   - Path-finding algorithm using TrailNode/TrailSeg
   - Risk calculation for dangerous routes
   - Contest resolution system
   - Taxation calculation and distribution

5. **UI Enhancements**:
   - Connect buttons to actual actions
   - Real-time caravan movement on map
   - Guild ownership sync from database
   - Trade volume calculations

**Estimated Effort**: 80-120 hours
**Dependencies**: Game balancing, economy design, guild warfare rules

## Testing Checklist

### Option A (Hide) - Quick Tests:
1. **Navigation**:
   - [ ] "Travel" link removed from sidebar
   - [ ] Direct navigation to `/hub-travel` shows "Coming Soon" page
   - [ ] All redirects work correctly

2. **Landing Page**:
   - [ ] Hub travel marked "Coming Soon" with timeline
   - [ ] No broken links to `/hub-travel`

3. **Help Page**:
   - [ ] Hub travel marked as unavailable
   - [ ] Alternative features suggested

### Option B (Full Implementation) - Comprehensive Tests:
- [ ] Can select start and end hub
- [ ] Can see available routes
- [ ] Risk calculation displays correctly
- [ ] "Take Safe Road" initiates travel
- [ ] Caravan appears in "Active Caravans" section
- [ ] Guild contests can be initiated
- [ ] Territory ownership updates in database
- [ ] Taxes are calculated and distributed

## Migration Strategy

When ready to implement Option B:

1. **Phase 1**: Road navigation (2-3 days)
   - Connect to Hub/Link database tables
   - Implement basic travel mechanics
   - Show real caravan positions

2. **Phase 2**: Territory contests (1 week)
   - Guild challenge system
   - Contest resolution logic
   - Ownership tracking

3. **Phase 3**: Economic integration (3-5 days)
   - Taxation system
   - Trade volume tracking
   - Revenue distribution

## Related Stories

- US-203: Guild benefits explanation (guilds should explain territory benefits)
- US-302: Hub dashboard enhancements (can add territory info later)
- US-304: Guild features polish (integrate territory ownership display)

## Notes

- Keep the existing code in git history for future reference
- Territory control is a great post-MVP feature for player retention
- Consider soft-launching with limited hubs (3-5) before full world map
- Coordinate with guild system to ensure warfare mechanics are balanced

## Decision Required

**Team must decide**: Hide (Option A) or Implement (Option B)?

**Recommendation**: Hide for MVP, implement 2-3 months post-launch after core loop is proven and stable.
