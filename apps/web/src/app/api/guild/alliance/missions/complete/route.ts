import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Complete/contribute to an alliance mission
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

    const { missionId, contribution, completeMission } = await request.json();

    if (!missionId) {
      return NextResponse.json({ error: 'Mission ID is required' }, { status: 400 });
    }

    // Get user's guild membership
    const membership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      include: {
        guild: { select: { id: true, name: true, tag: true } }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not in a guild' }, { status: 403 });
    }

    // Get mission and participation details
    const mission = await prisma.allianceMission.findUnique({
      where: { id: missionId },
      include: {
        alliance: {
          select: {
            id: true,
            fromGuildId: true,
            toGuildId: true,
            status: true,
            type: true
          }
        },
        participants: {
          include: {
            user: {
              include: {
                profile: { select: { display: true } },
                guildMembership: {
                  include: {
                    guild: { select: { name: true, tag: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Check if user is participating
    const participation = mission.participants.find(p => p.userId === user.id);
    if (!participation) {
      return NextResponse.json({ 
        error: 'You are not participating in this mission' 
      }, { status: 403 });
    }

    // Check if mission is still active
    if (mission.status !== 'active') {
      return NextResponse.json({ 
        error: 'Mission is no longer active' 
      }, { status: 400 });
    }

    // Update contribution
    if (contribution) {
      await prisma.allianceMissionParticipant.update({
        where: { id: participation.id },
        data: {
          contribution: {
            ...((participation.contribution as any) || {}),
            ...contribution,
            lastUpdated: new Date().toISOString()
          }
        }
      });
    }

    // Complete mission if requested and user has permission
    let missionCompleted = false;
    let rewards = null;

    if (completeMission) {
      // Only alliance leaders/officers can complete missions
      if (!['LEADER', 'OFFICER'].includes(membership.role)) {
        return NextResponse.json({ 
          error: 'Only leaders and officers can complete missions' 
        }, { status: 403 });
      }

      // Complete the mission and distribute rewards
      const result = await prisma.$transaction(async (tx) => {
        // Mark mission as completed
        const completedMission = await tx.allianceMission.update({
          where: { id: missionId },
          data: { 
            status: 'completed',
            completedAt: new Date()
          }
        });

        // Distribute rewards to participants
        const participants = await tx.allianceMissionParticipant.findMany({
          where: { missionId },
          include: {
            user: { include: { wallets: true } }
          }
        });

        const rewardResults = [];
        
        for (const participant of participants) {
          if (participant.user.wallets) {
            // Calculate individual rewards based on mission rewards and contribution
            const baseGoldReward = (mission.rewards as any).gold || 0;
            const participantReward = Math.floor(baseGoldReward / participants.length);

            if (participantReward > 0) {
              await tx.wallet.update({
                where: { userId: participant.userId },
                data: { gold: { increment: participantReward } }
              });

              rewardResults.push({
                userId: participant.userId,
                goldReward: participantReward
              });
            }

            // Handle item rewards if any
            if ((mission.rewards as any).items) {
              const itemRewards = (mission.rewards as any).items;
              for (const itemReward of itemRewards) {
                const itemQuantity = Math.floor(itemReward.quantity / participants.length);
                if (itemQuantity > 0) {
                  // Add items to participant's inventory
                  await tx.inventory.upsert({
                    where: {
                      userId_itemId_location: {
                        userId: participant.userId,
                        itemId: itemReward.itemId,
                        location: 'warehouse'
                      }
                    },
                    create: {
                      userId: participant.userId,
                      itemId: itemReward.itemId,
                      qty: itemQuantity,
                      location: 'warehouse'
                    },
                    update: {
                      qty: { increment: itemQuantity }
                    }
                  });
                }
              }
            }
          }
        }

        // Log mission completion in both alliance guilds
        const guildsToLog = [mission.alliance.fromGuildId, mission.alliance.toGuildId];
        await Promise.all(guildsToLog.map(guildId =>
          tx.guildLog.create({
            data: {
              guildId,
              userId: user.id,
              action: 'alliance_mission_completed',
              details: {
                missionId,
                missionName: mission.name,
                allianceId: mission.allianceId,
                participantCount: participants.length,
                rewardsDistributed: rewardResults.length,
                completedBy: membership.guildId
              }
            }
          })
        ));

        return { completedMission, rewardResults };
      });

      missionCompleted = true;
      rewards = result.rewardResults;
    }

    return NextResponse.json({
      success: true,
      message: missionCompleted ? 'Mission completed successfully' : 'Contribution updated',
      mission: {
        id: mission.id,
        name: mission.name,
        status: missionCompleted ? 'completed' : mission.status,
        completedAt: missionCompleted ? new Date() : mission.completedAt
      },
      contribution: contribution || null,
      rewards: rewards || null,
      missionCompleted
    });

  } catch (error) {
    console.error('Error completing alliance mission:', error);
    return NextResponse.json(
      { error: 'Failed to complete alliance mission' },
      { status: 500 }
    );
  }
}