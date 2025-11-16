# @aurelian/database

Shared database package for Aurelian with Prisma ORM and service layer.

## Features

- **Prisma Client**: Pre-configured singleton instance
- **Service Layer**: Clean abstraction over database operations
- **Transaction Support**: Built-in transaction handling
- **Type Safety**: Full TypeScript support with generated types
- **Connection Pooling**: Optimized database connections

## Installation

This package is automatically installed as part of the Aurelian monorepo workspace.

## Usage

### Using Prisma Client Directly

```typescript
import { prisma } from '@aurelian/database';

const users = await prisma.user.findMany();
```

### Using Service Layer (Recommended)

The service layer provides a clean abstraction with business logic and transaction support.

#### Individual Services

```typescript
import { UserService, WalletService } from '@aurelian/database';

const userService = new UserService();
const walletService = new WalletService();

// Get user with profile
const user = await userService.getUserWithProfile('user-id');

// Get or create wallet
const wallet = await walletService.getOrCreateWallet('user-id');

// Add gold with transaction logging
await walletService.addGold('user-id', 100, 'Quest reward');
```

#### Service Factory (Singleton)

```typescript
import { services } from '@aurelian/database';

// All services available as singletons
const user = await services.user.findById('user-id');
const wallet = await services.wallet.getWallet('user-id');
const missions = await services.mission.getUserActiveMissions('user-id');
```

## Available Services

### UserService

- `findById(userId)` - Find user by ID
- `findByEmail(email)` - Find user by email
- `create(data)` - Create new user
- `update(userId, data)` - Update user
- `getUserWithProfile(userId)` - Get user with profile and wallet
- `getCaravanSlots(userId)` - Get user's caravan slots info
- `isAdmin(userId)` - Check if user is admin
- `getOrCreate(userId, email)` - Upsert user

### WalletService

- `getWallet(userId)` - Get user's wallet
- `createWallet(userId, initialGold)` - Create wallet
- `getOrCreateWallet(userId, initialGold)` - Upsert wallet
- `addGold(userId, amount, reason)` - Add gold with transaction logging
- `subtractGold(userId, amount, reason)` - Subtract gold with validation
- `getBalance(userId)` - Get current balance
- `transfer(fromUserId, toUserId, amount, reason)` - Transfer gold between users

### MissionService

- `getActiveMissionDefs()` - Get all active mission definitions
- `getMissionDefById(missionId)` - Get specific mission definition
- `getUserActiveMissions(userId)` - Get user's active missions with details
- `getOccupiedCaravanSlots(userId)` - Get list of occupied slots
- `findAvailableCaravanSlot(userId, totalSlots)` - Find first available slot
- `startMission(params)` - Start a new mission
- `completeMission(instanceId, rewards)` - Complete mission and award rewards
- `cancelMission(instanceId)` - Cancel a mission
- `getCompletedMissionsCount(userId)` - Get completed missions count

### InventoryService

- `getUserInventory(userId, location)` - Get user's inventory
- `getInventoryItem(userId, itemKey, location)` - Get specific item
- `addItem(userId, itemKey, quantity, location)` - Add items to inventory
- `removeItem(userId, itemKey, quantity, location)` - Remove items
- `transferItems(userId, itemKey, quantity, fromLocation, toLocation)` - Move items
- `getItemDef(itemKey)` - Get item definition
- `getAllItemDefs()` - Get all item definitions
- `hasEnoughItems(userId, itemKey, quantity, location)` - Check availability

### AgentService

- `getUserAgents(userId)` - Get all user's agents
- `getAgentById(agentId, userId)` - Get specific agent
- `hireAgent(params)` - Hire a new agent
- `isAgentOnMission(agentId)` - Check if agent is busy
- `getAvailableAgents(userId)` - Get agents not on missions
- `updateEquipment(agentId, equipment)` - Update agent equipment
- `addExperience(agentId, xp)` - Add XP and handle leveling
- `dismissAgent(agentId, userId)` - Dismiss an agent

## Creating Custom Services

Extend `BaseService` for custom business logic:

```typescript
import { BaseService } from '@aurelian/database';
import { Guild } from '@prisma/client';

export class GuildService extends BaseService {
  async getGuildWithMembers(guildId: string) {
    return this.db.guild.findUnique({
      where: { id: guildId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                profile: true,
              },
            },
          },
        },
      },
    });
  }

  async createGuild(data: { name: string; tag: string; ownerId: string }) {
    return this.transaction(async (tx) => {
      const guild = await tx.guild.create({
        data: {
          name: data.name,
          tag: data.tag,
        },
      });

      await tx.guildMember.create({
        data: {
          guildId: guild.id,
          userId: data.ownerId,
          role: 'LEADER',
        },
      });

      return guild;
    });
  }
}
```

## Transactions

All services support transactions via the `transaction()` method:

```typescript
const walletService = new WalletService();

await walletService.transaction(async (tx) => {
  // All operations within this block are transactional
  await tx.wallet.update({
    where: { userId: 'user-1' },
    data: { gold: { increment: 100 } },
  });

  await tx.ledgerTx.create({
    data: {
      userId: 'user-1',
      amount: 100,
      reason: 'Quest reward',
    },
  });
});
```

## Database Migrations

### Development Workflow

1. **Check migration status** before making changes:
   ```bash
   npm run prisma:migrate:status
   ```

2. **Update schema** in `prisma/schema.prisma`

3. **Create migration**:
   ```bash
   npx prisma migrate dev --name descriptive_name
   ```

4. **Generate client**:
   ```bash
   npm run prisma:generate
   ```

### Production Deployment

Apply migrations in production:

```bash
npm run prisma:migrate:deploy
```

### Common Commands

```bash
# Generate Prisma client
npm run prisma:generate

# Create and apply migration
npm run prisma:migrate

# Deploy migrations (production)
npm run prisma:migrate:deploy

# Check migration status
cd packages/database && npx prisma migrate status

# Open Prisma Studio
cd packages/database && npx prisma studio
```

## Environment Variables

Required environment variables (see `.env.example`):

- `DATABASE_URL` - PostgreSQL connection string (pooled)
- `DIRECT_URL` - Direct database connection (non-pooled, for migrations)
- `NODE_ENV` - Environment (development, production)

## Best Practices

1. **Use Services**: Always prefer services over direct Prisma calls
2. **Transactions**: Use transactions for multi-step operations
3. **Error Handling**: Services throw errors - handle them in your routes
4. **Type Safety**: Leverage TypeScript for compile-time checks
5. **Testing**: Services are easy to mock and test

## Examples

### API Route with Service Layer

```typescript
// apps/web/src/app/api/wallet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { services } from '@aurelian/database';
import { withAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  return withAuth(request, async (user) => {
    try {
      const wallet = await services.wallet.getOrCreateWallet(user.id);
      return NextResponse.json({ gold: wallet.gold });
    } catch (error) {
      console.error('Wallet error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch wallet' },
        { status: 500 }
      );
    }
  });
}
```

### Starting a Mission

```typescript
// apps/web/src/app/api/missions/start/route.ts
import { services } from '@aurelian/database';

export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    const { missionId, agentId } = await request.json();

    try {
      // Get mission definition
      const missionDef = await services.mission.getMissionDefById(missionId);
      if (!missionDef) {
        return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
      }

      // Get agent and validate ownership
      const agent = await services.agent.getAgentById(agentId, user.id);
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }

      // Check if agent is available
      const isOnMission = await services.agent.isAgentOnMission(agentId);
      if (isOnMission) {
        return NextResponse.json({ error: 'Agent is busy' }, { status: 400 });
      }

      // Find available caravan slot
      const slots = await services.user.getCaravanSlots(user.id);
      const availableSlot = await services.mission.findAvailableCaravanSlot(
        user.id,
        slots?.total || 3
      );

      if (!availableSlot) {
        return NextResponse.json(
          { error: 'No caravan slots available' },
          { status: 400 }
        );
      }

      // Calculate end time with agent bonuses
      const speedMultiplier = 1 - agent.speedBonus / 100;
      const duration = missionDef.baseDuration * speedMultiplier;
      const endTime = new Date(Date.now() + duration * 1000);

      // Start mission
      const mission = await services.mission.startMission({
        userId: user.id,
        missionId,
        agentId,
        caravanSlot: availableSlot,
        endTime,
      });

      return NextResponse.json({ success: true, mission });
    } catch (error) {
      console.error('Mission start error:', error);
      return NextResponse.json(
        { error: 'Failed to start mission' },
        { status: 500 }
      );
    }
  });
}
```

## TypeScript Configuration

The package is built with TypeScript. The compiled output goes to `dist/`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

## License

MIT
