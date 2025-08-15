import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - List alliance missions
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
      select: { guildId: true, role: true }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not in a guild' }, { status: 403 });
    }

    // Get all alliances for user's guild
    const alliances = await prisma.guildAlliance.findMany({
      where: {
        OR: [
          { fromGuildId: membership.guildId },
          { toGuildId: membership.guildId }
        ],
        status: 'ACCEPTED',
        type: 'ALLIANCE'
      },
      select: { id: true }
    });

    const allianceIds = alliances.map(a => a.id);

    if (allianceIds.length === 0) {
      return NextResponse.json({
        success: true,
        missions: {
          available: [],
          participating: [],
          completed: []
        }
      });
    }

    // Get all alliance missions
    const missions = await prisma.allianceMission.findMany({
      where: {
        allianceId: { in: allianceIds }
      },
      include: {
        alliance: {
          include: {
            fromGuild: { select: { id: true, name: true, tag: true } },
            toGuild: { select: { id: true, name: true, tag: true } }
          }
        },
        participants: {
          include: {
            user: {
              include: {
                profile: { select: { display: true } },
                guildMembership: {
                  include: {
                    guild: { select: { name: true, tag: true } }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Categorize missions
    const userParticipation = await prisma.allianceMissionParticipant.findMany({
      where: { userId: user.id },
      select: { missionId: true }
    });

    const userMissionIds = new Set(userParticipation.map(p => p.missionId));

    const formattedMissions = missions.map(mission => ({
      id: mission.id,
      name: mission.name,
      description: mission.description,
      requirements: mission.requirements,
      rewards: mission.rewards,
      status: mission.status,
      startedAt: mission.startedAt,
      completedAt: mission.completedAt,
      expiresAt: mission.expiresAt,
      maxParticipants: mission.maxParticipants,
      currentParticipants: mission.currentParticipants,
      alliance: {
        id: mission.alliance.id,
        fromGuild: mission.alliance.fromGuild,
        toGuild: mission.alliance.toGuild
      },
      participants: mission.participants.map(p => ({
        id: p.id,
        userId: p.userId,
        displayName: p.user.profile?.display || 'Unknown',
        guildName: p.user.guildMembership?.guild.name || 'Unknown',
        guildTag: p.user.guildMembership?.guild.tag || '?',
        contribution: p.contribution,
        joinedAt: p.joinedAt
      })),
      isParticipating: userMissionIds.has(mission.id),
      canJoin: mission.status === 'active' && 
               mission.currentParticipants < mission.maxParticipants &&
               !userMissionIds.has(mission.id)
    }));

    const available = formattedMissions.filter(m => 
      m.status === 'active' && !m.isParticipating
    );
    const participating = formattedMissions.filter(m => 
      m.status === 'active' && m.isParticipating
    );
    const completed = formattedMissions.filter(m => 
      m.status === 'completed' && m.isParticipating
    );

    return NextResponse.json({
      success: true,
      missions: {
        available,
        participating,
        completed
      },
      stats: {
        totalMissions: missions.length,
        activeMissions: missions.filter(m => m.status === 'active').length,
        completedMissions: missions.filter(m => m.status === 'completed').length,
        userParticipating: participating.length
      }
    });

  } catch (error) {
    console.error('Error fetching alliance missions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alliance missions' },
      { status: 500 }
    );
  }
}

// POST - Create new alliance mission
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

    const { 
      allianceId, 
      name, 
      description, 
      requirements, 
      rewards,
      maxParticipants,
      expiresIn 
    } = await request.json();

    if (!allianceId || !name || !description || !requirements || !rewards) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Get user's guild membership
    const membership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      select: { guildId: true, role: true }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not in a guild' }, { status: 403 });
    }

    // Check if user can create alliance missions (LEADER or OFFICER)
    if (!['LEADER', 'OFFICER'].includes(membership.role)) {
      return NextResponse.json({ 
        error: 'Only leaders and officers can create alliance missions' 
      }, { status: 403 });
    }

    // Verify alliance exists and user's guild is part of it
    const alliance = await prisma.guildAlliance.findUnique({
      where: { id: allianceId },
      select: {
        id: true,
        fromGuildId: true,
        toGuildId: true,
        status: true,
        type: true
      }
    });

    if (!alliance) {
      return NextResponse.json({ error: 'Alliance not found' }, { status: 404 });
    }

    if (alliance.status !== 'ACCEPTED' || alliance.type !== 'ALLIANCE') {
      return NextResponse.json({ 
        error: 'Alliance must be active to create missions' 
      }, { status: 400 });
    }

    if (alliance.fromGuildId !== membership.guildId && alliance.toGuildId !== membership.guildId) {
      return NextResponse.json({ 
        error: 'Your guild is not part of this alliance' 
      }, { status: 403 });
    }

    // Calculate expiration date
    const expiresAt = expiresIn ? new Date(Date.now() + (expiresIn * 60 * 60 * 1000)) : null;

    // Create the mission
    const mission = await prisma.allianceMission.create({
      data: {
        allianceId,
        name,
        description,
        requirements,
        rewards,
        maxParticipants: maxParticipants || 10,
        expiresAt,
        status: 'active'
      },
      include: {
        alliance: {
          include: {
            fromGuild: { select: { id: true, name: true, tag: true } },
            toGuild: { select: { id: true, name: true, tag: true } }
          }
        }
      }
    });

    // Log mission creation in both guilds
    const guildsToLog = [alliance.fromGuildId, alliance.toGuildId];
    await Promise.all(guildsToLog.map(guildId =>
      prisma.guildLog.create({
        data: {
          guildId,
          userId: user.id,
          action: 'alliance_mission_created',
          details: {
            missionId: mission.id,
            missionName: name,
            allianceId,
            maxParticipants: maxParticipants || 10,
            expiresAt,
            createdByGuild: membership.guildId
          }
        }
      })
    ));

    return NextResponse.json({
      success: true,
      message: 'Alliance mission created successfully',
      mission: {
        id: mission.id,
        name: mission.name,
        description: mission.description,
        requirements: mission.requirements,
        rewards: mission.rewards,
        status: mission.status,
        maxParticipants: mission.maxParticipants,
        currentParticipants: mission.currentParticipants,
        startedAt: mission.startedAt,
        expiresAt: mission.expiresAt,
        alliance: {
          id: mission.alliance.id,
          fromGuild: mission.alliance.fromGuild,
          toGuild: mission.alliance.toGuild
        }
      }
    });

  } catch (error) {
    console.error('Error creating alliance mission:', error);
    return NextResponse.json(
      { error: 'Failed to create alliance mission' },
      { status: 500 }
    );
  }
}