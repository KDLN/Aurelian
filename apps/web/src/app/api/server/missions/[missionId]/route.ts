import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RouteParams {
  params: Promise<{ missionId: string }>;
}

// GET /api/server/missions/[missionId] - Get detailed mission info
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    const { missionId } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    const mission = await prisma.serverMission.findUnique({
      where: { id: missionId },
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
      }
    });

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    const response = {
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
      completedAt: mission.completedAt,
      participantCount: mission._count.participants,
      userParticipation: mission.participants[0] || null
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching server mission:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server mission' },
      { status: 500 }
    );
  }
}