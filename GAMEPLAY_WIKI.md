# Aurelian Gameplay Wiki

## Table of Contents

1. [Overview](#overview)
2. [Core Systems](#core-systems)
3. [Economy](#economy)
4. [Trading](#trading)
5. [Crafting](#crafting)
6. [Missions](#missions)
7. [Agents](#agents)
8. [Items & Inventory](#items--inventory)
9. [Guilds](#guilds)
10. [Social Features](#social-features)
11. [World & Travel](#world--travel)
12. [Server Events](#server-events)
13. [Progression](#progression)

---

## Overview

Aurelian is a multiplayer 2D trading and exploration game where players manage agents, complete missions, craft items, and trade in a dynamic economy. Players can form guilds, participate in server-wide events, and compete on leaderboards.

### Core Gameplay Loop
1. **Hire Agents** - Build your team of specialized operatives
2. **Send on Missions** - Earn gold and gather resources
3. **Craft Items** - Transform raw materials into valuable goods
4. **Trade** - Buy and sell on the auction house
5. **Upgrade** - Level up agents and unlock new blueprints
6. **Collaborate** - Join guilds and participate in server events

---

## Core Systems

### Character & Profile
- **Display Name**: Your public identity in the game (default: "Trader" + UUID)
- **Avatar**: Customizable character appearance (JSON-based)
- **Onboarding**: Track tutorial and feature unlocks
- **Level Systems**:
  - Crafting Level (increases with XP from crafting)
  - Agent Levels (increases with mission experience)

### User Resources
- **Gold**: Primary currency for all transactions
- **Caravan Slots**: Determines how many simultaneous missions you can run
  - Default: 3 unlocked slots
  - Premium slots available for expansion
- **Inventory**: Storage for items across multiple locations

---

## Economy

### Gold System
- **Earning Gold**:
  - Complete missions (base rewards 50-500g depending on risk)
  - Sell items on the auction house
  - Complete crafting jobs for profit
  - Participate in server events
- **Spending Gold**:
  - Hire agents (100-400g depending on type)
  - Buy items from auction house
  - Pay auction fees (2-12% based on listing duration)
  - Pay travel tolls on trade routes

### Ledger System
All gold transactions are recorded with:
- Amount (positive = earned, negative = spent)
- Reason (mission completion, purchase, etc.)
- Metadata (additional context)
- Timestamp

### Market Dynamics
- **Dynamic Pricing**: Item prices fluctuate based on supply and demand
- **Market Events**: Special events that affect prices (shortages, booms, etc.)
- **Price Tracking**: Historical price data (PriceTick records)
- **Hub-Specific Prices**: Different locations have different prices

---

## Trading

### Auction House
Real-time multiplayer trading system using WebSocket connections.

#### Listing Items for Sale
**Requirements**:
- Item must be in your warehouse
- Must have sufficient quantity
- Choose listing duration

**Listing Parameters**:
- **Item**: What you're selling
- **Quantity**: How many units
- **Price Per Unit**: Your asking price
- **Duration Options**:
  - 6 min (2% fee)
  - 12 min (3% fee)
  - 24 min (5% fee)
  - 36 min (8% fee)
  - 60 min (12% fee)

**Auction Fees**: Deducted from your proceeds when item sells

**Example**:
- List 10 Iron Ore at 50g each for 24 minutes
- Total value: 500g
- Fee (5%): 25g
- You receive: 475g when sold

#### Buying from Auction
**Actions**:
- Browse active listings
- View seller information
- Compare prices to market value
- Purchase instantly if you have enough gold

**Purchase Flow**:
1. Click "Buy" on a listing
2. Gold is deducted immediately
3. Items added to your warehouse
4. Seller receives payment minus fees

#### Managing Listings
**Seller Actions**:
- Cancel active listings (items returned to warehouse)
- View your active listings
- Track listing age and expiration

**Automatic Expiration**:
- Listings expire after duration ends
- Items automatically returned to warehouse
- No refund on listing fees

### Contracts System
Private buy/sell agreements between players:
- **Status**: draft, active, completed, cancelled, breached
- **Terms**: Custom agreement parameters
- **Escrow**: Items held until contract completion

---

## Crafting

### Blueprint System
Recipes for creating items from raw materials.

#### Blueprint Properties
- **Required Level**: Minimum crafting level needed
- **Time**: Base crafting duration (10-60+ minutes)
- **Category**: general, weapons, armor, tools, etc.
- **Inputs**: Required materials and quantities
- **Output**: Item produced and quantity
- **XP Reward**: Experience gained on completion

#### Recipe Unlocking
**Starter Recipes**:
- Automatically unlocked at crafting level 1
- Basic items to get started

**Discoverable Recipes**:
- Unlock by reaching certain crafting levels
- May require specific achievements
- Some are hidden until discovered

#### Crafting Process
1. **Select Blueprint**: Choose from unlocked recipes
2. **Check Materials**: Ensure you have required items in warehouse
3. **Set Quantity**: Craft multiple items (10% time reduction for batches)
4. **Start Job**: Items are queued for crafting
5. **Wait**: Job completes after time elapses
6. **Claim Rewards**: Receive items and XP

#### Crafting Jobs
**Job Status**:
- `queued`: Waiting to start
- `running`: Currently in progress
- `complete`: Ready to claim
- `cancelled`: Job was cancelled
- `failed`: Job encountered error

**Quality System**: Common quality by default (expandable system)

#### Leveling & XP
- **Starting Level**: 1
- **XP Per Job**: Based on blueprint complexity
- **Level Benefits**:
  - Unlock new blueprints
  - Faster crafting times (future feature)
  - Access to rare recipes

---

## Missions

### Mission System
Send agents on timed expeditions to earn rewards.

#### Mission Properties
- **Name & Description**: Mission details
- **Route**: From Hub → To Hub
- **Distance**: Travel distance in km
- **Base Duration**: Time to complete (300-3600 seconds)
- **Base Reward**: Gold earned on success (50-500g)
- **Risk Level**: LOW, MEDIUM, HIGH
- **Item Rewards**: Additional items you can earn

#### Risk Levels
| Risk Level | Base Success Rate | Typical Duration | Reward Multiplier |
|-----------|------------------|------------------|-------------------|
| LOW       | 85%              | 5-10 minutes     | 1.0x              |
| MEDIUM    | 65%              | 15-30 minutes    | 1.5x              |
| HIGH      | 40%              | 30-60 minutes    | 2.5x              |

#### Starting a Mission
**Requirements**:
- Available agent (not on another mission)
- Available caravan slot
- Select mission from available list

**Process**:
1. Choose mission from Mission Control
2. Select agent to send
3. View success rate calculation
4. Confirm and send

**Success Calculation**:
```
Base Success Rate (by risk level)
+ Agent's Success Bonus
+ Equipment Bonuses
= Final Success Rate
```

#### Mission Completion
**Success**:
- Receive full gold reward (+ agent reward bonus)
- Receive all item rewards
- Agent gains experience

**Failure**:
- Receive partial gold (25-50% of base)
- No item rewards
- Agent still gains some experience

**Claiming Rewards**:
- Mission must reach ETA (estimated time of arrival)
- Click "Complete" button
- Rewards added to wallet and warehouse
- Agent becomes available again

#### Caravan Slots
- **Default**: 3 slots unlocked
- **Premium**: Additional slots via upgrades
- **Slot Status**: Shows which slots are occupied
- **Parallel Missions**: Run multiple missions simultaneously

---

## Agents

### Agent System
Hire specialized NPCs to handle missions and operations.

#### Agent Types
| Type       | Base Success | Base Speed | Base Reward | Hiring Cost | Description                    |
|-----------|-------------|-----------|-------------|-------------|--------------------------------|
| SCOUT     | +5%         | +15%      | +0%         | 100g        | Fast missions, great for exploration |
| TRADER    | +0%         | +0%       | +25%        | 200g        | Maximum rewards and profits    |
| GUARD     | +20%        | -5%       | +0%         | 150g        | High success rate, reliable    |
| SPECIALIST| +10%        | +5%       | +10%        | 400g        | Balanced stats, equipment bonus|

#### Hiring Agents
**Process**:
1. Visit Agent Management page
2. Select agent type
3. Pay hiring cost
4. Agent added to your roster
5. First agent receives starter equipment (bonus)

**Limits**: Maximum 4 agents per player

#### Agent Leveling
**Experience Gain**:
- Complete missions (success or failure)
- Higher risk missions = more XP
- Equipment may provide XP bonuses

**Level Benefits**:
- Increased base stats
- Can equip higher-level gear
- Better mission success rates

**Level Progress**:
```
XP to Next Level = Current Level × 100
Example: Level 3 → 4 requires 300 XP
```

#### Equipment System

**Equipment Slots**:
1. **Weapon** ⚔️ - Offensive bonuses
2. **Armor** 🛡️ - Defensive bonuses
3. **Tool** 🔧 - Utility bonuses
4. **Accessory** 💎 - Special bonuses

**Equipment Properties**:
- **Rarity**: COMMON, UNCOMMON, RARE, EPIC, LEGENDARY
- **Success Bonus**: Improves mission success rate
- **Speed Bonus**: Reduces mission duration
- **Reward Bonus**: Increases gold earned
- **Min Level**: Required agent level
- **Agent Type**: Some items are type-specific

**Equipping Items**:
1. Item must be in your warehouse
2. Agent must meet level requirement
3. Agent type must match (if specified)
4. Click equipment slot on agent
5. Select item from available list
6. Bonuses apply immediately

**Starter Equipment**:
- Basic gear for new players
- Can be claimed once
- Provides small bonuses to get started

---

## Items & Inventory

### Item System

#### Item Properties
- **Key**: Unique identifier (e.g., "iron_ore")
- **Name**: Display name
- **Rarity**: COMMON, UNCOMMON, RARE, EPIC, LEGENDARY
- **Stack Size**: Maximum stack (default 9999)
- **Metadata**: Additional properties (JSON)

#### Core Trading Items
1. **Iron Ore** - Basic metal resource
2. **Herb** - Alchemical ingredient
3. **Hide** - Leather material
4. **Pearl** - Valuable gem
5. **Relic Fragment** - Rare artifact piece

#### Item Locations
Items can be stored in multiple locations:

**Warehouse**:
- Default storage location
- Used for crafting
- Used for auction listings
- Infinite capacity

**Caravan**:
- Items being transported on missions
- Limited by caravan capacity
- Items locked during mission

**Escrow**:
- Items held in contracts
- Released on contract completion
- Protected until terms met

### Inventory Management
**View Inventory**:
- By location (warehouse, caravan, escrow)
- By item type
- With quantity and value

**Item Actions**:
- List on auction house
- Use in crafting
- Attach to contracts
- Transfer between locations (future feature)

---

## Guilds

### Guild System
Player organizations for collaboration and competition.

#### Creating a Guild
**Requirements**:
- Unique guild name
- Unique guild tag (3-5 characters)
- Creation fee (varies)
- Minimum level (optional)

**Guild Properties**:
- **Name & Tag**: Guild identity
- **Emblem**: Visual representation (JSON)
- **Description**: Guild purpose
- **Level**: Guild experience level
- **Treasury**: Shared gold pool
- **Max Members**: Capacity limit (default 50)

#### Guild Roles
| Role    | Permissions                                      |
|---------|--------------------------------------------------|
| LEADER  | All permissions, can disband guild              |
| OFFICER | Invite/kick members, manage warehouse, set taxes|
| TRADER  | Access guild warehouse, contribute              |
| MEMBER  | Basic guild features, chat access               |

#### Joining a Guild
**Methods**:
1. **Invitation**: Officer/Leader sends invite
2. **Application**: Submit join request to guild
3. **Direct Join**: Open guilds (if enabled)

**Guild Invites**:
- Expire after set time
- Can include personal message
- Accept/decline options

**Guild Requests**:
- Status: PENDING, APPROVED, REJECTED, EXPIRED
- Reviewed by officers/leader
- Include application message

#### Guild Features

**Guild Warehouse**:
- Shared item storage
- Members can deposit items
- Permissions control withdrawals
- Track contributions

**Guild Treasury**:
- Shared gold pool
- Fund guild upgrades
- Support guild missions
- Distribute rewards

**Guild Channels**:
- Private chat channels
- Role-based access
- Multiple channels per guild
- Active/inactive status

**Guild Logs**:
- Audit trail of actions
- Member joins/leaves
- Warehouse transactions
- Role changes

**Guild Achievements**:
- Unlock by completing objectives
- Provide guild bonuses
- Permanent unlocks
- May include rewards

#### Guild Alliances
Form relationships with other guilds.

**Alliance Types**:
- **ALLIANCE**: Friendly cooperation
- **RIVALRY**: Competitive relationship
- **NEUTRAL**: No special relationship

**Alliance Status**:
- **PENDING**: Awaiting acceptance
- **ACCEPTED**: Active alliance
- **DECLINED**: Rejected proposal
- **EXPIRED**: Time limit reached

**Alliance Benefits** (for ALLIANCE type):
- Travel Tax Reduction: 35% discount
- Auction Fee Reduction: 12% discount
- Shared alliance chat channels
- Joint alliance missions

**Alliance Terms**:
- Custom agreement terms
- Expiration dates
- Can be broken by either party
- Penalty for breaking (optional)

**Alliance Missions**:
- Collaborative goals between allied guilds
- Shared requirements and rewards
- Participant tracking
- Tiered rewards based on contribution

#### Guild Leveling
**XP Sources**:
- Member missions completed
- Items contributed to warehouse
- Gold donated to treasury
- Alliance achievements
- Server event participation

**Level Benefits**:
- Increased member capacity
- Unlock guild features
- Better alliance terms
- Guild achievements

---

## Social Features

### Chat System

#### Channel Types
1. **GENERAL**: Server-wide public chat
2. **TRADE**: Trade announcements and deals
3. **GUILD**: Guild-only chat (per guild channel)
4. **ALLIANCE**: Alliance-wide chat
5. **DIRECT**: Private messages between players

#### Chat Features
- **Mentions**: Tag other players with @username
- **Reactions**: React to messages with emoji
- **Replies**: Thread-style conversations
- **Edit/Delete**: Modify your messages
- **Message History**: Persistent chat logs

#### Guild Channels
- Create custom channels
- Set role requirements
- Enable/disable channels
- Channel descriptions

### Mail System
Player-to-player asynchronous messaging.

#### Mail Features
**Sending Mail**:
- Choose recipient
- Set subject and content
- Add priority (LOW, NORMAL, HIGH, URGENT)
- Attach items (future feature)
- Set expiration date (optional)

**Mail Status**:
- UNREAD: Not yet viewed
- READ: Opened by recipient
- ARCHIVED: Saved for later
- DELETED: Moved to trash

**Mail Management**:
- Star important messages
- Organize with folders
- Reply to messages
- Forward to others

**Mail Blocking**:
- Block unwanted senders
- Block list management
- Reason tracking

---

## World & Travel

### Hub System
Trading posts and settlements connected by routes.

#### Hub Properties
- **Name**: Settlement identifier
- **Position**: X, Y coordinates
- **Safe Zone**: Whether PvP is disabled
- **Market**: Local pricing for goods
- **Links**: Connected routes to other hubs

#### Travel Routes
**Link Properties**:
- **Distance**: Travel time base
- **Risk**: Danger level of route
- **Toll**: Cost to use route
- **Capacity**: Max simultaneous travelers

**Route Booking**:
- Plan routes between hubs
- Calculate tolls and time
- Book travel slots
- View route summary

**Trade Routes**:
Players can create custom routes using TrailNodes:
- Define waypoints
- Set risk levels
- Create private paths
- Share with guild

---

## Server Events

### Server-Wide Missions
Massive collaborative events for all players.

#### Event Types
- **Gathering Events**: Collect X total items
- **Trading Events**: Complete Y trades
- **Gold Events**: Donate Z gold collectively

#### Event Structure
**Requirements**: Global objectives (JSON)
```json
{
  "iron_ore": 10000,
  "herbs": 5000,
  "gold": 100000
}
```

**Progress**: Real-time tracking of community contributions

**Tiers**: Different reward tiers based on contribution
- Bronze: Minimal participation
- Silver: Moderate contribution
- Gold: High contribution
- Platinum: Top contributors

#### Participation
**Contributing**:
- Donate items from warehouse
- Complete specific missions
- Make qualifying trades
- Participate during event window

**Tracking**:
- Individual contribution recorded
- Rank among participants
- Tier eligibility
- Joined timestamp

**Rewards**:
- Tiered rewards based on contribution
- One-time claim per player
- May include gold, items, blueprints
- Special achievements

**Event Status**:
- `scheduled`: Not yet started
- `active`: Currently running
- `completed`: Finished, claiming rewards
- `expired`: Ended without completion

---

## Progression

### Character Progression

#### Crafting Progression
**XP Gain**: Complete crafting jobs
**Level Up Benefits**:
- Unlock new blueprints
- Access rare recipes
- Improved crafting efficiency (future)

**XP Formula**:
```
XP Required = Current Level × 100
```

#### Agent Progression
**XP Gain**: Complete missions (success or failure)
**Level Up Benefits**:
- Increased base stats (+1% per level)
- Unlock equipment tiers
- Better mission rewards

### Activity Tracking

#### Daily Statistics
Track daily performance metrics:
- Gold earned and spent
- Missions completed and failed
- Items traded
- Items crafted
- Agents hired
- Active time (minutes)
- Login count

**Uses**:
- Personal progress tracking
- Leaderboards
- Achievements (future)
- Seasonal rewards (future)

#### Activity Log
Record all significant actions:
- Type of activity
- Description message
- Metadata (JSON details)
- Timestamp

**Common Activities**:
- Mission completion
- Item purchased/sold
- Crafting completed
- Agent hired
- Guild joined
- Achievement unlocked

---

## Player Actions Reference

### Core Actions

#### Economy Actions
- Earn gold from missions
- Spend gold on purchases
- View transaction history
- Track daily earnings

#### Trading Actions
- List items on auction house
- Buy from auction house
- Cancel your listings
- Create/manage contracts
- View market prices
- Track price history

#### Crafting Actions
- Unlock blueprints
- Start crafting jobs
- Complete crafting jobs
- Gain crafting XP
- Level up crafting

#### Mission Actions
- Browse available missions
- Start mission with agent
- Complete mission when ready
- Claim rewards
- View mission history

#### Agent Actions
- Hire new agents
- Level up agents
- Equip agent gear
- Unequip gear
- View agent stats
- Assign to missions

#### Inventory Actions
- View warehouse items
- View caravan items
- View escrow items
- Transfer between locations
- Use items in crafting
- List items for sale

#### Guild Actions
- Create guild
- Join guild
- Leave guild
- Invite members
- Promote/demote members
- Contribute to warehouse
- Donate to treasury
- Form alliances
- Participate in guild missions
- Chat in guild channels

#### Social Actions
- Send chat messages
- React to messages
- Mention players
- Send mail
- Read mail
- Block users
- Join channels
- Create private conversations

#### World Actions
- View hub locations
- Plan travel routes
- Pay route tolls
- Create custom trails
- Book travel slots

#### Event Actions
- View active server events
- Contribute to events
- Track event progress
- Claim event rewards
- View leaderboards

---

## Tips for New Players

### Getting Started
1. **Complete Tutorial**: Follow onboarding steps
2. **Hire First Agent**: Start with Scout (cheap, fast missions)
3. **Run Low-Risk Missions**: Build gold safely
4. **Claim Starter Equipment**: Equip your agent for better success
5. **Start Crafting**: Unlock basic blueprints and craft items
6. **Join Auction House**: Buy cheap materials, sell crafted goods
7. **Find a Guild**: Get support from experienced players

### Efficient Progression
1. **Balance Risk/Reward**: Mix low and medium risk missions
2. **Upgrade Equipment**: Better gear = better success rates
3. **Batch Crafting**: Save 10% time on quantity crafting
4. **Market Timing**: Buy low, sell high based on market events
5. **Agent Specialization**: Use right agent type for each mission
6. **Guild Collaboration**: Share resources and knowledge

### Advanced Strategies
1. **Trade Route Optimization**: Find profitable hub-to-hub routes
2. **Market Event Exploitation**: Capitalize on price fluctuations
3. **Alliance Benefits**: Maximize tax reductions
4. **Server Event Participation**: Earn unique rewards
5. **Diversified Portfolio**: Multiple income streams
6. **Risk Management**: Never over-commit resources

---

## FAQ

**Q: How many agents can I have?**
A: Maximum 4 agents per player.

**Q: How many missions can I run simultaneously?**
A: Depends on caravan slots. Default is 3, can be expanded.

**Q: What happens if a mission fails?**
A: You receive partial rewards (25-50% gold) and agent gains some XP.

**Q: Can I cancel a mission in progress?**
A: No, missions must complete or fail.

**Q: How do auction fees work?**
A: Fee percentage based on listing duration, deducted from proceeds when item sells.

**Q: Can I trade items directly with other players?**
A: Yes, via contracts system or guild warehouse.

**Q: What's the max guild size?**
A: Default 50 members, can be increased with guild levels.

**Q: Do crafting jobs continue offline?**
A: Yes, they complete based on server time.

**Q: Can I change my agent's type?**
A: No, agent types are permanent.

**Q: How do I unlock new blueprints?**
A: Level up crafting skill or discover through gameplay.

---

## Version History

**v1.0** - Initial Wiki Creation
- Documented all core systems
- Added player action reference
- Created comprehensive tables for reference
- Included beginner tips and FAQ

---

*This wiki will be updated as new features are added to Aurelian.*
