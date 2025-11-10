# US-GW-002: Market Warfare System

**Priority**: P1 - Post-MVP Endgame Content
**Estimated Effort**: 2 weeks
**Category**: Guild Wars - Market Manipulation
**Dependencies**: US-GW-001 (War Framework)

## User Story

As a **guild officer**, I want to **manipulate market prices to damage my war opponent's economy**, so that **my guild can gain war points and destabilize their trading profits**.

## Problem Statement

Wars exist (US-GW-001) but guilds have no attack mechanisms:
- Cannot execute price crashes (dump inventory to tank prices)
- Cannot execute price spikes (buy all supply to create shortages)
- Cannot track market dominance (trading volume control)
- No defensive stabilization tactics
- War scoring is manual/placeholder

**Impact**: Wars are declared but static - no actual economic warfare gameplay.

## Vision

Enable guilds to wage **economic warfare through market manipulation**:

**Offensive Tactics:**
1. **Price Crash** - Flood market with goods → opponent's inventory loses value
2. **Price Spike** - Buy entire supply → opponent can't craft/trade
3. **Volume Monopoly** - Control 60%+ trading volume → deny profits + war points

**Defensive Tactics:**
1. **Market Stabilization** - Counter-buy to prevent crashes
2. **Strategic Reserves** - Sell to counter spikes
3. **Diversification** - Trade multiple items to avoid monopoly

## Acceptance Criteria

**Price Crash Attack:**
- [ ] Guild officer can initiate price crash attack
- [ ] UI shows cost estimate (items needed + fees)
- [ ] Executes mass sell orders on target item
- [ ] Creates "surplus" MarketEvent (30-70% price reduction, 24h duration)
- [ ] Calculates opponent's inventory value loss
- [ ] Adds war points: `opponentLoss / 10`
- [ ] Logs attack in war timeline
- [ ] Both guilds notified

**Price Spike Attack:**
- [ ] Guild officer can initiate price spike attack
- [ ] UI shows cost estimate (gold needed to buy supply)
- [ ] Executes mass buy orders on target item
- [ ] Creates "shortage" MarketEvent (100-300% price increase, 24h duration)
- [ ] Prevents opponent from crafting (no materials)
- [ ] Adds war points: `goldSpent / 20`
- [ ] Logs attack in war timeline
- [ ] Both guilds notified

**Volume Monopoly:**
- [ ] Track last 24h trading volume by guild
- [ ] Calculate % control per item
- [ ] If 60%+ control held for 24h: +500 war points
- [ ] If 60%+ control for 7 consecutive days: Market Dominance victory (US-GW-005)
- [ ] Dashboard shows current dominance %
- [ ] Opponent can counter by trading same item

**Market Stabilization (Defense):**
- [ ] Guild can spend gold to counter attacks
- [ ] Stabilization reduces crash impact by 50%
- [ ] Stabilization reduces spike duration by 50%
- [ ] Costs 50% of attack gold amount
- [ ] Logs defense in timeline

**Attack Constraints:**
- [ ] 24h cooldown between attacks on same item
- [ ] Repeated attacks (within 24h) cost +50% each time
- [ ] Cannot attack if treasury < 10,000g
- [ ] Cannot attack if already bankrupt (< 10% peak)

**UI Components:**
- [ ] Market Warfare panel on war dashboard
- [ ] Attack selector (crash/spike/stabilize)
- [ ] Target item dropdown
- [ ] Cost calculator showing estimates
- [ ] Confirmation modal with impact preview
- [ ] Market dominance chart (% control per item)
- [ ] Price impact graph (historical with attack markers)

## Technical Solution

### Database Schema

**New Model: GuildWarAction**
```prisma
model GuildWarAction {
  id              String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  warId           String          @db.Uuid
  guildId         String          @db.Uuid
  actionType      WarActionType
  targetItemId    String?         @db.Uuid
  goldSpent       Int             @default(0)
  itemsUsed       Json?           // { itemId: quantity }
  armyDeployed    Int             @default(0)
  effectiveness   Float           @default(0) // 0-1, based on execution success
  pointsEarned    Int             @default(0)
  timestamp       DateTime        @default(now())
  result          Json?           // { priceChange, opponentDamage, etc. }

  war             GuildWar        @relation(fields: [warId], references: [id], onDelete: Cascade)
  guild           Guild           @relation(fields: [guildId], references: [id], onDelete: Cascade)
  targetItem      ItemDef?        @relation(fields: [targetItemId], references: [id])

  @@index([warId])
  @@index([guildId])
  @@index([timestamp])
  @@index([actionType])
}

enum WarActionType {
  PRICE_CRASH
  PRICE_SPIKE
  VOLUME_MONOPOLY
  SUPPLY_RAID          // Phase 3
  HUB_SIEGE            // Phase 4
  MARKET_STABILIZE
  TREASURY_DRAIN       // Phase 5
  DEFENSE              // Phase 3
}
```

**Update GuildWar model:**
```prisma
model GuildWar {
  // ... existing fields ...
  actions GuildWarAction[]
}
```

### API Endpoints

**1. POST /api/guild/market/manipulate**

**Request:**
```json
{
  "warId": "uuid",
  "manipulationType": "PRICE_CRASH" | "PRICE_SPIKE",
  "targetItemId": "uuid",
  "budget": 50000
}
```

**Response:**
```json
{
  "success": true,
  "action": {
    "id": "uuid",
    "actionType": "PRICE_CRASH",
    "goldSpent": 48250,
    "itemsUsed": { "iron-ore": 15000 },
    "effectiveness": 0.82,
    "pointsEarned": 6420,
    "result": {
      "priceChange": -0.67,
      "oldPrice": 8,
      "newPrice": 2.64,
      "opponentInventoryValue": 142000,
      "opponentLoss": 64200,
      "marketEventId": "uuid"
    }
  }
}
```

**Logic:**
```typescript
export async function POST(req: Request) {
  const session = await getSession(req);
  const { warId, manipulationType, targetItemId, budget } = await req.json();

  // 1. Verify guild member + officer role
  const membership = await prisma.guildMember.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ['LEADER', 'OFFICER'] }
    },
    include: { guild: true }
  });
  if (!membership) return error('Must be guild officer');

  // 2. Verify war exists and guild is participant
  const war = await prisma.guildWar.findUnique({
    where: { id: warId },
    include: { guild1: true, guild2: true }
  });
  if (!war) return error('War not found');
  if (war.status !== 'ACTIVE') return error('War not active');
  if (war.guild1Id !== membership.guildId && war.guild2Id !== membership.guildId) {
    return error('Guild not in this war');
  }

  // 3. Check treasury minimum
  if (membership.guild.treasury < 10000) {
    return error('Treasury too low (need 10k minimum)');
  }

  // 4. Check cooldown (24h per item)
  const recentAttack = await prisma.guildWarAction.findFirst({
    where: {
      warId,
      guildId: membership.guildId,
      targetItemId,
      actionType: manipulationType,
      timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });
  if (recentAttack) return error('24h cooldown active for this item');

  // 5. Check repeat attack penalty (50% cost increase each time in 24h)
  const recentAttacks = await prisma.guildWarAction.count({
    where: {
      warId,
      guildId: membership.guildId,
      actionType: manipulationType,
      timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });
  const costMultiplier = 1 + (recentAttacks * 0.5);
  const adjustedBudget = budget * costMultiplier;

  // 6. Check guild has budget
  if (membership.guild.treasury < adjustedBudget) {
    return error(`Insufficient treasury (need ${adjustedBudget}g with penalty)`);
  }

  // 7. Execute attack based on type
  let result;
  if (manipulationType === 'PRICE_CRASH') {
    result = await executePriceCrash(war, membership.guildId, targetItemId, adjustedBudget);
  } else if (manipulationType === 'PRICE_SPIKE') {
    result = await executePriceSpike(war, membership.guildId, targetItemId, adjustedBudget);
  } else {
    return error('Invalid manipulation type');
  }

  // 8. Deduct gold from treasury
  await prisma.guild.update({
    where: { id: membership.guildId },
    data: { treasury: { decrement: result.goldSpent } }
  });

  // 9. Update war scores
  const isGuild1 = war.guild1Id === membership.guildId;
  await prisma.guildWar.update({
    where: { id: warId },
    data: {
      [isGuild1 ? 'guild1Score' : 'guild2Score']: { increment: result.pointsEarned },
      [isGuild1 ? 'guild1GoldSpent' : 'guild2GoldSpent']: { increment: result.goldSpent }
    }
  });

  // 10. Create action record
  const action = await prisma.guildWarAction.create({
    data: {
      warId,
      guildId: membership.guildId,
      actionType: manipulationType,
      targetItemId,
      goldSpent: result.goldSpent,
      itemsUsed: result.itemsUsed,
      effectiveness: result.effectiveness,
      pointsEarned: result.pointsEarned,
      result: result
    }
  });

  // 11. Notify both guilds
  const opponentId = isGuild1 ? war.guild2Id : war.guild1Id;
  await Promise.all([
    notifyGuild(membership.guildId, {
      type: 'WAR_ACTION_SUCCESS',
      message: `${manipulationType} executed! Earned ${result.pointsEarned} points`,
      warId,
      actionId: action.id
    }),
    notifyGuild(opponentId, {
      type: 'WAR_ACTION_ENEMY',
      message: `Under attack! Enemy executed ${manipulationType}`,
      warId,
      actionId: action.id
    })
  ]);

  return json({ success: true, action });
}
```

**Helper: executePriceCrash**
```typescript
async function executePriceCrash(
  war: GuildWar,
  attackerGuildId: string,
  targetItemId: string,
  budget: number
) {
  // 1. Get attacker's guild warehouse inventory
  const inventory = await prisma.guildWarehouse.findFirst({
    where: { guildId: attackerGuildId, itemId: targetItemId }
  });
  if (!inventory || inventory.quantity === 0) {
    throw new Error('No inventory to dump');
  }

  // 2. Calculate how many items to sell (up to available)
  const quantityToSell = Math.min(inventory.quantity, Math.floor(budget / 2)); // Budget covers fees

  // 3. Get current market price
  const currentPrice = await getCurrentPrice(targetItemId);

  // 4. Calculate crash impact (30-70% reduction based on volume)
  const marketSupply = await getTotalMarketSupply(targetItemId);
  const dumpRatio = quantityToSell / (marketSupply || 1);
  const priceReduction = Math.min(dumpRatio * 0.5, 0.7); // Max 70% crash
  const newPrice = currentPrice * (1 - priceReduction);

  // 5. Create surplus MarketEvent (24h duration)
  const marketEvent = await prisma.marketEvent.create({
    data: {
      type: 'surplus',
      severity: priceReduction > 0.5 ? 'high' : priceReduction > 0.3 ? 'medium' : 'low',
      itemId: targetItemId,
      priceMultiplier: 1 - priceReduction,
      startedAt: new Date(),
      endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      description: `Market flooded with ${quantityToSell} units`
    }
  });

  // 6. Execute sales (deduct from guild warehouse)
  await prisma.guildWarehouse.update({
    where: { id: inventory.id },
    data: { quantity: { decrement: quantityToSell } }
  });

  // 7. Add gold from sales to guild treasury
  const goldEarned = quantityToSell * newPrice;
  await prisma.guild.update({
    where: { id: attackerGuildId },
    data: { treasury: { increment: goldEarned } }
  });

  // 8. Calculate opponent damage (their inventory loses value)
  const opponentId = war.guild1Id === attackerGuildId ? war.guild2Id : war.guild1Id;
  const opponentInventory = await prisma.guildWarehouse.findFirst({
    where: { guildId: opponentId, itemId: targetItemId }
  });
  const opponentInventoryValue = (opponentInventory?.quantity || 0) * currentPrice;
  const opponentLoss = opponentInventoryValue * priceReduction;

  // 9. Calculate war points (1 point per 10g damage)
  const pointsEarned = Math.floor(opponentLoss / 10);

  // 10. Calculate auction fees (assume 5% average)
  const goldSpent = Math.floor(quantityToSell * currentPrice * 0.05);

  return {
    goldSpent,
    itemsUsed: { [targetItemId]: quantityToSell },
    effectiveness: priceReduction / 0.7, // 0-1 scale
    pointsEarned,
    priceChange: -priceReduction,
    oldPrice: currentPrice,
    newPrice,
    opponentInventoryValue,
    opponentLoss,
    marketEventId: marketEvent.id
  };
}
```

**Helper: executePriceSpike**
```typescript
async function executePriceSpike(
  war: GuildWar,
  attackerGuildId: string,
  targetItemId: string,
  budget: number
) {
  // 1. Get all active market listings for target item
  const listings = await prisma.listing.findMany({
    where: {
      itemId: targetItemId,
      status: 'active'
    },
    orderBy: { price: 'asc' } // Buy cheapest first
  });

  if (listings.length === 0) {
    throw new Error('No market supply to buy');
  }

  // 2. Calculate how many we can buy with budget
  let totalCost = 0;
  let totalQuantity = 0;
  const purchases: { listingId: string; quantity: number; cost: number }[] = [];

  for (const listing of listings) {
    if (totalCost >= budget) break;

    const remainingBudget = budget - totalCost;
    const maxQty = Math.floor(remainingBudget / listing.price);
    const qtyToBuy = Math.min(maxQty, listing.qty);
    const cost = qtyToBuy * listing.price;

    totalCost += cost;
    totalQuantity += qtyToBuy;
    purchases.push({ listingId: listing.id, quantity: qtyToBuy, cost });
  }

  // 3. Execute purchases (simplified - actual implementation would use auction API)
  for (const purchase of purchases) {
    // Fulfill listing, transfer items to attacker guild warehouse
    // (Full implementation in actual code)
  }

  // 4. Calculate price spike (100-300% increase based on supply bought)
  const totalSupply = listings.reduce((sum, l) => sum + l.qty, 0);
  const buyRatio = totalQuantity / totalSupply;
  const priceIncrease = Math.min(buyRatio * 2, 3); // Max 300% spike
  const currentPrice = await getCurrentPrice(targetItemId);
  const newPrice = currentPrice * (1 + priceIncrease);

  // 5. Create shortage MarketEvent (24h duration)
  const marketEvent = await prisma.marketEvent.create({
    data: {
      type: 'shortage',
      severity: priceIncrease > 2 ? 'high' : priceIncrease > 1 ? 'medium' : 'low',
      itemId: targetItemId,
      priceMultiplier: 1 + priceIncrease,
      startedAt: new Date(),
      endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      description: `Market shortage: ${totalQuantity} units bought out`
    }
  });

  // 6. Calculate war points (1 point per 20g spent - less than crash)
  const pointsEarned = Math.floor(totalCost / 20);

  return {
    goldSpent: totalCost,
    itemsUsed: null,
    effectiveness: priceIncrease / 3, // 0-1 scale
    pointsEarned,
    priceChange: priceIncrease,
    oldPrice: currentPrice,
    newPrice,
    quantityBought: totalQuantity,
    marketEventId: marketEvent.id
  };
}
```

**2. GET /api/guild/market/dominance?warId=uuid**

Returns trading volume stats and market control percentages.

**3. POST /api/guild/market/stabilize**

Defensive counter-manipulation (reduces attack effectiveness by 50%, costs 50% of attack budget).

## UI Components

```tsx
function MarketWarfarePanel({ war }: { war: GuildWar }) {
  const [attackType, setAttackType] = useState<'crash' | 'spike'>('crash');
  const [targetItem, setTargetItem] = useState<string>('');
  const [budget, setBudget] = useState(10000);
  const { estimate, loading } = useAttackEstimate(attackType, targetItem, budget);

  const handleAttack = async () => {
    const confirmed = await confirm({
      title: 'Execute Market Attack?',
      message: `This will spend ${estimate.totalCost}g and earn ~${estimate.pointsEstimate} war points`,
      details: estimate
    });

    if (confirmed) {
      await executeAttack(war.id, attackType, targetItem, budget);
    }
  };

  return (
    <div className="market-warfare-panel">
      <h3>💥 Market Warfare</h3>

      {/* Attack Type Selector */}
      <div className="attack-selector">
        <button
          className={attackType === 'crash' ? 'selected' : ''}
          onClick={() => setAttackType('crash')}
        >
          📉 Price Crash
        </button>
        <button
          className={attackType === 'spike' ? 'selected' : ''}
          onClick={() => setAttackType('spike')}
        >
          📈 Price Spike
        </button>
      </div>

      {/* Target Item */}
      <div className="form-group">
        <label>Target Item</label>
        <select value={targetItem} onChange={(e) => setTargetItem(e.target.value)}>
          <option value="">Select item...</option>
          <option value="iron-ore">Iron Ore</option>
          <option value="herb">Herb</option>
          <option value="hide">Hide</option>
          <option value="pearl">Pearl</option>
          <option value="relic-fragment">Relic Fragment</option>
        </select>
      </div>

      {/* Budget Slider */}
      <div className="form-group">
        <label>Budget: {budget.toLocaleString()}g</label>
        <input
          type="range"
          min={5000}
          max={100000}
          step={5000}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
        />
      </div>

      {/* Cost Estimate */}
      {estimate && (
        <div className="attack-estimate">
          <h4>Estimated Impact:</h4>
          <div className="estimate-grid">
            <div className="stat">
              <label>Price Change</label>
              <span className={estimate.priceChange < 0 ? 'negative' : 'positive'}>
                {estimate.priceChange > 0 ? '+' : ''}{(estimate.priceChange * 100).toFixed(1)}%
              </span>
            </div>
            <div className="stat">
              <label>Opponent Damage</label>
              <span>{estimate.opponentDamage.toLocaleString()}g</span>
            </div>
            <div className="stat">
              <label>War Points</label>
              <span>+{estimate.pointsEstimate.toLocaleString()}</span>
            </div>
            <div className="stat">
              <label>Total Cost</label>
              <span>{estimate.totalCost.toLocaleString()}g</span>
            </div>
          </div>
        </div>
      )}

      {/* Execute Button */}
      <button
        onClick={handleAttack}
        disabled={!targetItem || loading}
        className="btn-attack"
      >
        {loading ? 'Calculating...' : '💥 Execute Attack'}
      </button>
    </div>
  );
}
```

## Testing Checklist

- [ ] Price crash reduces item price by 30-70%
- [ ] Price spike increases item price by 100-300%
- [ ] MarketEvents created with correct duration (24h)
- [ ] Opponent inventory value loss calculated correctly
- [ ] War points awarded based on damage formula
- [ ] Treasury deducted correctly
- [ ] 24h cooldown enforced per item
- [ ] Repeat attack penalty (+50% cost) applies
- [ ] Cannot attack with treasury < 10k
- [ ] Volume monopoly tracked accurately
- [ ] Stabilization reduces attack impact by 50%
- [ ] Both guilds notified of attacks
- [ ] War timeline shows attacks chronologically

## Related Stories

- **US-GW-001**: War Framework (prerequisite)
- **US-GW-003**: Guild Armies (army sabotage reduces manipulation effectiveness)
- **US-GW-005**: Victory Conditions (market dominance victory)

## Success Metrics

- Average 3+ price attacks per active war
- 60%+ of wars include market manipulation
- Price crashes cause average 40k gold opponent damage
- Price spikes create average 18h market shortage
- 20% of attacks countered with stabilization

## Notes

- Market warfare is the core economic gameplay loop
- Integrates with existing auction house and PriceTick systems
- Creates real consequences for non-participants (prices fluctuate)
- Defensive play is viable (stabilization, diversification)
- Consider adding "market insurance" for non-war guilds
