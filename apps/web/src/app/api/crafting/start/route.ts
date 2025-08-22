import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
    const { blueprintId, quantity = 1 } = await request.json();

    if (!blueprintId || quantity < 1 || quantity > 50) {
      return NextResponse.json({ 
        error: 'Invalid request. Quantity must be between 1 and 50.' 
      }, { status: 400 });
    }

    // Start transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Get blueprint with requirements
      const blueprint = await tx.blueprint.findUnique({
        where: { id: blueprintId },
        include: {
          output: { select: { name: true, key: true } }
        }
      });

      if (!blueprint) {
        throw new Error('Blueprint not found');
      }

      // Check if user has access to this blueprint
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

      // Verify user can craft this recipe
      const hasAccess = blueprint.starterRecipe || 
        (blueprint.requiredLevel <= user.craftingLevel &&
         await tx.blueprintUnlock.findFirst({
           where: { userId: userId, blueprintId: blueprintId }
         }));

      if (!hasAccess) {
        throw new Error('You do not have access to this blueprint');
      }

      // Parse inputs and validate materials
      const inputs = Array.isArray(blueprint.inputs) ? blueprint.inputs : [];
      const materialRequirements: Record<string, number> = {};
      
      for (const input of inputs) {
        if (input && typeof input === 'object' && 'qty' in input && 'itemId' in input) {
          const requiredQty = (input.qty as number) * quantity;
          materialRequirements[input.itemId as string] = requiredQty;
        }
      }

      // Check warehouse inventory
      const inventoryItems = await tx.inventory.findMany({
        where: {
          userId: userId,
          location: 'warehouse',
          itemId: { in: Object.keys(materialRequirements) }
        }
      });

      // Validate sufficient materials
      for (const [itemId, required] of Object.entries(materialRequirements)) {
        const available = inventoryItems.find(inv => inv.itemId === itemId)?.qty || 0;
        if (available < required) {
          const item = await tx.itemDef.findUnique({
            where: { id: itemId },
            select: { name: true }
          });
          throw new Error(`Insufficient ${item?.name || 'materials'}. Need ${required}, have ${available}`);
        }
      }

      // Consume materials
      for (const [itemId, required] of Object.entries(materialRequirements)) {
        await tx.inventory.update({
          where: {
            userId_itemId_location: {
              userId: userId,
              itemId: itemId,
              location: 'warehouse'
            }
          },
          data: {
            qty: {
              decrement: required
            }
          }
        });
      }

      // Calculate quality based on skill level (5% base chance + 1% per level above requirement)
      const skillBonus = Math.max(0, user.craftingLevel - blueprint.requiredLevel);
      const qualityRoll = Math.random() * 100;
      let quality = 'common';
      
      if (qualityRoll < 5 + skillBonus) {
        if (qualityRoll < 1) quality = 'legendary';
        else if (qualityRoll < 3) quality = 'epic';
        else if (qualityRoll < 8) quality = 'rare';
        else quality = 'uncommon';
      }

      // Calculate ETA (with 10% batch efficiency bonus for quantities > 1)
      const baseTimeMinutes = blueprint.timeMin * quantity;
      const batchBonus = quantity > 1 ? 0.9 : 1.0;
      const totalTimeMinutes = Math.ceil(baseTimeMinutes * batchBonus);
      const eta = new Date(Date.now() + totalTimeMinutes * 60 * 1000);

      // Create craft job
      const craftJob = await tx.craftJob.create({
        data: {
          userId: userId,
          blueprintId: blueprintId,
          qty: quantity,
          quality: quality,
          startedAt: new Date(),
          eta: eta,
          status: 'running'
        },
        include: {
          blueprint: {
            include: {
              output: { select: { name: true, key: true } }
            }
          }
        }
      });

      return {
        craftJob,
        materialsConsumed: materialRequirements,
        estimatedCompletionTime: totalTimeMinutes
      };
    });

    return NextResponse.json({
      success: true,
      message: `Started crafting ${quantity}x ${result.craftJob.blueprint.output.name}`,
      craftJob: result.craftJob,
      materialsConsumed: result.materialsConsumed,
      eta: result.craftJob.eta,
      estimatedMinutes: result.estimatedCompletionTime
    });

  } catch (error) {
    console.error('Start crafting error:', error);
    return NextResponse.json({
      error: 'Failed to start crafting',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}