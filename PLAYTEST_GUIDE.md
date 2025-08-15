# 🗡️ Aurelian: The Exchange - Playtest Guide

Welcome to the comprehensive playtest guide for **Aurelian: The Exchange**, a multiplayer 2D trading game where you rebuild civilization through commerce after the fall of empires.

## 🎯 What is Aurelian?

Aurelian is a persistent multiplayer trading game where players:
- Form trade guilds to build roads and control hubs
- Engage in strategic trading, crafting, and territorial control
- Navigate dangerous routes with hired agents
- Build economic empires through risk and reward

---

## 🚀 Getting Started

### 1. Account Setup
1. Visit **https://aurelian.online**
2. Click **"Join the Exchange"** 
3. Enter your email for magic link authentication
4. Check your email and click the login link
5. You'll be redirected to the character creator

### 2. Character Creation
1. Navigate to `/creator` if not automatically redirected
2. Customize your character appearance:
   - **Hair style and color**
   - **Skin tone**
   - **Clothing colors**
   - **Accessories**
3. Character appearance affects social interactions but not gameplay mechanics
4. Save your character when satisfied

### 3. Initial Setup
- **Starting Gold**: You begin with a small amount of gold in your wallet
- **Empty Inventory**: Start with no items (acquire through missions/trading)
- **No Guild**: Begin as an independent trader
- **Basic Access**: All core features available immediately

---

## 💰 Core Trading Systems

### Auction House (`/auction`)
**Purpose**: Buy and sell items with other players

**How to Test**:
1. Navigate to Auction House
2. **Browse Listings**: View all active item listings
3. **Buy Items**: Click on listings to purchase (if you have enough gold)
4. **Sell Items**: Create new listings for items in your inventory
5. **Price Discovery**: Observe market prices for different items

**Key Features**:
- Real-time listing updates
- Instant purchase system
- Seller receives gold when item sells
- Items automatically transferred to buyer's inventory

### Market Intelligence (`/market`)
**Purpose**: Advanced market analytics and trading insights

**How to Test**:
1. Navigate to Market page
2. **Price Trends**: View historical price charts for all items
3. **Market Events**: See active events affecting prices
4. **Supply/Demand**: Analyze market conditions
5. **Trading Signals**: Get buy/sell recommendations
6. **Volume Analysis**: Track trading activity

**Key Features**:
- Real-time price tickers
- Interactive price history graphs
- Market event notifications
- Trend analysis algorithms
- Trading recommendations

### Warehouse (`/warehouse`)
**Purpose**: Manage your item inventory and storage

**How to Test**:
1. Navigate to Warehouse
2. **View Inventory**: See all owned items with quantities
3. **Item Details**: Click items for descriptions and stats
4. **Organization**: Items categorized by type
5. **Capacity**: Monitor storage limits

**Key Features**:
- Real-time inventory updates
- Item categorization (Iron Ore, Herbs, Hides, Pearls, Relic Fragments)
- Quantity tracking
- Value calculations

---

## 🗺️ Mission System

### Mission Overview (`/missions`)
**Purpose**: Send caravans on trading missions to earn gold and items

**How to Test**:
1. Navigate to Missions page
2. **Available Missions**: View list of possible routes
3. **Risk Levels**: 
   - **LOW**: 85-95% success rate, modest rewards
   - **MEDIUM**: 70-85% success rate, good rewards  
   - **HIGH**: 50-70% success rate, excellent rewards
4. **Start Mission**: Select mission and confirm
5. **Active Missions**: Track ongoing missions with timers
6. **Mission History**: View past mission results

**Mission Flow**:
1. Choose a mission (different hubs, risk levels, rewards)
2. Select which caravan to send (if you have multiple)
3. Wait for mission timer to complete
4. Receive results (success/failure with rewards/losses)
5. Items go to warehouse, gold to wallet

**Key Features**:
- Real-time countdown timers
- Success/failure probability calculations
- Dynamic rewards based on risk
- Mission completion notifications
- Statistics tracking (success rate, total earnings)

### Mission Statistics (`/missions/stats`)
- Personal performance metrics
- Success rates by risk level
- Total earnings and losses
- Mission completion counts

### Mission Leaderboards (`/missions/leaderboard`)
- Top traders by earnings
- Most successful agents
- Guild comparisons

---

## 👥 Agent System

### Agent Management (`/agents`)
**Purpose**: Hire specialists to improve mission success rates

**How to Test**:
1. Navigate to Agents page
2. **View Agents**: See hired agents with stats and levels
3. **Hire New Agents**: Add agents to your roster (costs gold)
4. **Agent Types**:
   - **Scout**: Improves route knowledge and risk assessment
   - **Trader**: Better negotiation and profit margins
   - **Guard**: Protects caravans from bandits and threats
   - **Specialist**: Unique skills for specific mission types

**Agent Progression**:
1. **Experience**: Agents gain XP from missions
2. **Leveling**: Higher levels = better stat bonuses
3. **Specialization**: Agents develop strengths over time
4. **Equipment**: Equip agents with gear for bonuses

**Equipment System**:
- **Weapon Slot**: Combat effectiveness for guards
- **Armor Slot**: Protection from damage
- **Tool Slot**: Specialized equipment for tasks
- **Accessory Slot**: Minor bonuses and utilities

**How Equipment Works**:
1. Acquire equipment through crafting or trading
2. Assign equipment to specific agents
3. Equipment provides stat bonuses (e.g., +5% success rate)
4. Higher quality equipment = better bonuses
5. Equipment affects mission outcome calculations

---

## 🔨 Crafting System

### Crafting Overview (`/crafting`)
**Purpose**: Create items, equipment, and valuable goods from raw materials

**How to Test**:
1. Navigate to Crafting page
2. **Blueprints**: View available recipes
3. **Material Requirements**: See what materials each recipe needs
4. **Start Crafting**: Begin crafting jobs (consumes materials immediately)
5. **Crafting Queue**: Monitor active jobs with timers
6. **Completed Items**: Collect finished products

**Crafting Mechanics**:
- **Time-Based**: All crafting takes real time to complete
- **Material Consumption**: Materials removed from warehouse when starting
- **Quality System**: Items can have different quality levels
- **Batch Crafting**: Create multiple items simultaneously
- **Skill Progression**: Improve crafting efficiency over time

**Blueprint Discovery**:
- Start with basic blueprints
- Unlock new recipes through missions and trading
- Advanced blueprints require rare materials
- Some blueprints are guild-exclusive

**Key Features**:
- Real-time crafting timers
- Automatic material consumption
- Quality randomization
- Batch processing
- Progress tracking

---

## 🏰 Guild System

### Guild Overview (`/guild`)
**Purpose**: Join or create trading guilds for collaborative gameplay

### Creating a Guild (`/guild/create`)
**How to Test**:
1. Navigate to Guild Creation
2. **Guild Name**: Enter unique guild name
3. **Guild Tag**: 3-5 character abbreviation
4. **Emblem**: Choose symbol and color
5. **Description**: Optional guild description
6. **Create**: Confirm creation (costs gold)

**Guild Emblem System**:
- Choose from medieval symbols (⚔️, 🛡️, 🏛️, etc.)
- Select background color
- Emblem displays throughout the game

### Guild Management (`/guild/manage`)
**Leadership Features** (Leaders/Officers only):
- **Invite Players**: Send guild invitations
- **Manage Members**: Promote/demote/remove members
- **Set Permissions**: Control member access levels
- **Guild Settings**: Modify guild information

### Guild Roles & Permissions
- **Leader**: Full control over guild
- **Officer**: Can invite, manage members, access treasury
- **Trader**: Can use guild warehouse, participate in activities
- **Member**: Basic guild access

### Guild Treasury (`/guild` → Treasury Tab)
**How to Test**:
1. **Deposit Gold**: Contribute personal gold to guild funds
2. **Withdraw Gold**: Leaders/Officers can withdraw for guild expenses
3. **Transaction History**: View all treasury activities
4. **Preset Amounts**: Quick deposit/withdraw buttons

### Guild Warehouse (`/guild/warehouse`)
**Purpose**: Shared storage for guild members

**How to Test**:
1. **Deposit Items**: Move items from personal warehouse to guild storage
2. **Withdraw Items**: Take items from guild storage (with permissions)
3. **Access Controls**: Different access levels by role
4. **Item Tracking**: See who deposited/withdrew items

### Guild Members (`/guild/members`)
- View all guild members
- See member roles and activity
- Manage member permissions (if authorized)
- Track member contributions

---

## 🤝 Alliance System (NEW!)

### Alliance Management (`/guild` → Alliances Tab)
**Purpose**: Form strategic partnerships with other guilds

**How to Test**:
1. Navigate to guild Alliances tab
2. **View Active Alliances**: See current partnerships
3. **Propose Alliance**: Send alliance offers to other guilds
4. **Manage Proposals**: Accept/decline incoming alliance requests

**Alliance Benefits**:
- **Travel Tax Reduction**: 25-50% lower costs on allied guild roads
- **Auction Fee Benefits**: 10-15% reduced fees in allied markets
- **Alliance Chat Channels**: Shared communication between allied guilds
- **Joint Mission Access**: Special cooperative missions
- **Safe Passage**: Protected travel in allied territories

**Alliance Proposal Process**:
1. **Target Selection**: Choose guild to ally with
2. **Terms Negotiation**: Set economic benefits and conditions
3. **Proposal Message**: Add context for the alliance request
4. **Waiting Period**: Target guild reviews and responds
5. **Activation**: Alliance becomes active upon acceptance

**Alliance Types**:
- **Trade Alliance**: Focus on economic benefits
- **Military Alliance**: Mutual protection and support
- **Research Alliance**: Shared blueprint and technology access

### Alliance Directory
- **Alliance List**: View all active alliances
- **Alliance Benefits**: See active economic bonuses
- **Joint Activities**: Participate in alliance missions
- **Alliance Activity Feed**: Track alliance-related events

### Alliance Channels (`/guild/channels`)
- **Guild-Only Channels**: Internal guild communication
- **Alliance Channels**: Shared channels with allied guilds
- **Officer Channels**: Leadership-only communication
- **Public Channels**: Open communication with all guilds

---

## 🗺️ Hub Travel System

### Interactive Map (`/hub-travel`)
**Purpose**: Plan and execute trading routes across the medieval world

**How to Test**:
1. Navigate to Hub Travel page
2. **Interactive Map**: Click on hubs and roads
3. **Route Planning**: Select origin and destination hubs
4. **Risk Assessment**: View route safety levels
5. **Caravan Selection**: Choose which caravan to send
6. **Execute Travel**: Confirm route and start journey

**Map Features**:
- **Medieval Aesthetic**: Organic curved roads following terrain
- **Hub Information**: Click hubs for economic data
- **Route Visualization**: Different road types (safe guild roads vs dangerous paths)
- **Real-time Activity**: See other players' caravan movements
- **Terrain Features**: Forests, mountains, rivers affecting routes

**Route Types**:
- **Guild Roads**: Safe, maintained routes (higher tolls)
- **Wild Paths**: Dangerous but free routes (higher risk)
- **Merchant Routes**: Balanced risk/reward paths

**Hub Specializations**:
- **Mining Towns**: Iron Ore and rare materials
- **Farming Communities**: Herbs and food supplies
- **Coastal Ports**: Pearls and luxury goods
- **Ancient Ruins**: Relic Fragments and artifacts

**Route Planning Factors**:
- **Distance**: Longer routes take more time
- **Safety**: Risk of caravan loss or damage
- **Tolls**: Costs for using guild-controlled roads
- **Capacity**: Caravan load limits
- **Speed**: Modified by agent skills and equipment

---

## 🎮 Multiplayer Features

### Real-time World (`/play`)
**Purpose**: Live multiplayer environment with character movement

**How to Test**:
1. Navigate to Play page
2. **Character Movement**: Use WASD or arrow keys to move
3. **Real-time Updates**: See other players moving in real-time
4. **Chat System**: Communicate with nearby players
5. **World Exploration**: Discover different areas and locations

**Multiplayer Systems**:
- **Movement Synchronization**: All players see each other's positions
- **Chat Integration**: Real-time messaging
- **Player Identification**: See character names and guild tags
- **Collision Detection**: Physics-based movement
- **World Events**: Shared events affecting all players

### Chat System
- **Public Chat**: Open communication with all players
- **Guild Chat**: Private communication with guild members
- **Alliance Chat**: Communication with allied guilds
- **Private Messages**: Direct player-to-player communication

---

## 📊 Advanced Features

### Market Analytics
- **Price History**: Historical data for all items
- **Trend Analysis**: Identify market patterns
- **Volatility Indicators**: Risk assessment for investments
- **Supply/Demand Ratios**: Market equilibrium analysis

### Market Events
- **Random Events**: Wars, plagues, discoveries affecting prices
- **Seasonal Changes**: Harvest seasons, winter demand
- **Guild Actions**: Large guild activities affecting markets
- **Economic Cycles**: Boom and bust periods

### Profile System (`/profile`)
- **Trading Statistics**: Personal performance metrics
- **Achievement System**: Unlock rewards for accomplishments
- **Reputation**: Standing in the trading community
- **Character Progression**: Long-term advancement

---

## 🔧 Admin Features (If Applicable)

### Admin Panel (`/admin`)
**Purpose**: Content management and system monitoring

**Admin Tools**:
- **Item Management** (`/admin/items`): Create/edit items
- **Blueprint Management** (`/admin/blueprints`): Manage crafting recipes
- **Mission Management** (`/admin/missions`): Configure available missions
- **Hub Management** (`/admin/hubs`): Edit hub properties
- **Equipment Management** (`/admin/equipment`): Manage gear and weapons
- **System Statistics**: Monitor server performance and player activity

---

## ✅ Testing Checklist

### Core Functionality Tests
- [ ] **Account Creation**: Register new account successfully
- [ ] **Character Creation**: Customize character and save
- [ ] **Basic Navigation**: Access all main game areas
- [ ] **Wallet Functionality**: Send/receive gold transactions
- [ ] **Inventory Management**: Store and organize items

### Trading System Tests
- [ ] **Auction House**: Buy and sell items successfully
- [ ] **Market Data**: View price trends and analytics
- [ ] **Warehouse**: Store and retrieve items
- [ ] **Price Discovery**: Observe realistic market pricing

### Mission System Tests
- [ ] **Mission Selection**: Choose and start missions
- [ ] **Timer Functionality**: Missions complete on schedule
- [ ] **Success/Failure**: Appropriate outcomes based on risk
- [ ] **Reward Distribution**: Correct gold and items awarded
- [ ] **Agent Impact**: Agents improve mission outcomes

### Agent System Tests
- [ ] **Agent Hiring**: Successfully recruit new agents
- [ ] **Equipment Assignment**: Equip agents with gear
- [ ] **Level Progression**: Agents gain experience and improve
- [ ] **Specialization**: Different agent types provide different benefits

### Crafting System Tests
- [ ] **Blueprint Access**: View available recipes
- [ ] **Material Consumption**: Materials properly consumed when crafting
- [ ] **Timing System**: Crafting completes at correct intervals
- [ ] **Quality System**: Items produced with varying quality levels
- [ ] **Batch Processing**: Multiple items crafted simultaneously

### Guild System Tests
- [ ] **Guild Creation**: Successfully create new guild
- [ ] **Member Management**: Invite, promote, and manage members
- [ ] **Treasury System**: Deposit and withdraw guild funds
- [ ] **Shared Warehouse**: Access and manage guild storage
- [ ] **Role Permissions**: Different access levels work correctly

### Alliance System Tests
- [ ] **Alliance Proposal**: Send alliance requests to other guilds
- [ ] **Alliance Acceptance**: Accept/decline alliance proposals
- [ ] **Economic Benefits**: Travel and auction fee reductions apply
- [ ] **Alliance Channels**: Communication with allied guilds
- [ ] **Joint Missions**: Access to alliance-only content

### Hub Travel Tests
- [ ] **Interactive Map**: Click and navigate map interface
- [ ] **Route Planning**: Select origin and destination successfully
- [ ] **Risk Assessment**: Different route safety levels displayed
- [ ] **Caravan Selection**: Choose appropriate caravan for journey
- [ ] **Travel Execution**: Complete travel between hubs

### Multiplayer Tests
- [ ] **Real-time Movement**: Character movement synchronized with other players
- [ ] **Chat System**: Send and receive messages in real-time
- [ ] **Player Identification**: See other players' names and guild affiliations
- [ ] **World Persistence**: Player actions and progress saved correctly

---

## 🐛 Known Issues & Limitations

### Current Limitations
- **Mobile Optimization**: Game designed primarily for desktop browsers
- **Tutorial System**: Limited onboarding for new players
- **Balance Issues**: Economic systems still being fine-tuned
- **Performance**: Large numbers of concurrent players may cause lag

### Reporting Bugs
When you encounter issues:
1. **Note Exact Steps**: What were you doing when the bug occurred?
2. **Browser Info**: Which browser and version are you using?
3. **Error Messages**: Screenshot any error messages
4. **Reproducibility**: Can you make the bug happen again?
5. **Impact**: How severely does this affect gameplay?

**Bug Report Format**:
```
**Bug Title**: Brief description
**Steps to Reproduce**: 
1. Step one
2. Step two
3. Step three
**Expected Result**: What should happen
**Actual Result**: What actually happened
**Browser**: Chrome/Firefox/Safari version
**Screenshots**: Attach if applicable
```

---

## 🎯 Key Areas for Feedback

### Gameplay Balance
- **Mission Difficulty**: Are risk/reward ratios appropriate?
- **Economic Balance**: Do prices feel realistic and fair?
- **Progression Speed**: Is character/guild advancement too slow/fast?
- **Agent Usefulness**: Do agents provide meaningful benefits?

### User Experience
- **Interface Clarity**: Is the UI intuitive and easy to navigate?
- **Information Availability**: Can you find the information you need?
- **Visual Design**: Does the medieval theme feel authentic?
- **Performance**: Are loading times and responsiveness acceptable?

### Social Features
- **Guild Mechanics**: Are guild benefits compelling enough?
- **Alliance System**: Do alliances provide meaningful strategic options?
- **Communication**: Are chat and messaging systems effective?
- **Competition**: Is there enough motivation for guild rivalry?

### Technical Issues
- **Stability**: Does the game crash or freeze?
- **Synchronization**: Are multiplayer features working smoothly?
- **Data Persistence**: Do your actions and progress save correctly?
- **Cross-browser Compatibility**: Does the game work in different browsers?

---

## 💡 Advanced Testing Scenarios

### Economic Testing
1. **Market Manipulation**: Try to artificially inflate/deflate item prices
2. **Arbitrage Opportunities**: Look for profitable price differences between hubs
3. **Guild Economy**: Test large-scale guild economic activities
4. **Alliance Benefits**: Verify economic bonuses actually apply

### Strategic Testing
1. **Multi-Guild Coordination**: Coordinate complex strategies between allied guilds
2. **Resource Control**: Attempt to monopolize specific trade goods
3. **Territory Control**: Test hub ownership and taxation systems
4. **Competitive Scenarios**: Engage in guild vs guild economic warfare

### Edge Case Testing
1. **Maximum Limits**: Test system limits (max gold, max items, max guild size)
2. **Concurrent Actions**: Perform multiple actions simultaneously
3. **Network Issues**: Test behavior during connection problems
4. **Rapid Actions**: Perform actions very quickly to test rate limiting

---

## 📞 Support & Feedback

### Getting Help
- **In-Game Issues**: Use the support chat or contact system
- **Technical Problems**: Check browser console for error messages
- **Gameplay Questions**: Ask other players in global chat
- **Bug Reports**: Use the structured format provided above

### Community
- **Discord**: Join the trading community discussions
- **Forums**: Participate in strategy discussions and feedback
- **Social Media**: Follow for updates and announcements

---

**Thank you for playtesting Aurelian: The Exchange!** 

Your feedback is crucial for creating the best possible trading game experience. Focus on having fun while exploring the medieval trading world, and don't hesitate to experiment with different strategies and approaches.

*May your caravans return loaded with gold and your guilds prosper!* ⚔️📦💰