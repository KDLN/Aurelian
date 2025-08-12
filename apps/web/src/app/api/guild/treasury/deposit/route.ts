import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Deposit gold to guild treasury
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Get user's guild membership
    const membership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      select: { guildId: true, role: true }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not in a guild' }, { status: 403 });
    }

    // Check if user has enough gold
    const userWallet = await prisma.wallet.findUnique({
      where: { userId: user.id }
    });

    if (!userWallet || userWallet.gold < amount) {
      return NextResponse.json({ error: 'Insufficient gold' }, { status: 400 });
    }

    // Perform the deposit transaction
    await prisma.$transaction(async (tx) => {
      // Remove gold from user's wallet
      await tx.wallet.update({
        where: { userId: user.id },
        data: {
          gold: userWallet.gold - amount
        }
      });

      // Add gold to guild treasury
      await tx.guild.update({
        where: { id: membership.guildId },
        data: {
          treasury: {
            increment: amount
          }
        }
      });

      // Log the deposit activity
      await tx.guildLog.create({
        data: {
          guildId: membership.guildId,
          userId: user.id,
          action: 'treasury_deposit',
          details: {
            amount: amount,
            previousBalance: userWallet.gold
          }
        }
      });

      // Update member contribution points
      await tx.guildMember.update({
        where: { userId: user.id },
        data: {
          contributionPoints: {
            increment: Math.floor(amount / 10) // 1 point per 10 gold deposited
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deposited ${amount.toLocaleString()} gold to guild treasury`
    });

  } catch (error) {
    console.error('Error depositing to guild treasury:', error);
    return NextResponse.json(
      { error: 'Failed to deposit gold' },
      { status: 500 }
    );
  }
}