import { NextRequest, NextResponse } from 'next/server';
import { authenticateUserAndCheckAdmin, createErrorResponse, createSuccessResponse } from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ missionId: string }>;
}

// POST /api/server/missions/admin/[missionId]/end - End mission early or force completion
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    const { missionId } = await params;
    
    const authResult = await authenticateUserAndCheckAdmin(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }

    const body = await request.json();
    const { forced = false } = body; // Whether to force completion even if goals not met

    const mission = await prisma.serverMission.findUnique({
      where: { id: missionId },
      include: {
        participants: {
          select: {
            id: true,
            userId: true,
            contribution: true,
            tier: true,
            rewardClaimed: true
          }
        }
      }
    });

    if (!mission) {
      return createErrorResponse('NOT_FOUND', 'Mission not found');
    }

    if (mission.status === 'completed') {
      return createErrorResponse('CONFLICT', 'Mission is already completed');
    }

    // Calculate final tiers and rankings for all participants
    const updatedParticipants = [];
    
    // TODO: Implement proper tier calculation based on contribution vs requirements
    // For now, we'll use a simple calculation
    for (const participant of mission.participants) {
      if (!participant.tier) {
        // Calculate tier based on contribution (this is a simplified version)
        const contributionScore = calculateContributionScore(participant.contribution, mission.globalRequirements);
        const tiers = mission.tiers as any;
        
        let tier = 'bronze';
        if (contributionScore >= (tiers.gold || 0.5)) {
          tier = 'gold';
        } else if (contributionScore >= (tiers.silver || 0.25)) {
          tier = 'silver';
        }

        updatedParticipants.push({
          id: participant.id,
          tier
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      // Update mission status
      await tx.serverMission.update({
        where: { id: missionId },
        data: {
          status: forced ? 'completed' : 'failed',
          completedAt: new Date()
        }
      });

      // Update participant tiers
      for (const update of updatedParticipants) {
        await tx.serverMissionParticipant.update({
          where: { id: update.id },
          data: { tier: update.tier }
        });
      }

      // Calculate and assign ranks (optional, for leaderboard display)
      const allParticipants = await tx.serverMissionParticipant.findMany({
        where: { missionId },
        orderBy: [
          // This would need custom sorting logic based on contribution type
          { joinedAt: 'asc' } // Placeholder sorting
        ]
      });

      for (let i = 0; i < allParticipants.length; i++) {
        await tx.serverMissionParticipant.update({
          where: { id: allParticipants[i].id },
          data: { rank: i + 1 }
        });
      }
    });

    const finalStatus = forced ? 'completed' : 'failed';
    
    return createSuccessResponse({
      mission: {
        id: mission.id,
        name: mission.name,
        status: finalStatus,
        completedAt: new Date()
      },
      participantsProcessed: updatedParticipants.length
    }, `Mission "${mission.name}" ${finalStatus} successfully`);

  } catch (error) {
    console.error('Error ending mission:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to end mission');
  }
}

// Helper function to calculate contribution score (simplified version)
function calculateContributionScore(contribution: any, requirements: any): number {
  if (!contribution || !requirements) return 0;
  
  let totalScore = 0;
  let totalPossible = 0;

  // Calculate score for items
  if (requirements.items && contribution.items) {
    for (const [itemKey, required] of Object.entries(requirements.items as Record<string, number>)) {
      const contributed = contribution.items[itemKey] || 0;
      totalScore += Math.min(contributed / required, 1);
      totalPossible += 1;
    }
  }

  // Calculate score for gold
  if (requirements.gold && contribution.gold) {
    totalScore += Math.min(contribution.gold / requirements.gold, 1);
    totalPossible += 1;
  }

  // Calculate score for trades
  if (requirements.trades && contribution.trades) {
    totalScore += Math.min(contribution.trades / requirements.trades, 1);
    totalPossible += 1;
  }

  return totalPossible > 0 ? totalScore / totalPossible : 0;
}