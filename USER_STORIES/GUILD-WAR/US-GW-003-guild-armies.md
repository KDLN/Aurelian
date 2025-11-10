# US-GW-003: Guild Army System

**Priority**: P1 - Post-MVP Endgame Content
**Estimated Effort**: 2 weeks
**Category**: Guild Wars - Military Forces
**Dependencies**: US-GW-001 (War Framework), US-GW-002 (Market Warfare)

## User Story

As a **guild leader**, I want to **recruit and deploy guild armies**, so that **my guild can raid enemy trade routes, sabotage their market manipulation, and siege their territories**.

## Problem Statement

Guilds can declare wars and manipulate markets, but lack military capabilities:
- No way to fund or recruit armies
- Cannot intercept enemy caravans or trade routes
- Cannot reduce enemy market manipulation effectiveness
- Cannot siege hubs (prerequisite for Phase 4)
- No daily upkeep or maintenance costs (no ongoing gold sink)

**Impact**: Wars are purely economic with no strategic military layer.

## Vision

Create **guild-owned armies** (separate from personal agents) that provide:
1. **Trade Route Raids** - Intercept enemy caravans, steal goods
2. **Market Sabotage** - Reduce enemy price manipulation by 20%
3. **Hub Sieges** - Required for capturing territories (Phase 4)
4. **Treasury Defense** - Protect against economic attacks

Armies cost daily upkeep, creating ongoing expenses that drain treasuries.

## Acceptance Criteria

**Army Recruitment:**
- [ ] Guild leader/officer can recruit armies from treasury
- [ ] 4 army types: SCOUT, TRADER, GUARD, SPECIALIST
- [ ] Each type has different costs, strengths, and specializations
- [ ] Set training level (1-10) at recruitment
- [ ] Higher training = higher cost + upkeep
- [ ] Equipment can be purchased (weapons, armor, tools)

**Army Types & Stats:**
```
SCOUT Army:
- Cost: 500g per unit
- Upkeep: 50g/day per unit
- Specialty: Fast raids, low strength (0.8x base)
- Best for: Trade route interception

TRADER Army:
- Cost: 600g per unit
- Upkeep: 60g/day per unit
- Specialty: Market manipulation bonus (+20%)
- Best for: Price attack support

GUARD Army:
- Cost: 800g per unit
- Upkeep: 80g/day per unit
- Specialty: Defensive specialist (1.5x when defending)
- Best for: Protecting hubs, treasury defense

SPECIALIST Army:
- Cost: 1000g per unit
- Upkeep: 100g/day per unit
- Specialty: Siege experts (2x strength in sieges)
- Best for: Hub conquest
```

**Daily Upkeep System:**
- [ ] Automated daily upkeep deduction (cron job, midnight UTC)
- [ ] Formula: `totalUpkeep = Σ(quantity × baseUpkeep × training/10)`
- [ ] If treasury cannot pay: armies lose 10% strength per missed day
- [ ] If strength < 10%: armies desert (deleted from DB)
- [ ] Guild notified 24h before payment due
- [ ] Guild notified if payment missed

**Trade Route Raids:**
- [ ] Deploy SCOUT army to raid enemy caravans
- [ ] Target: Opponent's active RouteBookings (traveling agents)
- [ ] Success chance: `(attackerArmyStrength / (defenderArmyStrength + 100)) × 0.7`
- [ ] On success: Steal 10-30% of cargo
- [ ] On failure: Lose 20% of deployed army strength
- [ ] Costs: Army upkeep + 500g raid fee
- [ ] 12h cooldown per raid

**Market Sabotage:**
- [ ] Deploy TRADER army to sabotage enemy market manipulation
- [ ] Effect: Next enemy price attack has -20% effectiveness
- [ ] Duration: 24 hours
- [ ] Costs: 2,000g + army upkeep
- [ ] Stacks with market stabilization (total -70% effectiveness)

**Army Management UI:**
- [ ] `/guild/army` page showing composition
- [ ] Recruitment interface (type, quantity, training level)
- [ ] Equipment shop (buy weapons/armor/tools)
- [ ] Deployment panel (raid, sabotage, siege)
- [ ] Upkeep tracker (daily costs, payment status, morale)
- [ ] Army strength calculator

**Army Strength Formula:**
```typescript
const armyStrength =
  quantity ×
  training ×
  equipmentBonus ×
  typeMultiplier ×
  morale

where:
- quantity: number of units
- training: 1-10 level
- equipmentBonus: 1.0 + (weapons + armor + tools) / 100
- typeMultiplier: varies by action (0.8-2.0x)
- morale: 1.0 if paid, decreases 10%/day if unpaid
```

## Technical Solution

### Database Schema

**New Model: GuildArmy**
```prisma
model GuildArmy {
  id                String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  guildId           String      @db.Uuid
  agentType         AgentType   // SCOUT, TRADER, GUARD, SPECIALIST
  quantity          Int         @default(0)
  training          Int         @default(1) // 1-10
  strength          Float       @default(100) // 0-100%
  upkeepCost        Int         @default(50) // Base per unit per day
  lastPaidAt        DateTime    @default(now())
  equipment         Json?       // { weapons: 50, armor: 30, tools: 20 }
  createdAt         DateTime    @default(now())

  guild             Guild       @relation(fields: [guildId], references: [id], onDelete: Cascade)

  @@unique([guildId, agentType])
  @@index([guildId])
}
```

**Update GuildWarAction enum:**
```prisma
enum WarActionType {
  // ... existing types ...
  SUPPLY_RAID
  DEFENSE
}
```

**Add to Guild model:**
```prisma
model Guild {
  // ... existing fields ...
  armies GuildArmy[]
}
```

### API Endpoints

**1. POST /api/guild/army/recruit**

Request:
```json
{
  "agentType": "SCOUT",
  "quantity": 50,
  "trainingLevel": 5
}
```

Response:
```json
{
  "success": true,
  "army": {
    "id": "uuid",
    "agentType": "SCOUT",
    "quantity": 50,
    "training": 5,
    "upkeepCost": 50,
    "totalCost": 25000,
    "dailyUpkeep": 1250
  }
}
```

**2. POST /api/guild/army/deploy**

Request:
```json
{
  "warId": "uuid",
  "action": "SUPPLY_RAID",
  "armyType": "SCOUT",
  "quantity": 20,
  "targetRouteBookingId": "uuid"
}
```

**3. GET /api/guild/army/status**

Returns current armies, total strength, daily upkeep, payment status.

**4. POST /api/guild/army/equipment/buy**

Purchase equipment upgrades (weapons, armor, tools).

### Worker Service - Daily Upkeep

```typescript
// apps/worker/src/jobs/guild-army-upkeep.ts
export async function processGuildArmyUpkeep() {
  const armies = await prisma.guildArmy.findMany({
    include: { guild: true }
  });

  for (const army of armies) {
    // Calculate daily upkeep
    const dailyUpkeep = army.quantity * army.upkeepCost * (army.training / 10);

    // Check if 24h since last payment
    const hoursSincePayment =
      (Date.now() - army.lastPaidAt.getTime()) / (1000 * 60 * 60);

    if (hoursSincePayment < 24) continue;

    // Attempt to deduct from treasury
    if (army.guild.treasury >= dailyUpkeep) {
      await prisma.$transaction([
        prisma.guild.update({
          where: { id: army.guildId },
          data: { treasury: { decrement: dailyUpkeep } }
        }),
        prisma.guildArmy.update({
          where: { id: army.id },
          data: {
            lastPaidAt: new Date(),
            strength: 100 // Reset to full strength
          }
        }),
        prisma.guildLog.create({
          data: {
            guildId: army.guildId,
            action: 'ARMY_UPKEEP_PAID',
            meta: { armyType: army.agentType, amount: dailyUpkeep }
          }
        })
      ]);
    } else {
      // Cannot afford upkeep - reduce strength
      const newStrength = Math.max(0, army.strength - 10);

      if (newStrength === 0) {
        // Army deserts
        await prisma.guildArmy.delete({ where: { id: army.id } });
        await notifyGuild(army.guildId, {
          type: 'ARMY_DESERTED',
          message: `${army.agentType} army deserted due to unpaid upkeep!`
        });
      } else {
        await prisma.guildArmy.update({
          where: { id: army.id },
          data: { strength: newStrength }
        });
        await notifyGuild(army.guildId, {
          type: 'ARMY_UPKEEP_MISSED',
          message: `${army.agentType} army strength reduced to ${newStrength}%`
        });
      }
    }
  }
}
```

## UI Components

```tsx
function ArmyManagementPage() {
  const { armies, loading } = useGuildArmies();
  const { guild } = useGuild();

  const totalDailyUpkeep = armies.reduce((sum, army) =>
    sum + (army.quantity * army.upkeepCost * army.training / 10), 0
  );

  return (
    <GuildLayout title="Army Management">
      <div className="army-management">
        {/* Overview */}
        <div className="army-overview">
          <h2>Guild Forces</h2>
          <div className="stats-grid">
            <StatCard label="Total Strength" value={calculateTotalStrength(armies)} />
            <StatCard label="Daily Upkeep" value={`${totalDailyUpkeep}g/day`} />
            <StatCard label="Treasury" value={`${guild.treasury}g`} />
            <StatCard
              label="Days Until Bankrupt"
              value={Math.floor(guild.treasury / totalDailyUpkeep)}
              variant={guild.treasury / totalDailyUpkeep < 7 ? 'danger' : 'normal'}
            />
          </div>
        </div>

        {/* Army Composition */}
        <div className="army-composition">
          <h3>Force Composition</h3>
          {armies.map(army => (
            <ArmyUnitCard key={army.id} army={army} />
          ))}
        </div>

        {/* Recruitment Panel */}
        <RecruitmentPanel />

        {/* Deployment Panel */}
        <DeploymentPanel armies={armies} />

        {/* Equipment Shop */}
        <EquipmentShop armies={armies} />
      </div>
    </GuildLayout>
  );
}

function ArmyUnitCard({ army }: { army: GuildArmy }) {
  const typeInfo = getArmyTypeInfo(army.agentType);

  return (
    <div className="army-card">
      <div className="army-header">
        <h4>{typeInfo.icon} {army.agentType} Regiment</h4>
        <span className="quantity">{army.quantity} units</span>
      </div>

      <div className="army-stats">
        <div className="stat">
          <label>Training</label>
          <span>Level {army.training}</span>
        </div>
        <div className="stat">
          <label>Strength</label>
          <ProgressBar value={army.strength} max={100} />
        </div>
        <div className="stat">
          <label>Daily Upkeep</label>
          <span>{army.quantity * army.upkeepCost * army.training / 10}g</span>
        </div>
      </div>

      {army.equipment && (
        <div className="equipment">
          <label>Equipment:</label>
          <div className="equipment-badges">
            {army.equipment.weapons && <Badge>⚔️ Weapons +{army.equipment.weapons}</Badge>}
            {army.equipment.armor && <Badge>🛡️ Armor +{army.equipment.armor}</Badge>}
            {army.equipment.tools && <Badge>🔧 Tools +{army.equipment.tools}</Badge>}
          </div>
        </div>
      )}

      <div className="payment-status">
        {isPaymentDue(army.lastPaidAt) ? (
          <Alert variant="warning">⚠️ Payment due in {getHoursUntilDue(army.lastPaidAt)}h</Alert>
        ) : (
          <span className="paid">✓ Paid (next: {formatNextPayment(army.lastPaidAt)})</span>
        )}
      </div>
    </div>
  );
}
```

## Testing Checklist

- [ ] Can recruit armies (all 4 types)
- [ ] Training level affects cost correctly
- [ ] Daily upkeep calculated accurately
- [ ] Treasury deducted at midnight UTC
- [ ] Unpaid armies lose 10% strength per day
- [ ] Armies desert when strength reaches 0%
- [ ] Trade raids calculate success chance correctly
- [ ] Successful raids steal 10-30% of cargo
- [ ] Failed raids reduce army strength by 20%
- [ ] Market sabotage reduces enemy attack effectiveness
- [ ] Equipment bonuses apply to strength calculation
- [ ] Multiple armies of same type update quantity (@@unique constraint)
- [ ] Guild notified 24h before payment due
- [ ] Guild notified on missed payments

## Related Stories

- **US-GW-001**: War Framework
- **US-GW-002**: Market Warfare (TRADER armies boost price attacks)
- **US-GW-004**: Hub Control (SPECIALIST armies needed for sieges)

## Success Metrics

- 60%+ of warring guilds recruit at least one army
- Average army size: 50-100 units per guild
- 40% of guilds experience upkeep payment issues (creates tension)
- Trade raids succeed 45-55% of the time
- Market sabotage used in 30% of wars

## Notes

- Armies are separate from personal agents (different system)
- Daily upkeep creates ongoing gold sink
- Strategic depth: balance army size vs treasury drain
- Equipment upgrades provide long-term investment
- Morale system encourages keeping armies paid
