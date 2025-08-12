import { NextRequest } from 'next/server';
import { 
  authenticateUser, 
  createErrorResponse, 
  createSuccessResponse,
  getUserGuildMembership,
  checkRolePermissions,
  logGuildActivity
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Get guild channels
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }
    const { user } = authResult;

    // Get user's guild membership
    const membershipResult = await getUserGuildMembership(user.id);
    if ('error' in membershipResult) {
      return createErrorResponse(membershipResult.error);
    }
    const { membership } = membershipResult;

    // Get all guild channels
    const channels = await prisma.guildChannel.findMany({
      where: { 
        guildId: membership.guildId,
        isActive: true 
      },
      orderBy: [
        { name: 'asc' }
      ]
    });

    // Filter channels based on user's role
    const roleHierarchy = { LEADER: 4, OFFICER: 3, TRADER: 2, MEMBER: 1 };
    const userLevel = roleHierarchy[membership.role];

    const accessibleChannels = channels.filter(channel => {
      if (!channel.roleRequired) return true;
      const requiredLevel = roleHierarchy[channel.roleRequired];
      return userLevel >= requiredLevel;
    });

    const formattedChannels = accessibleChannels.map(channel => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      roleRequired: channel.roleRequired,
      isActive: channel.isActive,
      createdAt: channel.createdAt
    }));

    return createSuccessResponse({
      channels: formattedChannels,
      guild: {
        id: membership.guild.id,
        name: membership.guild.name,
        tag: membership.guild.tag
      },
      userRole: membership.role
    });

  } catch (error) {
    console.error('Error fetching guild channels:', error);
    return createErrorResponse('INTERNAL_ERROR');
  }
}

// POST - Create new guild channel (Leaders/Officers only)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }
    const { user } = authResult;

    // Get user's guild membership
    const membershipResult = await getUserGuildMembership(user.id);
    if ('error' in membershipResult) {
      return createErrorResponse(membershipResult.error);
    }
    const { membership } = membershipResult;

    // Check permissions
    if (!checkRolePermissions(membership.role, ['LEADER', 'OFFICER'])) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS');
    }

    const { name, description, roleRequired } = await request.json();

    if (!name || !name.trim()) {
      return createErrorResponse('MISSING_FIELDS', 'Channel name is required');
    }

    // Validate channel name (alphanumeric and hyphens only)
    if (!/^[a-z0-9-]+$/.test(name.toLowerCase())) {
      return createErrorResponse('MISSING_FIELDS', 'Channel name must contain only lowercase letters, numbers, and hyphens');
    }

    // Check if channel name already exists
    const existingChannel = await prisma.guildChannel.findUnique({
      where: {
        guildId_name: {
          guildId: membership.guildId,
          name: name.toLowerCase()
        }
      }
    });

    if (existingChannel) {
      return createErrorResponse('CONFLICT', 'Channel name already exists');
    }

    // Create the channel
    const channel = await prisma.guildChannel.create({
      data: {
        guildId: membership.guildId,
        name: name.toLowerCase(),
        description: description?.trim() || null,
        roleRequired: roleRequired || null
      }
    });

    // Log the channel creation
    await logGuildActivity(
      membership.guildId,
      user.id,
      'channel_created',
      {
        channelId: channel.id,
        channelName: channel.name,
        roleRequired: channel.roleRequired
      }
    );

    return createSuccessResponse({
      channel: {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        roleRequired: channel.roleRequired,
        isActive: channel.isActive,
        createdAt: channel.createdAt
      }
    }, 'Channel created successfully');

  } catch (error) {
    console.error('Error creating guild channel:', error);
    return createErrorResponse('INTERNAL_ERROR');
  }
}