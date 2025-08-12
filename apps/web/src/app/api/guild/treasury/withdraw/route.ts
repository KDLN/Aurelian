import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Withdraw gold from guild treasury (Leaders and Officers only)
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

    const { amount, reason } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Get user's guild membership
    const membership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      include: {
        guild: {
          select: {
            id: true,
            name: true,
            treasury: true
          }
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not in a guild' }, { status: 403 });
    }

    // Check permissions - only Leaders and Officers can withdraw
    if (!['LEADER', 'OFFICER'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to withdraw from treasury' }, { status: 403 });
    }

    // Check if guild has enough gold
    if (membership.guild.treasury < amount) {
      return NextResponse.json({ error: 'Insufficient gold in guild treasury' }, { status: 400 });
    }

    // Get user's current wallet
    const userWallet = await prisma.wallet.findUnique({
      where: { userId: user.id }
    });

    if (!userWallet) {
      return NextResponse.json({ error: 'User wallet not found' }, { status: 400 });
    }

    // Perform the withdrawal transaction
    await prisma.$transaction(async (tx) => {
      // Remove gold from guild treasury
      await tx.guild.update({
        where: { id: membership.guildId },
        data: {
          treasury: membership.guild.treasury - amount
        }
      });

      // Add gold to user's wallet
      await tx.wallet.update({
        where: { userId: user.id },
        data: {
          gold: userWallet.gold + amount
        }
      });

      // Log the withdrawal activity
      await tx.guildLog.create({
        data: {
          guildId: membership.guildId,
          userId: user.id,
          action: 'treasury_withdraw',
          details: {
            amount: amount,
            reason: reason || 'No reason provided',
            previousTreasury: membership.guild.treasury
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: `Successfully withdrew ${amount.toLocaleString()} gold from guild treasury`
    });

  } catch (error) {
    console.error('Error withdrawing from guild treasury:', error);
    return NextResponse.json(
      { error: 'Failed to withdraw gold' },
      { status: 500 }
    );
  }
}