# US-201: Mission Rewards Clarity

**Priority**: P2 - HIGH
**Estimated Effort**: 2 hours

## User Story
As a **player**, I want to **see exactly what rewards I'll get from a mission**, so that **I can choose the best missions for my needs**.

## Solution

### Show Full Rewards Before Starting

**File**: `apps/web/src/app/missions/page.tsx`

```typescript
<div className="game-card-nested">
  <h4>Rewards</h4>
  <div className="game-flex-col">
    <div className="game-space-between">
      <span>Base Gold:</span>
      <span className="game-good">{mission.baseReward}g</span>
    </div>
    {mission.itemRewards && mission.itemRewards.map(reward => (
      <div key={reward.itemKey} className="game-space-between">
        <span>{reward.itemName}:</span>
        <span>{reward.minQty}-{reward.maxQty}x</span>
      </div>
    ))}
    <div className="game-space-between">
      <span>Experience:</span>
      <span className="game-good">+25 XP</span>
    </div>
  </div>

  {agent.level > 1 && (
    <div className="game-small game-muted" style={{ marginTop: '0.5rem' }}>
      💡 Agent bonus: +{agent.rewardBonus}% gold (+{Math.floor(mission.baseReward * agent.rewardBonus / 100)}g)
    </div>
  )}
</div>
```

### Add Expected Value Calculator

```typescript
const calculateExpectedValue = (mission, agent) => {
  const baseGold = mission.baseReward;
  const agentBonus = Math.floor(baseGold * (agent.rewardBonus || 0) / 100);
  const successRate = calculateSuccessRate(mission.riskLevel, agent);

  const itemValue = mission.itemRewards?.reduce((sum, r) => {
    const avgQty = (r.minQty + r.maxQty) / 2;
    const itemPrice = r.marketPrice || 15;
    return sum + (avgQty * itemPrice);
  }, 0) || 0;

  const expectedGold = (baseGold + agentBonus + itemValue) * (successRate / 100);

  return Math.floor(expectedGold);
};

// Display:
<div className="game-space-between">
  <span>
    Expected Value:
    <HelpTooltip content="Average reward considering success rate and market prices" />
  </span>
  <span className="game-good">{calculateExpectedValue(mission, agent)}g</span>
</div>
```

## Testing
- [ ] All rewards display correctly
- [ ] Expected value calculation is accurate
- [ ] Agent bonuses shown properly
- [ ] Item rewards show quantity ranges
