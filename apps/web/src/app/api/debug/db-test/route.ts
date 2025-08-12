import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test 1: Simple query to check if database is reachable
    const startTime = performance.now();
    const userCount = await prisma.user.count();
    const queryTime = performance.now() - startTime;
    
    // Test 2: Check if specific tables exist by querying them
    const blueprintCount = await prisma.blueprint.count();
    const itemDefCount = await prisma.itemDef.count();
    
    // Test 3: Check database connection info
    const result = await prisma.$queryRaw`SELECT version()`;
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      stats: {
        userCount,
        blueprintCount,
        itemDefCount,
        queryTimeMs: Math.round(queryTime)
      },
      databaseVersion: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        hasDbUrl: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DIRECT_URL,
        dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...'
      }
    }, { status: 500 });
  }
}