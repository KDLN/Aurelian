import { NextRequest, NextResponse } from 'next/server';
import { authenticateUserAndCheckAdmin, createErrorResponse, createSuccessResponse } from '@/lib/apiUtils';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ missionId: string }>;
}

// POST /api/server/missions/admin/[missionId]/pause - Pause active mission
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    const { missionId } = await params;
    
    const authResult = await authenticateUserAndCheckAdmin(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }

    const mission = await prisma.serverMission.findUnique({
      where: { id: missionId },
      select: { 
        id: true, 
        name: true, 
        status: true 
      }
    });

    if (!mission) {
      return createErrorResponse('NOT_FOUND', 'Mission not found');
    }

    if (mission.status !== 'active') {
      return createErrorResponse('CONFLICT', 'Only active missions can be paused');
    }

    const updatedMission = await prisma.serverMission.update({
      where: { id: missionId },
      data: {
        status: 'scheduled' // Paused missions go back to scheduled status
      }
    });

    return createSuccessResponse({
      mission: {
        id: updatedMission.id,
        name: updatedMission.name,
        status: updatedMission.status
      }
    }, `Mission "${mission.name}" paused successfully`);

  } catch (error) {
    console.error('Error pausing mission:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to pause mission');
  }
}