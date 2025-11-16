# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aurelian is a multiplayer 2D trading/gaming application built as a monorepo with three main services:
- **apps/web**: Next.js frontend with character creation and multiplayer gameplay
- **apps/realtime**: Colyseus WebSocket server for real-time multiplayer
- **apps/worker**: Background service for world simulation

## Essential Commands

### Development
```bash
npm i                     # Install all dependencies
npm run dev:web          # Start web app (http://localhost:3000)
npm run dev:realtime     # Start WebSocket server (ws://localhost:8787)
npm run dev:worker       # Start worker service (http://localhost:8080)
```

### Database
```bash
npm run prisma:migrate   # Run database migrations
npm run prisma:generate  # Generate Prisma client
npx prisma migrate dev --name <name>  # Create new migration
npx prisma migrate status  # Check migration status (prevent drift)
```

⚠️ **IMPORTANT**: Always check `npx prisma migrate status` before making schema changes to prevent drift. See `prisma/MIGRATION_GUIDE.md` for detailed migration procedures and `MIGRATION_SETUP.md` for automated migration workflow.

### Service Layer
The project uses a service layer pattern for database operations:
```typescript
import { services } from '@aurelian/database';

// Use services instead of direct Prisma calls
const wallet = await services.wallet.getOrCreateWallet(userId);
const missions = await services.mission.getUserActiveMissions(userId);
```

See `packages/database/README.md` for full service layer documentation.

### Build & Production
```bash
npm --prefix apps/web run build       # Build web app
npm --prefix apps/realtime run build  # Build realtime server
npm --prefix apps/worker run build    # Build worker service
```

### Testing & Type Checking
```bash
npm --prefix apps/web run build      # Type check web app via build
npm --prefix apps/realtime run build # Type check realtime server
npm --prefix apps/worker run build    # Type check worker service
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Supabase Auth, Colyseus.js client
- **Backend**: Colyseus WebSocket server, Express, JWT auth via `jose`
- **Database**: PostgreSQL with Prisma ORM (v6.13), Service Layer pattern
- **Deployment**: Docker containers, Google Cloud Run via GitHub Actions

### Key Architectural Patterns

1. **Real-time Multiplayer**: Colyseus rooms handle player movement and auction tickers
   - MovementRoom: Player positioning, up to 200 concurrent players
   - AuctionTickerRoom: Price updates broadcast every second
   
2. **Authentication Flow**: 
   - Supabase magic link authentication
   - JWT validation on realtime server via `jose` library
   - Session stored in browser

3. **State Management**:
   - Server authoritative for multiplayer state
   - Local storage for avatar customization
   - Canvas-based 2D rendering for gameplay
   - In-memory world simulation (apps/web/src/app/ae2/_shared/world.ts)

### Database Schema
Core tables:
- **User/Profile/Character**: Authentication and user profiles
- **ItemDef/Inventory**: Item system with location tracking (warehouse, caravan, escrow)
- **Listing/Contract**: Trading system with auction house mechanics
- **Blueprint/CraftJob**: Time-based crafting system
- **Mission**: Game missions with risk levels (LOW, MEDIUM, HIGH) and ETAs
- **Hub/Link/TrailNode**: Trade route and pathfinding system
- **PriceTick/LedgerTx**: Economy tracking and transaction logging

Trading items: Iron Ore, Herb, Hide, Pearl, Relic Fragment

## Project Structure

```
apps/
  web/                # Next.js frontend
    src/app/         # App router pages
      creator/       # Character customization
      play/          # Main multiplayer gameplay
      ae2/           # Complete game UI mockups
      ae_mock/       # Additional UI prototypes
  realtime/          # WebSocket server
    src/
      rooms/         # Colyseus room logic
      schemas/       # Colyseus state schemas
  worker/            # Background tasks
packages/
  database/          # Shared database package
    src/
      services/      # Service layer (NEW)
      index.ts       # Exports Prisma client and services
prisma/              # Database schema and migrations
.github/workflows/   # CI/CD pipelines for Cloud Run
```

## Environment Setup

Required environment variables:

### Web App (.env.local)
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `NEXT_PUBLIC_WS_URL`: WebSocket server URL (default: ws://localhost:8787)

### Realtime Server (.env)
- `SUPABASE_JWT_SECRET`: JWT secret for token validation
- `PORT`: Server port (default: 8787)

### Database (prisma/.env)
- `DATABASE_URL`: PostgreSQL connection string (pooled)
- `DIRECT_URL`: Direct database connection (non-pooled for migrations)

## Development Guidelines

1. **Monorepo Structure**: Use npm workspaces, prefix commands with `npm --prefix apps/<app>`
2. **TypeScript**: All apps use TypeScript with ESM modules and strict configuration
3. **Service Layer**: Use service layer for database operations instead of direct Prisma calls
4. **Real-time Updates**: Server broadcasts state at 1-second intervals
5. **Canvas Rendering**: Custom 2D rendering using HTML5 Canvas API
6. **Retro Aesthetic**: Dark brown/gold color scheme (`#231913` background, `#f1e5c8` text), monospace fonts
7. **Database Migrations**: Always create migrations for schema changes, never modify database directly