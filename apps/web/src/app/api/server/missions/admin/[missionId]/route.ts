import { NextRequest, NextResponse } from 'next/server';
import { authenticateUserAndCheckAdmin, createErrorResponse, createSuccessResponse } from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ missionId: string }>;
}

// GET /api/server/missions/admin/[missionId] - Get detailed mission info for admin
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    const { missionId } = await params;
    
    const authResult = await authenticateUserAndCheckAdmin(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }

    const mission = await prisma.serverMission.findUnique({
      where: { id: missionId },
      include: {
        participants: {
          include: {
            user: {
              include: {
                profile: {
                  select: { display: true }
                },
                guildMembership: {
                  include: {
                    guild: {
                      select: { name: true, tag: true }
                    }
                  }
                }
              }
            }
          },
          orderBy: [
            { rank: 'asc' },
            { joinedAt: 'asc' }
          ]
        },
        _count: {
          select: {
            participants: true
          }
        }
      }
    });

    if (!mission) {
      return createErrorResponse('NOT_FOUND', 'Mission not found');
    }

    const formattedParticipants = mission.participants.map(participant => ({
      id: participant.id,
      userId: participant.userId,
      displayName: participant.user.profile?.display || 'Anonymous Trader',
      guild: participant.user.guildMembership ? {
        name: participant.user.guildMembership.guild.name,
        tag: participant.user.guildMembership.guild.tag
      } : null,
      contribution: participant.contribution,
      tier: participant.tier,
      rank: participant.rank,
      rewardClaimed: participant.rewardClaimed,
      joinedAt: participant.joinedAt
    }));

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
      createdAt: mission.createdAt,
      participantCount: mission._count.participants,
      participants: formattedParticipants
    };

    return createSuccessResponse(response);

  } catch (error) {
    console.error('Error fetching admin mission details:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch mission details');
  }
}

// PATCH /api/server/missions/admin/[missionId] - Update mission
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    const { missionId } = await params;
    
    const authResult = await authenticateUserAndCheckAdmin(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }

    const body = await request.json();
    const allowedUpdates = ['name', 'description', 'globalRequirements', 'rewards', 'tiers', 'endsAt', 'globalProgress'];
    
    const updates: any = {};
    for (const field of allowedUpdates) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return createErrorResponse('MISSING_FIELDS', 'No valid fields to update');
    }

    // Validate end date if being updated
    if (updates.endsAt && new Date(updates.endsAt) <= new Date()) {
      return createErrorResponse('MISSING_FIELDS', 'End date must be in the future');
    }

    const mission = await prisma.serverMission.update({
      where: { id: missionId },
      data: updates
    });

    return createSuccessResponse({
      mission: {
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
        createdAt: mission.createdAt
      }
    }, 'Mission updated successfully');

  } catch (error) {
    console.error('Error updating mission:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to update mission');
  }
}

// DELETE /api/server/missions/admin/[missionId] - Delete mission
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    const { missionId } = await params;
    
    const authResult = await authenticateUserAndCheckAdmin(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }

    // Check if mission exists and can be deleted
    const mission = await prisma.serverMission.findUnique({
      where: { id: missionId },
      select: { status: true, _count: { select: { participants: true } } }
    });

    if (!mission) {
      return createErrorResponse('NOT_FOUND', 'Mission not found');
    }

    if (mission.status === 'active') {
      return createErrorResponse('CONFLICT', 'Cannot delete active mission');
    }

    if (mission._count.participants > 0) {
      return createErrorResponse('CONFLICT', 'Cannot delete mission with participants');
    }

    await prisma.serverMission.delete({
      where: { id: missionId }
    });

    return createSuccessResponse({}, 'Mission deleted successfully');

  } catch (error) {
    console.error('Error deleting mission:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to delete mission');
  }
}