import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Get guild treasury information
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user's guild membership and guild info
    const membership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      include: {
        guild: {
          select: {
            id: true,
            name: true,
            tag: true,
            treasury: true
          }
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not in a guild' }, { status: 403 });
    }

    // Get recent treasury transactions
    const recentTransactions = await prisma.guildLog.findMany({
      where: {
        guildId: membership.guildId,
        action: {
          in: ['treasury_deposit', 'treasury_withdraw']
        }
      },
      include: {
        user: {
          select: {
            profile: {
              select: { display: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return NextResponse.json({
      success: true,
      guild: membership.guild,
      userRole: membership.role,
      treasury: membership.guild.treasury,
      recentTransactions: recentTransactions.map(tx => ({
        id: tx.id,
        action: tx.action,
        amount: (tx.details as any)?.amount || 0,
        user: tx.user?.profile?.display || 'Unknown',
        createdAt: tx.createdAt,
        details: tx.details
      }))
    });

  } catch (error) {
    console.error('Error fetching guild treasury:', error);
    return NextResponse.json(
      { error: 'Failed to fetch treasury data' },
      { status: 500 }
    );
  }
}