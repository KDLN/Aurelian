import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyJWT } from '@/lib/auth/jwt';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = await verifyJWT(token);
    if (!payload?.sub) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.sub;
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Complete the crafting job in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get the craft job
      const craftJob = await tx.craftJob.findUnique({
        where: { id: jobId },
        include: {
          blueprint: {
            include: {
              output: { select: { id: true, key: true, name: true, rarity: true } }
            }
          }
        }
      });

      if (!craftJob) {
        throw new Error('Craft job not found');
      }

      if (craftJob.userId !== userId) {
        throw new Error('Unauthorized access to craft job');
      }

      if (craftJob.status !== 'running') {
        throw new Error('Job is not running');
      }

      // Check if job is actually complete (ETA has passed)
      const now = new Date();
      if (now < craftJob.eta) {
        throw new Error('Job is not yet complete');
      }

      // Calculate items to create based on quantity and output amount
      const totalItemsToCreate = craftJob.qty * craftJob.blueprint.outputQty;

      // Add crafted items to warehouse inventory
      await tx.inventory.upsert({
        where: {
          userId_itemId_location: {
            userId: userId,
            itemId: craftJob.blueprint.outputId,
            location: 'warehouse'
          }
        },
        update: {
          qty: {
            increment: totalItemsToCreate
          }
        },
        create: {
          userId: userId,
          itemId: craftJob.blueprint.outputId,
          location: 'warehouse',
          qty: totalItemsToCreate
        }
      });

      // Award crafting XP
      const xpGained = craftJob.blueprint.xpReward * craftJob.qty;
      
      // Get current user stats
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { 
          craftingLevel: true, 
          craftingXP: true, 
          craftingXPNext: true 
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      let newXP = user.craftingXP + xpGained;
      let newLevel = user.craftingLevel;
      let newXPNext = user.craftingXPNext;
      let leveledUp = false;

      // Check for level up
      while (newXP >= newXPNext) {
        newXP -= newXPNext;
        newLevel += 1;
        leveledUp = true;
        // XP requirement increases by 50 per level
        newXPNext = 100 + (newLevel - 1) * 50;
      }

      // Update user crafting stats
      await tx.user.update({
        where: { id: userId },
        data: {
          craftingLevel: newLevel,
          craftingXP: newXP,
          craftingXPNext: newXPNext
        }
      });

      // Mark job as completed
      await tx.craftJob.update({
        where: { id: jobId },
        data: {
          status: 'complete',
          updatedAt: now
        }
      });

      // If leveled up, unlock new blueprints
      let newBlueprints: any[] = [];
      if (leveledUp) {
        const blueprintsToUnlock = await tx.blueprint.findMany({
          where: {
            requiredLevel: { lte: newLevel },
            starterRecipe: false,
            unlockedBy: {
              none: { userId: userId }
            }
          },
          include: {
            output: { select: { name: true } }
          }
        });

        if (blueprintsToUnlock.length > 0) {
          await tx.blueprintUnlock.createMany({
            data: blueprintsToUnlock.map(bp => ({
              userId: userId,
              blueprintId: bp.id,
              unlockedBy: 'level'
            }))
          });
          newBlueprints = blueprintsToUnlock;
        }
      }

      return {
        craftJob,
        itemsCreated: totalItemsToCreate,
        xpGained,
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
        newBlueprints
      };
    });

    return NextResponse.json({
      success: true,
      message: `Completed crafting ${result.itemsCreated}x ${result.craftJob.blueprint.output.name}!`,
      itemsCreated: result.itemsCreated,
      outputItem: result.craftJob.blueprint.output,
      quality: result.craftJob.quality,
      xpGained: result.xpGained,
      leveledUp: result.leveledUp,
      newLevel: result.newLevel,
      newBlueprints: result.newBlueprints
    });

  } catch (error) {
    console.error('Complete crafting error:', error);
    return NextResponse.json({
      error: 'Failed to complete crafting',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}