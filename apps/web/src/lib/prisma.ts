import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Singleton pattern for Prisma Client
class PrismaClientSingleton {
  private static instance: PrismaClient | null = null;
  
  public static getInstance(): PrismaClient {
    if (this.instance) {
      return this.instance;
    }

    // Check global instance first (for development hot reloading)
    if (typeof globalThis !== 'undefined' && globalThis.__prisma) {
      this.instance = globalThis.__prisma;
      return this.instance;
    }

    // Don't create Prisma client during build time - return a mock client
    if (process.env.NODE_ENV === undefined || process.env.NEXT_PHASE === 'phase-production-build') {
      // Return a mock client that won't cause build failures
      return {} as PrismaClient;
    }

    // Create new instance with proper configuration for production
    this.instance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      errorFormat: 'pretty',
    });

    // Store globally in development to prevent hot reload issues
    if (process.env.NODE_ENV !== 'production') {
      globalThis.__prisma = this.instance;
    }

    return this.instance;
  }

  // Cleanup method for graceful shutdowns
  public static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
      if (typeof globalThis !== 'undefined') {
        globalThis.__prisma = undefined;
      }
    }
  }
}

// Lazy export to prevent build-time initialization
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const instance = PrismaClientSingleton.getInstance();
    return instance[prop as keyof PrismaClient];
  }
});

// Export the disconnect method for use in serverless cleanup
export const disconnectPrisma = PrismaClientSingleton.disconnect;