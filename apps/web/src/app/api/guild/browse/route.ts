import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Browse public guilds
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'level'; // level, members, name
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // asc, desc
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Max 50 per page
    const offset = (page - 1) * limit;

    console.log('Browsing guilds with params:', { search, sortBy, sortOrder, page, limit });

    // Check if user is already in a guild
    const userMembership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      include: { guild: true }
    });

    // Build where clause for search
    const whereClause: any = {
      isActive: true,
      // Exclude user's current guild if they're in one
      ...(userMembership && { id: { not: userMembership.guildId } })
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { tag: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build orderBy clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'level':
        orderBy = { level: sortOrder };
        break;
      case 'members':
        orderBy = { members: { _count: sortOrder } };
        break;
      case 'name':
        orderBy = { name: sortOrder };
        break;
      case 'created':
        orderBy = { createdAt: sortOrder };
        break;
      default:
        orderBy = { level: 'desc' };
    }

    // Get guilds with member count and recent activity
    const [guilds, totalCount] = await Promise.all([
      prisma.guild.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              members: true,
              achievements: true
            }
          },
          members: {
            where: { role: 'LEADER' },
            include: {
              user: {
                include: {
                  profile: true
                }
              }
            },
            take: 1
          },
          achievements: {
            orderBy: { unlockedAt: 'desc' },
            take: 3
          }
        },
        orderBy,
        skip: offset,
        take: limit
      }),
      prisma.guild.count({ where: whereClause })
    ]);

    const formattedGuilds = guilds.map(guild => ({
      id: guild.id,
      name: guild.name,
      tag: guild.tag,
      emblem: guild.emblem,
      description: guild.description,
      level: guild.level,
      memberCount: guild._count.members,
      maxMembers: guild.maxMembers,
      achievementCount: guild._count.achievements,
      createdAt: guild.createdAt,
      leader: guild.members[0] ? {
        displayName: guild.members[0].user.profile?.display || guild.members[0].user.email || 'Unknown',
        joinedAt: guild.members[0].joinedAt
      } : null,
      recentAchievements: guild.achievements.map(achievement => ({
        key: achievement.key,
        name: achievement.name,
        unlockedAt: achievement.unlockedAt
      })),
      // Calculate if guild is "recruiting" based on member count
      isRecruiting: guild._count.members < guild.maxMembers,
      membershipFull: guild._count.members >= guild.maxMembers
    }));

    return NextResponse.json({
      success: true,
      guilds: formattedGuilds,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      },
      userInGuild: !!userMembership,
      currentGuild: userMembership ? {
        id: userMembership.guild.id,
        name: userMembership.guild.name,
        tag: userMembership.guild.tag
      } : null
    });

  } catch (error) {
    console.error('Error browsing guilds:', error);
    return NextResponse.json(
      { error: 'Failed to browse guilds' },
      { status: 500 }
    );
  }
}