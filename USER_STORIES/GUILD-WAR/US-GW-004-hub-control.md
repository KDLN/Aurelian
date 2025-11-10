# US-GW-004: Hub Territory Control

**Priority**: P1 - Post-MVP Endgame Content
**Estimated Effort**: 2 weeks
**Category**: Guild Wars - Territory Conquest
**Dependencies**: US-GW-001 (War Framework), US-GW-003 (Guild Armies)

## User Story

As a **guild leader**, I want to **capture and control trading hubs**, so that **my guild earns passive toll revenue from all trades passing through**.

## Problem Statement

Hubs exist but have no ownership system:
- No way for guilds to own territories
- No siege or conquest mechanics
- No toll revenue from controlled hubs
- No strategic value to hub locations
- No defensive gameplay for territory holders

**Impact**: No territorial conflict, no passive income incentive, no endgame guild objectives.

## Vision

Create **hub ownership and siege system** where:
1. **Guilds Own Hubs** - Captured territories provide passive toll revenue
2. **Siege Mechanics** - 48-hour contests to capture hubs (requires armies + gold)
3. **Toll Revenue** - 5% of all hub trade volume → owner's treasury daily
4. **Strategic Value** - Control trade routes, create choke points
5. **Defensive Bonuses** - Current owners get +20% army strength when defending

## Acceptance Criteria

**Hub Ownership:**
- [ ] Hub model extended with ownerGuildId field
- [ ] HubOwnership model tracks ownership, toll rate, defense strength
- [ ] Admin can assign initial ownership (top 3 guilds by members)
- [ ] Neutral hubs (no owner) available for capture
- [ ] Ownership displayed on hub-travel map with guild colors

**Siege Mechanics:**
- [ ] Guild can declare siege on hub (costs 10,000g + deploy min 100 army strength)
- [ ] 48-hour siege contest accumulates victory points
- [ ] VP sources: Army strength, market dominance, gold investment
- [ ] Defender can counter-deploy armies
- [ ] First to 1,000 VP wins (or timer expires = defender wins)
- [ ] Max 1 active siege per guild, max 3 sieges per hub simultaneously

**Victory Point Accumulation:**
```
VP Sources (per hour):
- Army Strength: armyStrength × 0.1
- Market Dominance: +50 if attacker controls 60%+ trade volume in hub
- Gold Investment: +1 VP per 100g spent
- Defender Bonus: +20% to defensive army strength
```

**Toll Revenue System:**
- [ ] Daily cron job calculates 24h trade volume per hub
- [ ] Revenue formula: `volume × tollRate` (default 5%)
- [ ] Auto-deposit to owner guild treasury
- [ ] Owner can adjust toll rate (1-15%)
- [ ] Higher tolls reduce trade volume (10% decrease per 1% above 10%)

**Hub Benefits:**
- [ ] Toll revenue (3-5k gold/day for busy hubs)
- [ ] Market control (owner can create MarketEvents in hub)
- [ ] Strategic positioning (control trade routes)
- [ ] Guild prestige (leaderboard ranking)

**Territory Map UI:**
- [ ] Color-coded hub ownership map
- [ ] Click hub to see owner, toll rate, revenue stats
- [ ] "Declare Siege" button (if eligible)
- [ ] Active sieges shown with progress bars
- [ ] Historical ownership timeline

**Siege UI:**
- [ ] Siege panel showing attacker vs defender
- [ ] VP progress bars (both sides)
- [ ] Investment interface (add gold to siege)
- [ ] Army deployment (add more troops)
- [ ] Real-time updates every 60 seconds
- [ ] Victory/defeat notifications

## Technical Solution

### Database Schema

**New Model: HubOwnership**
```prisma
model HubOwnership {
  id                String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  hubId             String      @unique @db.Uuid
  ownerGuildId      String?     @db.Uuid // null = neutral
  capturedAt        DateTime?
  tollRate          Float       @default(0.05) // 5%
  defenseStrength   Int         @default(100)
  lastAttackAt      DateTime?
  dailyRevenue      Int         @default(0) // Tracked for stats
  tradeVolume24h    Int         @default(0)

  hub               Hub         @relation(fields: [hubId], references: [id], onDelete: Cascade)
  owner             Guild?      @relation(fields: [ownerGuildId], references: [id], onDelete: SetNull)
  sieges            HubSiege[]

  @@index([ownerGuildId])
  @@index([hubId])
}

model HubSiege {
  id                String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  hubOwnershipId    String        @db.Uuid
  attackerGuildId   String        @db.Uuid
  status            SiegeStatus   @default(IN_PROGRESS)
  armyStrength      Int           @default(0)
  goldInvested      Int           @default(0)
  victoryPoints     Int           @default(0)
  startedAt         DateTime      @default(now())
  endsAt            DateTime      // startedAt + 48 hours
  winnerId          String?       @db.Uuid

  hubOwnership      HubOwnership  @relation(fields: [hubOwnershipId], references: [id], onDelete: Cascade)
  attacker          Guild         @relation("AttackerSieges", fields: [attackerGuildId], references: [id], onDelete: Cascade)
  winner            Guild?        @relation("WonSieges", fields: [winnerId], references: [id])

  @@index([hubOwnershipId])
  @@index([attackerGuildId])
  @@index([status])
}

enum SiegeStatus {
  IN_PROGRESS
  SUCCESSFUL
  FAILED
  ABANDONED
}
```

**Update Hub model:**
```prisma
model Hub {
  // ... existing fields ...
  ownership HubOwnership?
  wars      GuildWar[] // For targetHubId
}
```

**Update Guild model:**
```prisma
model Guild {
  // ... existing fields ...
  ownedHubs       HubOwnership[]
  attackerSieges  HubSiege[]  @relation("AttackerSieges")
  wonSieges       HubSiege[]  @relation("WonSieges")
}
```

### API Endpoints

**1. POST /api/guild/hub/siege/start**

Request:
```json
{
  "hubId": "uuid",
  "armyStrength": 150,
  "initialGoldInvestment": 15000
}
```

Response:
```json
{
  "success": true,
  "siege": {
    "id": "uuid",
    "hubId": "uuid",
    "attackerGuildId": "uuid",
    "armyStrength": 150,
    "goldInvested": 15000,
    "victoryPoints": 150,
    "endsAt": "2025-01-03T12:00:00Z"
  }
}
```

**2. POST /api/guild/hub/siege/invest**

Add more gold or army strength to ongoing siege.

**3. GET /api/guild/hub/ownership**

Returns list of guild-owned hubs with revenue stats.

**4. POST /api/guild/hub/toll/set**

Adjust toll rate for owned hub (1-15%).

**5. GET /api/hub/[id]/siege/status**

Real-time siege progress, VP counts, time remaining.

### Worker Service - Toll Revenue Distribution

```typescript
// apps/worker/src/jobs/hub-revenue-distribution.ts
export async function distributeHubRevenue() {
  const ownerships = await prisma.hubOwnership.findMany({
    where: { ownerGuildId: { not: null } },
    include: { hub: true, owner: true }
  });

  for (const ownership of ownerships) {
    // Calculate 24h trade volume at this hub
    const volume = await calculate24hTradeVolume(ownership.hubId);

    // Calculate revenue (volume × tollRate)
    const revenue = Math.floor(volume * ownership.tollRate);

    if (revenue > 0) {
      // Add to guild treasury
      await prisma.guild.update({
        where: { id: ownership.ownerGuildId! },
        data: { treasury: { increment: revenue } }
      });

      // Update ownership stats
      await prisma.hubOwnership.update({
        where: { id: ownership.id },
        data: {
          dailyRevenue: revenue,
          tradeVolume24h: volume
        }
      });

      // Log transaction
      await prisma.guildLog.create({
        data: {
          guildId: ownership.ownerGuildId!,
          action: 'HUB_REVENUE_COLLECTED',
          meta: {
            hubId: ownership.hubId,
            hubName: ownership.hub.name,
            revenue,
            volume
          }
        }
      });
    }
  }
}

async function calculate24hTradeVolume(hubId: string): Promise<number> {
  // Sum all completed listings in past 24h at this hub
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const sales = await prisma.listing.aggregate({
    where: {
      hubId, // Assumes listings have hubId field (may need to add)
      status: 'sold',
      updatedAt: { gte: yesterday }
    },
    _sum: {
      price: true
    }
  });

  return sales._sum.price || 0;
}
```

### Worker Service - Siege VP Accumulation

```typescript
// apps/worker/src/jobs/siege-vp-accumulation.ts
export async function processSiegeVictoryPoints() {
  const activeSieges = await prisma.hubSiege.findMany({
    where: {
      status: 'IN_PROGRESS',
      endsAt: { gt: new Date() } // Not expired yet
    },
    include: {
      hubOwnership: { include: { owner: true } },
      attacker: true
    }
  });

  for (const siege of activeSieges) {
    // Calculate VP for this hour
    let vpEarned = 0;

    // Army strength contribution: armyStrength × 0.1
    vpEarned += siege.armyStrength * 0.1;

    // Market dominance bonus (if attacker controls 60%+ volume)
    const attackerDominance = await getMarketDominance(
      siege.attackerGuildId,
      siege.hubOwnership.hubId
    );
    if (attackerDominance >= 0.6) {
      vpEarned += 50;
    }

    // Gold investment bonus: +1 VP per 100g (calculated on investment, not hourly)
    // This is already baked into victoryPoints when gold is invested

    // Add VP to siege
    const newVP = siege.victoryPoints + vpEarned;

    await prisma.hubSiege.update({
      where: { id: siege.id },
      data: { victoryPoints: newVP }
    });

    // Check if victory threshold reached (1000 VP)
    if (newVP >= 1000) {
      await resolveSiege(siege.id, 'SUCCESSFUL');
    }
  }

  // Check for expired sieges (48h timeout)
  const expiredSieges = await prisma.hubSiege.findMany({
    where: {
      status: 'IN_PROGRESS',
      endsAt: { lte: new Date() }
    }
  });

  for (const siege of expiredSieges) {
    // Timeout = defender wins
    await resolveSiege(siege.id, 'FAILED');
  }
}

async function resolveSiege(siegeId: string, status: 'SUCCESSFUL' | 'FAILED') {
  const siege = await prisma.hubSiege.findUnique({
    where: { id: siegeId },
    include: { hubOwnership: true, attacker: true }
  });

  if (!siege) return;

  if (status === 'SUCCESSFUL') {
    // Attacker wins - transfer ownership
    await prisma.hubOwnership.update({
      where: { id: siege.hubOwnershipId },
      data: {
        ownerGuildId: siege.attackerGuildId,
        capturedAt: new Date(),
        defenseStrength: 100
      }
    });

    await prisma.hubSiege.update({
      where: { id: siegeId },
      data: {
        status: 'SUCCESSFUL',
        winnerId: siege.attackerGuildId
      }
    });

    await notifyGuild(siege.attackerGuildId, {
      type: 'SIEGE_VICTORY',
      message: `Victory! ${siege.hubOwnership.hub.name} is now yours!`
    });

    if (siege.hubOwnership.ownerGuildId) {
      await notifyGuild(siege.hubOwnership.ownerGuildId, {
        type: 'SIEGE_DEFEAT',
        message: `${siege.hubOwnership.hub.name} has been captured!`
      });
    }
  } else {
    // Defender wins
    await prisma.hubSiege.update({
      where: { id: siegeId },
      data: {
        status: 'FAILED',
        winnerId: siege.hubOwnership.ownerGuildId
      }
    });

    await notifyGuild(siege.attackerGuildId, {
      type: 'SIEGE_FAILED',
      message: `Siege failed! ${siege.hubOwnership.hub.name} held by defenders.`
    });

    if (siege.hubOwnership.ownerGuildId) {
      await notifyGuild(siege.hubOwnership.ownerGuildId, {
        type: 'SIEGE_DEFENDED',
        message: `Successfully defended ${siege.hubOwnership.hub.name}!`
      });
    }
  }
}
```

## UI Components

```tsx
function TerritoryMapPage() {
  const { ownerships, loading } = useHubOwnerships();
  const { guild } = useGuild();

  return (
    <GuildLayout title="Territory Control">
      <div className="territory-map">
        {/* Interactive SVG Map (reuse from hub-travel) */}
        <HubTravelMap
          ownerships={ownerships}
          onHubClick={handleHubClick}
        />

        {/* Territory Stats */}
        <div className="territory-stats">
          <h3>Your Territories</h3>
          {ownerships
            .filter(o => o.ownerGuildId === guild.id)
            .map(ownership => (
              <OwnedHubCard key={ownership.hubId} ownership={ownership} />
            ))}
        </div>

        {/* Active Sieges */}
        <ActiveSiegesPanel />
      </div>
    </GuildLayout>
  );
}

function OwnedHubCard({ ownership }: { ownership: HubOwnership }) {
  return (
    <div className="owned-hub-card">
      <div className="hub-header">
        <h4>🏰 {ownership.hub.name}</h4>
        <span className="captured-date">
          Captured {formatDistanceToNow(ownership.capturedAt)}
        </span>
      </div>

      <div className="hub-stats">
        <div className="stat">
          <label>Daily Revenue</label>
          <span className="value">{ownership.dailyRevenue.toLocaleString()}g</span>
        </div>
        <div className="stat">
          <label>24h Trade Volume</label>
          <span className="value">{ownership.tradeVolume24h.toLocaleString()}g</span>
        </div>
        <div className="stat">
          <label>Toll Rate</label>
          <input
            type="number"
            min={1}
            max={15}
            step={0.5}
            value={ownership.tollRate * 100}
            onChange={(e) => handleTollChange(ownership.hubId, e.target.value)}
          />
          <span>%</span>
        </div>
        <div className="stat">
          <label>Defense Strength</label>
          <ProgressBar value={ownership.defenseStrength} max={100} />
        </div>
      </div>

      {ownership.sieges.filter(s => s.status === 'IN_PROGRESS').length > 0 && (
        <Alert variant="danger">
          ⚠️ Under siege! Deploy defenses immediately.
        </Alert>
      )}
    </div>
  );
}

function SiegePanel({ siege }: { siege: HubSiege }) {
  const { guild } = useGuild();
  const isAttacker = siege.attackerGuildId === guild.id;
  const timeRemaining = siege.endsAt.getTime() - Date.now();
  const hoursLeft = Math.floor(timeRemaining / (1000 * 60 * 60));

  return (
    <div className="siege-panel">
      <div className="siege-header">
        <h3>⚔️ Siege of {siege.hubOwnership.hub.name}</h3>
        <div className="timer">
          <Clock />
          {hoursLeft}h remaining
        </div>
      </div>

      <div className="siege-progress">
        <div className="attacker-side">
          <h4>{siege.attacker.name}</h4>
          <div className="vp-display">
            <span className="vp-count">{siege.victoryPoints}</span>
            <span className="vp-label">/ 1000 VP</span>
          </div>
          <ProgressBar value={siege.victoryPoints} max={1000} />
          <div className="siege-stats">
            <span>🪖 Army: {siege.armyStrength}</span>
            <span>💰 Gold: {siege.goldInvested.toLocaleString()}</span>
          </div>
        </div>

        {!isAttacker && (
          <div className="defender-side">
            <h4>Defenders</h4>
            <DefensePanel hubOwnership={siege.hubOwnership} />
          </div>
        )}
      </div>

      {isAttacker && (
        <div className="siege-actions">
          <button onClick={() => handleInvestGold(siege.id)}>
            💰 Invest More Gold
          </button>
          <button onClick={() => handleDeployArmy(siege.id)}>
            🪖 Deploy More Army
          </button>
          <button onClick={() => handleAbandon(siege.id)} className="btn-danger">
            🏳️ Abandon Siege
          </button>
        </div>
      )}
    </div>
  );
}
```

## Testing Checklist

- [ ] Hub ownership assigned correctly
- [ ] Siege declared (costs 10k + army deployment)
- [ ] 48-hour timer enforced
- [ ] VP accumulates hourly (army × 0.1)
- [ ] Market dominance grants +50 VP/hour
- [ ] Gold investment grants +1 VP/100g
- [ ] Defender gets +20% army strength bonus
- [ ] First to 1000 VP wins
- [ ] Timer expiry = defender wins
- [ ] Ownership transfers on victory
- [ ] Daily toll revenue collected
- [ ] Toll rate adjustable (1-15%)
- [ ] High tolls reduce trade volume
- [ ] Max 1 active siege per guild
- [ ] Max 3 sieges per hub
- [ ] Both guilds notified of siege events

## Related Stories

- **US-GW-001**: War Framework
- **US-GW-002**: Market Warfare (dominance contributes to sieges)
- **US-GW-003**: Guild Armies (required for sieges)
- **US-GW-005**: Victory Conditions (hub conquest victory)

## Success Metrics

- 70% of hubs owned by guilds (30% neutral)
- Average 2-3 sieges per week
- Siege success rate: 40-50% (balanced)
- Average hub revenue: 3,000-5,000g/day
- Guild treasuries grow 25% from toll income

## Notes

- Hub control is the ultimate endgame objective
- Passive income incentivizes long-term territory holding
- Sieges create 48h intense competitive events
- Strategic hub placement matters (trade route choke points)
- Consider adding hub upgrades (walls, fortifications)
