import { NextRequest, NextResponse } from 'next/server';
import { authenticateUserAndCheckAdmin, createErrorResponse, createSuccessResponse, validateRequiredFields } from '@/lib/apiUtils';
import prisma from '@/lib/prisma';

// GET /api/server/missions/admin - List all server missions for admin
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUserAndCheckAdmin(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const type = searchParams.get('type') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [missions, totalCount] = await Promise.all([
      prisma.serverMission.findMany({
        where,
        include: {
          _count: {
            select: {
              participants: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.serverMission.count({ where })
    ]);

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
      completedAt: mission.completedAt,
      createdAt: mission.createdAt,
      participantCount: mission._count.participants
    }));

    return createSuccessResponse({
      missions: formattedMissions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching admin missions:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch missions');
  }
}

// POST /api/server/missions/admin - Create new server mission
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUserAndCheckAdmin(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }

    const body = await request.json();
    const requiredFields = ['name', 'description', 'type', 'globalRequirements', 'rewards', 'tiers', 'endsAt'];
    
    const validationError = validateRequiredFields(body, requiredFields);
    if (validationError) {
      return createErrorResponse('MISSING_FIELDS', validationError);
    }

    const {
      name,
      description,
      type,
      globalRequirements,
      rewards,
      tiers,
      endsAt,
      status = 'scheduled'
    } = body;

    // Validate end date
    if (new Date(endsAt) <= new Date()) {
      return createErrorResponse('MISSING_FIELDS', 'End date must be in the future');
    }

    // Initialize empty progress matching requirements structure
    let initialProgress = {};
    if (globalRequirements.items) {
      initialProgress = { items: {} };
      for (const itemKey in globalRequirements.items) {
        initialProgress.items[itemKey] = 0;
      }
    }
    if (globalRequirements.gold) {
      initialProgress.gold = 0;
    }
    if (globalRequirements.trades) {
      initialProgress.trades = 0;
    }

    const mission = await prisma.serverMission.create({
      data: {
        name,
        description,
        type,
        globalRequirements,
        globalProgress: initialProgress,
        rewards,
        tiers,
        endsAt: new Date(endsAt),
        status,
        ...(status === 'active' && { startedAt: new Date() })
      }
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
        createdAt: mission.createdAt
      }
    }, 'Server mission created successfully');

  } catch (error) {
    console.error('Error creating server mission:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to create server mission');
  }
}