import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  let prisma: PrismaClient | null = null;
  let dbStatus = {
    canConnect: false,
    error: null as string | null,
    missionDefCount: 0,
    missionInstanceCount: 0,
    userCount: 0,
    prismaInitialized: false,
    databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
  };

  try {
    // Try to initialize Prisma
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('://')) {
      prisma = new PrismaClient();
      dbStatus.prismaInitialized = true;

      // Try to query the database
      const [missionDefs, missionInstances, users] = await Promise.all([
        prisma.missionDef.count(),
        prisma.missionInstance.count(),
        prisma.user.count()
      ]);

      dbStatus.canConnect = true;
      dbStatus.missionDefCount = missionDefs;
      dbStatus.missionInstanceCount = missionInstances;
      dbStatus.userCount = users;
    } else {
      dbStatus.error = 'DATABASE_URL not configured or invalid';
    }
  } catch (error) {
    dbStatus.error = error instanceof Error ? error.message : 'Unknown error';
    dbStatus.canConnect = false;
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }

  return NextResponse.json(dbStatus);
}