import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import {
  validateContribution,
  consumeResources,
  updateMissionProgress,
  calculateContributionScore,
  calculateTier,
  mergeContributions,
  isMissionCompleted,
  updateMissionRankings,
  type ContributionData,
  type MissionRequirements,
  type TierThresholds
} from '@/lib/serverMissions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RouteParams {
  params: Promise<{ missionId: string }>;
}

// POST /api/server/missions/[missionId]/participate - Submit contribution
export async function POST(request: NextRequest, { params }: RouteParams) {
  let user: any = null;
  let missionId: string = '';
  
  try {
    // Try Bearer token first (from Authorization header)
    let token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    // Fallback to cookie if no Bearer token
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
    console.log('Participation request received:', {
      missionId,
      userId: user.id,
      body
    });
    
    const { contribution } = body as { contribution: ContributionData };

    if (!contribution) {
      console.error('No contribution data in request body');
      return NextResponse.json({ error: 'Contribution data required' }, { status: 400 });
    }

    // Get mission details
    const mission = await prisma.serverMission.findUnique({
      where: { id: missionId },
      include: {
        participants: {
          where: { userId: user.id }
        }
      }
    });

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    if (mission.status !== 'active') {
      return NextResponse.json({ error: 'Mission is not active' }, { status: 400 });
    }

    if (new Date() > new Date(mission.endsAt)) {
      return NextResponse.json({ error: 'Mission has ended' }, { status: 400 });
    }

    // Validate the contribution
    const validation = await validateContribution(contribution, user.id, missionId);
    if (!validation.valid) {
      console.error('Validation failed for mission participation:', {
        missionId,
        userId: user.id,
        contribution,
        errors: validation.errors
      });
      return NextResponse.json({ 
        error: 'Invalid contribution', 
        details: validation.errors 
      }, { status: 400 });
    }

    // Get previous contribution if exists
    const previousParticipation = mission.participants[0];
    const previousContribution = previousParticipation?.contribution as ContributionData | undefined;

    // Get user's guild affiliation
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        guildMembership: {
          select: { guildId: true }
        }
      }
    });

    const guildId = userProfile?.guildMembership?.guildId || null;

    // Merge new contribution with existing (accumulative)
    const accumulatedContribution = mergeContributions(previousContribution, contribution);

    // Calculate contribution score and tier based on TOTAL contributions
    const requirements = mission.globalRequirements as MissionRequirements;
    const tiers = mission.tiers as TierThresholds;
    const score = calculateContributionScore(accumulatedContribution, requirements);
    const tier = calculateTier(score, tiers);

    let participation;
    await prisma.$transaction(async (tx) => {
      // Consume resources from user's inventory/wallet
      await consumeResources(contribution, user.id, missionId, tx);

      // Create or update participation with accumulated total
      participation = await tx.serverMissionParticipant.upsert({
        where: {
          missionId_userId: {
            missionId,
            userId: user.id
          }
        },
        update: {
          contribution: accumulatedContribution, // Store accumulated total
          guildId: guildId,
          tier: tier !== 'none' ? tier : null
        },
        create: {
          missionId,
          userId: user.id,
          guildId: guildId,
          contribution: accumulatedContribution,
          tier: tier !== 'none' ? tier : null
        }
      });

      // Update mission progress
      try {
        console.log('📊 Updating mission progress...', {
          missionId,
          contribution,
          previousContribution
        });
        await updateMissionProgress(missionId, contribution, previousContribution);
        console.log('✅ Mission progress updated successfully');
      } catch (progressError) {
        console.error('❌ Failed to update mission progress:', progressError);
        // Continue with the transaction - don't fail the contribution
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: user.id,
          type: 'server_mission_contribution',
          message: `Contributed to "${mission.name}"`,
          metadata: {
            missionId,
            contribution,
            tier,
            score: Math.round(score * 100) / 100
          }
        }
      });
    }, {
      timeout: 15000 // 15 second timeout
    });

    // Resources already consumed in the transaction above

    // Check if mission is now completed
    const updatedMission = await prisma.serverMission.findUnique({
      where: { id: missionId },
      select: { globalProgress: true, globalRequirements: true }
    });

    let missionCompleted = false;
    if (updatedMission && isMissionCompleted(
      updatedMission.globalProgress as ContributionData,
      updatedMission.globalRequirements as MissionRequirements
    )) {
      await prisma.serverMission.update({
        where: { id: missionId },
        data: {
          status: 'completed',
          completedAt: new Date()
        }
      });
      missionCompleted = true;
    }

    // Update rankings after any contribution change
    await updateMissionRankings(missionId);

    // Get updated participation data with new rankings
    const finalParticipation = await prisma.serverMissionParticipant.findUnique({
      where: { id: participation!.id },
      select: {
        id: true,
        contribution: true,
        tier: true,
        rank: true,
        joinedAt: true
      }
    });

    return NextResponse.json({ 
      success: true,
      participation: {
        id: finalParticipation!.id,
        contribution: finalParticipation!.contribution,
        tier: finalParticipation!.tier,
        rank: finalParticipation!.rank,
        joinedAt: finalParticipation!.joinedAt,
        contributionScore: Math.round(score * 100) / 100
      },
      mission: {
        completed: missionCompleted,
        progress: updatedMission?.globalProgress
      }
    });

  } catch (error: any) {
    console.error('Error submitting participation:', {
      error: error.message,
      stack: error.stack,
      missionId,
      userId: user?.id
    });
    return NextResponse.json(
      { 
        error: 'Failed to submit participation',
        details: error.message || 'Unknown server error'
      },
      { status: 500 }
    );
  }
}