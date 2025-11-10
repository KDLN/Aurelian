# US-006: Clarify Server Missions

**Priority**: P0 - BLOCKER
**Estimated Effort**: 3 hours
**Category**: Cooperative Features

## User Story

As a **player**, I want to **understand how server missions work and how to contribute**, so that **I can participate in cooperative events**.

## Problem Statement

Server missions show "Required Resources: iron_ore: 0/1000" but:
- How do I contribute?
- Where do contributions come from?
- What are the rewards?
- No instructions in UI

## Solution

Add comprehensive tooltips and help text explaining:
1. What server missions are
2. How to contribute resources
3. What rewards look like
4. How to track participation

## Implementation

### 1. Add Help Modal to Server Missions Section

**File**: `apps/web/src/app/missions/page.tsx` (around line 327)

```typescript
const [showServerHelp, setShowServerHelp] = useState(false);

// Add help button near server missions title:
<div className="game-space-between">
  <h3>🌍 Server Missions</h3>
  <button
    onClick={() => setShowServerHelp(true)}
    className="game-btn game-btn-small"
  >
    ❓ How It Works
  </button>
</div>

// Add modal:
{showServerHelp && (
  <div className="game-modal-overlay" onClick={() => setShowServerHelp(false)}>
    <div className="game-card" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
      <h3>🌍 Server-Wide Cooperative Missions</h3>

      <div className="game-card-nested" style={{ marginTop: '1rem' }}>
        <h4>What Are Server Missions?</h4>
        <p>
          Server missions are cooperative challenges where ALL players work together
          to achieve a common goal. When the goal is met, everyone who contributed
          receives rewards.
        </p>
      </div>

      <div className="game-card-nested" style={{ marginTop: '1rem' }}>
        <h4>How to Contribute</h4>
        <ol>
          <li>Click "View Details" on an active server mission</li>
          <li>Check the required resources (e.g., 1000 iron ore, 500 herbs)</li>
          <li>Click "Contribute Resources" button</li>
          <li>Select items from your warehouse to donate</li>
          <li>Your contribution is added to the global progress</li>
        </ol>
      </div>

      <div className="game-card-nested" style={{ marginTop: '1rem' }}>
        <h4>Rewards</h4>
        <ul>
          <li><strong>Participation Rewards</strong>: All contributors get base rewards</li>
          <li><strong>Top Contributors</strong>: Bonus rewards for highest contributors</li>
          <li><strong>Guild Bonuses</strong>: Extra rewards if your guild contributes most</li>
        </ul>
        <p className="game-small game-muted" style={{ marginTop: '0.5rem' }}>
          Example: Contribute 50 iron ore → Earn 500g + rare recipe
        </p>
      </div>

      <div className="game-card-nested" style={{ marginTop: '1rem' }}>
        <h4>Strategy Tips</h4>
        <ul>
          <li>💰 Contribute early for better positioning on leaderboards</li>
          <li>🏛️ Coordinate with your guild for maximum impact</li>
          <li>📊 Check mission rewards before contributing valuable resources</li>
          <li>⏱️ Time-limited events offer better rewards but shorter windows</li>
        </ul>
      </div>

      <button
        onClick={() => setShowServerHelp(false)}
        className="game-btn game-btn-primary"
        style={{ marginTop: '1rem', width: '100%' }}
      >
        Got It!
      </button>
    </div>
  </div>
)}
```

### 2. Add Contribution Button

**File**: `apps/web/src/app/missions/page.tsx`

For each active server mission, add:

```typescript
<div className="game-card">
  <h4>{mission.name}</h4>
  <p className="game-muted">{mission.description}</p>

  {/* Show required resources */}
  <div className="game-card-nested">
    <h5>Required Resources:</h5>
    {Object.entries(mission.globalRequirements).map(([item, qty]) => {
      const current = mission.globalProgress[item] || 0;
      const percent = Math.floor((current / qty) * 100);

      return (
        <div key={item} style={{ marginBottom: '0.5rem' }}>
          <div className="game-space-between game-small">
            <span>{item.replace(/_/g, ' ')}</span>
            <span>{current} / {qty}</span>
          </div>
          <div className="game-progress-bar">
            <div className="game-progress-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
      );
    })}
  </div>

  {/* Add contribute button */}
  <button
    onClick={() => handleContributeToServerMission(mission.id)}
    className="game-btn game-btn-primary"
    style={{ width: '100%', marginTop: '1rem' }}
  >
    🎯 Contribute Resources
  </button>

  {/* Show your contribution */}
  {mission.yourContribution && mission.yourContribution > 0 && (
    <div className="game-small game-muted" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
      Your contribution: {mission.yourContribution} items
    </div>
  )}
</div>
```

### 3. Add Modal Styles

**File**: `apps/web/src/app/globals.css`

```css
.game-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
}

.game-modal-overlay .game-card {
  max-height: 90vh;
  overflow-y: auto;
  margin: auto;
}
```

## Testing

- [ ] Help modal opens and closes correctly
- [ ] Content is readable and clear
- [ ] Contribution button appears on active missions
- [ ] Modal styles work on mobile
- [ ] No console errors

## Related Stories

- US-203: Guild benefits (coordinate server missions with guild)
- US-302: Hub dashboard (show server mission progress)
