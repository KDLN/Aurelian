import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUser,
  createErrorResponse,
  createSuccessResponse,
  validateRequiredFields,
  InputValidation,
  checkRateLimit
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }
    const { user } = authResult;

    if (!user.id) {
      return createErrorResponse('INVALID_TOKEN', 'User ID missing');
    }

    // Temporarily disable rate limiting for testing
    // const rateLimitCheck = checkRateLimit(`guild_create:${user.id}`, 3600000, 1);
    // if (!rateLimitCheck.allowed) {
    //   const resetIn = Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 60000);
    //   return createErrorResponse('RATE_LIMITED', `You can only create one guild per hour. Try again in ${resetIn} minutes.`);
    // }

    // Parse and validate request body
    const body = await request.json();
    const validationError = validateRequiredFields(body, ['name', 'tag']);
    if (validationError) {
      return createErrorResponse('MISSING_FIELDS', validationError);
    }

    const { name, tag, emblem, description } = body;

    // Enhanced validation
    const nameError = InputValidation.guildName(name);
    if (nameError) {
      return createErrorResponse('MISSING_FIELDS', nameError);
    }

    const tagError = InputValidation.guildTag(tag);
    if (tagError) {
      return createErrorResponse('MISSING_FIELDS', tagError);
    }

    // Validate optional fields
    if (description && (typeof description !== 'string' || description.length > 500)) {
      return createErrorResponse('VALIDATION_ERROR', 'Description must be less than 500 characters');
    }

    // Validate emblem object structure
    if (emblem) {
      if (typeof emblem !== 'object' || !emblem.symbol || !emblem.color) {
        return createErrorResponse('VALIDATION_ERROR', 'Emblem must include both symbol and color');
      }
      if (typeof emblem.symbol !== 'string' || emblem.symbol.length > 10) {
        return createErrorResponse('VALIDATION_ERROR', 'Emblem symbol must be less than 10 characters');
      }
      if (typeof emblem.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(emblem.color)) {
        return createErrorResponse('VALIDATION_ERROR', 'Emblem color must be a valid hex color code');
      }
    }

    // Check if user is already in a guild
    const existingMember = await prisma.guildMember.findUnique({
      where: { userId: user.id }
    });

    if (existingMember) {
      return createErrorResponse('CONFLICT', 'You are already in a guild');
    }

    // Check if guild name or tag already exists
    const existingGuild = await prisma.guild.findFirst({
      where: {
        OR: [
          { name: name },
          { tag: tag.toUpperCase() }
        ]
      }
    });

    if (existingGuild) {
      return createErrorResponse(
        'CONFLICT', 
        existingGuild.name === name ? 'Guild name already taken' : 'Guild tag already taken'
      );
    }

    console.log('Creating guild with data:', { name, tag: tag.toUpperCase(), emblem, description });

    // Create guild and add creator as leader
    const guild = await prisma.$transaction(async (tx) => {
      // Create the guild
      const newGuild = await tx.guild.create({
        data: {
          name,
          tag: tag.toUpperCase(),
          emblem: emblem ? JSON.stringify(emblem) : undefined,
          description
        }
      });
      
      console.log('Guild created:', newGuild.id);

      // Add creator as guild leader
      await tx.guildMember.create({
        data: {
          guildId: newGuild.id,
          userId: user.id,
          role: 'LEADER'
        }
      });

      // Create default channels
      await tx.guildChannel.create({
        data: {
          guildId: newGuild.id,
          name: 'general',
          description: 'General guild discussion'
        }
      });

      await tx.guildChannel.create({
        data: {
          guildId: newGuild.id,
          name: 'officers',
          description: 'Officer-only discussions',
          roleRequired: 'OFFICER'
        }
      });

      // Log guild creation
      await tx.guildLog.create({
        data: {
          guildId: newGuild.id,
          userId: user.id,
          action: 'guild_created',
          details: { guildName: name, guildTag: tag }
        }
      });

      // Grant founder achievement
      await tx.guildAchievement.create({
        data: {
          guildId: newGuild.id,
          key: 'founder',
          name: 'Guild Founder',
          description: 'Founded this guild',
          reward: { xp: 100, gold: 0 }
        }
      });

      return newGuild;
    });

    return createSuccessResponse({
      guild: {
        id: guild.id,
        name: guild.name,
        tag: guild.tag,
        emblem: guild.emblem ? JSON.parse(guild.emblem as string) : null,
        description: guild.description,
        level: guild.level,
        treasury: guild.treasury,
        memberCount: 1
      }
    });

  } catch (error: any) {
    console.error('Detailed error creating guild:', error);
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    return createErrorResponse('INTERNAL_ERROR', `Failed to create guild: ${error?.message}`);
  }
}