# US-304: Guild Features Polish

**Priority**: P3 - MEDIUM
**Estimated Effort**: 4 hours

## Improvements

### 1. Complete Guild Wars UI

**File**: `apps/web/src/app/guild/wars/page.tsx`

Currently exists but needs:
- Display active wars
- Show war progress
- Allow declaring war (leader only)
- Show alliance missions

```typescript
export default function GuildWarsPage() {
  const [activeWars, setActiveWars] = useState([]);
  const [alliances, setAlliances] = useState([]);

  return (
    <GameLayout title="Guild Wars & Alliances">
      <div className="game-flex-col">
        {/* Active Wars */}
        <div className="game-card">
          <h3>⚔️ Active Wars</h3>
          {activeWars.length === 0 ? (
            <p className="game-muted">No active wars. Peace reigns... for now.</p>
          ) : (
            activeWars.map(war => (
              <div key={war.id} className="game-card-nested">
                <div className="game-space-between">
                  <h4>{war.attacker.name} vs {war.defender.name}</h4>
                  <span className="game-pill game-pill-warn">WAR</span>
                </div>
                <div className="game-progress-bar">
                  <div className="game-progress-fill" style={{ width: `${war.progress}%` }} />
                </div>
                <div className="game-space-between game-small">
                  <span>Ends: {formatTimeRemaining(war.endsAt)}</span>
                  <span>Victor: {war.winner || 'TBD'}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Alliances */}
        <div className="game-card">
          <h3>🤝 Alliances</h3>
          {alliances.map(alliance => (
            <div key={alliance.id} className="game-card-nested">
              <div className="game-space-between">
                <h4>{alliance.name}</h4>
                <span className="game-pill">{alliance.memberCount} guilds</span>
              </div>
              <p className="game-small">{alliance.description}</p>

              {/* Alliance Missions */}
              {alliance.missions.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong className="game-small">Alliance Missions:</strong>
                  {alliance.missions.map(mission => (
                    <div key={mission.id} className="game-space-between game-small">
                      <span>{mission.name}</span>
                      <span className="game-good">Reward: {mission.reward}g</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Declare War (Leader Only) */}
        {isGuildLeader && (
          <div className="game-card">
            <h3>⚔️ Declare War</h3>
            <p className="game-muted">
              Challenge another guild to war. Victory brings prestige and rewards.
            </p>
            <select className="game-select">
              <option>Select target guild...</option>
              {guilds.map(g => (
                <option key={g.id} value={g.id}>[{g.tag}] {g.name}</option>
              ))}
            </select>
            <button className="game-btn game-btn-warning" style={{ marginTop: '0.5rem' }}>
              ⚔️ Declare War (Cost: 5000g)
            </button>
          </div>
        )}
      </div>
    </GameLayout>
  );
}
```

### 2. Guild Achievements Implementation

**File**: `apps/web/src/app/guild/achievements/page.tsx`

Add achievement tracking and display:

```typescript
const GUILD_ACHIEVEMENTS = [
  { id: 'founder', name: 'Founded', icon: '🏛️', desc: 'Create a guild' },
  { id: 'treasury_1k', name: 'Funded', icon: '💰', desc: 'Reach 1000g in treasury' },
  { id: 'members_10', name: 'Growing', icon: '👥', desc: 'Reach 10 members' },
  { id: 'war_victor', name: 'Victorious', icon: '⚔️', desc: 'Win a guild war' },
  // ... more achievements
];

// Display with progress tracking
```

### 3. Guild Permissions System

Add role-based permissions for:
- Withdraw from treasury (limit by rank)
- Access warehouse (by rank)
- Invite members (officer+)
- Declare war (leader only)

```typescript
const GUILD_PERMISSIONS = {
  MEMBER: ['view_treasury', 'view_warehouse', 'chat'],
  OFFICER: ['invite_members', 'access_warehouse', 'withdraw_100g'],
  LEADER: ['all_permissions', 'declare_war', 'disband_guild']
};
```

## Testing
- [ ] Guild wars can be declared
- [ ] Alliances display correctly
- [ ] Achievements unlock properly
- [ ] Permissions enforced correctly
- [ ] Mobile responsive

## Notes
This is polish work - can be done post-MVP if time constrained.
