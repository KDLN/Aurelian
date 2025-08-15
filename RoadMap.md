# 🗺️ Aurelian: The Exchange - Development Roadmap

## 🎯 Vision
A persistent multiplayer 2D trading game where players rebuild civilization through commerce after the fall of empires. Players form trade guilds to build roads, control hubs, and shape the emerging economy through strategic trading, crafting, and territorial control.

---

## ✅ Phase 0: Foundation (COMPLETED)
- [x] Monorepo structure with three services (web, realtime, worker)
- [x] Next.js 14 frontend with React 18
- [x] Colyseus WebSocket server for real-time multiplayer
- [x] Supabase authentication with magic links
- [x] PostgreSQL database with Prisma ORM
- [x] Docker containerization
- [x] Google Cloud Run deployment via GitHub Actions
- [x] 2D character creator with customizable sprites
- [x] Real-time multiplayer movement in game world
- [x] Database integration for wallet and inventory
- [x] Immersive landing page with world lore
- [x] Basic UI for all game systems

---

## 🗺️ Major Milestone: Hub & Path Travel System ✅ **JANUARY 2025**

A complete interactive medieval trading route system with:
- **Interactive SVG Map**: Click and hover interactions with hubs and routes
- **Organic Medieval Roads**: Curved paths following natural terrain (hills, rivers, forests)
- **Risk vs Reward Planning**: Safe guild roads vs dangerous wild paths
- **Economic Integration**: Toll systems, taxation, and resource specialties
- **Caravan Management**: Select caravans and plan optimal routes
- **Real-time Events**: Live activity feed showing trade successes and dangers
- **Authentic Medieval Aesthetic**: Wagon graphics, settlement towers, terrain patterns

*This represents a major leap toward the full vision of territorial control and guild-based economics.*

---

## 🚀 Phase 1: Core Trading Loop (CURRENT PRIORITY)

### 1.1 Working Missions System ⭐ **COMPLETED**
- [x] Connect missions to PostgreSQL database
- [x] Implement real-time caravan timers
- [x] Risk calculation system (LOW/MEDIUM/HIGH routes)
- [x] Success/failure dice rolls based on risk
- [x] Dynamic gold and item rewards
- [x] Mission history and statistics tracking
- [x] Caravan capacity limits
- [x] Multiple caravans per player
- [x] NPC/Agent hiring system (4 agent types: Scout, Trader, Guard, Specialist)
- [x] Agent equipment slots and gear effects (Weapon, Armor, Tool, Accessory)
- [x] Agent skill progression and specialization (Level-based stat bonuses per type)
- [x] Equipment impact on mission success rates (Calculated bonuses system)

### 1.2 Functional Crafting System ✅
- [x] Database-backed crafting queue
- [x] Material consumption from warehouse inventory
- [x] Real-time crafting timers with progress bars
- [x] Blueprint discovery and unlocking
- [x] Batch crafting with efficiency bonuses
- [x] Quality/rarity modifiers on crafted items
- [x] Crafting skill progression
- [x] Recipe book UI

### 1.3 Dynamic Market System ✅ **COMPLETE**
- [x] Supply and demand calculations (MarketPriceCalculator utility)
- [x] Market events system (database schema & MarketEvent table)
- [x] Trade volume tracking infrastructure (enhanced PriceTick schema)
- [x] Regional price differences support (hub-specific pricing schema)
- [x] Real-time price ticker updates (EnhancedTickerRoom with live market data)
- [x] Price history graphs and trends (API endpoints & frontend components)
- [x] Market analytics dashboard (comprehensive market overview & insights)
- [x] Trading signals and recommendations (trend analysis & buy/sell indicators)
- [x] Market event notifications (UI integration & real-time alerts)
- [ ] Market manipulation detection (algorithms & monitoring) *Future enhancement*
- [ ] Economic reports and forecasts (advanced analytics) *Future enhancement*

---

## 🏰 Phase 2: Trade Guilds & Territory Control

### 2.1 Guild System Foundation ✅ **COMPLETE**
- [x] Guild creation with naming and emblems
- [x] Member management and permissions
- [x] Role hierarchy (Leader, Officer, Trader, Member)
- [x] Guild treasury and shared warehouse
- [x] Guild-only chat channels
- [x] Guild achievements and leveling
- [x] Alliance and rivalry declarations
- [x] Guild wars and competitions
- [x] Member contribution tracking

### 2.2 Guild Alliance System ⭐ **NEXT PRIORITY**
- [ ] **Alliance Management**: Propose, accept, decline, and break alliances
- [ ] **Travel Tax Benefits**: 25-50% tax reduction on allied guild roads  
- [ ] **Auction Fee Benefits**: 10-15% fee reduction in allied markets
- [ ] **Alliance Chat Channels**: Shared communication between allied guilds
- [ ] **Safe Passage System**: No attacks in neutral zones between allies
- [ ] **Alliance Directory**: View all current alliances and benefits
- [ ] **Joint Mission Access**: Special multi-guild cooperative missions
- [ ] **Alliance Activity Feed**: Track alliance-related guild events
- [ ] **Alliance UI Integration**: Clear ally/enemy indicators throughout game

### 2.3 Hub-Based Guild Wars ⭐ **NEXT AFTER ALLIANCES**
- [ ] **Contest Declaration System**: Challenge other guilds for hub control
- [ ] **Economic Competition Mechanics**: Win through trade volume, missions, crafting activity
- [ ] **Real-time Contest Scoring**: Track guild performance during 7-day contests
- [ ] **Hub Control Benefits**: Tax revenue, reduced fees, strategic advantages
- [ ] **Contest Types**: Capture uncontrolled hubs or challenge existing owners
- [ ] **Victory Rewards**: Treasury bonuses, ongoing tax income, prestige achievements
- [ ] **Hub Value Tiers**: Major/Regional/Minor hubs with different reward levels
- [ ] **Balancing Systems**: Maintenance costs, revolt risks, contest cooldowns
- [ ] **Contest UI**: Live leaderboards, activity tracking, strategic coordination tools

### 2.4 Hub Ownership & Taxation
- [ ] Advanced hub upgrade system (defenses, warehouses, markets)
- [ ] NPC guard hiring for defense
- [ ] Trade embargo powers
- [ ] Hub specialization bonuses (crafting, storage, speed)
- [ ] Inter-hub trade route management
- [ ] Hub prosperity and growth mechanics

### 2.5 Road Building & Infrastructure
- [ ] Guild-funded road construction projects
- [ ] Road quality tiers affecting travel speed
- [ ] Maintenance costs and road decay over time
- [ ] Toll collection for non-guild members
- [ ] Safe roads vs dangerous wilderness paths
- [ ] Bandit spawn reduction on maintained roads
- [ ] Bridge and tunnel construction
- [ ] Waystation placement for rest stops
- [ ] Road destruction during guild wars
- [ ] Caravan travel time affected by road quality
- [ ] Guild missions requiring bulk resource transport

---

## 🌟 Phase 3: Character Progression & World

### 3.1 Character Development
- [ ] Experience points from successful trades and missions
- [ ] Multi-path skill trees:
  - **Negotiation**: Better buy/sell prices, contract terms
  - **Logistics**: Faster caravans, larger capacity
  - **Crafting**: Higher quality goods, special recipes
  - **Diplomacy**: Guild benefits, NPC relations
  - **Combat**: Caravan defense, raid success
- [ ] Prestige levels and special titles
- [ ] Cosmetic unlocks and badges
- [ ] Legacy system for account-wide bonuses
- [ ] Mentor/apprentice relationships

### 3.2 Interactive World Map ⭐ **IN PROGRESS**
- [x] **Hub & Path Travel System**: Interactive SVG map with medieval roads
- [x] **Organic Road Visualization**: Curved paths following natural terrain  
- [x] **Risk vs Reward Route Planning**: Safe roads vs dangerous wild paths
- [x] **Caravan Selection Interface**: Choose and manage trading caravans
- [x] **Hub Ownership Display**: Visual indicators for guild/player controlled hubs
- [x] **Economic Information**: Tolls, taxes, and resource specialties per hub
- [x] **Medieval Terrain Features**: Forests, mountains, rivers affecting routes
- [x] **Real-time Event Log**: Recent caravan activities and encounters
- [ ] Live caravan position tracking on routes
- [ ] City prosperity indicators
- [ ] Weather effects on travel times
- [ ] Fog of war / map discovery
- [ ] Strategic waypoint placement
- [ ] Resource node locations
- [ ] Danger heat maps
- [ ] Multiple warehouse locations across world
- [ ] Caravan loading and transport between cities
- [ ] Price arbitrage between hub locations
- [ ] Backend integration for route planning

### 3.3 Enhanced Contract System
- [ ] Player-to-player binding contracts
- [ ] Recurring trade agreements
- [ ] Futures and options trading
- [ ] Insurance policies for caravans
- [ ] Breach penalties and enforcement
- [ ] Reputation system with consequences
- [ ] Escrow services for large deals
- [ ] Contract templates and negotiation

---

## 🎮 Phase 4: Advanced Gameplay

### 4.1 World Events & Seasons
- [ ] Seasonal trade goods (harvest, winter supplies)
- [ ] Dynamic world events:
  - Wars between NPC factions
  - Plague outbreaks affecting cities
  - New trade route discoveries
  - Resource discoveries
- [ ] Limited-time trading opportunities
- [ ] Festival markets with special items
- [ ] Guild competition seasons
- [ ] Leaderboards with rewards
- [ ] Historical event chronicle

### 4.2 Advanced Economics
- [ ] Multiple currency types
- [ ] Banking and lending system
- [ ] Investment opportunities in cities
- [ ] Stock market for guild shares
- [ ] Commodity futures exchange
- [ ] Economic indicators dashboard
- [ ] Inflation and deflation mechanics
- [ ] Trade sanctions and embargos

### 4.3 Conflict & Competition
- [ ] Caravan raid mechanics
- [ ] Trade route blockades
- [ ] Economic warfare options
- [ ] Sabotage missions
- [ ] Bounty hunting system
- [ ] Guild territory wars
- [ ] Mercenary hiring
- [ ] Privateering licenses

---

## 📱 Phase 5: Platform Expansion & Polish

### 5.1 Mobile Support
- [ ] Fully responsive design overhaul
- [ ] Touch-optimized controls
- [ ] Progressive Web App features
- [ ] Push notifications for timers
- [ ] Offline mode for viewing data
- [ ] Mobile-specific UI optimizations
- [ ] Cross-device save sync

### 5.2 Tutorial & New Player Experience
- [ ] Interactive tutorial campaign
- [ ] Contextual tooltips and help
- [ ] Practice mode with no losses
- [ ] New player protection period
- [ ] Mentor rewards system
- [ ] Achievement-guided progression
- [ ] Video tutorials and guides
- [ ] Tips loading screens

### 5.3 Social & Community Features
- [ ] Friends list and online status
- [ ] Direct messaging system
- [ ] Trade history sharing
- [ ] Screenshot and moment capture
- [ ] Guild recruitment board
- [ ] Player marketplace forums
- [ ] Trading post bulletin boards
- [ ] Social media integration

---

## 🔮 Phase 6: Endgame & Long-term Vision

### 6.1 Endgame Content
- [ ] Legendary trade routes to discover
- [ ] Ancient artifact trading system
- [ ] Guild capital cities
- [ ] Trade empire victory conditions
- [ ] Prestige rewards and bonuses
- [ ] Hall of Fame for top traders
- [ ] Server-wide cooperative goals
- [ ] New Game+ mode

### 6.2 User Generated Content
- [ ] Custom trade goods creation
- [ ] Player-designed missions
- [ ] Map editor for new regions
- [ ] Economic scenario creator
- [ ] Modding API and tools
- [ ] Community workshop
- [ ] Player-run events
- [ ] Custom guild emblems designer

### 6.3 Platform & Distribution
- [ ] Steam release preparation
- [ ] Epic Games Store consideration
- [ ] Native desktop application
- [ ] Console ports evaluation
- [ ] Localization (10+ languages)
- [ ] Regional servers (EU, Asia, etc.)
- [ ] Cross-platform play
- [ ] Cloud saves

---

## 🎯 Quick Wins (Implement Anytime)
- [ ] Sound effects and ambient music
- [ ] Particle effects for actions
- [ ] Chat emotes and reactions
- [ ] Daily login rewards
- [ ] Detailed statistics page
- [ ] Settings persistence
- [ ] Keyboard hotkeys
- [ ] UI color themes
- [ ] Accessibility options
- [ ] Auto-save indicators
- [ ] Connection status display
- [ ] Performance settings

---

## 🔧 Technical Improvements

### UI/CSS System Overhaul ✅ **COMPLETE**
- [x] **Custom CSS System**: Replaced Tailwind with game-styled CSS
- [x] **shadcn/ui Component Library**: CSS-only implementation
- [x] **Admin Panel Styling**: Consistent design system across admin pages
- [x] **Game Layout Integration**: Unified styling with existing game UI
- [x] **Responsive Design**: Mobile-friendly utility classes
- [x] **HSL Color System**: Theme-based color management

### Infrastructure & Performance
- [ ] Comprehensive test suite (unit, integration, e2e)
- [ ] Performance profiling and optimization
- [ ] Database query optimization
- [ ] Redis caching layer
- [ ] Rate limiting and DDoS protection
- [ ] Analytics integration (Mixpanel/Amplitude)
- [ ] Error tracking (Sentry)
- [ ] Monitoring and alerting
- [ ] Load balancing
- [ ] Backup and disaster recovery
- [ ] API documentation
- [ ] Developer documentation

---

## 🎨 Art & Visual Polish
- [ ] Expanded character customization
- [ ] Animated character sprites
- [ ] UI consistency pass
- [ ] Custom loading screens
- [ ] Story cutscenes
- [ ] Seasonal UI themes
- [ ] Item icon set
- [ ] Guild emblem system
- [ ] Weather visual effects
- [ ] Day/night cycle
- [ ] Terrain variety
- [ ] Building animations

---

## 💡 Community Ideas Backlog
*Ideas from players and ongoing development discoveries*

- [ ] Caravan customization (speed vs capacity tradeoffs)
- [ ] Black market for illegal goods
- [ ] Diplomatic missions between cities
- [ ] Explorer role for finding new routes
- [ ] Dynamic NPC trader AI
- [ ] Dutch auction system
- [ ] Resource extraction rights
- [ ] Guild banks with interest rates
- [ ] Trade apprenticeship program
- [ ] Historical trade museum
- [ ] Traveling merchant events
- [ ] Caravan insurance fraud detection
- [ ] Trade route monopolies
- [ ] Seasonal migration patterns
- [ ] Currency speculation
- [ ] Warehouse raids
- [ ] Trade secret espionage
- [ ] Merchant reputation tiers
- [ ] Cargo weight affecting speed
- [ ] Perishable goods with timers

---

## 📅 Current Focus (January 2025)
**Goal: Complete Hub & Path Travel System**

### Recently Completed ✅
- [x] Interactive medieval-style hub travel map
- [x] Organic curved roads with terrain features
- [x] Risk vs reward route planning interface
- [x] Custom CSS system replacing Tailwind
- [x] Admin panel styling improvements

### Current Sprint
- [ ] **Backend Integration**: Connect hub travel to database
- [ ] **Route Planning Logic**: Implement actual route calculation
- [ ] **Live Caravan Tracking**: Real-time position updates on map
- [ ] **Mission Integration**: Connect missions to hub travel system
- [ ] **Agent Assignment**: Link agents to specific caravans/routes

### Next Priority
- [ ] **Hub Ownership System**: Guild control mechanics
- [ ] **Toll Collection**: Revenue system for road owners
- [ ] **Road Building**: Infrastructure development features

---

## 📊 Success Metrics
- **Engagement**: Daily Active Users, Session Length
- **Economy**: Trade Volume, Market Liquidity
- **Social**: Guild Participation Rate, Chat Activity
- **Retention**: Day 1/7/30 Retention Rates
- **Monetization**: Premium Conversion (future)
- **Performance**: Server Response Time, Uptime

---

## 🚦 Development Principles
1. **Modular Architecture**: Features as independent modules
2. **Player-First Design**: Fun over complexity
3. **Economic Balance**: Prevent inflation/deflation spirals
4. **Fair Play**: No pay-to-win mechanics
5. **Community Driven**: Regular feedback integration
6. **Performance**: 60 FPS, <100ms latency target
7. **Accessibility**: Playable by all

---

*This is a living document. Last updated: January 2025*
*Version: 2.1 - Hub & Path Travel System Implementation*