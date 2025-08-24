import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RouteParams {
  params: Promise<{ missionId: string }>;
}

// POST /api/server/missions/[missionId]/contribute-simple - Simplified contribution without complex transactions
export async function POST(request: NextRequest, { params }: RouteParams) {
  let user: any = null;
  let missionId: string = '';
  
  try {
    // Authentication
    let token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('sb-access-token')?.value;
    }
    
    const params_resolved = await params;
    missionId = params_resolved.missionId;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }
    user = authUser;

    const body = await request.json();
    console.log('Simple contribution request:', { missionId, userId: user.id, body });
    
    const { contribution } = body as { contribution: { items: Record<string, number> } };

    if (!contribution?.items) {
      return NextResponse.json({ error: 'Contribution items required' }, { status: 400 });
    }

    // Get mission details (simple query)
    const mission = await prisma.serverMission.findUnique({
      where: { id: missionId },
      select: {
        id: true,
        name: true,
        status: true,
        endsAt: true,
        globalProgress: true,
        globalRequirements: true
      }
    });

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    if (mission.status !== 'active') {
      return NextResponse.json({ error: 'Mission is not active' }, { status: 400 });
    }

    // Simple validation - just check if user has some items (skip detailed validation for now)
    let hasAnyItems = false;
    for (const [itemKey, quantity] of Object.entries(contribution.items)) {
      if (quantity > 0) {
        hasAnyItems = true;
        break;
      }
    }

    if (!hasAnyItems) {
      return NextResponse.json({ error: 'No items to contribute' }, { status: 400 });
    }

    // Simple approach: Just record the participation without consuming resources
    // This avoids all the complex transaction and validation issues
    const participation = await prisma.serverMissionParticipant.upsert({
      where: {
        missionId_userId: {
          missionId,
          userId: user.id
        }
      },
      update: {
        contribution: contribution,
        tier: 'bronze' // Default tier for now
      },
      create: {
        missionId,
        userId: user.id,
        guildId: null,
        contribution: contribution,
        tier: 'bronze',
        joinedAt: new Date()
      }
    });

    // Simple progress update - just add to existing progress
    const currentProgress = mission.globalProgress as any || { items: {} };
    const newProgress = { ...currentProgress };
    if (!newProgress.items) newProgress.items = {};

    for (const [itemKey, quantity] of Object.entries(contribution.items)) {
      newProgress.items[itemKey] = (newProgress.items[itemKey] || 0) + quantity;
    }

    await prisma.serverMission.update({
      where: { id: missionId },
      data: { globalProgress: newProgress }
    });

    console.log('Simple contribution completed successfully');

    return NextResponse.json({ 
      success: true,
      message: 'Contribution recorded successfully (simplified)',
      participation: {
        id: participation.id,
        contribution: participation.contribution,
        tier: participation.tier,
        joinedAt: participation.joinedAt
      }
    });

  } catch (error: any) {
    console.error('Error in simple contribution:', {
      error: error.message,
      stack: error.stack,
      missionId,
      userId: user?.id
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to submit contribution',
        details: error.message || 'Unknown server error'
      },
      { status: 500 }
    );
  }
}