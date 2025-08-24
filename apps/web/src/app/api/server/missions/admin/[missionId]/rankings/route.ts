import { NextRequest, NextResponse } from 'next/server';
import { authenticateUserAndCheckAdmin, createErrorResponse, createSuccessResponse } from '@/lib/apiUtils';
import { updateMissionRankings } from '@/lib/serverMissions';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ missionId: string }>;
}

// POST /api/server/missions/admin/[missionId]/rankings - Recalculate and update rankings
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    const { missionId } = await params;
    
    const authResult = await authenticateUserAndCheckAdmin(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }

    // Verify mission exists
    const mission = await prisma.serverMission.findUnique({
      where: { id: missionId },
      select: { 
        id: true, 
        name: true,
        _count: { select: { participants: true } }
      }
    });

    if (!mission) {
      return createErrorResponse('NOT_FOUND', 'Mission not found');
    }

    // Update all rankings
    const updatedRankings = await updateMissionRankings(missionId);

    return createSuccessResponse({
      missionId: mission.id,
      missionName: mission.name,
      totalParticipants: mission._count.participants,
      updatedRankings: updatedRankings?.length || 0,
      rankings: updatedRankings || []
    }, 'Rankings updated successfully');

  } catch (error) {
    console.error('Error updating rankings:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to update rankings');
  }
}