import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Accept or decline guild invitation
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

    const { invitationId, action } = await request.json();

    if (!invitationId || !action) {
      return NextResponse.json({ error: 'Invitation ID and action are required' }, { status: 400 });
    }

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Action must be accept or decline' }, { status: 400 });
    }

    // Find the invitation
    const invitation = await prisma.guildInvite.findFirst({
      where: {
        id: invitationId,
        userId: user.id,
        expiresAt: { gt: new Date() }
      },
      include: { guild: true }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found or expired' }, { status: 404 });
    }

    // Check if user is already in a guild
    const existingMembership = await prisma.guildMember.findUnique({
      where: { userId: user.id }
    });

    if (existingMembership) {
      return NextResponse.json({ error: 'You are already in a guild' }, { status: 400 });
    }

    if (action === 'accept') {
      // Check if guild is at capacity
      const memberCount = await prisma.guildMember.count({
        where: { guildId: invitation.guildId }
      });

      if (memberCount >= invitation.guild.maxMembers) {
        return NextResponse.json({ error: 'Guild is at maximum capacity' }, { status: 400 });
      }

      // Accept invitation - join guild and delete invitation
      await prisma.$transaction(async (tx) => {
        // Add user to guild
        await tx.guildMember.create({
          data: {
            guildId: invitation.guildId,
            userId: user.id,
            role: 'MEMBER'
          }
        });

        // Delete all invitations for this user (they can only be in one guild)
        await tx.guildInvite.deleteMany({
          where: { userId: user.id }
        });

        // Log the join
        await tx.guildLog.create({
          data: {
            guildId: invitation.guildId,
            userId: user.id,
            action: 'member_joined',
            details: { 
              invitedBy: invitation.invitedBy,
              acceptedInvitation: true
            }
          }
        });

        // Check if this unlocks any achievements
        const newMemberCount = memberCount + 1;
        const milestones = [5, 10, 20, 50];
        
        for (const milestone of milestones) {
          if (newMemberCount === milestone) {
            const achievementKey = `members_${milestone}`;
            
            // Check if achievement doesn't already exist
            const existingAchievement = await tx.guildAchievement.findUnique({
              where: {
                guildId_key: {
                  guildId: invitation.guildId,
                  key: achievementKey
                }
              }
            });

            if (!existingAchievement) {
              await tx.guildAchievement.create({
                data: {
                  guildId: invitation.guildId,
                  key: achievementKey,
                  name: `${milestone} Members`,
                  description: `Reached ${milestone} guild members`,
                  reward: { xp: milestone * 10, gold: milestone * 100 }
                }
              });

              // Add XP to guild
              await tx.guild.update({
                where: { id: invitation.guildId },
                data: {
                  xp: { increment: milestone * 10 }
                }
              });
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: `Successfully joined ${invitation.guild.name}!`,
        guild: {
          id: invitation.guild.id,
          name: invitation.guild.name,
          tag: invitation.guild.tag,
          level: invitation.guild.level
        }
      });

    } else {
      // Decline invitation - just delete it
      await prisma.$transaction(async (tx) => {
        await tx.guildInvite.delete({
          where: { id: invitation.id }
        });

        await tx.guildLog.create({
          data: {
            guildId: invitation.guildId,
            userId: null, // System action
            action: 'invitation_declined',
            details: { 
              targetUserId: user.id,
              invitedBy: invitation.invitedBy
            }
          }
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Invitation declined'
      });
    }

  } catch (error) {
    console.error('Error responding to guild invitation:', error);
    return NextResponse.json(
      { error: 'Failed to respond to guild invitation' },
      { status: 500 }
    );
  }
}