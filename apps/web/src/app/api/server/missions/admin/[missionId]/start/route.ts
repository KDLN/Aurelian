import { NextRequest, NextResponse } from 'next/server';
import { authenticateUserAndCheckAdmin, createErrorResponse, createSuccessResponse } from '@/lib/apiUtils';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ missionId: string }>;
}

// POST /api/server/missions/admin/[missionId]/start - Start mission
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
        status: true, 
        endsAt: true,
        startedAt: true
      }
    });

    if (!mission) {
      return createErrorResponse('NOT_FOUND', 'Mission not found');
    }

    if (mission.status === 'active') {
      return createErrorResponse('CONFLICT', 'Mission is already active');
    }

    if (mission.status === 'completed') {
      return createErrorResponse('CONFLICT', 'Cannot start completed mission');
    }

    if (new Date() >= new Date(mission.endsAt)) {
      return createErrorResponse('CONFLICT', 'Cannot start mission past its end date');
    }

    const updatedMission = await prisma.serverMission.update({
      where: { id: missionId },
      data: {
        status: 'active',
        startedAt: new Date()
      }
    });

    // TODO: Send notifications to all players about the new event
    // This would integrate with your notification system

    return createSuccessResponse({
      mission: {
        id: updatedMission.id,
        name: updatedMission.name,
        status: updatedMission.status,
        startedAt: updatedMission.startedAt,
        endsAt: updatedMission.endsAt
      }
    }, `Mission "${mission.name}" started successfully`);

  } catch (error) {
    console.error('Error starting mission:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to start mission');
  }
}