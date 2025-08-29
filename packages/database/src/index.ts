export * from '@prisma/client';
export * from './env';
import { PrismaClient } from '@prisma/client';
import { validateDatabaseEnv } from './env';

// Global singleton for development hot reloads
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Validate environment variables first
const env = validateDatabaseEnv();

// Create Prisma client with proper configuration
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
});

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;