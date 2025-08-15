import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Join an alliance mission
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

    const { missionId } = await request.json();

    if (!missionId) {
      return NextResponse.json({ error: 'Mission ID is required' }, { status: 400 });
    }

    // Get user's guild membership
    const membership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      include: {
        guild: { select: { id: true, name: true, tag: true } }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not in a guild' }, { status: 403 });
    }

    // Get mission details
    const mission = await prisma.allianceMission.findUnique({
      where: { id: missionId },
      include: {
        alliance: {
          select: {
            id: true,
            fromGuildId: true,
            toGuildId: true,
            status: true,
            type: true
          }
        },
        participants: {
          select: { userId: true }
        }
      }
    });

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Check if alliance is active
    if (mission.alliance.status !== 'ACCEPTED' || mission.alliance.type !== 'ALLIANCE') {
      return NextResponse.json({ 
        error: 'Alliance is not active' 
      }, { status: 400 });
    }

    // Check if user's guild is part of the alliance
    const isPartOfAlliance = mission.alliance.fromGuildId === membership.guildId || 
                           mission.alliance.toGuildId === membership.guildId;

    if (!isPartOfAlliance) {
      return NextResponse.json({ 
        error: 'Your guild is not part of this alliance' 
      }, { status: 403 });
    }

    // Check if mission is still active
    if (mission.status !== 'active') {
      return NextResponse.json({ 
        error: 'Mission is no longer active' 
      }, { status: 400 });
    }

    // Check if mission has expired
    if (mission.expiresAt && new Date() > mission.expiresAt) {
      return NextResponse.json({ 
        error: 'Mission has expired' 
      }, { status: 400 });
    }

    // Check if user is already participating
    const isAlreadyParticipating = mission.participants.some(p => p.userId === user.id);
    if (isAlreadyParticipating) {
      return NextResponse.json({ 
        error: 'You are already participating in this mission' 
      }, { status: 400 });
    }

    // Check if mission is full
    if (mission.currentParticipants >= mission.maxParticipants) {
      return NextResponse.json({ 
        error: 'Mission is full' 
      }, { status: 400 });
    }

    // Join the mission
    const result = await prisma.$transaction(async (tx) => {
      // Add participant
      const participant = await tx.allianceMissionParticipant.create({
        data: {
          missionId: missionId,
          userId: user.id,
          guildId: membership.guildId
        }
      });

      // Update mission participant count
      await tx.allianceMission.update({
        where: { id: missionId },
        data: { currentParticipants: { increment: 1 } }
      });

      // Log the action
      await tx.guildLog.create({
        data: {
          guildId: membership.guildId,
          userId: user.id,
          action: 'alliance_mission_joined',
          details: {
            missionId,
            missionName: mission.name,
            allianceId: mission.allianceId,
            participantCount: mission.currentParticipants + 1
          }
        }
      });

      return participant;
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully joined alliance mission',
      participation: {
        id: result.id,
        missionId,
        joinedAt: result.joinedAt,
        guild: {
          id: membership.guild.id,
          name: membership.guild.name,
          tag: membership.guild.tag
        }
      }
    });

  } catch (error) {
    console.error('Error joining alliance mission:', error);
    return NextResponse.json(
      { error: 'Failed to join alliance mission' },
      { status: 500 }
    );
  }
}