import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify the JWT token with Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not configured, returning default wallet data');
      return NextResponse.json({
        gold: 1000,
        userId: user.id
      });
    }

    // Get user's wallet from database
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id }
    });

    if (!wallet) {
      // Return default wallet if not found
      return NextResponse.json({
        gold: 1000,
        userId: user.id
      });
    }

    return NextResponse.json({
      gold: wallet.gold,
      userId: user.id
    });

  } catch (error) {
    console.error('Wallet API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch wallet data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}