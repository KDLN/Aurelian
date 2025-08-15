import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Break existing alliance
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

    const { allianceId, reason } = await request.json();

    if (!allianceId) {
      return NextResponse.json({ error: 'Alliance ID is required' }, { status: 400 });
    }

    // Get user's guild membership
    const membership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      select: { guildId: true, role: true, guild: { select: { id: true, name: true, tag: true } } }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not in a guild' }, { status: 403 });
    }

    // Check permissions (Only LEADER can break alliances)
    if (membership.role !== 'LEADER') {
      return NextResponse.json({ 
        error: 'Only guild leaders can break alliances' 
      }, { status: 403 });
    }

    // Get the alliance
    const alliance = await prisma.guildAlliance.findUnique({
      where: { id: allianceId },
      include: {
        fromGuild: { select: { id: true, name: true, tag: true } },
        toGuild: { select: { id: true, name: true, tag: true } },
        channels: { select: { id: true } },
        missions: { 
          select: { id: true, status: true },
          where: { status: 'active' }
        }
      }
    });

    if (!alliance) {
      return NextResponse.json({ error: 'Alliance not found' }, { status: 404 });
    }

    // Verify user's guild is part of this alliance
    if (alliance.fromGuildId !== membership.guildId && alliance.toGuildId !== membership.guildId) {
      return NextResponse.json({ 
        error: 'You can only break alliances your guild is part of' 
      }, { status: 403 });
    }

    // Can only break accepted alliances
    if (alliance.status !== 'ACCEPTED') {
      return NextResponse.json({ 
        error: 'You can only break active alliances' 
      }, { status: 400 });
    }

    const otherGuild = alliance.fromGuildId === membership.guildId 
      ? alliance.toGuild 
      : alliance.fromGuild;

    // Break the alliance and clean up
    const result = await prisma.$transaction(async (tx) => {
      // Mark alliance as broken
      const brokenAlliance = await tx.guildAlliance.update({
        where: { id: allianceId },
        data: {
          status: 'DECLINED', // Reuse DECLINED status for broken alliances
          brokenAt: new Date(),
          brokenBy: user.id,
          brokenReason: reason || 'No reason provided'
        }
      });

      // Deactivate alliance channels
      if (alliance.channels.length > 0) {
        await tx.allianceChannel.updateMany({
          where: { allianceId: allianceId },
          data: { isActive: false }
        });
      }

      // Complete or cancel active alliance missions
      if (alliance.missions.length > 0) {
        await tx.allianceMission.updateMany({
          where: { 
            allianceId: allianceId,
            status: 'active'
          },
          data: { 
            status: 'cancelled',
            completedAt: new Date()
          }
        });
      }

      // Log the breaking in both guilds
      await tx.guildLog.create({
        data: {
          guildId: membership.guildId,
          userId: user.id,
          action: 'alliance_broken',
          details: {
            allianceId: allianceId,
            otherGuildId: otherGuild.id,
            otherGuildName: otherGuild.name,
            otherGuildTag: otherGuild.tag,
            type: alliance.type,
            reason: reason || 'No reason provided',
            channelsDeactivated: alliance.channels.length,
            missionsCompleted: alliance.missions.length
          }
        }
      });

      await tx.guildLog.create({
        data: {
          guildId: otherGuild.id,
          action: 'alliance_broken_by_other',
          details: {
            allianceId: allianceId,
            breakingGuildId: membership.guildId,
            breakingGuildName: membership.guild.name,
            breakingGuildTag: membership.guild.tag,
            type: alliance.type,
            reason: reason || 'No reason provided',
            channelsDeactivated: alliance.channels.length,
            missionsCompleted: alliance.missions.length
          }
        }
      });

      return brokenAlliance;
    });

    return NextResponse.json({
      success: true,
      message: 'Alliance broken successfully',
      details: {
        allianceId: result.id,
        brokenAt: result.brokenAt,
        reason: result.brokenReason,
        otherGuild: {
          id: otherGuild.id,
          name: otherGuild.name,
          tag: otherGuild.tag
        },
        cleanupActions: {
          channelsDeactivated: alliance.channels.length,
          missionsCancelled: alliance.missions.length
        }
      }
    });

  } catch (error) {
    console.error('Error breaking alliance:', error);
    return NextResponse.json(
      { error: 'Failed to break alliance' },
      { status: 500 }
    );
  }
}