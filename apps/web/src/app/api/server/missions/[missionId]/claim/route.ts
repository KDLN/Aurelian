import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RouteParams {
  params: Promise<{ missionId: string }>;
}

// POST /api/server/missions/[missionId]/claim - Claim rewards
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    const { missionId } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Get mission and user participation
    const mission = await prisma.serverMission.findUnique({
      where: { id: missionId },
      include: {
        participants: {
          where: { userId: user.id }
        }
      }
    });

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    const participation = mission.participants[0];
    if (!participation) {
      return NextResponse.json({ error: 'Not participating in this mission' }, { status: 400 });
    }

    if (participation.rewardClaimed) {
      return NextResponse.json({ error: 'Rewards already claimed' }, { status: 400 });
    }

    if (mission.status !== 'completed') {
      return NextResponse.json({ error: 'Mission not yet completed' }, { status: 400 });
    }

    if (!participation.tier) {
      return NextResponse.json({ error: 'No tier achieved for rewards' }, { status: 400 });
    }

    // Calculate rewards based on tier
    const rewards = mission.rewards as any;
    const tierRewards = rewards.tiers?.[participation.tier];
    
    if (!tierRewards) {
      return NextResponse.json({ error: 'Invalid tier for rewards' }, { status: 400 });
    }

    // Begin transaction to award rewards
    const result = await prisma.$transaction(async (tx) => {
      // Mark rewards as claimed
      const updatedParticipation = await tx.serverMissionParticipant.update({
        where: { id: participation.id },
        data: { rewardClaimed: true }
      });

      // Award gold if specified
      if (tierRewards.gold) {
        // Get or create wallet
        let wallet = await tx.wallet.findUnique({
          where: { userId: user.id }
        });

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: {
              userId: user.id,
              gold: 0
            }
          });
        }

        // Add gold
        await tx.wallet.update({
          where: { userId: user.id },
          data: { gold: { increment: tierRewards.gold } }
        });

        // Log transaction
        await tx.ledgerTx.create({
          data: {
            userId: user.id,
            amount: tierRewards.gold,
            reason: `Server Mission Reward: ${mission.name}`,
            meta: {
              missionId: mission.id,
              tier: participation.tier,
              type: 'server_mission_reward'
            }
          }
        });
      }

      // Award items if specified
      if (tierRewards.items && Array.isArray(tierRewards.items)) {
        for (const itemReward of tierRewards.items) {
          const itemDef = await tx.itemDef.findUnique({
            where: { key: itemReward.itemKey || itemReward.key }
          });

          if (itemDef) {
            await tx.inventory.upsert({
              where: {
                userId_itemId_location: {
                  userId: user.id,
                  itemId: itemDef.id,
                  location: 'warehouse'
                }
              },
              update: {
                qty: { increment: itemReward.quantity || 1 }
              },
              create: {
                userId: user.id,
                itemId: itemDef.id,
                qty: itemReward.quantity || 1,
                location: 'warehouse'
              }
            });
          }
        }
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: user.id,
          type: 'server_mission_reward_claimed',
          message: `Claimed ${participation.tier} tier rewards for "${mission.name}"`,
          metadata: {
            missionId: mission.id,
            tier: participation.tier,
            rewards: tierRewards
          }
        }
      });

      return { updatedParticipation, rewards: tierRewards };
    });

    return NextResponse.json({
      success: true,
      rewards: result.rewards,
      message: `Successfully claimed ${participation.tier} tier rewards!`
    });

  } catch (error) {
    console.error('Error claiming rewards:', error);
    return NextResponse.json(
      { error: 'Failed to claim rewards' },
      { status: 500 }
    );
  }
}