import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getMissionLeaderboard, getMissionTierStats } from '@/lib/serverMissions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RouteParams {
  params: Promise<{ missionId: string }>;
}

// GET /api/server/missions/[missionId]/leaderboard - Get rankings
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    const { missionId } = await params;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const guildFilter = searchParams.get('guild') || undefined;
    const tierFilter = searchParams.get('tier') || undefined;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Verify mission exists
    const mission = await prisma.serverMission.findUnique({
      where: { id: missionId },
      select: { id: true, name: true, type: true, status: true }
    });

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Get leaderboard data with filters
    const leaderboardData = await getMissionLeaderboard(missionId, {
      page,
      limit,
      guildFilter,
      tierFilter,
      userContext: user.id
    });

    // Get tier statistics
    const tierStats = await getMissionTierStats(missionId);

    // Get available guilds for filtering
    const guildsInMission = await prisma.serverMissionParticipant.findMany({
      where: { 
        missionId,
        guildId: { not: null }
      },
      include: {
        user: {
          include: {
            guildMembership: {
              include: {
                guild: {
                  select: { id: true, name: true, tag: true }
                }
              }
            }
          }
        }
      },
      distinct: ['guildId']
    });

    const availableGuilds = guildsInMission
      .map(p => p.user.guildMembership?.guild)
      .filter((guild, index, self) => 
        guild && self.findIndex(g => g?.id === guild.id) === index
      )
      .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));

    return NextResponse.json({
      mission: {
        id: mission.id,
        name: mission.name,
        type: mission.type,
        status: mission.status
      },
      leaderboard: leaderboardData.leaderboard,
      userPosition: leaderboardData.userPosition,
      pagination: leaderboardData.pagination,
      statistics: {
        tiers: tierStats,
        totalParticipants: tierStats.total
      },
      filters: {
        availableGuilds,
        availableTiers: ['bronze', 'silver', 'gold', 'legendary'],
        activeFilters: {
          guild: guildFilter,
          tier: tierFilter
        }
      }
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}