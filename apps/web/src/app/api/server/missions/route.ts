import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/server/missions - List active server missions for players
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Get active server missions
    const missions = await prisma.serverMission.findMany({
      where: {
        status: 'active'
      },
      include: {
        participants: {
          where: { userId: user.id },
          select: {
            id: true,
            contribution: true,
            tier: true,
            rank: true,
            rewardClaimed: true,
            joinedAt: true
          }
        },
        _count: {
          select: {
            participants: true
          }
        }
      },
      orderBy: {
        startedAt: 'desc'
      }
    });

    const formattedMissions = missions.map(mission => ({
      id: mission.id,
      name: mission.name,
      description: mission.description,
      type: mission.type,
      globalRequirements: mission.globalRequirements,
      globalProgress: mission.globalProgress,
      rewards: mission.rewards,
      tiers: mission.tiers,
      status: mission.status,
      startedAt: mission.startedAt,
      endsAt: mission.endsAt,
      participantCount: mission._count.participants,
      userParticipation: mission.participants[0] || null
    }));

    return NextResponse.json({ missions: formattedMissions });

  } catch (error) {
    console.error('Error fetching server missions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server missions' },
      { status: 500 }
    );
  }
}