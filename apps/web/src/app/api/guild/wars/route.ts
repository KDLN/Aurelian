import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - List active guild wars and competitions
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

    // Check if user is in a guild
    const userMembership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      include: { guild: true }
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'You are not in a guild' }, { status: 400 });
    }

    // Get active rivalries involving this guild
    const rivalries = await prisma.guildAlliance.findMany({
      where: {
        OR: [
          { fromGuildId: userMembership.guildId },
          { toGuildId: userMembership.guildId }
        ],
        type: 'RIVALRY',
        status: 'active'
      },
      include: {
        fromGuild: true,
        toGuild: true
      }
    });

    // Get guild leaderboard for competitions
    const guildStats = await prisma.guild.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        tag: true,
        level: true,
        xp: true,
        treasury: true,
        _count: {
          select: { members: true }
        }
      },
      orderBy: [
        { level: 'desc' },
        { xp: 'desc' }
      ],
      take: 20
    });

    // Get this guild's rank
    const guildRank = guildStats.findIndex(g => g.id === userMembership.guildId) + 1;

    // Calculate weekly trading volume for trade competition
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const tradingVolume = await prisma.ledgerTx.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: weekAgo },
        reason: { in: ['auction_sale', 'auction_purchase'] },
        user: {
          guildMembership: {
            guildId: userMembership.guildId
          }
        }
      },
      _sum: {
        amount: true
      }
    });

    const guildTradingVolume = tradingVolume.reduce((total, tx) => total + Math.abs(tx._sum.amount || 0), 0);

    // Get weekly crafting activity
    const craftingActivity = await prisma.craftJob.count({
      where: {
        createdAt: { gte: weekAgo },
        status: 'complete',
        user: {
          guildMembership: {
            guildId: userMembership.guildId
          }
        }
      }
    });

    const formattedRivalries = rivalries.map(rivalry => {
      const opponentGuild = rivalry.fromGuildId === userMembership.guildId 
        ? rivalry.toGuild 
        : rivalry.fromGuild;
      
      return {
        id: rivalry.id,
        opponent: {
          id: opponentGuild.id,
          name: opponentGuild.name,
          tag: opponentGuild.tag,
          level: opponentGuild.level
        },
        proposedAt: rivalry.proposedAt,
        acceptedAt: rivalry.acceptedAt,
        status: rivalry.status
      };
    });

    return NextResponse.json({
      success: true,
      wars: {
        rivalries: formattedRivalries,
        canDeclareWar: ['LEADER', 'OFFICER'].includes(userMembership.role)
      },
      competitions: {
        leaderboard: guildStats.map((guild, index) => ({
          rank: index + 1,
          guild: {
            id: guild.id,
            name: guild.name,
            tag: guild.tag,
            level: guild.level,
            xp: guild.xp,
            treasury: guild.treasury,
            memberCount: guild._count.members
          },
          isOwnGuild: guild.id === userMembership.guildId
        })),
        currentGuildRank: guildRank,
        weeklyStats: {
          tradingVolume: guildTradingVolume,
          craftingJobs: craftingActivity
        }
      }
    });

  } catch (error) {
    console.error('Error fetching guild wars:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guild wars' },
      { status: 500 }
    );
  }
}

// POST - Declare war/rivalry
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

    const { targetGuildId, type } = await request.json();

    if (!targetGuildId || !type) {
      return NextResponse.json({ error: 'Target guild ID and type are required' }, { status: 400 });
    }

    if (!['ALLIANCE', 'RIVALRY'].includes(type)) {
      return NextResponse.json({ error: 'Type must be ALLIANCE or RIVALRY' }, { status: 400 });
    }

    // Check if user is in a guild and has permission
    const userMembership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      include: { guild: true }
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'You are not in a guild' }, { status: 400 });
    }

    // Only leaders and officers can declare wars/alliances
    if (!['LEADER', 'OFFICER'].includes(userMembership.role)) {
      return NextResponse.json({ error: 'Only leaders and officers can declare wars or alliances' }, { status: 403 });
    }

    // Check if target guild exists
    const targetGuild = await prisma.guild.findUnique({
      where: { id: targetGuildId }
    });

    if (!targetGuild) {
      return NextResponse.json({ error: 'Target guild not found' }, { status: 404 });
    }

    // Can't declare on own guild
    if (targetGuildId === userMembership.guildId) {
      return NextResponse.json({ error: 'Cannot declare war on your own guild' }, { status: 400 });
    }

    // Check if relationship already exists
    const existingRelation = await prisma.guildAlliance.findFirst({
      where: {
        OR: [
          { fromGuildId: userMembership.guildId, toGuildId: targetGuildId },
          { fromGuildId: targetGuildId, toGuildId: userMembership.guildId }
        ],
        status: { in: ['pending', 'active'] }
      }
    });

    if (existingRelation) {
      return NextResponse.json({ error: 'A relationship already exists with this guild' }, { status: 400 });
    }

    // Create the alliance/rivalry declaration
    const declaration = await prisma.$transaction(async (tx) => {
      const relation = await tx.guildAlliance.create({
        data: {
          fromGuildId: userMembership.guildId,
          toGuildId: targetGuildId,
          type: type as any,
          status: type === 'RIVALRY' ? 'active' : 'pending' // Rivalries are immediate, alliances need acceptance
        }
      });

      // Log the declaration
      await tx.guildLog.create({
        data: {
          guildId: userMembership.guildId,
          userId: user.id,
          action: type === 'RIVALRY' ? 'war_declared' : 'alliance_proposed',
          details: { 
            targetGuildId,
            targetGuildName: targetGuild.name,
            type
          }
        }
      });

      // Log for target guild too
      await tx.guildLog.create({
        data: {
          guildId: targetGuildId,
          userId: null, // System message
          action: type === 'RIVALRY' ? 'war_declared_against' : 'alliance_proposed_to',
          details: { 
            fromGuildId: userMembership.guildId,
            fromGuildName: userMembership.guild.name,
            type
          }
        }
      });

      return relation;
    });

    const actionText = type === 'RIVALRY' ? 'War declared' : 'Alliance proposed';
    
    return NextResponse.json({
      success: true,
      message: `${actionText} against ${targetGuild.name}`,
      declaration: {
        id: declaration.id,
        type: declaration.type,
        status: declaration.status,
        targetGuild: {
          name: targetGuild.name,
          tag: targetGuild.tag
        }
      }
    });

  } catch (error) {
    console.error('Error declaring war/alliance:', error);
    return NextResponse.json(
      { error: 'Failed to declare war/alliance' },
      { status: 500 }
    );
  }
}