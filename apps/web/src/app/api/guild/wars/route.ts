import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUser,
  createErrorResponse,
  createSuccessResponse
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Get guild wars and alliances
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }
    const { user } = authResult;

    // Get user's guild membership
    const membership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      select: { guildId: true, role: true }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not in a guild' }, { status: 403 });
    }

    // Get guild alliances/rivalries
    const alliances = await prisma.guildAlliance.findMany({
      where: {
        OR: [
          { fromGuildId: membership.guildId },
          { toGuildId: membership.guildId }
        ]
      },
      include: {
        fromGuild: {
          select: {
            id: true,
            name: true,
            tag: true,
            level: true,
            treasury: true,
            _count: {
              select: { members: true }
            }
          }
        },
        toGuild: {
          select: {
            id: true,
            name: true,
            tag: true,
            level: true,
            treasury: true,
            _count: {
              select: { members: true }
            }
          }
        }
      },
      orderBy: { proposedAt: 'desc' }
    });

    // Format the alliances/rivalries
    const rivalries = alliances.map(alliance => {
      const isFromGuild = alliance.fromGuildId === membership.guildId;
      const opponent = isFromGuild ? alliance.toGuild : alliance.fromGuild;
      
      return {
        id: alliance.id,
        opponent: {
          id: opponent.id,
          name: opponent.name,
          tag: opponent.tag,
          level: opponent.level,
          treasury: opponent.treasury,
          memberCount: opponent._count.members
        },
        type: alliance.type,
        status: alliance.status,
        proposedAt: alliance.proposedAt,
        acceptedAt: alliance.acceptedAt,
        isProposer: isFromGuild
      };
    });

    // Get guild leaderboard for competitions
    const guilds = await prisma.guild.findMany({
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
        { xp: 'desc' },
        { treasury: 'desc' }
      ],
      take: 20
    });

    const leaderboard = guilds.map((guild, index) => ({
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
      isOwnGuild: guild.id === membership.guildId
    }));

    const currentGuildRank = leaderboard.findIndex(entry => entry.isOwnGuild) + 1;

    // Mock weekly stats (could be enhanced with real data later)
    const weeklyStats = {
      tradingVolume: 0, // Could be calculated from actual trades
      craftingJobs: 0   // Could be calculated from actual crafting jobs
    };

    return createSuccessResponse({
      wars: {
        rivalries: rivalries,
        canDeclareWar: ['LEADER', 'OFFICER'].includes(membership.role)
      },
      competitions: {
        leaderboard: leaderboard,
        currentGuildRank: currentGuildRank,
        weeklyStats: weeklyStats
      }
    });

  } catch (error) {
    console.error('Error fetching guild wars:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch war data');
  }
}

// POST - Declare war or alliance
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }
    const { user } = authResult;

    const { action, targetGuildId, type } = await request.json();

    if (!action || (!targetGuildId && action !== 'accept' && action !== 'decline')) {
      return createErrorResponse('MISSING_FIELDS', 'Missing required fields');
    }

    // Get user's guild membership
    const membership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      select: { guildId: true, role: true }
    });

    if (!membership) {
      return createErrorResponse('NOT_IN_GUILD', 'Not in a guild');
    }

    // Check permissions
    if (!['LEADER', 'OFFICER'].includes(membership.role)) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Only leaders and officers can manage wars');
    }

    let result;
    switch (action) {
      case 'declare':
        if (!type || !['ALLIANCE', 'RIVALRY'].includes(type)) {
          return createErrorResponse('INVALID_TYPE', 'Invalid alliance type');
        }

        // Check if target guild exists
        const targetGuild = await prisma.guild.findUnique({
          where: { id: targetGuildId },
          select: { id: true, name: true }
        });

        if (!targetGuild) {
          return NextResponse.json({ error: 'Target guild not found' }, { status: 404 });
        }

        if (targetGuild.id === membership.guildId) {
          return NextResponse.json({ error: 'Cannot declare war on your own guild' }, { status: 400 });
        }

        // Check if alliance/rivalry already exists
        const existingAlliance = await prisma.guildAlliance.findFirst({
          where: {
            OR: [
              { fromGuildId: membership.guildId, toGuildId: targetGuildId },
              { fromGuildId: targetGuildId, toGuildId: membership.guildId }
            ]
          }
        });

        if (existingAlliance) {
          return NextResponse.json({ error: 'Alliance or rivalry already exists with this guild' }, { status: 400 });
        }

        // Create the alliance/rivalry
        result = await prisma.guildAlliance.create({
          data: {
            fromGuildId: membership.guildId,
            toGuildId: targetGuildId,
            type: type,
            status: 'PENDING'
          }
        });

        // Log the action
        await prisma.guildLog.create({
          data: {
            guildId: membership.guildId,
            userId: user.id,
            action: type === 'ALLIANCE' ? 'alliance_proposed' : 'war_declared',
            details: {
              targetGuildId: targetGuildId,
              targetGuildName: targetGuild.name,
              type: type
            }
          }
        });

        break;

      default:
        return createErrorResponse('INVALID_ACTION', 'Invalid action');
    }

    return createSuccessResponse({
      message: `${type === 'ALLIANCE' ? 'Alliance' : 'War'} declaration sent successfully`,
      result
    });

  } catch (error) {
    console.error('Error managing guild war:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to manage war declaration');
  }
}