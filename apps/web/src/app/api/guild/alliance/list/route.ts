import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - List all alliances for user's guild
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

    // Get user's guild membership
    const membership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      select: { guildId: true, role: true, guild: { select: { id: true, name: true, tag: true } } }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not in a guild' }, { status: 403 });
    }

    // Get all alliances involving the user's guild
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
        },
        channels: {
          select: {
            id: true,
            name: true,
            isActive: true
          },
          where: { isActive: true }
        },
        missions: {
          select: {
            id: true,
            name: true,
            status: true,
            currentParticipants: true,
            maxParticipants: true
          },
          where: { status: 'active' }
        }
      },
      orderBy: [
        { status: 'asc' }, // PENDING first, then ACCEPTED, then others
        { proposedAt: 'desc' }
      ]
    });

    // Format the alliances for the response
    const formattedAlliances = alliances.map(alliance => {
      const isFromGuild = alliance.fromGuildId === membership.guildId;
      const otherGuild = isFromGuild ? alliance.toGuild : alliance.fromGuild;
      
      return {
        id: alliance.id,
        type: alliance.type,
        status: alliance.status,
        isProposer: isFromGuild,
        otherGuild: {
          id: otherGuild.id,
          name: otherGuild.name,
          tag: otherGuild.tag,
          level: otherGuild.level,
          treasury: otherGuild.treasury,
          memberCount: otherGuild._count.members
        },
        proposedAt: alliance.proposedAt,
        acceptedAt: alliance.acceptedAt,
        expiresAt: alliance.expiresAt,
        brokenAt: alliance.brokenAt,
        brokenReason: alliance.brokenReason,
        terms: alliance.terms,
        proposalMessage: alliance.proposalMessage,
        benefits: alliance.status === 'ACCEPTED' ? {
          travelTaxReduction: alliance.travelTaxReduction,
          auctionFeeReduction: alliance.auctionFeeReduction,
          safePassage: (alliance.terms as any)?.safePassage ?? true,
          sharedChat: alliance.channels.length > 0,
          jointMissions: alliance.missions.length > 0
        } : null,
        channels: alliance.channels,
        activeMissions: alliance.missions
      };
    });

    // Categorize alliances
    const activeAlliances = formattedAlliances.filter(a => a.status === 'ACCEPTED');
    const pendingProposals = formattedAlliances.filter(a => a.status === 'PENDING');
    const incomingProposals = pendingProposals.filter(a => !a.isProposer);
    const outgoingProposals = pendingProposals.filter(a => a.isProposer);
    const pastAlliances = formattedAlliances.filter(a => ['DECLINED', 'EXPIRED'].includes(a.status));

    // Calculate alliance statistics
    const stats = {
      totalActive: activeAlliances.length,
      totalAlliances: activeAlliances.filter(a => a.type === 'ALLIANCE').length,
      totalRivalries: activeAlliances.filter(a => a.type === 'RIVALRY').length,
      pendingIncoming: incomingProposals.length,
      pendingOutgoing: outgoingProposals.length,
      totalSharedChannels: activeAlliances.reduce((sum, a) => sum + a.channels.length, 0),
      totalActiveMissions: activeAlliances.reduce((sum, a) => sum + a.activeMissions.length, 0),
      averageTravelBenefit: activeAlliances.length > 0 
        ? Math.round(activeAlliances.reduce((sum, a) => sum + (a.benefits?.travelTaxReduction || 0), 0) / activeAlliances.length)
        : 0,
      averageAuctionBenefit: activeAlliances.length > 0
        ? Math.round(activeAlliances.reduce((sum, a) => sum + (a.benefits?.auctionFeeReduction || 0), 0) / activeAlliances.length)
        : 0
    };

    // Get recent alliance activity
    const recentActivity = await prisma.guildLog.findMany({
      where: {
        guildId: membership.guildId,
        action: {
          in: [
            'alliance_proposed',
            'alliance_accepted',
            'alliance_declined',
            'alliance_broken',
            'alliance_proposal_received',
            'alliance_proposal_accepted',
            'alliance_proposal_declined',
            'alliance_broken_by_other'
          ]
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
        user: {
          select: {
            profile: {
              select: { display: true }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        alliances: {
          active: activeAlliances,
          pending: {
            incoming: incomingProposals,
            outgoing: outgoingProposals
          },
          past: pastAlliances
        },
        stats,
        recentActivity: recentActivity.map(activity => ({
          id: activity.id,
          action: activity.action,
          details: activity.details,
          createdAt: activity.createdAt,
          user: activity.user?.profile?.display || 'System'
        })),
        userGuild: {
          id: membership.guild.id,
          name: membership.guild.name,
          tag: membership.guild.tag,
          userRole: membership.role,
          canManageAlliances: ['LEADER', 'OFFICER'].includes(membership.role),
          canBreakAlliances: membership.role === 'LEADER'
        }
      }
    });

  } catch (error) {
    console.error('Error listing alliances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alliances' },
      { status: 500 }
    );
  }
}