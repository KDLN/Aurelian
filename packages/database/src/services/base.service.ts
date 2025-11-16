import { PrismaClient } from '@prisma/client';
import { prisma } from '../index';

/**
 * Base service class that all services extend from
 * Provides common database operations and transaction support
 */
export abstract class BaseService {
  protected db: PrismaClient;

  constructor() {
    this.db = prisma;
  }

  /**
   * Execute operations within a transaction
   */
  async transaction<T>(
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>) => Promise<T>
  ): Promise<T> {
    return this.db.$transaction(fn);
  }

  /**
   * Execute raw SQL query
   */
  async executeRaw(query: string, ...values: any[]) {
    return this.db.$executeRawUnsafe(query, ...values);
  }

  /**
   * Query raw SQL
   */
  async queryRaw<T = any>(query: string, ...values: any[]): Promise<T> {
    return this.db.$queryRawUnsafe(query, ...values);
  }
}
