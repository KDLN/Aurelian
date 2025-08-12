import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - List guild members
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

    // Check if user is in a guild
    const userMembership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      include: { guild: true }
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'You are not in a guild' }, { status: 400 });
    }

    // Get all guild members
    const members = await prisma.guildMember.findMany({
      where: { guildId: userMembership.guildId },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // LEADER first
        { joinedAt: 'asc' }
      ]
    });

    const formattedMembers = members.map(member => ({
      id: member.id,
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      contributionPoints: member.contributionPoints,
      lastActive: member.lastActive,
      displayName: member.user.profile?.display || member.user.email || 'Unknown'
    }));

    return NextResponse.json({
      success: true,
      guild: {
        id: userMembership.guild.id,
        name: userMembership.guild.name,
        tag: userMembership.guild.tag
      },
      members: formattedMembers
    });

  } catch (error) {
    console.error('Error fetching guild members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guild members' },
      { status: 500 }
    );
  }
}

// POST - Manage member (promote, demote, kick)
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

    const { action, targetUserId, newRole } = await request.json();

    if (!action || !targetUserId) {
      return NextResponse.json({ error: 'Action and target user ID are required' }, { status: 400 });
    }

    // Check if user is in a guild and has permission
    const userMembership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      include: { guild: true }
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'You are not in a guild' }, { status: 400 });
    }

    // Check if target is in the same guild
    const targetMembership = await prisma.guildMember.findFirst({
      where: { 
        userId: targetUserId,
        guildId: userMembership.guildId
      }
    });

    if (!targetMembership) {
      return NextResponse.json({ error: 'Target user is not in your guild' }, { status: 400 });
    }

    // Permission checks
    const roleHierarchy = { LEADER: 4, OFFICER: 3, TRADER: 2, MEMBER: 1 };
    const userRoleLevel = roleHierarchy[userMembership.role];
    const targetRoleLevel = roleHierarchy[targetMembership.role];

    switch (action) {
      case 'promote':
      case 'demote':
        // Only leaders and officers can promote/demote
        if (userRoleLevel < 3) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
        
        // Can't promote/demote someone of equal or higher rank
        if (targetRoleLevel >= userRoleLevel) {
          return NextResponse.json({ error: 'Cannot manage member of equal or higher rank' }, { status: 403 });
        }

        if (!newRole || !roleHierarchy[newRole as keyof typeof roleHierarchy]) {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        // Only leader can promote to officer or leader
        if (newRole === 'OFFICER' || newRole === 'LEADER') {
          if (userMembership.role !== 'LEADER') {
            return NextResponse.json({ error: 'Only guild leader can promote to officer or leader' }, { status: 403 });
          }
        }

        await prisma.$transaction(async (tx) => {
          await tx.guildMember.update({
            where: { id: targetMembership.id },
            data: { role: newRole as any }
          });

          await tx.guildLog.create({
            data: {
              guildId: userMembership.guildId,
              userId: user.id,
              action: action === 'promote' ? 'member_promoted' : 'member_demoted',
              details: { 
                targetUserId,
                oldRole: targetMembership.role,
                newRole
              }
            }
          });
        });

        break;

      case 'kick':
        // Only leaders and officers can kick
        if (userRoleLevel < 3) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
        
        // Can't kick someone of equal or higher rank
        if (targetRoleLevel >= userRoleLevel) {
          return NextResponse.json({ error: 'Cannot kick member of equal or higher rank' }, { status: 403 });
        }

        // Can't kick yourself
        if (targetUserId === user.id) {
          return NextResponse.json({ error: 'Cannot kick yourself' }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
          await tx.guildMember.delete({
            where: { id: targetMembership.id }
          });

          await tx.guildLog.create({
            data: {
              guildId: userMembership.guildId,
              userId: user.id,
              action: 'member_kicked',
              details: { 
                targetUserId,
                targetRole: targetMembership.role
              }
            }
          });
        });

        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error managing guild member:', error);
    return NextResponse.json(
      { error: 'Failed to manage guild member' },
      { status: 500 }
    );
  }
}