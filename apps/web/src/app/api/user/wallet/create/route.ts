import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { ensureUserExistsOptimized } from '@/lib/auth/auto-sync';

export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Ensure user has a wallet record with starting gold
export async function POST(request: NextRequest) {
  try {
    // Get JWT token from headers
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Ensure user exists in database
    await ensureUserExistsOptimized(user);

    // Check if user already has a wallet
    const existingWallet = await prisma.wallet.findUnique({
      where: { userId: user.id }
    });

    if (existingWallet) {
      return NextResponse.json({
        success: false,
        message: 'User already has a wallet',
        currentGold: existingWallet.gold
      });
    }

    // Create wallet with starting gold
    const startingGold = 2000; // Give users 2000 gold to start
    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        gold: startingGold
      }
    });

    console.log(`✅ Created wallet for user ${user.id} with ${startingGold} gold`);

    return NextResponse.json({
      success: true,
      message: `Created wallet with ${startingGold} gold`,
      wallet: {
        gold: wallet.gold,
        userId: wallet.userId
      }
    });

  } catch (error) {
    console.error('Error creating wallet:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create wallet',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}