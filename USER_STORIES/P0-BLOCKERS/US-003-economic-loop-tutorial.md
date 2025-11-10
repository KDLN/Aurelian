# US-003: Add Economic Loop Tutorial

**Priority**: P0 - BLOCKER
**Estimated Effort**: 1 day
**Category**: Player Onboarding

## User Story

As a **new player**, I want to **understand how missions, crafting, and trading connect**, so that **I can make strategic decisions about how to earn gold and progress**.

## Problem Statement

Players currently have access to multiple systems but no explanation of how they work together:
- Missions give gold and items
- Crafting uses items to make new items
- Auction house allows trading
- **BUT**: Players don't understand the economic loop

**Current Confusion**:
- "Where do I get crafting materials?"
- "Should I sell raw materials or craft them first?"
- "Why trade when missions give gold directly?"
- "What's the optimal path to wealth?"

## Acceptance Criteria

- [ ] New tutorial explaining economic loop in 3-5 steps
- [ ] Visual diagram showing: Missions → Materials → Crafting → Selling → Gold
- [ ] Help page section dedicated to economy
- [ ] In-game tooltips explaining material sources
- [ ] Example calculations showing profit margins
- [ ] "Economic Strategy" guide accessible from hub

## Economic Loop Design

### Core Loop (MVP):

```
1. EARN: Run missions → Get gold + materials
2. DECIDE: Sell materials raw OR craft into products
3. CRAFT: Use materials → Create higher-value items
4. SELL: Auction crafted goods → More gold than raw materials
5. REINVEST: Use gold to hire agents, buy equipment, expand
```

### Example Flow:

```
Mission Reward: 100g + 10 iron_ore

Option A (Quick Cash):
→ Sell 10 iron_ore @ 15g each = 150g total
→ Net profit: 250g (100g + 150g)

Option B (Crafting):
→ Use 10 iron_ore to craft 2 iron_ingots (5 ore each)
→ Sell 2 ingots @ 100g each = 200g
→ Net profit: 300g (100g + 200g)
→ Extra profit: 50g (but requires 30min crafting time)

Trade-off: Time vs. Profit
```

## Implementation

### Step 1: Create Economy Tutorial Component

**New File**: `apps/web/src/components/EconomyTutorial.tsx`

```typescript
'use client';

import { useState } from 'react';
import HelpTooltip from './HelpTooltip';

interface EconomyStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  example?: string;
  tips?: string[];
}

const ECONOMY_STEPS: EconomyStep[] = [
  {
    id: 'missions',
    title: 'Run Missions for Resources',
    icon: '🎯',
    description: 'Missions reward both gold and raw materials (iron ore, herbs, hides). Higher-risk missions give better rewards.',
    example: 'LOW risk mission: 100g + 5 iron ore\nMEDIUM risk: 200g + 10 iron ore\nHIGH risk: 400g + 20 iron ore',
    tips: [
      'Start with LOW risk to build up your stockpile',
      'Equip agents to improve success rates',
      'Materials from missions are FREE - pure profit'
    ]
  },
  {
    id: 'decide',
    title: 'Sell Raw or Craft?',
    icon: '⚖️',
    description: 'You can sell raw materials immediately for quick gold, or invest time crafting them into more valuable products.',
    example: '10 iron ore (raw): Sells for ~150g\n10 iron ore (crafted): Makes 2 ingots worth ~200g\nProfit difference: +50g (but takes 30 minutes)',
    tips: [
      'Check market prices before deciding',
      'Crafting takes time but increases value',
      'Rare materials (pearls, relics) often better to craft'
    ]
  },
  {
    id: 'craft',
    title: 'Craft Higher-Value Items',
    icon: '🔨',
    description: 'Use raw materials in crafting recipes to create products worth more than the sum of their parts.',
    example: 'Recipe: Iron Ingot\nInput: 5 iron ore (75g value)\nOutput: 1 iron ingot (100g value)\nTime: 15 minutes\nProfit: +25g per craft',
    tips: [
      'Unlock recipes by crafting basic items',
      'Higher-level recipes = better profit margins',
      'Queue multiple crafts before logging off'
    ]
  },
  {
    id: 'sell',
    title: 'Sell on Auction House',
    icon: '💰',
    description: 'List your crafted goods on the auction house. Price competitively to sell quickly, or higher for maximum profit.',
    example: 'Iron Ingot market analysis:\nAverage price: 100g\nYour cost: 75g (5 ore @ 15g each)\nNet profit: 25g per ingot (33% margin)',
    tips: [
      'Check current listings before pricing',
      'Shorter listings = lower fees',
      'Undercut competitors by 5-10% for fast sales'
    ]
  },
  {
    id: 'reinvest',
    title: 'Reinvest to Scale Up',
    icon: '📈',
    description: 'Use your gold to hire more agents, upgrade equipment, and run more missions simultaneously.',
    example: 'Growth strategy:\n1. Hire 2nd agent (1000g) → 2x mission capacity\n2. Buy equipment (500g) → Higher success rates\n3. Run better missions → More materials\n4. Craft more → Higher profits',
    tips: [
      'More agents = more missions = more materials',
      'Better equipment = higher mission success',
      'Join guild for shared resources and missions'
    ]
  }
];

export default function EconomyTutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const step = ECONOMY_STEPS[currentStep];

  if (!isExpanded) {
    return (
      <div className="game-card" style={{ cursor: 'pointer' }} onClick={() => setIsExpanded(true)}>
        <div className="game-space-between">
          <div>
            <h4>💡 How the Economy Works</h4>
            <p className="game-small game-muted">Click to learn how to maximize your profits</p>
          </div>
          <span style={{ fontSize: '24px' }}>▶️</span>
        </div>
      </div>
    );
  }

  return (
    <div className="game-card">
      <div className="game-space-between" style={{ marginBottom: '1rem' }}>
        <h3>💡 Economic Loop Tutorial</h3>
        <button onClick={() => setIsExpanded(false)} className="game-btn game-btn-small">
          ✕
        </button>
      </div>

      {/* Progress indicators */}
      <div className="game-flex" style={{ gap: '0.5rem', marginBottom: '1rem', justifyContent: 'center' }}>
        {ECONOMY_STEPS.map((s, idx) => (
          <div
            key={s.id}
            onClick={() => setCurrentStep(idx)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: idx === currentStep ? '2px solid #d4af37' : '1px solid #533b2c',
              background: idx === currentStep ? '#533b2c' : '#1a1511',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            {s.icon}
          </div>
        ))}
      </div>

      {/* Current step content */}
      <div className="game-card-nested">
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '32px' }}>{step.icon}</span>
          <span>Step {currentStep + 1}: {step.title}</span>
        </h4>

        <p style={{ marginTop: '1rem' }}>{step.description}</p>

        {step.example && (
          <div className="game-card-nested" style={{ marginTop: '1rem', background: '#1a1511' }}>
            <h5>Example:</h5>
            <pre style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              color: '#f1e5c8',
              margin: '0.5rem 0 0 0'
            }}>
              {step.example}
            </pre>
          </div>
        )}

        {step.tips && step.tips.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h5>💡 Tips:</h5>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
              {step.tips.map((tip, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="game-flex" style={{ gap: '0.5rem', marginTop: '1rem' }}>
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="game-btn"
        >
          ← Previous
        </button>
        <button
          onClick={() => setCurrentStep(Math.min(ECONOMY_STEPS.length - 1, currentStep + 1))}
          disabled={currentStep === ECONOMY_STEPS.length - 1}
          className="game-btn game-btn-primary"
          style={{ flex: 1 }}
        >
          {currentStep === ECONOMY_STEPS.length - 1 ? 'Got it!' : 'Next →'}
        </button>
      </div>

      {/* Quick links */}
      <div className="game-grid-3" style={{ marginTop: '1rem', gap: '0.5rem' }}>
        <a href="/missions" className="game-btn game-btn-small">🎯 Missions</a>
        <a href="/crafting" className="game-btn game-btn-small">🔨 Crafting</a>
        <a href="/auction" className="game-btn game-btn-small">💰 Auction</a>
      </div>
    </div>
  );
}
```

### Step 2: Add to Hub Dashboard

**File**: `apps/web/src/app/hub/page.tsx`

Add after the welcome card (around line 225):

```typescript
import EconomyTutorial from '@/components/EconomyTutorial';

// ... inside the component render:

<div className="game-flex-col">
  {/* Existing welcome card */}
  <div className="game-card">
    {/* ... existing content ... */}
  </div>

  {/* NEW: Add economy tutorial */}
  <EconomyTutorial />

  {/* Rest of the dashboard */}
  <div className="game-grid-2">
    {/* ... existing cards ... */}
  </div>
</div>
```

### Step 3: Add to Help Page

**File**: `apps/web/src/app/help/page.tsx`

Add new section in `helpSections` object (around line 40):

```typescript
'economy': {
  title: 'Economy & Profit',
  icon: '💰',
  content: (
    <div>
      <h4>Understanding the Economic Loop</h4>
      <p>Aurelian's economy revolves around a simple but strategic loop:</p>

      <div className="game-card-nested" style={{ margin: '1rem 0' }}>
        <h5>The Core Loop:</h5>
        <ol>
          <li><strong>Missions</strong> → Earn gold + raw materials</li>
          <li><strong>Decision</strong> → Sell raw or craft?</li>
          <li><strong>Crafting</strong> → Transform into higher value</li>
          <li><strong>Trading</strong> → Sell for profit</li>
          <li><strong>Reinvest</strong> → Scale up operations</li>
        </ol>
      </div>

      <h5>Material Sources:</h5>
      <ul>
        <li><strong>Missions</strong>: Primary source of all materials</li>
        <li><strong>Auction House</strong>: Buy from other players</li>
        <li><strong>Guild Warehouse</strong>: Shared resources (if in guild)</li>
      </ul>

      <h5>Profit Strategy:</h5>
      <ul>
        <li>📊 Check <a href="/market">Market Dashboard</a> for current prices</li>
        <li>🔨 Craft when profit margin > 30%</li>
        <li>💰 Sell raw materials when prices spike</li>
        <li>⚖️ Balance quick cash (selling raw) vs. long-term profit (crafting)</li>
      </ul>

      <h5>Example Profit Calculation:</h5>
      <div className="game-card-nested" style={{ background: '#1a1511' }}>
        <pre style={{ fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
{`Mission Reward: 100g + 10 iron ore

Option A (Sell Raw):
  10 iron ore × 15g = 150g
  Total: 250g
  Time: Instant

Option B (Craft):
  10 iron ore → 2 iron ingots (5 ore each)
  2 ingots × 100g = 200g
  Total: 300g
  Time: 30 minutes
  Extra profit: +50g (20% more)

Best choice: Craft if you can wait, sell if you need gold now`}
        </pre>
      </div>

      <h5>Scaling Up:</h5>
      <ul>
        <li>Hire multiple agents → Run missions in parallel</li>
        <li>Upgrade equipment → Higher success rates</li>
        <li>Join guild → Access shared resources and missions</li>
        <li>Unlock advanced recipes → Higher profit margins</li>
      </ul>
    </div>
  )
}
```

Update the navigation to include 'economy':

```typescript
const helpSections: Record<HelpSectionKey, ...> = {
  'getting-started': { ... },
  'economy': { ... }, // NEW
  'trading': { ... },
  // ... rest
};
```

### Step 4: Add Material Source Tooltips

**File**: `apps/web/src/app/crafting/page.tsx`

Add tooltip next to material requirements (around line 450):

```typescript
<div className="game-space-between">
  <span>
    {material.itemName}
    <HelpTooltip
      content={`Get from missions or buy from auction house. Current market price: ~${material.marketPrice || 15}g`}
      position="top"
    />
  </span>
  <span className={material.have >= material.need ? 'game-good' : 'game-bad'}>
    {material.have} / {material.need}
  </span>
</div>
```

### Step 5: Add Economy Guide Link to Navigation

**File**: `apps/web/src/components/GameLayout.tsx`

Add to Quick Stats section (around line 336):

```typescript
<div>
  <div className="game-flex" style={{ alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
    <h3>Quick Stats</h3>
    <HelpTooltip
      content="Overview of your current activities. Click items for quick navigation."
      position="right"
    />
  </div>

  {/* NEW: Add economy guide link */}
  <a
    href="/help?section=economy"
    className="game-btn game-btn-small game-btn-secondary"
    style={{ width: '100%', marginBottom: '0.5rem', textAlign: 'center' }}
  >
    💡 Economy Guide
  </a>

  <div className="game-flex-col">
    {/* ... existing quick stats ... */}
  </div>
</div>
```

## Testing Checklist

1. **Hub Dashboard**:
   - [ ] Economy tutorial appears on hub page
   - [ ] Can expand/collapse tutorial
   - [ ] Can navigate between 5 steps
   - [ ] All examples display correctly
   - [ ] Quick links work

2. **Help Page**:
   - [ ] "Economy & Profit" section appears in navigation
   - [ ] Content is readable and clear
   - [ ] All links work correctly
   - [ ] Example calculations are accurate

3. **Crafting Page**:
   - [ ] Material source tooltips appear
   - [ ] Tooltips show helpful information
   - [ ] Market prices displayed (if available)

4. **User Flow**:
   - [ ] New player can find economy guide within 1 minute
   - [ ] Tutorial is understandable without external help
   - [ ] Examples match actual game mechanics
   - [ ] Links lead to correct pages

5. **Mobile**:
   - [ ] Tutorial is readable on mobile devices
   - [ ] Navigation works on touch screens
   - [ ] Cards don't overflow on small screens

## Related Stories

- US-101: Enhanced onboarding (should include economy tutorial)
- US-103: Resource flow explanation (covered by this tutorial)
- US-201: Mission rewards clarity (connects to economic loop)
- US-202: Crafting material sources (explained in tutorial)

## Success Metrics

After implementation:
- New players understand economic loop within first session
- Reduced questions about "where to get materials"
- Increased crafting activity (players understand profit potential)
- Better retention (clear progression path)

## Notes

- Keep examples simple and based on actual starter missions
- Update market prices regularly to keep examples accurate
- Consider adding video tutorial later (post-MVP)
- A/B test tutorial placement: hub vs. onboarding flow
