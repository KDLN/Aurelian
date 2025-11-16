/**
 * Wallet API v2 - Example using Service Layer
 *
 * This is an example of how to refactor API routes to use the service layer
 * instead of direct Prisma calls. Compare this to apps/web/src/app/api/user/wallet/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { services } from '@aurelian/database';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify the JWT token with Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Use the WalletService instead of direct Prisma call
    // This handles wallet creation automatically if it doesn't exist
    const wallet = await services.wallet.getOrCreateWallet(user.id, 1000);

    return NextResponse.json({
      gold: wallet.gold,
      userId: user.id,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
      version: 'v2', // Indicates this is using the service layer
    });
  } catch (error) {
    console.error('Wallet API v2 error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch wallet data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Add or subtract gold
 *
 * Example request body:
 * {
 *   "action": "add",
 *   "amount": 100,
 *   "reason": "Quest reward"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth (same as GET)
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { action, amount, reason } = body;

    if (!action || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: action, amount' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    // Use service methods instead of manual transaction
    let wallet;
    if (action === 'add') {
      wallet = await services.wallet.addGold(user.id, amount, reason);
    } else if (action === 'subtract') {
      wallet = await services.wallet.subtractGold(user.id, amount, reason);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "add" or "subtract"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      wallet: {
        gold: wallet.gold,
        userId: wallet.userId,
        updatedAt: wallet.updatedAt,
      },
      transaction: {
        action,
        amount,
        reason,
      },
    });
  } catch (error) {
    console.error('Wallet POST error:', error);

    // Service layer throws specific errors we can handle
    if (error instanceof Error && error.message === 'Insufficient gold') {
      return NextResponse.json(
        { error: 'Insufficient gold' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update wallet',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
