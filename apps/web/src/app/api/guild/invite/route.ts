import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Send guild invitation
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

    const { targetUserId, message } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    // Check if inviter is in a guild and has permission
    const inviterMembership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      include: { guild: true }
    });

    if (!inviterMembership) {
      return NextResponse.json({ error: 'You are not in a guild' }, { status: 400 });
    }

    // Only officers and leaders can invite
    if (!['LEADER', 'OFFICER'].includes(inviterMembership.role)) {
      return NextResponse.json({ error: 'Only officers and leaders can invite members' }, { status: 403 });
    }

    // Check if target user exists and isn't already in a guild
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { guildMembership: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    if (targetUser.guildMembership) {
      return NextResponse.json({ error: 'User is already in a guild' }, { status: 400 });
    }

    // Check if guild is at capacity
    const memberCount = await prisma.guildMember.count({
      where: { guildId: inviterMembership.guildId }
    });

    if (memberCount >= inviterMembership.guild.maxMembers) {
      return NextResponse.json({ error: 'Guild is at maximum capacity' }, { status: 400 });
    }

    // Check if invitation already exists
    const existingInvite = await prisma.guildInvite.findUnique({
      where: {
        guildId_userId: {
          guildId: inviterMembership.guildId,
          userId: targetUserId
        }
      }
    });

    if (existingInvite) {
      return NextResponse.json({ error: 'Invitation already sent to this user' }, { status: 400 });
    }

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.$transaction(async (tx) => {
      const invite = await tx.guildInvite.create({
        data: {
          guildId: inviterMembership.guildId,
          userId: targetUserId,
          invitedBy: user.id,
          message,
          expiresAt
        }
      });

      await tx.guildLog.create({
        data: {
          guildId: inviterMembership.guildId,
          userId: user.id,
          action: 'invitation_sent',
          details: { targetUserId, message }
        }
      });

      return invite;
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        guildName: inviterMembership.guild.name,
        guildTag: inviterMembership.guild.tag,
        message: invitation.message,
        expiresAt: invitation.expiresAt
      }
    });

  } catch (error) {
    console.error('Error sending guild invitation:', error);
    return NextResponse.json(
      { error: 'Failed to send guild invitation' },
      { status: 500 }
    );
  }
}

// GET - Get received invitations
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

    // Get all active invitations for the user
    const invitations = await prisma.guildInvite.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() }
      },
      include: {
        guild: true,
        inviter: {
          include: { profile: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedInvitations = invitations.map(invite => ({
      id: invite.id,
      guild: {
        id: invite.guild.id,
        name: invite.guild.name,
        tag: invite.guild.tag,
        level: invite.guild.level,
        memberCount: invite.guild.maxMembers // This would need a count query in real implementation
      },
      inviter: {
        displayName: invite.inviter.profile?.display || invite.inviter.email || 'Unknown'
      },
      message: invite.message,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt
    }));

    return NextResponse.json({
      success: true,
      invitations: formattedInvitations
    });

  } catch (error) {
    console.error('Error fetching guild invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guild invitations' },
      { status: 500 }
    );
  }
}