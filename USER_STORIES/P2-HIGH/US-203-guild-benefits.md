# US-203: Guild Benefits Explanation

**Priority**: P2 - HIGH
**Estimated Effort**: 2 hours

## Problem
Players don't understand why they should join a guild.

## Solution

### Add Guild Benefits Panel

**File**: `apps/web/src/app/guild/browse/page.tsx`

```typescript
<div className="game-card">
  <h3>🏛️ Why Join a Guild?</h3>
  <div className="game-grid-2">
    <div className="game-card-nested">
      <h4>💰 Shared Resources</h4>
      <ul>
        <li>Access guild warehouse (shared items)</li>
        <li>Borrow gold from treasury</li>
        <li>Pool resources for big purchases</li>
      </ul>
    </div>
    <div className="game-card-nested">
      <h4>🎯 Cooperative Missions</h4>
      <ul>
        <li>Server missions with better rewards</li>
        <li>Alliance missions (guild coordination)</li>
        <li>Shared mission XP bonuses</li>
      </ul>
    </div>
    <div className="game-card-nested">
      <h4>📊 Economic Benefits</h4>
      <ul>
        <li>Bulk buying power (lower prices)</li>
        <li>Shared crafting blueprints</li>
        <li>Territory taxation (future)</li>
      </ul>
    </div>
    <div className="game-card-nested">
      <h4>🤝 Social Features</h4>
      <ul>
        <li>Private guild chat channels</li>
        <li>Trading priority with guildmates</li>
        <li>Reputation bonuses</li>
      </ul>
    </div>
  </div>
</div>
```

### Add Comparison: Solo vs Guild

```typescript
<table className="game-table">
  <thead>
    <tr>
      <th>Feature</th>
      <th>Solo Player</th>
      <th>Guild Member</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Mission Capacity</td>
      <td>4 agents max</td>
      <td>4 agents + guild missions</td>
    </tr>
    <tr>
      <td>Storage</td>
      <td>Personal warehouse only</td>
      <td>Personal + Guild warehouse</td>
    </tr>
    <tr>
      <td>Gold Access</td>
      <td>Your wallet only</td>
      <td>Wallet + Guild treasury</td>
    </tr>
  </tbody>
</table>
```
