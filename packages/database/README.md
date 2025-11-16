# @aurelian/database

Shared Prisma database client and services for the Aurelian trading game platform.

## Features

- **Type-safe Prisma Client**: Pre-configured with optimized transaction settings
- **WalletService**: Secure, transactional wallet operations with race condition prevention
- **DatabaseOptimizer**: Query caching with LRU eviction and TTL
- **Validation Utilities**: UUID, gold amount, and string length validation
- **Custom Error Classes**: Typed error handling for wallet and database operations
- **Comprehensive Tests**: Unit and integration tests for all services

## Installation

```bash
npm install @aurelian/database
```

## Quick Start

### Basic Usage

```typescript
import { prisma, WalletService } from '@aurelian/database';

// Create service instance
const walletService = new WalletService(prisma);

// Add gold to a wallet
const wallet = await walletService.addGold(
  'user-id-here',
  500,
  { reason: 'Mission reward', createLedgerEntry: true }
);

console.log(`New balance: ${wallet.gold} gold`);
```

## Services

### WalletService

Provides safe, transactional operations for wallet management with **Serializable** isolation level to prevent race conditions.

#### Methods

##### `getBalance(userId: string): Promise<WalletBalance>`

Gets the current gold balance for a user. Creates wallet with default starting amount if it doesn't exist.

```typescript
const balance = await walletService.getBalance('user-123');
console.log(`Balance: ${balance.gold} gold`);
```

##### `addGold(userId, amount, options): Promise<WalletBalance>`

Adds gold to a user's wallet atomically.

**Options:**
- `reason` (optional): Description for ledger entry
- `createLedgerEntry` (default: `true`): Whether to log transaction

```typescript
const wallet = await walletService.addGold(
  'user-123',
  1000,
  {
    reason: 'Quest completion bonus',
    createLedgerEntry: true
  }
);
```

**Throws:**
- `ValidationError` - Invalid UUID or negative amount
- `ValidationError` - Adding would exceed `GOLD_LIMITS.MAX` (1 billion)

##### `subtractGold(userId, amount, options): Promise<WalletBalance>`

Subtracts gold from a user's wallet with balance validation.

**Options:**
- `reason` (optional): Description for ledger entry
- `createLedgerEntry` (default: `true`): Whether to log transaction
- `allowNegative` (default: `false`): Admin override to allow negative balance

```typescript
try {
  const wallet = await walletService.subtractGold(
    'user-123',
    500,
    { reason: 'Purchase legendary sword' }
  );
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    console.log('Not enough gold!');
  }
}
```

**Throws:**
- `ValidationError` - Invalid UUID or amount
- `InsufficientFundsError` - Wallet has insufficient funds
- `WalletNotFoundError` - Wallet doesn't exist

##### `transfer(fromUserId, toUserId, amount, options): Promise<TransferResult>`

Transfers gold from one user to another atomically. Both wallets are locked during the transaction.

```typescript
const result = await walletService.transfer(
  'user-alice',
  'user-bob',
  250,
  { reason: 'Payment for trade' }
);

console.log(`Alice: ${result.fromWallet.gold}, Bob: ${result.toWallet.gold}`);
```

**Throws:**
- `ValidationError` - Invalid UUIDs, self-transfer, or invalid amount
- `InsufficientFundsError` - Sender has insufficient funds
- `WalletNotFoundError` - Sender wallet doesn't exist

##### `getBatchBalances(userIds: string[]): Promise<Map<string, WalletBalance>>`

Efficiently retrieves balances for multiple users in a single query.

```typescript
const balances = await walletService.getBatchBalances([
  'user-1',
  'user-2',
  'user-3'
]);

balances.forEach((balance, userId) => {
  console.log(`${userId}: ${balance.gold} gold`);
});
```

### DatabaseOptimizer

Provides query caching with LRU eviction and TTL expiry.

#### Methods

##### `cachedQuery<T>(key, queryFn): Promise<T>`

Executes a query with caching. Results are cached for 5 minutes.

```typescript
import { DatabaseOptimizer, prisma } from '@aurelian/database';

const activeUsers = await DatabaseOptimizer.cachedQuery(
  'users:active',
  () => prisma.user.findMany({ where: { active: true } })
);
```

**Features:**
- LRU eviction when cache reaches 1000 entries
- 5-minute TTL per entry
- Type-safe return values

##### `clearCache(key?: string): void`

Clears cache for a specific key or entire cache.

```typescript
// Clear specific key
DatabaseOptimizer.clearCache('users:active');

// Clear entire cache
DatabaseOptimizer.clearCache();
```

##### `getCacheStats()`

Returns cache statistics for monitoring.

```typescript
const stats = DatabaseOptimizer.getCacheStats();
console.log(`Cache: ${stats.size}/${stats.maxSize} (${stats.utilizationPercent}%)`);
```

## Constants

### GOLD_LIMITS

```typescript
import { GOLD_LIMITS } from '@aurelian/database';

GOLD_LIMITS.MIN                    // 0
GOLD_LIMITS.MAX                    // 1,000,000,000
GOLD_LIMITS.DEFAULT_STARTING_AMOUNT // 1,000
```

### ERROR_CODES

```typescript
import { ERROR_CODES } from '@aurelian/database';

ERROR_CODES.INSUFFICIENT_FUNDS  // User doesn't have enough gold
ERROR_CODES.WALLET_NOT_FOUND    // Wallet doesn't exist
ERROR_CODES.INVALID_UUID        // Invalid UUID format
ERROR_CODES.SELF_TRANSFER       // Cannot transfer to self
// ... see constants/index.ts for full list
```

## Validation

### Validation Functions

```typescript
import {
  validateUUID,
  validateGoldAmount,
  validateTransfer
} from '@aurelian/database';

// Validate UUID format
validateUUID('550e8400-e29b-41d4-a716-446655440000', 'userId');

// Validate gold amount
validateGoldAmount(500, 'amount', {
  min: 0,
  max: 10000,
  allowZero: false
});

// Validate transfer parameters
validateTransfer(fromUserId, toUserId, amount, reason);
```

### Error Classes

```typescript
import {
  InsufficientFundsError,
  WalletNotFoundError,
  ValidationError
} from '@aurelian/database';

try {
  await walletService.subtractGold(userId, amount);
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    console.log(`Need ${error.required} gold, but only have ${error.available}`);
  } else if (error instanceof WalletNotFoundError) {
    console.log(`Wallet not found for user: ${error.userId}`);
  } else if (error instanceof ValidationError) {
    console.log(`Invalid ${error.field}: ${error.code}`);
  }
}
```

## Transaction Patterns

### Serializable Isolation

All WalletService operations use **Serializable** isolation level to prevent race conditions:

```typescript
// This is handled automatically by WalletService
await prisma.$transaction(
  async (tx) => {
    // Your transaction logic
  },
  {
    isolationLevel: 'Serializable',
    timeout: 5000
  }
);
```

### Atomic Operations

Use atomic increment/decrement to prevent race conditions:

```typescript
// ✅ GOOD: Atomic increment
await prisma.wallet.update({
  where: { userId },
  data: { gold: { increment: amount } }
});

// ❌ BAD: Read-modify-write race condition
const wallet = await prisma.wallet.findUnique({ where: { userId } });
await prisma.wallet.update({
  where: { userId },
  data: { gold: wallet.gold + amount }
});
```

### Optimistic Locking

Use where constraints for optimistic locking:

```typescript
// Only update if balance is sufficient
await prisma.wallet.update({
  where: {
    userId,
    gold: { gte: amount } // Atomic constraint
  },
  data: { gold: { decrement: amount } }
});
```

## Database Migrations

### Running Migrations

```bash
# Development (creates migration and applies it)
npm run migrate

# Production (applies pending migrations)
npm run migrate:deploy

# Check migration status
npm run migrate:status
```

### Creating Migrations

```bash
npx prisma migrate dev --name add_new_feature
```

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm test:watch

# Coverage report
npm test:coverage
```

## Best Practices

### 1. Always Use WalletService

❌ **Don't** manipulate wallets directly:
```typescript
// BAD: Race condition!
const wallet = await prisma.wallet.findUnique({ where: { userId } });
await prisma.wallet.update({
  where: { userId },
  data: { gold: wallet.gold + amount }
});
```

✅ **Do** use WalletService:
```typescript
// GOOD: Atomic, race-condition free
await walletService.addGold(userId, amount, { reason: 'Reward' });
```

### 2. Handle Errors Properly

```typescript
import { isInsufficientFundsError, isWalletNotFoundError } from '@aurelian/database';

try {
  await walletService.subtractGold(userId, cost);
} catch (error) {
  if (isInsufficientFundsError(error)) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }
  throw error; // Re-throw unexpected errors
}
```

### 3. Use Ledger Entries for Audit Trail

```typescript
// Always log transactions for audit trail
await walletService.transfer(
  fromUserId,
  toUserId,
  amount,
  {
    reason: 'Trade payment for Quantum Resin',
    createLedgerEntry: true // Default, but be explicit
  }
);
```

### 4. Validate Input Early

```typescript
import { validateUUID, validateGoldAmount } from '@aurelian/database';

// Validate before expensive operations
validateUUID(userId, 'userId');
validateGoldAmount(amount, 'amount');

// Now proceed with database operations
await walletService.addGold(userId, amount);
```

## Environment Variables

Required environment variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/aurelian?pgbouncer=true"
DIRECT_URL="postgresql://user:password@localhost:5432/aurelian"
NODE_ENV="development"
```

Optional:
```env
DATABASE_POOL_SIZE=20
```

## Architecture

```
packages/database/
├── src/
│   ├── index.ts              # Main exports, Prisma client, DatabaseOptimizer
│   ├── env.ts                # Environment variable validation
│   ├── constants/
│   │   └── index.ts          # Gold limits, error codes, transaction config
│   ├── validation/
│   │   └── index.ts          # Validation functions, custom error classes
│   ├── services/
│   │   └── wallet.service.ts # WalletService implementation
│   └── __tests__/
│       ├── services/
│       │   └── wallet.service.test.ts
│       └── optimizer.test.ts
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Migration history
├── jest.config.cjs
├── jest.setup.cjs
├── package.json
└── README.md
```

## Troubleshooting

### "Insufficient funds" errors in tests

Make sure to create wallets with enough gold before running operations:

```typescript
await prisma.wallet.create({
  data: {
    userId: 'test-user',
    gold: 10000 // Enough for testing
  }
});
```

### Transaction timeout errors

Increase timeout for long-running operations:

```typescript
await prisma.$transaction(
  async (tx) => {
    // Your logic
  },
  {
    timeout: 30000 // 30 seconds
  }
);
```

### Serialization failures

This is normal under high concurrency. Implement retry logic:

```typescript
import { isPrismaError } from '@aurelian/database';

for (let attempt = 0; attempt < 3; attempt++) {
  try {
    await walletService.transfer(from, to, amount);
    break;
  } catch (error) {
    if (isPrismaError(error) && error.code === 'P2034' && attempt < 2) {
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      continue;
    }
    throw error;
  }
}
```

## License

Private - Aurelian Project

## Support

For questions or issues, please open an issue in the repository.
