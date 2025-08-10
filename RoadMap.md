Full Game Development Roadmap — Based on Agreed Plans

Project Goal

Develop a persistent multiplayer 2D game featuring player creation, economy, crafting, quests, and an expandable path/trade hub network with a risk-versus-reward travel mechanic. Use React for the frontend, Supabase for backend/auth, Colyseus for real-time networking, and Prisma for database ORM. Support modular drop-ins to avoid overwriting community or team contributions.

1. Current Implemented Features (from mockups)

Basic player movement synced via Colyseus.

Placeholder 2D character creator.

Auction House UI mockup.

Crafting UI mockup.

Economy dashboard placeholder.

Static world map mockup with hub locations.

2. Planned Features

Player Creation & Management

Supabase account linking.

Multiple characters per user.

Persistent inventory, equipment, and stats.

Economy System

Player-to-player trades.

Auction House with bids, buy orders, and sell orders.

Price history and trend tracking.

Anti-cheat transaction logs.

Crafting System

Recipes combining gathered resources.

Time-gated and RNG crafting outcomes.

Crafting queue with cancellation/refund.

Blueprint discovery through quests/exploration.

Quest System

NPC and player-generated quests.

Rewards: currency, items, reputation.

Quest chains and repeatables.

Path & Trade Hub System

Safe hubs with guaranteed safety.

Player/guild toll gates.

Risky alternative paths with NPC/bandit ambushes.

Path construction tools for connecting hubs.

Spacing rules to prevent hub stacking.

3. Supporting Systems

Multiplayer chat.

Persistent inventory.

Marketplace price alerts.

Logging for economy and travel.

4. Development Path (Local & Prod)

Local Setup

Clone repo.

Install dependencies (npm install).

Configure .env with Supabase keys.

Start backend (npm run dev:realtime).

Start frontend (npm run dev:web).

Validate database and real-time connection.

Production Setup

Host frontend (Vercel/Netlify or similar).

Host backend (Render/custom server or Google Cloud Run).

Use Supabase for production DB.

Configure DNS and SSL.

Optional: Store static assets and backups in Google Cloud Storage.

5. Roadmap & Milestones

Phase 1 — Core Foundations (Weeks 1–2)

Supabase auth integration.

Prisma schema for User, Character, Inventory.

Google Cloud project setup for hosting and storage.

Phase 2 — Economy & Crafting (Weeks 3–4)

Auction House backend + UI integration.

Currency & transaction systems.

Crafting backend logic.

Phase 3 — Quests & Path System (Weeks 5–6)

Quest creation/completion flow.

Path/trade hub mechanics, toll collection, and encounters.

Phase 4 — Polish & Deployment (Weeks 7–8)

Replace placeholder art.

Optimize server performance.

Deploy backend to Google Cloud Run.

Deploy frontend to Vercel/Netlify.

6. Immediate Actions

Complete Prisma schema with all relation mappings.

Merge existing drop-in modules.

Implement save/load for player data.

Connect Auction House backend.

Start backend for path/trade hub system.

Create Google Cloud project for hosting, storage, and backups.

