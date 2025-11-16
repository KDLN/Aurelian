export * from '@prisma/client';
export * from './env';
export * from './services';
export * from './errors';
export * from './constants';
import { PrismaClient } from '@prisma/client';
import { validateDatabaseEnv } from './env';

// Global singleton for development hot reloads
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Validate environment variables first
const env = validateDatabaseEnv();

// Create Prisma client with optimized configuration
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
  // Query optimization settings
  transactionOptions: {
    maxWait: 5000,    // Max time to wait for transaction (5s)
    timeout: 10000,   // Transaction timeout (10s)
    isolationLevel: 'ReadCommitted', // Reduce locking for better concurrency
  },
});

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Connection management and optimization utilities
export class DatabaseOptimizer {
  private static queryCache = new Map<string, any>();
  private static cacheExpiry = new Map<string, number>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Start automatic cache cleanup timer
   */
  private static startCleanupTimer() {
    if (this.cleanupTimer) return; // Already running

    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, expiry] of this.cacheExpiry.entries()) {
        if (now >= expiry) {
          this.queryCache.delete(key);
          this.cacheExpiry.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`[DatabaseOptimizer] Cleaned up ${cleaned} expired cache entries`);
      }
    }, 60000); // Cleanup every minute

    // Prevent the timer from keeping the process alive
    this.cleanupTimer.unref();
  }

  /**
   * Stop automatic cache cleanup timer
   */
  static stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Cached query execution with TTL
   */
  static async cachedQuery<T>(key: string, queryFn: () => Promise<T>): Promise<T> {
    // Start cleanup timer on first use
    this.startCleanupTimer();

    const now = Date.now();
    const expiry = this.cacheExpiry.get(key);

    if (expiry && now < expiry && this.queryCache.has(key)) {
      return this.queryCache.get(key);
    }

    const result = await queryFn();
    this.queryCache.set(key, result);
    this.cacheExpiry.set(key, now + this.CACHE_TTL);

    return result;
  }

  /**
   * Clear cache for specific keys or all cache
   */
  static clearCache(key?: string) {
    if (key) {
      this.queryCache.delete(key);
      this.cacheExpiry.delete(key);
    } else {
      this.queryCache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * Batch operations for better performance
   */
  static async batchCreate<T>(
    model: any,
    data: any[],
    batchSize: number = 100
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchResults = await model.createMany({
        data: batch,
        skipDuplicates: true,
      });
      results.push(batchResults);
    }

    return results;
  }

  /**
   * Connection health check
   */
  static async healthCheck(): Promise<boolean> {
    try {
      await prisma.$executeRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

}

// Graceful shutdown handling
process.on('beforeExit', async () => {
  DatabaseOptimizer.stopCleanupTimer();
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  DatabaseOptimizer.stopCleanupTimer();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  DatabaseOptimizer.stopCleanupTimer();
  await prisma.$disconnect();
  process.exit(0);
});