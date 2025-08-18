import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUser,
  createErrorResponse,
  createSuccessResponse,
  validateRequiredFields,
  checkRateLimit,
  logGuildActivity
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST - Send guild join request
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }
    const { user } = authResult;

    // Rate limiting - 5 requests per hour per user
    const rateLimitCheck = checkRateLimit(`guild_request:${user.id}`, 3600000, 5);
    if (!rateLimitCheck.allowed) {
      const resetIn = Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 60000);
      return createErrorResponse('RATE_LIMITED', `Too many requests sent. Try again in ${resetIn} minutes.`);
    }

    // Parse and validate request body
    const body = await request.json();
    const validationError = validateRequiredFields(body, ['guildId']);
    if (validationError) {
      return createErrorResponse('MISSING_FIELDS', validationError);
    }

    const { guildId, message } = body;

    // Validate message if provided
    if (message && (typeof message !== 'string' || message.length > 500)) {
      return createErrorResponse('MISSING_FIELDS', 'Message must be less than 500 characters');
    }

    // Check if user is already in a guild
    const existingMembership = await prisma.guildMember.findUnique({
      where: { userId: user.id }
    });

    if (existingMembership) {
      return createErrorResponse('CONFLICT', 'You are already in a guild');
    }

    // Check if guild exists and is active
    const guild = await prisma.guild.findFirst({
      where: { 
        id: guildId,
        isActive: true 
      }
    });

    if (!guild) {
      return createErrorResponse('NOT_FOUND', 'Guild not found or inactive');
    }

    // Check if guild is at capacity
    const memberCount = await prisma.guildMember.count({
      where: { guildId: guild.id }
    });

    if (memberCount >= guild.maxMembers) {
      return createErrorResponse('CONFLICT', 'Guild is at maximum capacity');
    }

    // Check if request already exists
    const existingRequest = await prisma.guildRequest.findUnique({
      where: {
        guildId_userId: {
          guildId: guild.id,
          userId: user.id
        }
      }
    });

    if (existingRequest) {
      if (existingRequest.status === 'PENDING') {
        return createErrorResponse('CONFLICT', 'You already have a pending request to this guild');
      }
      
      // If previous request was rejected/expired, allow new request after 24 hours
      const hoursSinceLastRequest = (Date.now() - existingRequest.updatedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastRequest < 24) {
        return createErrorResponse('CONFLICT', 'You must wait 24 hours before sending another request to this guild');
      }
    }

    // Create or update request (expires in 30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const guildRequest = await prisma.$transaction(async (tx) => {
      // Delete any existing request first
      if (existingRequest) {
        await tx.guildRequest.delete({
          where: { id: existingRequest.id }
        });
      }

      const request = await tx.guildRequest.create({
        data: {
          guildId: guild.id,
          userId: user.id,
          message: message || '',
          status: 'PENDING',
          expiresAt
        }
      });

      await logGuildActivity(
        guild.id,
        null, // System action
        'join_request_received',
        { 
          requesterId: user.id,
          message: message || '',
          expiresAt: expiresAt.toISOString()
        },
        tx
      );

      return request;
    }, {
      isolationLevel: 'Serializable',
      timeout: 10000
    });

    return createSuccessResponse({
      request: {
        id: guildRequest.id,
        guildName: guild.name,
        guildTag: guild.tag,
        message: guildRequest.message,
        status: guildRequest.status,
        expiresAt: guildRequest.expiresAt
      }
    }, 'Guild join request sent successfully');

  } catch (error) {
    console.error('Error sending guild request:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to send guild request');
  }
}

// GET - Get user's sent requests
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }
    const { user } = authResult;

    // Get all requests sent by the user
    const requests = await prisma.guildRequest.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() }
      },
      include: {
        guild: {
          select: {
            id: true,
            name: true,
            tag: true,
            level: true,
            memberCount: true,
            maxMembers: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedRequests = requests.map(req => ({
      id: req.id,
      guild: req.guild,
      message: req.message,
      status: req.status,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
      expiresAt: req.expiresAt
    }));

    return createSuccessResponse({
      requests: formattedRequests
    });

  } catch (error) {
    console.error('Error fetching guild requests:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch guild requests');
  }
}