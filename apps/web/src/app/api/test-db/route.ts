import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  let dbStatus = {
    canConnect: false,
    error: null as string | null,
    missionDefCount: 0,
    missionInstanceCount: 0,
    userCount: 0,
    prismaInitialized: true,
    databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
  };

  try {
    // Try to query the database using the singleton prisma instance
    const [missionDefs, missionInstances, users] = await Promise.all([
      prisma.missionDef.count(),
      prisma.missionInstance.count(),
      prisma.user.count()
    ]);

    dbStatus.canConnect = true;
    dbStatus.missionDefCount = missionDefs;
    dbStatus.missionInstanceCount = missionInstances;
    dbStatus.userCount = users;
  } catch (error) {
    dbStatus.error = error instanceof Error ? error.message : 'Unknown error';
    dbStatus.canConnect = false;
  }

  return NextResponse.json(dbStatus);
}