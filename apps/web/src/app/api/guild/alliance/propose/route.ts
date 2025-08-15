import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Propose alliance
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

    const { targetGuildId, type, message, terms } = await request.json();

    if (!targetGuildId || !type || !['ALLIANCE', 'RIVALRY'].includes(type)) {
      return NextResponse.json({ 
        error: 'Missing required fields or invalid alliance type' 
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

    // Check permissions (LEADER or OFFICER can propose alliances)
    if (!['LEADER', 'OFFICER'].includes(membership.role)) {
      return NextResponse.json({ 
        error: 'Only leaders and officers can propose alliances' 
      }, { status: 403 });
    }

    // Check if target guild exists
    const targetGuild = await prisma.guild.findUnique({
      where: { id: targetGuildId },
      select: { id: true, name: true, tag: true, isActive: true }
    });

    if (!targetGuild) {
      return NextResponse.json({ error: 'Target guild not found' }, { status: 404 });
    }

    if (!targetGuild.isActive) {
      return NextResponse.json({ error: 'Target guild is inactive' }, { status: 400 });
    }

    if (targetGuild.id === membership.guildId) {
      return NextResponse.json({ 
        error: 'Cannot propose alliance with your own guild' 
      }, { status: 400 });
    }

    // Check if alliance/rivalry already exists
    const existingAlliance = await prisma.guildAlliance.findFirst({
      where: {
        OR: [
          { fromGuildId: membership.guildId, toGuildId: targetGuildId },
          { fromGuildId: targetGuildId, toGuildId: membership.guildId }
        ],
        status: { in: ['PENDING', 'ACCEPTED'] }
      }
    });

    if (existingAlliance) {
      return NextResponse.json({ 
        error: 'An active alliance or proposal already exists with this guild' 
      }, { status: 400 });
    }

    // Set default terms based on alliance type
    const defaultTerms = type === 'ALLIANCE' ? {
      travelTaxReduction: terms?.travelTaxReduction || 35,
      auctionFeeReduction: terms?.auctionFeeReduction || 12,
      safePassage: terms?.safePassage !== false,
      sharedChat: terms?.sharedChat !== false,
      jointMissions: terms?.jointMissions !== false
    } : {
      travelTaxReduction: 0,
      auctionFeeReduction: 0,
      safePassage: false,
      sharedChat: false,
      jointMissions: false
    };

    // Create the alliance proposal
    const alliance = await prisma.$transaction(async (tx) => {
      const newAlliance = await tx.guildAlliance.create({
        data: {
          fromGuildId: membership.guildId,
          toGuildId: targetGuildId,
          type: type as 'ALLIANCE' | 'RIVALRY',
          status: 'PENDING',
          proposalMessage: message || null,
          terms: defaultTerms,
          travelTaxReduction: defaultTerms.travelTaxReduction,
          auctionFeeReduction: defaultTerms.auctionFeeReduction,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
        },
        include: {
          fromGuild: { select: { id: true, name: true, tag: true } },
          toGuild: { select: { id: true, name: true, tag: true } }
        }
      });

      // Log the action in both guilds
      await tx.guildLog.create({
        data: {
          guildId: membership.guildId,
          userId: user.id,
          action: type === 'ALLIANCE' ? 'alliance_proposed' : 'rivalry_declared',
          details: {
            targetGuildId: targetGuildId,
            targetGuildName: targetGuild.name,
            targetGuildTag: targetGuild.tag,
            type: type,
            message: message || null,
            terms: defaultTerms,
            allianceId: newAlliance.id
          }
        }
      });

      // Log notification in target guild
      await tx.guildLog.create({
        data: {
          guildId: targetGuildId,
          action: type === 'ALLIANCE' ? 'alliance_proposal_received' : 'rivalry_declared_against',
          details: {
            fromGuildId: membership.guildId,
            fromGuildName: membership.guild.name,
            fromGuildTag: membership.guild.tag,
            type: type,
            message: message || null,
            terms: defaultTerms,
            allianceId: newAlliance.id
          }
        }
      });

      return newAlliance;
    });

    return NextResponse.json({
      success: true,
      message: `${type === 'ALLIANCE' ? 'Alliance' : 'Rivalry'} proposal sent successfully`,
      alliance: {
        id: alliance.id,
        type: alliance.type,
        status: alliance.status,
        fromGuild: alliance.fromGuild,
        toGuild: alliance.toGuild,
        proposedAt: alliance.proposedAt,
        expiresAt: alliance.expiresAt,
        terms: alliance.terms,
        proposalMessage: alliance.proposalMessage
      }
    });

  } catch (error) {
    console.error('Error proposing alliance:', error);
    return NextResponse.json(
      { error: 'Failed to propose alliance' },
      { status: 500 }
    );
  }
}