# Guild & Server Mission System Plan

## Overview
Create collaborative mission systems that require multiple players to contribute resources, items, or complete objectives together for shared rewards. This system will encourage teamwork, create engaging content, and provide meaningful progression for both guilds and the entire server community.

## 1. Guild Mission System

### Database Schema

#### New Table: `GuildMission`
```prisma
model GuildMission {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  guildId           String   @db.Uuid
  name              String
  description       String
  type              String   // resource_gathering, treasury_funding, trade_volume, defense, construction
  requirements      Json     // {items: [{itemKey, quantity}], gold: number, objectives: [...]}
  progress          Json     // {items: {itemKey: collected}, gold: collected, objectives: {...}}
  rewards           Json     // {treasury: number, memberRewards: {...}, guildXP: number}
  minParticipants   Int      @default(3)
  maxParticipants   Int      @default(20)
  participantCount  Int      @default(0)
  status            String   @default("draft") // draft, active, completed, failed
  startedAt         DateTime?
  completesAt       DateTime?
  completedAt       DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  guild             Guild    @relation(fields: [guildId], references: [id])
  participants      GuildMissionParticipant[]
}
```

#### New Table: `GuildMissionParticipant`
```prisma
model GuildMissionParticipant {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  missionId       String   @db.Uuid
  userId          String   @db.Uuid
  guildId         String   @db.Uuid
  contribution    Json     // {items: {...}, gold: number, objectives: [...]}
  rewardClaimed   Boolean  @default(false)
  joinedAt        DateTime @default(now())
  contributedAt   DateTime?
  
  mission         GuildMission @relation(fields: [missionId], references: [id])
  user            User @relation(fields: [userId], references: [id])
  
  @@unique([missionId, userId])
}
```

### Mission Types

1. **Resource Gathering Missions**
   - Collect 500 Iron Ore for guild armory
   - Gather 1000 Herbs for guild alchemist
   - Requirements: Specific items and quantities
   - Rewards: Guild treasury + crafting materials

2. **Treasury Funding Missions**
   - Raise 10,000 gold for guild hall upgrade
   - Fund new trade route establishment
   - Requirements: Gold contributions
   - Rewards: Guild perks, member dividends

3. **Trade Volume Missions**
   - Complete 50 trade contracts as a guild
   - Sell 100,000 gold worth of goods
   - Requirements: Trading activity metrics
   - Rewards: Trade bonuses, merchant reputation

4. **Defense Missions**
   - Defend against NPC raids
   - Protect trade caravans
   - Requirements: Active participation during event
   - Rewards: Combat gear, defensive bonuses

5. **Construction Missions**
   - Build guild facilities (bank, workshop, etc.)
   - Requirements: Materials + gold + time
   - Rewards: New guild features unlocked

### File Structure
```
apps/web/src/
├── app/api/guild/missions/
│   ├── route.ts                    # GET (list), POST (create)
│   ├── [missionId]/
│   │   ├── route.ts                # GET (details), PATCH (update), DELETE
│   │   ├── contribute/route.ts     # POST (submit items/gold)
│   │   ├── claim/route.ts          # POST (claim rewards)
│   │   └── participants/route.ts   # GET (list participants)
│   └── active/route.ts             # GET (active missions only)
├── components/guild/
│   ├── GuildMissions.tsx           # Main mission management UI
│   ├── MissionCard.tsx             # Individual mission display
│   ├── ContributeModal.tsx        # Contribution interface
│   ├── MissionProgress.tsx        # Progress bar component
│   └── ParticipantList.tsx        # Show contributors
└── hooks/
    └── useGuildMissions.ts         # Mission state management

```

## 2. Server Mission System

### Database Schema

#### New Table: `ServerMission`
```prisma
model ServerMission {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name                String
  description         String   @db.Text
  type                String   // world_event, trade_festival, resource_drive, competition, seasonal
  globalRequirements  Json     // {items: {...}, gold: number, trades: number, etc.}
  globalProgress      Json     // Current server-wide progress
  rewards             Json     // {tiers: {bronze: {...}, silver: {...}, gold: {...}}}
  tiers               Json     // {bronze: 0.1, silver: 0.25, gold: 0.5} (percentage thresholds)
  status              String   @default("scheduled") // scheduled, active, completed, failed
  startedAt           DateTime?
  endsAt              DateTime
  completedAt         DateTime?
  createdAt           DateTime @default(now())
  
  participants        ServerMissionParticipant[]
}
```

#### New Table: `ServerMissionParticipant`
```prisma
model ServerMissionParticipant {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  missionId       String   @db.Uuid
  userId          String   @db.Uuid
  guildId         String?  @db.Uuid  // Optional guild affiliation
  contribution    Json     // Individual contribution details
  tier            String?  // bronze, silver, gold, legendary
  rank            Int?     // Leaderboard position
  rewardClaimed   Boolean  @default(false)
  joinedAt        DateTime @default(now())
  
  mission         ServerMission @relation(fields: [missionId], references: [id])
  user            User @relation(fields: [userId], references: [id])
  
  @@unique([missionId, userId])
}
```

### Mission Types

1. **World Events**
   - Dragon Attack: Defend all trade routes
   - Plague Outbreak: Deliver medical supplies
   - Requirements: Server-wide participation
   - Rewards: Temporary server buffs, exclusive items

2. **Trade Festival**
   - Boost server economy through trading
   - Double rewards for trade missions
   - Requirements: Total trade volume targets
   - Rewards: Economic bonuses, trader items

3. **Resource Drive**
   - Collect resources for server monuments
   - Unlock new areas/features
   - Requirements: Massive resource collection
   - Rewards: New content unlocked

4. **Guild Competition**
   - Guild vs guild leaderboards
   - Categories: trade, combat, crafting
   - Requirements: Guild participation
   - Rewards: Guild trophies, prestige

5. **Seasonal Events**
   - Holiday celebrations
   - Limited-time content
   - Requirements: Themed objectives
   - Rewards: Cosmetics, seasonal items

### File Structure
```
apps/web/src/
├── app/api/server/missions/
│   ├── route.ts                    # GET (list active for players)
│   ├── [missionId]/
│   │   ├── route.ts                # GET (details)
│   │   ├── participate/route.ts    # POST (submit contribution)
│   │   ├── leaderboard/route.ts   # GET (rankings)
│   │   └── claim/route.ts         # POST (claim rewards)
│   └── admin/
│       ├── route.ts                # GET (all missions), POST (create)
│       ├── [missionId]/
│       │   ├── route.ts            # PATCH (update), DELETE
│       │   ├── start/route.ts      # POST (activate mission)
│       │   ├── pause/route.ts      # POST (pause mission)
│       │   ├── end/route.ts        # POST (force end mission)
│       │   └── stats/route.ts      # GET (detailed analytics)
│       ├── templates/route.ts      # GET (mission templates)
│       └── analytics/route.ts      # GET (server mission overview)
├── components/server/
│   ├── ServerMissions.tsx          # Player server mission dashboard
│   ├── EventBanner.tsx             # Active event notification
│   ├── LeaderboardView.tsx         # Rankings display
│   ├── GlobalProgress.tsx          # Server progress bar
│   └── ContributionForm.tsx        # Submit contributions
├── components/admin/
│   ├── ServerMissionAdmin.tsx      # Admin mission control panel
│   ├── MissionCreator.tsx          # Create/edit mission interface
│   ├── MissionDashboard.tsx        # Live mission monitoring
│   ├── ParticipantAnalytics.tsx    # User participation analytics
│   └── MissionTemplates.tsx        # Pre-built mission templates
└── hooks/
    ├── useServerMissions.ts        # Server mission state (players)
    └── useAdminMissions.ts         # Admin mission management

```

## 3. Trigger System

### Guild Mission Triggers

#### Manual Creation
- Guild leaders/officers create custom missions
- Set requirements, rewards, duration
- Approve/reject participant contributions

#### Automatic Weekly Challenges
```typescript
// Cron job: Every Monday at 00:00 UTC
const weeklyMissions = [
  { type: 'resource', difficulty: guildLevel },
  { type: 'trade', difficulty: guildLevel },
  { type: 'treasury', difficulty: guildLevel }
];
```

#### Milestone Triggers
- Guild Level 5: Unlock defense missions
- Guild Level 10: Unlock construction missions
- Guild Level 15: Unlock alliance missions
- Guild Level 20: Create custom mission types

#### Alliance Missions
- Joint missions between 2+ allied guilds
- Shared requirements and rewards
- Strengthen alliance bonds

### Server Mission Triggers

#### Admin-Only Control System
Server missions are **exclusively triggered by administrators** to ensure proper timing, balance, and narrative control.

**Admin Panel Features:**
```typescript
interface AdminMissionControl {
  // Pre-defined mission templates
  templates: MissionTemplate[];
  
  // Active mission management
  activeMissions: ServerMission[];
  
  // Mission creation tools
  createCustomMission(config: MissionConfig): Promise<ServerMission>;
  
  // Mission control
  startMission(missionId: string): Promise<void>;
  pauseMission(missionId: string): Promise<void>;
  endMission(missionId: string, forced?: boolean): Promise<void>;
  
  // Real-time monitoring
  getMissionStats(missionId: string): MissionStats;
  getParticipantList(missionId: string): Participant[];
}
```

**Admin Trigger Scenarios:**
1. **Scheduled Events** - Admin manually activates planned events
2. **Special Occasions** - Holidays, community milestones, celebrations
3. **Emergency Events** - Server economy rebalancing, crisis events
4. **Testing** - New features, balance testing, stress tests
5. **Narrative Events** - Story-driven campaigns, lore progression
6. **Community Requests** - Player-suggested events approved by admin

**Admin Interface Features:**
- **Mission Templates**: Pre-built missions ready to activate
- **Custom Creator**: Build missions with custom requirements/rewards
- **Live Dashboard**: Monitor active missions in real-time
- **Participant Analytics**: See who's participating and their progress
- **Economic Impact**: Preview how rewards affect server economy
- **Emergency Controls**: Pause, modify, or end missions if needed

## 4. Reward Structure

### Guild Mission Rewards

#### Individual Rewards
```javascript
const calculateIndividualReward = (contribution, totalProgress, baseReward) => {
  const contributionPercent = contribution / totalProgress;
  return {
    gold: Math.floor(baseReward.gold * contributionPercent),
    items: distributeItems(baseReward.items, contributionPercent),
    xp: Math.floor(baseReward.xp * contributionPercent),
    contributionPoints: Math.floor(contributionPercent * 100)
  };
};
```

#### Guild Rewards
- Treasury: 20% bonus on all gold collected
- Guild XP: 100 * mission difficulty
- Perks: Unlock at milestone completions
- Buffs: Temporary bonuses for all members

### Server Mission Rewards

#### Tier System
```javascript
const rewardTiers = {
  bronze: { threshold: 0.1, multiplier: 1.0 },   // Any contribution
  silver: { threshold: 0.25, multiplier: 1.5 },  // 25% of personal goal
  gold: { threshold: 0.5, multiplier: 2.0 },     // 50% of personal goal
  legendary: { threshold: 'top10', multiplier: 3.0 } // Top 10 contributors
};
```

#### Server-Wide Benefits
- **Economic Boost**: +10% gold from all sources (24 hours)
- **XP Weekend**: Double XP gains (48 hours)
- **Rare Spawns**: Increased rare item drops (1 week)
- **New Content**: Unlock special areas/items

## 5. Implementation Timeline

### Phase 1: Guild Missions Foundation (Week 1)
- [ ] Create database migrations
- [ ] Basic CRUD APIs for guild missions
- [ ] Simple contribution system (gold only)
- [ ] Basic UI for viewing missions
- [ ] Join/leave mission functionality

### Phase 2: Advanced Guild Features (Week 2)
- [ ] Item contribution system
- [ ] Progress tracking UI
- [ ] Reward distribution system
- [ ] Mission creation interface for leaders
- [ ] Notification system for updates

### Phase 3: Server Missions (Week 3)
- [ ] Server mission database setup
- [ ] Global progress tracking
- [ ] Leaderboard implementation
- [ ] Event banner system
- [ ] Tier-based rewards

### Phase 4: Polish & Features (Week 4)
- [ ] Automated trigger system
- [ ] Analytics dashboard
- [ ] Achievement integration
- [ ] Mobile optimization
- [ ] Performance optimization

## 6. Technical Considerations

### Real-Time Updates
```typescript
// WebSocket events
socket.on('mission:progress', (data) => {
  updateMissionProgress(data.missionId, data.progress);
});

socket.on('mission:completed', (data) => {
  showCompletionNotification(data.missionId);
  distributeRewards(data.participants);
});
```

### Caching Strategy
- Mission definitions: 5 minute cache
- Progress updates: 30 second cache
- Leaderboards: 1 minute cache
- Use Redis for distributed caching

### Security Measures
- Validate all contributions server-side
- Rate limit: 10 contributions per minute
- Audit trail for all transactions
- Prevent double-claiming rewards
- Validate item ownership before contribution

### Performance Optimization
```sql
-- Key indexes
CREATE INDEX idx_guild_missions_status ON guild_missions(status);
CREATE INDEX idx_guild_missions_guild ON guild_missions(guild_id);
CREATE INDEX idx_participants_user ON guild_mission_participants(user_id);
CREATE INDEX idx_server_missions_active ON server_missions(status, ends_at);
```

### Data Archival
- Archive completed missions after 30 days
- Keep summary statistics permanently
- Compress contribution details
- Move to cold storage after 90 days

## 7. UI/UX Considerations

### Guild Mission Interface
- Dashboard showing active/available missions
- Progress bars with real-time updates
- Contribution history and leaderboard
- Quick contribution buttons
- Mobile-responsive design

### Server Mission Interface
- Prominent event banner
- Global progress indicator
- Personal progress tracker
- Leaderboard with filters (global/guild/friends)
- Countdown timers for events

### Notifications
- Mission started/completed
- Contribution received
- Reward available
- Rank changes
- Event reminders

## 8. Balance Considerations

### Preventing Exploitation
- Daily contribution limits
- Minimum contribution thresholds
- Cooldown between missions
- Anti-botting measures

### Encouraging Participation
- Low barrier to entry (small contributions count)
- Visible progress indicators
- Regular reward distributions
- Social recognition features

### Economic Impact
- Monitor gold inflation
- Balance reward values
- Adjust requirements based on server economy
- Consider item sinks for materials

## 9. Admin Control System

### Admin Mission Panel Interface

#### Dashboard Overview
```typescript
interface AdminDashboard {
  activeMissions: {
    total: number;
    byType: Record<string, number>;
    participation: number; // Total participants across all missions
  };
  
  templates: {
    available: MissionTemplate[];
    recent: MissionTemplate[]; // Recently used templates
  };
  
  analytics: {
    totalLaunched: number;
    successRate: number;
    avgParticipation: number;
    economicImpact: {
      goldDistributed: number;
      itemsAwarded: number;
    };
  };
}
```

#### Mission Creation Wizard
1. **Template Selection**: Choose from pre-built or create custom
2. **Requirements Setup**: Define contribution goals (items, gold, actions)
3. **Reward Configuration**: Set tier rewards and server-wide benefits  
4. **Timing Settings**: Duration, start time, end conditions
5. **Preview & Test**: Simulate mission before activation
6. **Launch Confirmation**: Final review and activation

#### Pre-Built Mission Templates

**Economic Events:**
```javascript
const tradeBoostEvent = {
  name: "Grand Trade Festival",
  type: "trade_festival", 
  duration: "72 hours",
  requirements: {
    serverTradeVolume: 1000000, // 1M gold in trades
    uniqueTraders: 200
  },
  rewards: {
    serverWide: { tradeBonus: 0.25, duration: 48 }, // +25% trade rewards for 48h
    tiers: {
      bronze: { minTrades: 5, reward: { gold: 500, items: ["merchant_badge"] }},
      silver: { minTrades: 20, reward: { gold: 1500, items: ["trade_certificate"] }},
      gold: { minTrades: 50, reward: { gold: 5000, items: ["master_trader_seal"] }}
    }
  }
};
```

**Community Events:**
```javascript
const dragonDefense = {
  name: "The Great Dragon Threat",
  type: "world_event",
  duration: "24 hours", 
  requirements: {
    totalDefenders: 500,
    itemsContributed: {
      "steel_sword": 100,
      "healing_potion": 500,
      "iron_armor": 200
    }
  },
  rewards: {
    serverWide: { 
      xpBonus: 0.5, // +50% XP for 24h
      rareSpawns: true // Enable rare monsters
    },
    individual: "Defender's Glory item set"
  }
};
```

#### Mission Control Interface

**Active Mission Management:**
- **Real-time Progress**: Live charts showing contribution progress
- **Participant List**: Who's contributing and their current tier
- **Mission Timeline**: Visual timeline with milestones
- **Emergency Controls**: Pause, extend, modify, or end early

**Administrative Actions:**
```typescript
// Mission control actions available to admin
interface MissionControls {
  // Basic controls
  pause(): void;           // Temporarily halt contributions
  resume(): void;          // Resume paused mission
  extend(hours: number): void; // Extend mission duration
  endEarly(): void;        // Force completion
  
  // Reward management
  adjustRewards(newRewards: RewardTier[]): void;
  distributeEarlyRewards(): void; // Distribute partial rewards
  
  // Participation management
  kickParticipant(userId: string): void;
  boostProgress(amount: number): void; // Manual progress boost
  
  // Communication
  broadcastMessage(message: string): void; // Message all participants
  sendNotification(type: NotificationType): void;
}
```

### Admin Authentication & Permissions
```typescript
// Secure admin-only endpoints
const adminRoutes = {
  middleware: [
    authenticateUser,
    requireAdmin, // Check user.isAdmin === true
    rateLimitAdmin // Stricter rate limits for admin actions
  ],
  
  permissions: {
    createMission: ['ADMIN', 'MODERATOR'],
    modifyActiveMission: ['ADMIN'],
    distributeBonusRewards: ['ADMIN'],
    endMissionEarly: ['ADMIN'],
    viewAnalytics: ['ADMIN', 'MODERATOR']
  }
};
```

### Mission Template System

#### Quick Launch Templates
- **Trade Surge**: Boost economy during slow periods
- **Resource Rally**: Collect materials for major updates
- **Combat Challenge**: PvE combat event with rare rewards  
- **Crafting Competition**: Boost crafting activity
- **Exploration Event**: Encourage new player exploration

#### Custom Mission Builder
```typescript
interface MissionBuilder {
  // Basic info
  setName(name: string): MissionBuilder;
  setDescription(desc: string): MissionBuilder;
  setDuration(hours: number): MissionBuilder;
  
  // Requirements
  addItemRequirement(itemKey: string, quantity: number): MissionBuilder;
  addGoldRequirement(amount: number): MissionBuilder;
  addActionRequirement(action: string, count: number): MissionBuilder;
  
  // Rewards
  setServerReward(type: string, value: any): MissionBuilder;
  addTierReward(tier: string, reward: Reward): MissionBuilder;
  
  // Build and validate
  build(): MissionTemplate;
  validate(): ValidationResult;
}
```

## 10. Future Enhancements

### Planned Admin Features
- **Mission Scheduling**: Queue missions to auto-start at specific times
- **A/B Testing**: Run parallel missions with different configurations
- **Player Feedback Integration**: Survey system for post-mission feedback
- **Economic Impact Modeling**: Predict mission effects before launch
- **Automated Templates**: AI-suggested missions based on server metrics

### Advanced Controls
- **Mission Chaining**: Link missions together for story campaigns
- **Conditional Triggers**: Missions that unlock based on previous results
- **Guild-Specific Variants**: Customize mission requirements per guild
- **Regional Events**: Missions affecting specific game areas
- **Cross-Server Events**: Coordinate with other game servers

### Integration Points
- **Achievement System**: Award special achievements for mission participation
- **Reputation System**: Mission performance affects player reputation
- **Territory Control**: Missions that affect guild territories
- **Market Manipulation**: Events that influence item prices
- **Seasonal Campaigns**: Story-driven multi-mission arcs

This admin-controlled system gives you complete narrative and economic control while providing engaging collaborative content for the entire player base.