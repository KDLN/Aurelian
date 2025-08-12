import { PrismaClient } from '@prisma/client';

// Global prisma client for the realtime server
export const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});