import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { name, tag, emblem, description } = await request.json();

    if (!name || !tag) {
      return NextResponse.json({ error: 'Name and tag are required' }, { status: 400 });
    }

    if (tag.length < 3 || tag.length > 5) {
      return NextResponse.json({ error: 'Tag must be 3-5 characters' }, { status: 400 });
    }

    // Check if user is already in a guild
    const existingMember = await prisma.guildMember.findUnique({
      where: { userId: user.id }
    });

    if (existingMember) {
      return NextResponse.json({ error: 'You are already in a guild' }, { status: 400 });
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
      return NextResponse.json({ 
        error: existingGuild.name === name ? 'Guild name already taken' : 'Guild tag already taken' 
      }, { status: 400 });
    }

    console.log('Creating guild with data:', { name, tag: tag.toUpperCase(), emblem, description });

    // Create guild and add creator as leader
    const guild = await prisma.$transaction(async (tx) => {
      // Create the guild
      const newGuild = await tx.guild.create({
        data: {
          name,
          tag: tag.toUpperCase(),
          emblem,
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

    return NextResponse.json({
      success: true,
      guild: {
        id: guild.id,
        name: guild.name,
        tag: guild.tag,
        emblem: guild.emblem,
        description: guild.description,
        level: guild.level,
        treasury: guild.treasury,
        memberCount: 1
      }
    });

  } catch (error) {
    console.error('Detailed error creating guild:', error);
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    return NextResponse.json(
      { error: 'Failed to create guild', details: error?.message },
      { status: 500 }
    );
  }
}