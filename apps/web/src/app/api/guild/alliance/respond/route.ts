import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Respond to alliance proposal (accept/decline)
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

    const { allianceId, action, responseMessage } = await request.json();

    if (!allianceId || !action || !['ACCEPT', 'DECLINE'].includes(action)) {
      return NextResponse.json({ 
        error: 'Missing required fields or invalid action' 
      }, { status: 400 });
    }

    // Get user's guild membership
    const membership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      select: { guildId: true, role: true, guild: { select: { id: true, name: true, tag: true } } }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not in a guild' }, { status: 403 });
    }

    // Check permissions (LEADER or OFFICER can respond to alliances)
    if (!['LEADER', 'OFFICER'].includes(membership.role)) {
      return NextResponse.json({ 
        error: 'Only leaders and officers can respond to alliance proposals' 
      }, { status: 403 });
    }

    // Get the alliance proposal
    const alliance = await prisma.guildAlliance.findUnique({
      where: { id: allianceId },
      include: {
        fromGuild: { select: { id: true, name: true, tag: true } },
        toGuild: { select: { id: true, name: true, tag: true } }
      }
    });

    if (!alliance) {
      return NextResponse.json({ error: 'Alliance proposal not found' }, { status: 404 });
    }

    // Verify user's guild is the target guild
    if (alliance.toGuildId !== membership.guildId) {
      return NextResponse.json({ 
        error: 'You can only respond to proposals directed to your guild' 
      }, { status: 403 });
    }

    // Check if proposal is still pending
    if (alliance.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'This proposal has already been responded to or expired' 
      }, { status: 400 });
    }

    // Check if proposal has expired
    if (alliance.expiresAt && new Date() > alliance.expiresAt) {
      // Auto-expire the proposal
      await prisma.guildAlliance.update({
        where: { id: allianceId },
        data: { status: 'EXPIRED' }
      });
      
      return NextResponse.json({ 
        error: 'This proposal has expired' 
      }, { status: 400 });
    }

    const isAccepting = action === 'ACCEPT';
    const newStatus = isAccepting ? 'ACCEPTED' : 'DECLINED';

    // Update alliance and handle side effects
    const updatedAlliance = await prisma.$transaction(async (tx) => {
      const updated = await tx.guildAlliance.update({
        where: { id: allianceId },
        data: {
          status: newStatus as 'ACCEPTED' | 'DECLINED',
          acceptedAt: isAccepting ? new Date() : null
        },
        include: {
          fromGuild: { select: { id: true, name: true, tag: true } },
          toGuild: { select: { id: true, name: true, tag: true } }
        }
      });

      // If alliance is accepted and it's an ALLIANCE type, create shared channel
      if (isAccepting && updated.type === 'ALLIANCE') {
        await tx.allianceChannel.create({
          data: {
            allianceId: updated.id,
            name: 'alliance-general',
            description: `Alliance chat between ${updated.fromGuild.name} and ${updated.toGuild.name}`,
            isActive: true
          }
        });
      }

      // Log the response in both guilds
      await tx.guildLog.create({
        data: {
          guildId: membership.guildId,
          userId: user.id,
          action: isAccepting ? 'alliance_accepted' : 'alliance_declined',
          details: {
            allianceId: updated.id,
            otherGuildId: updated.fromGuildId,
            otherGuildName: updated.fromGuild.name,
            otherGuildTag: updated.fromGuild.tag,
            type: updated.type,
            responseMessage: responseMessage || null
          }
        }
      });

      await tx.guildLog.create({
        data: {
          guildId: updated.fromGuildId,
          action: isAccepting ? 'alliance_proposal_accepted' : 'alliance_proposal_declined',
          details: {
            allianceId: updated.id,
            respondingGuildId: membership.guildId,
            respondingGuildName: membership.guild.name,
            respondingGuildTag: membership.guild.tag,
            type: updated.type,
            responseMessage: responseMessage || null
          }
        }
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: `Alliance proposal ${isAccepting ? 'accepted' : 'declined'} successfully`,
      alliance: {
        id: updatedAlliance.id,
        type: updatedAlliance.type,
        status: updatedAlliance.status,
        fromGuild: updatedAlliance.fromGuild,
        toGuild: updatedAlliance.toGuild,
        proposedAt: updatedAlliance.proposedAt,
        acceptedAt: updatedAlliance.acceptedAt,
        terms: updatedAlliance.terms,
        travelTaxReduction: updatedAlliance.travelTaxReduction,
        auctionFeeReduction: updatedAlliance.auctionFeeReduction
      }
    });

  } catch (error) {
    console.error('Error responding to alliance:', error);
    return NextResponse.json(
      { error: 'Failed to respond to alliance proposal' },
      { status: 500 }
    );
  }
}