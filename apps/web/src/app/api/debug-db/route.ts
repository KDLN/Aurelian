import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  
  return NextResponse.json({
    hasUrl: !!dbUrl,
    urlLength: dbUrl?.length || 0,
    urlStart: dbUrl?.substring(0, 50) || 'NOT SET',
    urlEnd: dbUrl?.substring(dbUrl.length - 20) || 'NOT SET',
    containsPort6543: dbUrl?.includes(':6543') || false,
    containsPort5432: dbUrl?.includes(':5432') || false,
    containsPgbouncer: dbUrl?.includes('pgbouncer') || false,
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('DATABASE')),
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
}