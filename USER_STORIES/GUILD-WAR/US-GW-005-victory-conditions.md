# US-GW-005: War Victory Conditions & Auto-Resolution

**Priority**: P1 - Post-MVP Endgame Content
**Estimated Effort**: 1 week
**Category**: Guild Wars - Victory System
**Dependencies**: US-GW-001 through US-GW-004

## User Story

As a **player**, I want **wars to automatically resolve when victory conditions are met**, so that **wars have definitive winners without requiring manual intervention**.

## Problem Statement

Wars can be declared and fought, but have no automated resolution:
- No automatic victory detection
- No automated spoils distribution
- Market dominance tracked but not checked for victory
- Economic collapse not monitored
- Hub conquest not enforced as victory
- Wars can drag on indefinitely
- Manual surrender is only exit path

**Impact**: Wars become stagnant, no climactic conclusions, unclear when wars end.

## Vision

Create **automated victory detection and resolution** system:
1. **Three Victory Paths**: Market Dominance, Economic Collapse, Hub Conquest
2. **Hourly Checks**: Worker service monitors all active wars
3. **Automatic Resolution**: War ends when condition met
4. **Spoils Distribution**: Winner receives 25% of loser's treasury + contested territories
5. **Notifications**: Both guilds notified with war summary

## Acceptance Criteria

**Victory Condition 1: Market Dominance**
- [ ] Track trading volume % per guild for target item
- [ ] If guild controls 60%+ for 7 consecutive days → Victory
- [ ] Reset counter if dominance drops below 60%
- [ ] Only applies if war has targetItemId set

**Victory Condition 2: Economic Collapse**
- [ ] Track each guild's peak treasury during war
- [ ] If opponent's treasury < 10% of peak for 3 consecutive days → Victory
- [ ] Treasury check runs daily at midnight UTC
- [ ] Applies to all wars (always active)

**Victory Condition 3: Hub Conquest**
- [ ] If war has targetHubId and attacker captures it → Victory
- [ ] Must hold hub for 48 consecutive hours
- [ ] If ownership changes hands, reset 48h timer
- [ ] Only applies if war has targetHubId set

**Automated Checks:**
- [ ] Worker service runs hourly
- [ ] Checks all ACTIVE wars for victory conditions
- [ ] Calls `resolveWar(warId, winnerId, reason)` when met
- [ ] Logs victory condition progress in war metadata

**War Resolution:**
- [ ] Update war status to GUILD1_VICTORY or GUILD2_VICTORY
- [ ] Calculate spoils: 25% of loser's treasury
- [ ] Transfer gold from loser to winner
- [ ] Transfer all contested hubs to winner (if any)
- [ ] Set war.endsAt timestamp
- [ ] Create final war summary report

**Notifications:**
- [ ] Winner notified: "Victory! Reason: [condition]. Spoils: [amount]g"
- [ ] Loser notified: "Defeat. Reason: [condition]. Lost: [amount]g + [X] territories"
- [ ] All guild members notified
- [ ] War result posted to guild activity log

**Stalemate Detection:**
- [ ] If war lasts 90+ days with no victor → Stalemate
- [ ] Status set to STALEMATE
- [ ] No spoils, territories remain unchanged
- [ ] Both guilds notified

## Technical Solution

### Database Changes

**Update GuildWar model:**
```prisma
model GuildWar {
  // ... existing fields ...

  // Victory condition tracking
  marketDominanceDays     Int       @default(0)
  currentDominant         String?   @db.Uuid
  guild1PeakTreasury      Int?
  guild2PeakTreasury      Int?
  guild1CollapseStreak    Int       @default(0)
  guild2CollapseStreak    Int       @default(0)
  hubCapturedAt           DateTime?
  hubHeldByGuildId        String?   @db.Uuid

  victoryReason           String? // MARKET_DOMINANCE, ECONOMIC_COLLAPSE, HUB_CONQUEST, SURRENDER, STALEMATE
}
```

### Worker Service - Victory Condition Checks

```typescript
// apps/worker/src/jobs/war-victory-checks.ts
export async function checkWarVictoryConditions() {
  const activeWars = await prisma.guildWar.findMany({
    where: { status: 'ACTIVE' },
    include: {
      guild1: true,
      guild2: true,
      targetHub: { include: { ownership: true } }
    }
  });

  for (const war of activeWars) {
    // Check 1: Market Dominance (if target item set)
    if (war.targetItemId) {
      await checkMarketDominance(war);
    }

    // Check 2: Economic Collapse (always active)
    await checkEconomicCollapse(war);

    // Check 3: Hub Conquest (if target hub set)
    if (war.targetHubId) {
      await checkHubConquest(war);
    }

    // Check 4: Stalemate (90+ days)
    await checkStalemate(war);
  }
}

async function checkMarketDominance(war: GuildWar) {
  const item = war.targetItemId;

  // Get last 24h trading volume by guild
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const volumes = await prisma.listing.groupBy({
    by: ['ownerId'],
    where: {
      itemId: item,
      status: 'sold',
      updatedAt: { gte: yesterday }
    },
    _sum: {
      price: true
    }
  });

  // Map to guild IDs (ownerId is userId, need to join through GuildMember)
  const guild1Volume = await calculateGuildVolume(war.guild1Id, volumes);
  const guild2Volume = await calculateGuildVolume(war.guild2Id, volumes);
  const totalVolume = guild1Volume + guild2Volume;

  const guild1Pct = totalVolume > 0 ? guild1Volume / totalVolume : 0;
  const guild2Pct = totalVolume > 0 ? guild2Volume / totalVolume : 0;

  let updateData: any = {};

  if (guild1Pct >= 0.6) {
    // Guild 1 dominates
    if (war.currentDominant === war.guild1Id) {
      updateData.marketDominanceDays = war.marketDominanceDays + 1;
    } else {
      updateData.currentDominant = war.guild1Id;
      updateData.marketDominanceDays = 1;
    }

    if (updateData.marketDominanceDays >= 7) {
      return await resolveWar(war.id, war.guild1Id, 'MARKET_DOMINANCE');
    }
  } else if (guild2Pct >= 0.6) {
    // Guild 2 dominates
    if (war.currentDominant === war.guild2Id) {
      updateData.marketDominanceDays = war.marketDominanceDays + 1;
    } else {
      updateData.currentDominant = war.guild2Id;
      updateData.marketDominanceDays = 1;
    }

    if (updateData.marketDominanceDays >= 7) {
      return await resolveWar(war.id, war.guild2Id, 'MARKET_DOMINANCE');
    }
  } else {
    // Neither dominates - reset
    updateData.marketDominanceDays = 0;
    updateData.currentDominant = null;
  }

  await prisma.guildWar.update({
    where: { id: war.id },
    data: updateData
  });
}

async function checkEconomicCollapse(war: GuildWar) {
  const guild1 = war.guild1;
  const guild2 = war.guild2;

  // Update peak treasuries if higher
  const guild1Peak = Math.max(war.guild1PeakTreasury || 0, guild1.treasury);
  const guild2Peak = Math.max(war.guild2PeakTreasury || 0, guild2.treasury);

  let updateData: any = {
    guild1PeakTreasury: guild1Peak,
    guild2PeakTreasury: guild2Peak
  };

  // Check if guild 1 collapsed (< 10% of peak)
  if (guild1.treasury < guild1Peak * 0.1) {
    updateData.guild1CollapseStreak = war.guild1CollapseStreak + 1;
    if (updateData.guild1CollapseStreak >= 3) {
      return await resolveWar(war.id, war.guild2Id, 'ECONOMIC_COLLAPSE');
    }
  } else {
    updateData.guild1CollapseStreak = 0;
  }

  // Check if guild 2 collapsed
  if (guild2.treasury < guild2Peak * 0.1) {
    updateData.guild2CollapseStreak = war.guild2CollapseStreak + 1;
    if (updateData.guild2CollapseStreak >= 3) {
      return await resolveWar(war.id, war.guild1Id, 'ECONOMIC_COLLAPSE');
    }
  } else {
    updateData.guild2CollapseStreak = 0;
  }

  await prisma.guildWar.update({
    where: { id: war.id },
    data: updateData
  });
}

async function checkHubConquest(war: GuildWar) {
  const hubOwnership = war.targetHub?.ownership;
  if (!hubOwnership) return; // Hub not owned yet

  const currentOwner = hubOwnership.ownerGuildId;

  // Check if attacker (guild1 or guild2) owns hub
  const attackerId = war.guild1Id; // Assume guild1 is attacker (or track separately)
  const defenderId = war.guild2Id;

  if (currentOwner === attackerId) {
    // Attacker owns hub - check how long
    if (war.hubHeldByGuildId === attackerId) {
      // Already tracking hold time
      const holdDuration = Date.now() - (war.hubCapturedAt?.getTime() || Date.now());
      const hours48 = 48 * 60 * 60 * 1000;

      if (holdDuration >= hours48) {
        return await resolveWar(war.id, attackerId, 'HUB_CONQUEST');
      }
    } else {
      // Just captured - start tracking
      await prisma.guildWar.update({
        where: { id: war.id },
        data: {
          hubCapturedAt: new Date(),
          hubHeldByGuildId: attackerId
        }
      });
    }
  } else {
    // Hub ownership changed or lost - reset timer
    await prisma.guildWar.update({
      where: { id: war.id },
      data: {
        hubCapturedAt: null,
        hubHeldByGuildId: null
      }
    });
  }
}

async function checkStalemate(war: GuildWar) {
  const warDuration = Date.now() - war.startedAt.getTime();
  const days90 = 90 * 24 * 60 * 60 * 1000;

  if (warDuration >= days90) {
    await resolveWar(war.id, null, 'STALEMATE');
  }
}

async function resolveWar(
  warId: string,
  winnerId: string | null,
  reason: string
) {
  const war = await prisma.guildWar.findUnique({
    where: { id: warId },
    include: { guild1: true, guild2: true, targetHub: { include: { ownership: true } } }
  });

  if (!war) return;

  let status: WarStatus;
  let spoils = 0;
  let loserGuild: Guild | null = null;
  let winnerGuild: Guild | null = null;

  if (winnerId === war.guild1Id) {
    status = 'GUILD1_VICTORY';
    winnerGuild = war.guild1;
    loserGuild = war.guild2;
  } else if (winnerId === war.guild2Id) {
    status = 'GUILD2_VICTORY';
    winnerGuild = war.guild2;
    loserGuild = war.guild1;
  } else {
    status = 'STALEMATE';
  }

  // Calculate spoils (25% of loser's treasury)
  if (loserGuild && winnerGuild) {
    spoils = Math.floor(loserGuild.treasury * 0.25);

    // Transfer gold
    await prisma.$transaction([
      prisma.guild.update({
        where: { id: loserGuild.id },
        data: { treasury: { decrement: spoils } }
      }),
      prisma.guild.update({
        where: { id: winnerGuild.id },
        data: { treasury: { increment: spoils } }
      })
    ]);

    // Transfer contested hubs
    if (war.targetHubId && war.targetHub?.ownership) {
      await prisma.hubOwnership.update({
        where: { hubId: war.targetHubId },
        data: { ownerGuildId: winnerId }
      });
    }
  }

  // Update war status
  await prisma.guildWar.update({
    where: { id: warId },
    data: {
      status,
      endsAt: new Date(),
      victoryReason: reason
    }
  });

  // Create war summary
  const summary = {
    reason,
    duration: Date.now() - war.startedAt.getTime(),
    finalScores: {
      guild1: war.guild1Score,
      guild2: war.guild2Score
    },
    spoils,
    territoriesTransferred: war.targetHubId ? 1 : 0
  };

  // Notify guilds
  if (winnerGuild && loserGuild) {
    await Promise.all([
      notifyGuild(winnerGuild.id, {
        type: 'WAR_VICTORY',
        message: `🎉 Victory! ${reason}. Spoils: ${spoils.toLocaleString()}g`,
        warId,
        summary
      }),
      notifyGuild(loserGuild.id, {
        type: 'WAR_DEFEAT',
        message: `💔 Defeat. ${reason}. Lost: ${spoils.toLocaleString()}g`,
        warId,
        summary
      })
    ]);
  } else {
    // Stalemate
    await Promise.all([
      notifyGuild(war.guild1Id, {
        type: 'WAR_STALEMATE',
        message: 'War ended in stalemate after 90 days.',
        warId,
        summary
      }),
      notifyGuild(war.guild2Id, {
        type: 'WAR_STALEMATE',
        message: 'War ended in stalemate after 90 days.',
        warId,
        summary
      })
    ]);
  }

  // Log to guild activity
  await Promise.all([
    createGuildLog(war.guild1Id, 'WAR_ENDED', summary),
    createGuildLog(war.guild2Id, 'WAR_ENDED', summary)
  ]);
}
```

## UI Components

```tsx
function VictoryProgressTracker({ war }: { war: GuildWar }) {
  return (
    <div className="victory-tracker">
      <h3>Victory Conditions</h3>

      {/* Market Dominance */}
      {war.targetItemId && (
        <VictoryConditionCard
          title="📈 Market Dominance"
          description={`Control 60%+ of ${war.targetItem?.name} trading for 7 days`}
          progress={war.marketDominanceDays}
          max={7}
          currentLeader={war.currentDominant}
          war={war}
        />
      )}

      {/* Economic Collapse */}
      <VictoryConditionCard
        title="💰 Economic Collapse"
        description="Reduce opponent's treasury below 10% of peak for 3 days"
        progress={Math.max(war.guild1CollapseStreak, war.guild2CollapseStreak)}
        max={3}
        currentLeader={
          war.guild1CollapseStreak > war.guild2CollapseStreak
            ? war.guild2Id
            : war.guild1Id
        }
        war={war}
      />

      {/* Hub Conquest */}
      {war.targetHubId && (
        <VictoryConditionCard
          title="🏰 Territory Control"
          description={`Capture and hold ${war.targetHub?.name} for 48 hours`}
          progress={
            war.hubCapturedAt
              ? Math.floor((Date.now() - war.hubCapturedAt.getTime()) / (1000 * 60 * 60))
              : 0
          }
          max={48}
          currentLeader={war.hubHeldByGuildId}
          war={war}
        />
      )}

      {/* Stalemate Warning */}
      {getWarDurationDays(war.startedAt) > 60 && (
        <Alert variant="warning">
          ⚠️ War has lasted {getWarDurationDays(war.startedAt)} days.
          Stalemate occurs at 90 days.
        </Alert>
      )}
    </div>
  );
}

function VictoryConditionCard({
  title,
  description,
  progress,
  max,
  currentLeader,
  war
}: VictoryConditionCardProps) {
  const { guild } = useGuild();
  const isLeading = currentLeader === guild.id;
  const progressPct = (progress / max) * 100;

  return (
    <div className={`victory-condition ${isLeading ? 'leading' : ''}`}>
      <div className="condition-header">
        <h4>{title}</h4>
        <span className="progress-text">
          {progress} / {max} {max < 10 ? 'days' : 'hours'}
        </span>
      </div>

      <ProgressBar
        value={progress}
        max={max}
        variant={isLeading ? 'success' : 'default'}
      />

      <p className="condition-desc">{description}</p>

      {currentLeader && (
        <div className="leader-badge">
          {isLeading ? (
            <Badge variant="success">✓ You are leading</Badge>
          ) : (
            <Badge variant="danger">⚠️ Opponent leading</Badge>
          )}
        </div>
      )}
    </div>
  );
}

function WarEndModal({ war, summary }: { war: GuildWar; summary: any }) {
  const { guild } = useGuild();
  const isVictor = war.status === 'GUILD1_VICTORY' && war.guild1Id === guild.id ||
                   war.status === 'GUILD2_VICTORY' && war.guild2Id === guild.id;

  return (
    <Modal open={true} onClose={() => {}}>
      <div className={`war-end-modal ${isVictor ? 'victory' : 'defeat'}`}>
        <h2>{isVictor ? '🎉 VICTORY!' : '💔 DEFEAT'}</h2>

        <div className="war-summary">
          <h3>War Summary</h3>

          <div className="summary-stats">
            <div className="stat">
              <label>Victory Condition</label>
              <span>{formatVictoryReason(war.victoryReason)}</span>
            </div>

            <div className="stat">
              <label>Duration</label>
              <span>{formatDuration(summary.duration)}</span>
            </div>

            <div className="stat">
              <label>Final Scores</label>
              <span>
                {summary.finalScores.guild1.toLocaleString()} vs{' '}
                {summary.finalScores.guild2.toLocaleString()}
              </span>
            </div>

            <div className="stat highlight">
              <label>{isVictor ? 'Spoils Earned' : 'Gold Lost'}</label>
              <span className={isVictor ? 'positive' : 'negative'}>
                {isVictor ? '+' : '-'}
                {summary.spoils.toLocaleString()}g
              </span>
            </div>

            {summary.territoriesTransferred > 0 && (
              <div className="stat">
                <label>Territories</label>
                <span>
                  {isVictor
                    ? `+${summary.territoriesTransferred} captured`
                    : `${summary.territoriesTransferred} lost`}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="action-buttons">
          <button onClick={() => window.location.href = '/guild/wars/history'}>
            View War History
          </button>
          <button onClick={() => window.location.href = '/guild'}>
            Return to Guild
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

## Testing Checklist

- [ ] Market dominance detected at 60% for 7 days
- [ ] Market dominance resets if drops below 60%
- [ ] Economic collapse detected at < 10% for 3 days
- [ ] Peak treasury tracked and updated correctly
- [ ] Hub conquest detected after 48h hold
- [ ] Hub conquest resets if ownership changes
- [ ] Stalemate triggered at 90 days
- [ ] War status updated correctly
- [ ] 25% spoils calculated and transferred
- [ ] Contested territories transferred to winner
- [ ] Both guilds notified with correct messages
- [ ] War summary created with all stats
- [ ] Worker service runs hourly
- [ ] Multiple active wars checked simultaneously

## Related Stories

- **US-GW-001**: War Framework
- **US-GW-002**: Market Warfare (dominance tracking)
- **US-GW-003**: Guild Armies
- **US-GW-004**: Hub Control (conquest victory)

## Success Metrics

- 70% of wars end via automated victory (not surrender)
- Victory distribution:
  - 40% Market Dominance
  - 30% Economic Collapse
  - 20% Hub Conquest
  - 10% Surrender/Stalemate
- Average war duration: 14-21 days
- 90% of players satisfied with victory conditions (survey)

## Notes

- Hourly checks provide good balance (not too frequent/expensive)
- Three victory paths ensure variety and strategy
- Stalemate prevents infinite wars
- 25% spoils is significant but not devastating
- Victory conditions encourage different playstyles
