# US-GW-006: Guild War Balance & Polish

**Priority**: P1 - Post-MVP Endgame Content
**Estimated Effort**: 1 week
**Category**: Guild Wars - Polish & Optimization
**Dependencies**: US-GW-001 through US-GW-005

## User Story

As a **game developer**, I want to **balance economic costs, prevent exploits, and optimize performance** of the guild war system, so that **wars are fair, engaging, and don't break the game economy or server**.

## Problem Statement

After implementing all war mechanics (US-GW-001 through US-GW-005), need to:
- Balance attack costs, army upkeep, spoils
- Prevent exploits (market manipulation loops, treasury cycling, etc.)
- Optimize database queries for scalability
- Add anti-cheat measures
- Create achievements and rewards
- Polish UI/UX for better player experience

**Impact**: Without balance/polish, wars could be exploitable, lag server, or feel unfair.

## Acceptance Criteria

### Economic Balancing

**Attack Costs:**
- [ ] Price crash: 5,000-50,000g (based on item rarity × market size)
- [ ] Price spike: 10,000-100,000g (must buy significant supply)
- [ ] Army upkeep: 50-100g/unit/day (training multiplier)
- [ ] Siege entry: 10,000g minimum
- [ ] War declaration: 1,000g entry fee

**Revenue Targets:**
- [ ] Busy hub toll: 3,000-5,000g/day
- [ ] Medium hub: 1,500-2,500g/day
- [ ] Frontier hub: 500-1,000g/day
- [ ] Army cost: 50% of hub revenue (balance incentive)

**Spoils Distribution:**
- [ ] Victory spoils: 25% of loser's treasury (significant but not devastating)
- [ ] Min treasury to declare war: 20,000g
- [ ] Min members to declare war: 10 active

**Victory Thresholds:**
- [ ] Market dominance: 60% for 7 consecutive days
- [ ] Economic collapse: < 10% of peak for 3 days
- [ ] Hub conquest: Hold for 48 hours
- [ ] Stalemate: 90 days no victor

### Anti-Exploit Measures

**Cooldowns:**
- [ ] 24h between price attacks on same item
- [ ] 12h between trade route raids
- [ ] 48h between sieges on same hub
- [ ] 30 days between wars with same opponent

**Cost Escalation:**
- [ ] Repeated attacks (same 24h): +50% cost each time
- [ ] Prevents spam attacks

**Action Limits:**
- [ ] Max 1 active war per guild
- [ ] Max 3 active sieges per hub
- [ ] Max 10 price attacks per war per day (guild-wide)
- [ ] Army deployment limited by treasury (cannot overdraft)

**Treasury Protections:**
- [ ] Cannot declare war if treasury < 20k
- [ ] Cannot execute attack if treasury < 10k
- [ ] Minimum 5k reserve cannot be spent on war actions
- [ ] Prevents bankruptcy spiral

**Validation:**
- [ ] All war actions require JWT authentication
- [ ] Verify guild membership + role (LEADER/OFFICER)
- [ ] Check cooldowns server-side (not client)
- [ ] Atomic treasury updates (prevent race conditions)
- [ ] Log all war actions for audit trail

### Performance Optimization

**Database Indexes:**
```sql
-- Critical indexes for war queries
CREATE INDEX idx_guildwar_status ON "GuildWar"("status");
CREATE INDEX idx_guildwar_started ON "GuildWar"("startedAt");
CREATE INDEX idx_waractions_war ON "GuildWarAction"("warId", "timestamp");
CREATE INDEX idx_waractions_guild ON "GuildWarAction"("guildId", "actionType");
CREATE INDEX idx_hubsiege_status ON "HubSiege"("status", "endsAt");
CREATE INDEX idx_army_guild ON "GuildArmy"("guildId", "agentType");
```

**Query Optimization:**
- [ ] War dashboard: Single query with includes (not N+1)
- [ ] Victory checks: Batch process all wars (not per-war)
- [ ] Cache war scores: Update every 60s, not real-time
- [ ] Paginate war history: 50 actions per page
- [ ] Use database aggregations for volume calculations

**Worker Service Tuning:**
- [ ] Victory checks: Hourly (not every minute)
- [ ] Army upkeep: Daily at midnight UTC
- [ ] Toll revenue: Daily at midnight UTC
- [ ] Siege VP accumulation: Hourly
- [ ] Stagger cron jobs to avoid spikes

**Caching Strategy:**
```typescript
// Cache war scores for 60 seconds
const warScoreCache = new Map<string, { score: number; timestamp: number }>();

function getCachedWarScore(warId: string) {
  const cached = warScoreCache.get(warId);
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.score;
  }
  // Fetch fresh score
  const score = await fetchWarScore(warId);
  warScoreCache.set(warId, { score, timestamp: Date.now() });
  return score;
}
```

### Achievement System

**War-Related Achievements:**

**Market Manipulator**
- Execute 10 price attacks
- Reward: Title "Market Manipulator" + 10k gold

**Economic Warlord**
- Win 5 wars
- Reward: Title "Warlord" + 50k gold

**Territory Baron**
- Control 5+ hubs simultaneously
- Reward: Title "Baron" + permanent +10% toll revenue bonus

**Defense Master**
- Successfully defend 3 sieges
- Reward: Title "Defender" + permanent +10% defensive army strength

**War Profiteer**
- Earn 100k+ from war spoils (cumulative)
- Reward: Title "Profiteer" + 25k gold

**Perfect Victory**
- Win war without losing any battles
- Reward: Title "Unstoppable" + 100k gold

**Comeback King**
- Win war after being down 5,000+ points
- Reward: Title "Phoenix" + 50k gold

### UI/UX Polish

**Tooltips & Help Text:**
- [ ] Hover tooltips on all war actions explaining costs/effects
- [ ] Help icons with explanations of victory conditions
- [ ] Warning modals before expensive actions
- [ ] Cost calculators for attacks (show estimated impact)

**Visual Feedback:**
- [ ] Animated score updates (count up effect)
- [ ] Color-coded progress bars (red = opponent leading, green = us)
- [ ] Sound effects for war events (attack, victory, defeat)
- [ ] Confetti animation on victory

**Notifications:**
- [ ] Real-time toast notifications for war events
- [ ] Daily war summary email (optional, user preference)
- [ ] Discord webhook integration (optional, guild setting)
- [ ] In-game notification center with war history

**Mobile Responsiveness:**
- [ ] War dashboard responsive layout
- [ ] Touch-friendly buttons (min 44px tap target)
- [ ] Collapsible sections for mobile
- [ ] Swipe gestures for timeline navigation

## Technical Implementation

### Cost Balancing Formulas

```typescript
// Price Crash Cost
function calculatePriceCrashCost(
  itemRarity: string,
  marketSize: number,
  quantityToDump: number
): number {
  const rarityMultiplier = {
    common: 1,
    uncommon: 2,
    rare: 4,
    epic: 8,
    legendary: 16
  }[itemRarity];

  const baseCost = quantityToDump * rarityMultiplier * 10;
  const marketSizeBonus = Math.log(marketSize) * 500;

  return Math.floor(baseCost + marketSizeBonus);
}

// Army Upkeep
function calculateArmyUpkeep(
  quantity: number,
  baseUpkeep: number,
  trainingLevel: number
): number {
  return quantity * baseUpkeep * (trainingLevel / 10);
}

// Siege Entry Cost
function calculateSiegeCost(
  hubTier: 'frontier' | 'medium' | major',
  currentDefense: number
): number {
  const tierCost = {
    frontier: 5000,
    medium: 10000,
    major: 20000
  }[hubTier];

  const defenseCost = currentDefense * 100; // More defended = more expensive

  return tierCost + defenseCost;
}
```

### Anti-Exploit Validation

```typescript
// Check cooldown
async function checkActionCooldown(
  guildId: string,
  actionType: WarActionType,
  targetItemId?: string
): Promise<boolean> {
  const cooldowns = {
    PRICE_CRASH: 24 * 60 * 60 * 1000, // 24h
    PRICE_SPIKE: 24 * 60 * 60 * 1000,
    SUPPLY_RAID: 12 * 60 * 60 * 1000, // 12h
    HUB_SIEGE: 48 * 60 * 60 * 1000    // 48h
  };

  const cooldownMs = cooldowns[actionType];
  if (!cooldownMs) return true;

  const cutoff = new Date(Date.now() - cooldownMs);

  const recentAction = await prisma.guildWarAction.findFirst({
    where: {
      guildId,
      actionType,
      targetItemId: targetItemId || undefined,
      timestamp: { gte: cutoff }
    }
  });

  return !recentAction; // True if no recent action (cooldown passed)
}

// Validate treasury minimum
async function validateTreasuryMinimum(
  guildId: string,
  actionCost: number
): Promise<boolean> {
  const guild = await prisma.guild.findUnique({
    where: { id: guildId }
  });

  if (!guild) return false;

  const MIN_RESERVE = 5000;
  return guild.treasury >= actionCost + MIN_RESERVE;
}

// Prevent concurrent treasury modifications
async function atomicTreasuryDeduct(
  guildId: string,
  amount: number
): Promise<boolean> {
  try {
    const result = await prisma.guild.updateMany({
      where: {
        id: guildId,
        treasury: { gte: amount + 5000 } // Ensure minimum reserve
      },
      data: {
        treasury: { decrement: amount }
      }
    });

    return result.count > 0; // True if update succeeded
  } catch (error) {
    console.error('Treasury deduct failed:', error);
    return false;
  }
}
```

### Performance Benchmarks

**Target Response Times:**
- War dashboard load: < 500ms
- Execute war action: < 1000ms
- Victory check (hourly): < 5s for all wars
- Toll revenue distribution: < 10s for all hubs

**Load Testing:**
```bash
# Test 100 concurrent war actions
artillery run war-load-test.yml

# Expected results:
# - 95th percentile: < 1000ms
# - 99th percentile: < 2000ms
# - Error rate: < 1%
```

## Testing Checklist

### Economic Balance
- [ ] Price crash costs scale with item rarity
- [ ] Army upkeep drains treasury at expected rate
- [ ] Hub revenue covers army costs (50-70%)
- [ ] Victory spoils feel significant (25% treasury)
- [ ] Wars are expensive but affordable for active guilds

### Anti-Exploit
- [ ] Cannot spam attacks (cooldowns enforced)
- [ ] Cannot overdraft treasury (atomic checks)
- [ ] Cannot declare war with insufficient funds
- [ ] Cost escalation prevents repeated attacks
- [ ] All actions require proper authentication

### Performance
- [ ] War dashboard loads in < 500ms
- [ ] Victory checks complete in < 5s
- [ ] Database queries use indexes
- [ ] Cache hit rate > 80% for war scores
- [ ] Worker services complete on time

### Achievements
- [ ] Achievements unlock correctly
- [ ] Titles display on guild profiles
- [ ] Reward gold deposited to treasury
- [ ] Progress tracked accurately

### UI/UX
- [ ] Tooltips explain all actions
- [ ] Warning modals prevent accidents
- [ ] Animations smooth (60fps)
- [ ] Mobile layout responsive
- [ ] Notifications delivered in real-time

## Related Stories

- **US-GW-001 through US-GW-005**: All previous war stories

## Success Metrics

- War participation rate: 50%+ of guilds engage in wars
- Average war duration: 14-21 days (not too short/long)
- Player satisfaction: 80%+ positive feedback
- Performance: 99% uptime, < 500ms response times
- Economy health: No hyperinflation from war rewards
- Engagement: 30% increase in daily active users during wars

## Notes

- Balance is iterative - expect tuning post-launch
- Monitor economy metrics closely (gold supply, item prices)
- A/B test different cost structures with player segments
- Consider seasonal events (double toll revenue weekends)
- Add leaderboard for war victories
- Consider guild war seasons (quarterly resets)
- Add spectator mode for non-participants
- Create war replays/highlights system

## Launch Checklist

**Pre-Launch:**
- [ ] All database migrations tested on staging
- [ ] Load testing passed (100 concurrent users)
- [ ] Balance tuning approved by design team
- [ ] Anti-exploit measures tested (pen testing)
- [ ] Documentation updated (API, database schema)
- [ ] Player guide created (how to war)

**Launch Day:**
- [ ] Enable war features via feature flag
- [ ] Monitor error rates and performance
- [ ] Have rollback plan ready
- [ ] Support team briefed on war mechanics
- [ ] Community announcement posted

**Post-Launch (Week 1):**
- [ ] Collect player feedback
- [ ] Analyze war participation metrics
- [ ] Tune balance if needed (hotfix)
- [ ] Address any exploits discovered
- [ ] Celebrate first war victories on social media

## Economic Impact Analysis

**Gold Sinks (Expenses):**
- War declaration: 1k/war × 10 wars/week = 10k/week
- Price attacks: 25k avg × 50 attacks/week = 1.25M/week
- Army upkeep: 5k/day × 20 guilds = 3.5M/week
- Siege costs: 15k × 5 sieges/week = 75k/week
**Total Sink: ~4.8M gold/week**

**Gold Sources (Income):**
- Hub toll revenue: 4k/day × 10 hubs × 7 days = 280k/week
- Victory spoils: 50k avg × 10 wars/month = 125k/week (distributed)
**Total Source: ~405k gold/week**

**Net Impact: -4.4M gold/week sink** (deflationary, good for economy)

## Conclusion

This polish phase ensures guild wars are:
1. **Balanced** - Fair costs, achievable goals
2. **Secure** - Anti-exploit, anti-cheat
3. **Performant** - Fast, scalable, reliable
4. **Engaging** - Achievements, polish, feedback
5. **Sustainable** - Economic health maintained

Ready for epic guild warfare! ⚔️
