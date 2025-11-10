# US-GW-001: Guild War Framework

**Priority**: P1 - Post-MVP Endgame Content
**Estimated Effort**: 2 weeks
**Category**: Guild Wars - Foundation
**Dependencies**: GuildAlliance system (already exists)

## User Story

As a **guild leader**, I want to **declare economic war on rival guilds**, so that **my guild can compete for market dominance and territory control**.

## Problem Statement

Currently, guilds have a basic alliance/rivalry system but no actual war mechanics:
- Guilds can propose RIVALRY relationships (antagonistic alliances)
- No way to convert rivalry into active warfare
- No scoring, victory conditions, or competitive gameplay
- No stakes or rewards for guild conflicts
- Guild competition is passive (just treasury/member count comparison)

**Impact**: Guilds lack engaging endgame content, no reason to form strategic alliances, no competitive guild-vs-guild gameplay.

## Vision

Create an **economic warfare system** where guilds compete through:
1. **Market Manipulation** - Price crashes, spikes, volume control
2. **Army Funding** - Recruit mercenaries to raid trade routes and siege hubs
3. **Territory Control** - Capture hubs for toll revenue

Wars are won through economic dominance, not combat.

## Acceptance Criteria

**War Declaration:**
- [ ] Guild leader can declare war from existing RIVALRY alliance
- [ ] War requires minimum treasury (20,000g) and members (10+ active)
- [ ] War declaration costs 1,000g entry fee
- [ ] Both guilds notified of war start
- [ ] Optional: Set target item (commodity-focused war) or target hub (territory war)

**War Tracking:**
- [ ] GuildWar model created with scoring, status, timestamps
- [ ] War scores tracked for both guilds
- [ ] Gold spent tracked for both guilds
- [ ] Victory threshold set (default: 10,000 points)
- [ ] Market dominance tracking (if target item specified)

**War Dashboard UI:**
- [ ] `/guild/wars/active` page showing current war
- [ ] War overview (opponent, scores, time elapsed, victory progress)
- [ ] Recent actions timeline (both sides)
- [ ] Economic impact charts (spending, market changes)
- [ ] Action buttons (prepare for Phase 2-4)

**War Ending:**
- [ ] Surrender button (guild leader only)
- [ ] Surrender penalty: Lose 25% treasury + contested territories
- [ ] War history logged with outcome
- [ ] Both guilds notified of result

**Constraints:**
- [ ] Max 1 active war per guild at a time
- [ ] Cannot declare war on allied guilds
- [ ] 30-day cooldown after war ends (same opponent)

## Technical Solution

### Database Schema

**New Model: GuildWar**
```prisma
model GuildWar {
  id                  String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  allianceId          String        @unique @db.Uuid
  status              WarStatus     @default(ACTIVE)
  startedAt           DateTime      @default(now())
  endsAt              DateTime?
  targetItemId        String?       @db.Uuid // Optional: focused on commodity
  targetHubId         String?       @db.Uuid // Optional: hub contest

  // Score tracking
  guild1Id            String        @db.Uuid
  guild2Id            String        @db.Uuid
  guild1Score         Int           @default(0)
  guild2Score         Int           @default(0)
  victoryThreshold    Int           @default(10000)

  // Economic stats
  guild1GoldSpent     Int           @default(0)
  guild2GoldSpent     Int           @default(0)
  guild1ItemsTraded   Json?         // { itemId: quantity }
  guild2ItemsTraded   Json?

  // Victory condition tracking
  marketDominanceDays Int           @default(0)
  currentDominant     String?       @db.Uuid
  guild1PeakTreasury  Int?
  guild2PeakTreasury  Int?

  alliance            GuildAlliance @relation(fields: [allianceId], references: [id], onDelete: Cascade)
  guild1              Guild         @relation("Guild1Wars", fields: [guild1Id], references: [id], onDelete: Cascade)
  guild2              Guild         @relation("Guild2Wars", fields: [guild2Id], references: [id], onDelete: Cascade)
  targetItem          ItemDef?      @relation(fields: [targetItemId], references: [id])
  targetHub           Hub?          @relation(fields: [targetHubId], references: [id])
  actions             GuildWarAction[]

  @@index([status])
  @@index([startedAt])
  @@index([guild1Id])
  @@index([guild2Id])
}

enum WarStatus {
  ACTIVE
  GUILD1_VICTORY
  GUILD2_VICTORY
  STALEMATE
  ABANDONED
  SURRENDERED
}
```

**Modify Existing Models:**
```prisma
// Add to GuildAlliance model
model GuildAlliance {
  // ... existing fields ...
  war GuildWar?
}

// Add to Guild model
model Guild {
  // ... existing fields ...
  guild1Wars GuildWar[] @relation("Guild1Wars")
  guild2Wars GuildWar[] @relation("Guild2Wars")
}
```

### API Endpoints

**1. POST /api/guild/war/declare**

**Request:**
```json
{
  "allianceId": "uuid",
  "targetItemId": "uuid | null",
  "targetHubId": "uuid | null",
  "wagerAmount": 1000
}
```

**Logic:**
```typescript
export async function POST(req: Request) {
  const session = await getSession(req);
  const { allianceId, targetItemId, targetHubId, wagerAmount } = await req.json();

  // 1. Verify user is guild leader
  const membership = await prisma.guildMember.findFirst({
    where: { userId: session.user.id, role: 'LEADER' },
    include: { guild: true }
  });
  if (!membership) return error('Must be guild leader');

  // 2. Verify alliance exists and is RIVALRY
  const alliance = await prisma.guildAlliance.findUnique({
    where: { id: allianceId },
    include: { guild1: true, guild2: true }
  });
  if (!alliance || alliance.type !== 'RIVALRY') {
    return error('Alliance must be RIVALRY type');
  }
  if (alliance.status !== 'ACCEPTED') {
    return error('Rivalry must be accepted');
  }

  // 3. Check war already exists
  const existingWar = await prisma.guildWar.findUnique({
    where: { allianceId }
  });
  if (existingWar) return error('War already active');

  // 4. Validate minimums
  const guild = membership.guild;
  if (guild.treasury < 20000) {
    return error('Need 20,000g minimum treasury');
  }
  const activeMembers = await prisma.guildMember.count({
    where: { guildId: guild.id }
  });
  if (activeMembers < 10) {
    return error('Need 10+ members to declare war');
  }

  // 5. Check cooldown (30 days same opponent)
  const recentWar = await prisma.guildWar.findFirst({
    where: {
      OR: [
        { guild1Id: guild.id, guild2Id: alliance.guild2Id },
        { guild1Id: alliance.guild2Id, guild2Id: guild.id }
      ],
      endsAt: { not: null },
      endsAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }
  });
  if (recentWar) return error('30-day cooldown active');

  // 6. Deduct entry fee
  await prisma.guild.update({
    where: { id: guild.id },
    data: { treasury: { decrement: wagerAmount } }
  });

  // 7. Create war
  const war = await prisma.guildWar.create({
    data: {
      allianceId,
      guild1Id: alliance.guild1Id,
      guild2Id: alliance.guild2Id,
      targetItemId,
      targetHubId,
      guild1PeakTreasury: alliance.guild1.treasury,
      guild2PeakTreasury: alliance.guild2.treasury
    }
  });

  // 8. Log event
  await prisma.guildLog.create({
    data: {
      guildId: guild.id,
      action: 'WAR_DECLARED',
      actorId: session.user.id,
      meta: { warId: war.id, opponent: alliance.guild2.name }
    }
  });

  // 9. Notify opponent
  await notifyGuild(alliance.guild2Id, {
    type: 'WAR_DECLARED',
    message: `${guild.name} has declared war!`,
    warId: war.id
  });

  return json({ success: true, war });
}
```

**2. GET /api/guild/war/status?warId=uuid**

**Response:**
```json
{
  "war": {
    "id": "uuid",
    "status": "ACTIVE",
    "startedAt": "2025-01-01T00:00:00Z",
    "guild1": {
      "id": "uuid",
      "name": "Crown Guild",
      "score": 5420,
      "goldSpent": 48200
    },
    "guild2": {
      "id": "uuid",
      "name": "Merchant Alliance",
      "score": 4890,
      "goldSpent": 52100
    },
    "victoryThreshold": 10000,
    "targetItem": { "id": "uuid", "name": "Iron Ore" },
    "marketDominance": {
      "guild1Pct": 0.45,
      "guild2Pct": 0.38,
      "daysHeld": 3
    },
    "recentActions": [ /* last 20 actions */ ]
  }
}
```

**3. POST /api/guild/war/surrender**

**Request:**
```json
{
  "warId": "uuid",
  "confirm": true
}
```

**Logic:**
```typescript
export async function POST(req: Request) {
  const session = await getSession(req);
  const { warId, confirm } = await req.json();

  // 1. Verify guild leader
  const membership = await prisma.guildMember.findFirst({
    where: { userId: session.user.id, role: 'LEADER' },
    include: { guild: true }
  });
  if (!membership) return error('Must be guild leader');

  // 2. Get war
  const war = await prisma.guildWar.findUnique({
    where: { id: warId },
    include: { guild1: true, guild2: true }
  });
  if (!war) return error('War not found');
  if (war.status !== 'ACTIVE') return error('War not active');

  // 3. Determine winner/loser
  const isGuild1 = war.guild1Id === membership.guildId;
  const loserId = membership.guildId;
  const winnerId = isGuild1 ? war.guild2Id : war.guild1Id;

  // 4. Calculate penalty (25% of treasury)
  const loserGuild = membership.guild;
  const penalty = Math.floor(loserGuild.treasury * 0.25);

  // 5. Transfer gold
  await prisma.$transaction([
    prisma.guild.update({
      where: { id: loserId },
      data: { treasury: { decrement: penalty } }
    }),
    prisma.guild.update({
      where: { id: winnerId },
      data: { treasury: { increment: penalty } }
    })
  ]);

  // 6. Transfer contested hubs (if any)
  if (war.targetHubId) {
    await prisma.hubOwnership.update({
      where: { hubId: war.targetHubId },
      data: { ownerGuildId: winnerId }
    });
  }

  // 7. End war
  await prisma.guildWar.update({
    where: { id: warId },
    data: {
      status: 'SURRENDERED',
      endsAt: new Date()
    }
  });

  // 8. Log and notify
  await Promise.all([
    notifyGuild(winnerId, {
      type: 'WAR_WON',
      message: `Victory! Enemy surrendered. Spoils: ${penalty}g`,
      warId
    }),
    notifyGuild(loserId, {
      type: 'WAR_LOST',
      message: `Defeat. Lost ${penalty}g and territories.`,
      warId
    })
  ]);

  return json({ success: true, penalty, winner: winnerId });
}
```

**4. GET /api/guild/war/history?guildId=uuid**

Returns past wars with outcomes, final scores, spoils.

### UI Components

**1. War Dashboard Page (`/guild/wars/active`)**

```tsx
export default function ActiveWarPage() {
  const { war, loading } = useActiveWar();
  const { guild } = useGuild();

  if (loading) return <Loading />;
  if (!war) return <NoActiveWar />;

  const isGuild1 = war.guild1.id === guild.id;
  const ourScore = isGuild1 ? war.guild1.score : war.guild2.score;
  const theirScore = isGuild1 ? war.guild2.score : war.guild1.score;
  const opponent = isGuild1 ? war.guild2 : war.guild1;

  return (
    <GuildLayout title="Active War">
      <div className="war-dashboard">
        {/* Header */}
        <div className="war-header">
          <h1>⚔️ War with {opponent.name}</h1>
          <div className="war-timer">
            Started {formatDistanceToNow(war.startedAt)} ago
          </div>
        </div>

        {/* Score Overview */}
        <div className="score-panel">
          <div className="guild-score">
            <h3>{guild.name}</h3>
            <div className="score">{ourScore.toLocaleString()}</div>
            <Progress value={ourScore} max={war.victoryThreshold} />
          </div>

          <div className="vs-divider">VS</div>

          <div className="guild-score opponent">
            <h3>{opponent.name}</h3>
            <div className="score">{theirScore.toLocaleString()}</div>
            <Progress value={theirScore} max={war.victoryThreshold} />
          </div>
        </div>

        {/* Victory Progress */}
        <VictoryProgressTracker war={war} />

        {/* Recent Actions Timeline */}
        <WarTimeline actions={war.recentActions} />

        {/* Economic Stats */}
        <div className="economic-stats">
          <StatCard
            label="Gold Spent"
            value={`${isGuild1 ? war.guild1GoldSpent : war.guild2GoldSpent}g`}
            trend="up"
          />
          <StatCard
            label="Market Dominance"
            value={war.marketDominance?.guild1Pct ? `${(war.marketDominance.guild1Pct * 100).toFixed(1)}%` : 'N/A'}
          />
        </div>

        {/* Action Buttons (enabled in later phases) */}
        <div className="war-actions">
          <button disabled className="btn-warning">
            💥 Price Attack (Coming Soon)
          </button>
          <button disabled className="btn-danger">
            🪖 Deploy Army (Coming Soon)
          </button>
          <button disabled className="btn-primary">
            🏰 Siege Hub (Coming Soon)
          </button>
        </div>

        {/* Surrender Option */}
        <div className="surrender-section">
          <button
            onClick={handleSurrender}
            className="btn-surrender"
            disabled={!isLeader}
          >
            🏳️ Surrender War
          </button>
          <p className="warning-text">
            Penalty: Lose 25% of treasury + contested territories
          </p>
        </div>
      </div>
    </GuildLayout>
  );
}
```

**2. Victory Progress Tracker Component**

```tsx
function VictoryProgressTracker({ war }: { war: GuildWar }) {
  return (
    <div className="victory-tracker">
      <h3>Victory Conditions</h3>

      {/* Market Dominance */}
      {war.targetItemId && (
        <div className="condition">
          <div className="condition-header">
            <span>📈 Market Dominance</span>
            <span>{war.marketDominanceDays}/7 days</span>
          </div>
          <Progress value={war.marketDominanceDays} max={7} />
          <p className="condition-desc">
            Control 60%+ of {war.targetItem?.name} trading for 7 consecutive days
          </p>
        </div>
      )}

      {/* Economic Collapse (placeholder for Phase 5) */}
      <div className="condition disabled">
        <div className="condition-header">
          <span>💰 Economic Collapse</span>
          <span>Coming Soon</span>
        </div>
        <p className="condition-desc">
          Reduce opponent's treasury below 10% of peak for 3 days
        </p>
      </div>

      {/* Territory Control (placeholder for Phase 4) */}
      {war.targetHubId && (
        <div className="condition disabled">
          <div className="condition-header">
            <span>🏰 Territory Control</span>
            <span>Coming Soon</span>
          </div>
          <p className="condition-desc">
            Capture and hold {war.targetHub?.name} for 48 hours
          </p>
        </div>
      )}
    </div>
  );
}
```

## Testing Checklist

**War Declaration:**
- [ ] Leader can declare war from accepted rivalry
- [ ] Non-leader cannot declare war
- [ ] Cannot declare with insufficient treasury (< 20k)
- [ ] Cannot declare with insufficient members (< 10)
- [ ] Cannot declare during 30-day cooldown
- [ ] Cannot declare war on ally
- [ ] Cannot declare if already in active war
- [ ] Entry fee deducted from treasury
- [ ] Both guilds notified

**War Tracking:**
- [ ] War created with correct initial state
- [ ] Scores start at 0
- [ ] Victory threshold set to 10,000
- [ ] Peak treasuries recorded
- [ ] Target item/hub saved if specified

**War Dashboard:**
- [ ] Shows correct guild names, scores
- [ ] Progress bars display correctly
- [ ] Victory conditions show appropriate progress
- [ ] Recent actions timeline populates
- [ ] Action buttons disabled (Phase 1)
- [ ] Surrender button visible to leader only

**War Ending:**
- [ ] Surrender calculates 25% penalty correctly
- [ ] Gold transferred from loser to winner
- [ ] Contested hubs transferred (if applicable)
- [ ] War status updated to SURRENDERED
- [ ] Both guilds notified of outcome
- [ ] War moved to history

**Edge Cases:**
- [ ] Handle guild dissolution during war
- [ ] Handle alliance deletion during war
- [ ] Handle concurrent surrender attempts
- [ ] Handle negative treasury scenarios

## Dependencies

**Existing Systems:**
- `GuildAlliance` model (already exists)
- `Guild` model with treasury (already exists)
- `GuildMember` model with roles (already exists)
- `GuildLog` for activity tracking (already exists)
- Notification system (needs implementation or stub)

**Required for Future Phases:**
- `GuildWarAction` model (Phase 2)
- `GuildArmy` model (Phase 3)
- `HubOwnership` model (Phase 4)

## Migration Strategy

**Step 1: Create enums**
```sql
CREATE TYPE "WarStatus" AS ENUM (
  'ACTIVE',
  'GUILD1_VICTORY',
  'GUILD2_VICTORY',
  'STALEMATE',
  'ABANDONED',
  'SURRENDERED'
);
```

**Step 2: Create GuildWar table**
```sql
CREATE TABLE "GuildWar" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "allianceId" UUID NOT NULL UNIQUE REFERENCES "GuildAlliance"("id") ON DELETE CASCADE,
  "status" "WarStatus" NOT NULL DEFAULT 'ACTIVE',
  -- ... (all other fields)
);
```

**Step 3: Add indexes**
```sql
CREATE INDEX "GuildWar_status_idx" ON "GuildWar"("status");
CREATE INDEX "GuildWar_guild1Id_idx" ON "GuildWar"("guild1Id");
CREATE INDEX "GuildWar_guild2Id_idx" ON "GuildWar"("guild2Id");
```

## Related Stories

- **US-GW-002**: Market Warfare (price manipulation)
- **US-GW-003**: Guild Armies (recruitment, raids)
- **US-GW-004**: Hub Control (sieges, tolls)
- **US-GW-005**: Victory Conditions (automated resolution)
- **US-GW-006**: Balance & Polish

## Notes

- Phase 1 provides foundation - wars exist but limited actions available
- Action buttons will be enabled in Phase 2-4 as features are implemented
- Victory conditions partially tracked (market dominance only) - full automation in Phase 5
- Consider adding war chat channel for guild coordination
- Consider adding war spectator mode (other players can watch)
- Economic warfare theme avoids needing combat mechanics
- Leverages existing trading/economy systems

## Success Metrics

- 30% of guilds participate in at least 1 war within first month
- Average war declaration rate: 5+ per week
- Wars last average 14-21 days (not instant surrenders)
- Guild treasury activity increases 40% during wars
- Alliance formation increases 25% (strategic partnerships)
