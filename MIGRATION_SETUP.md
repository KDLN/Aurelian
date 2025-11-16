# Automated Migration Setup Guide

This guide explains how to set up automated Prisma migrations for the Aurelian project, eliminating the need for manual database deployments.

## Overview

The project now has a proper service layer that abstracts database operations and a streamlined migration workflow. This allows you to:

1. **Add new tables or columns** by editing `prisma/schema.prisma`
2. **Generate migrations automatically** with a single command
3. **Deploy to production** without manual database changes

## Project Structure

```
Aurelian/
├── packages/database/           # Shared database package
│   ├── src/
│   │   ├── index.ts            # Exports Prisma client and services
│   │   ├── env.ts              # Environment validation
│   │   └── services/           # Service layer (NEW)
│   │       ├── base.service.ts
│   │       ├── user.service.ts
│   │       ├── wallet.service.ts
│   │       ├── mission.service.ts
│   │       ├── inventory.service.ts
│   │       ├── agent.service.ts
│   │       └── index.ts
│   └── package.json
├── prisma/                      # Prisma schema and migrations
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Migration history
│   └── MIGRATION_GUIDE.md      # Migration best practices
└── apps/
    ├── web/                    # Next.js app
    ├── realtime/               # Colyseus server
    └── worker/                 # Background worker
```

## Service Layer Benefits

The new service layer provides:

✅ **Clean Abstraction**: Business logic separated from database operations
✅ **Transaction Support**: Built-in transaction handling for complex operations
✅ **Type Safety**: Full TypeScript support with Prisma-generated types
✅ **Testability**: Easy to mock and test services
✅ **Reusability**: Share business logic across apps
✅ **Error Handling**: Consistent error handling patterns

## Quick Start

### 1. Environment Setup

Create a `.env` file in the project root (or use existing `.env.local`):

```bash
# Database URLs (required for Prisma)
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public&pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/database?schema=public"

# Node environment
NODE_ENV="development"
```

**Note**:
- `DATABASE_URL` should use connection pooling (pgbouncer)
- `DIRECT_URL` is a direct connection needed for migrations

### 2. Install Dependencies

```bash
npm install
```

This will automatically run `npm run prisma:generate` via the `postinstall` hook.

### 3. Check Migration Status

Before making any schema changes:

```bash
npm run prisma:migrate:status
```

This shows which migrations have been applied and if there's any drift.

## Making Schema Changes

### Step 1: Update the Schema

Edit `prisma/schema.prisma` to add or modify tables:

```prisma
model NewFeature {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @db.Uuid
  name      String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// Don't forget to add the relation to User model
model User {
  // ... existing fields
  newFeatures NewFeature[]  // Add this
}
```

### Step 2: Create Migration

```bash
npx prisma migrate dev --name add_new_feature_table
```

This will:
1. Create a new migration file in `prisma/migrations/`
2. Apply the migration to your development database
3. Regenerate the Prisma client

### Step 3: Generate Prisma Client

The migration command automatically generates the client, but you can run it manually:

```bash
npm run prisma:generate
```

### Step 4: Build the Database Package

After schema changes, rebuild the database package:

```bash
npm --prefix packages/database run build
```

### Step 5: Commit Changes

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add new feature table"
git push
```

## Using the Service Layer

### Before (Direct Prisma Usage)

```typescript
// apps/web/src/app/api/wallet/route.ts
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id }
  });

  return NextResponse.json({ gold: wallet?.gold ?? 0 });
}
```

### After (Service Layer)

```typescript
// apps/web/src/app/api/wallet/route.ts
import { services } from '@aurelian/database';

export async function GET(request: NextRequest) {
  const wallet = await services.wallet.getOrCreateWallet(user.id);
  return NextResponse.json({ gold: wallet.gold });
}
```

### Example: Complex Operation with Transaction

```typescript
import { WalletService } from '@aurelian/database';

const walletService = new WalletService();

// Transfer gold between users with automatic transaction logging
await walletService.transfer(
  fromUserId: 'user-1',
  toUserId: 'user-2',
  amount: 500,
  reason: 'Guild donation'
);
```

## Creating Custom Services

Extend the base service for your domain logic:

```typescript
// packages/database/src/services/guild.service.ts
import { BaseService } from './base.service';

export class GuildService extends BaseService {
  async createGuild(name: string, tag: string, ownerId: string) {
    return this.transaction(async (tx) => {
      // Create guild
      const guild = await tx.guild.create({
        data: { name, tag },
      });

      // Add owner as leader
      await tx.guildMember.create({
        data: {
          guildId: guild.id,
          userId: ownerId,
          role: 'LEADER',
        },
      });

      return guild;
    });
  }
}
```

Don't forget to export it in `packages/database/src/services/index.ts`:

```typescript
export { GuildService } from './guild.service';

export const services = {
  // ... existing services
  guild: new GuildService(),
};
```

## Production Deployment

### Option 1: Manual Deploy

```bash
npm run prisma:migrate:deploy
```

### Option 2: CI/CD (GitHub Actions)

Add to your workflow:

```yaml
- name: Run Database Migrations
  run: npm run prisma:migrate:deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    DIRECT_URL: ${{ secrets.DIRECT_URL }}
```

### Option 3: Docker/Cloud Run

Add to your Dockerfile:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run prisma:generate
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app .
CMD ["sh", "-c", "npm run prisma:migrate:deploy && npm start"]
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Create and apply migration (dev) |
| `npm run prisma:migrate:deploy` | Apply migrations (production) |
| `npx prisma migrate status` | Check migration status |
| `npx prisma migrate dev --name NAME` | Create named migration |
| `npx prisma studio` | Open Prisma Studio GUI |
| `npx prisma db push` | Push schema without migration (dev only) |
| `npx prisma db pull` | Pull schema from database |

## Best Practices

### ✅ DO

- Always check migration status before making changes
- Use descriptive migration names (`add_user_preferences`, `fix_inventory_indexes`)
- Test migrations in development before deploying
- Commit both `schema.prisma` and migration files together
- Use the service layer for business logic
- Use transactions for multi-step operations

### ❌ DON'T

- Don't modify the database directly with SQL (unless emergency)
- Don't edit or delete existing migration files
- Don't use `db push` in production
- Don't skip migrations
- Don't put business logic in API routes

## Troubleshooting

### Migration Drift Detected

If you see migration drift:

```bash
# Pull current schema from database
npx prisma db pull

# Create a new migration from current state
npx prisma migrate dev --name baseline_from_current_state
```

### Migration Fails in Production

1. Check logs for the specific error
2. Verify `DIRECT_URL` is set (non-pooled connection)
3. Ensure database user has migration permissions
4. Roll back if needed:
   ```bash
   npx prisma migrate resolve --rolled-back MIGRATION_NAME
   ```

### Prisma Client Out of Sync

```bash
# Regenerate the client
npm run prisma:generate

# Rebuild the database package
npm --prefix packages/database run build
```

### TypeScript Errors After Schema Change

```bash
# Rebuild all packages
npm run build

# Or just the database package
npm --prefix packages/database run build
```

## Migration Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Edit prisma/schema.prisma                                │
│    - Add/modify models, fields, relations                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Create Migration                                         │
│    npx prisma migrate dev --name descriptive_name           │
│    - Generates migration SQL                                │
│    - Applies to dev database                                │
│    - Regenerates Prisma client                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Update Service Layer (if needed)                         │
│    - Add methods to existing services                       │
│    - Or create new service classes                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Build Database Package                                   │
│    npm --prefix packages/database run build                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Update API Routes                                        │
│    - Use services instead of direct Prisma                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Test Locally                                             │
│    - Run dev servers                                        │
│    - Test new features                                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Commit & Push                                            │
│    git add prisma/ packages/database/                       │
│    git commit -m "feat: add new feature"                    │
│    git push                                                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Deploy to Production                                     │
│    - CI/CD runs: npm run prisma:migrate:deploy              │
│    - Migrations applied automatically                       │
└─────────────────────────────────────────────────────────────┘
```

## Next Steps

1. **Review the service layer**: Check `packages/database/src/services/`
2. **Migrate existing routes**: Convert API routes to use services
3. **Add custom services**: Create services for your domain logic (guilds, crafting, etc.)
4. **Set up CI/CD**: Automate migrations in your deployment pipeline
5. **Read the docs**: `packages/database/README.md` for detailed API reference

## Support

For issues or questions:
- Check `prisma/MIGRATION_GUIDE.md` for Prisma-specific guidance
- Review `packages/database/README.md` for service layer documentation
- Open an issue if you encounter problems

---

**You now have a proper logic layer and automated migration workflow!** 🎉

No more manual database deployments - just edit the schema and run migrations.
