import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyJWT } from '@/lib/auth/jwt';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
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

    // Get user's crafting level to filter available blueprints
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        craftingLevel: true,
        craftingXP: true,
        craftingXPNext: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all blueprints that user has access to
    const availableBlueprints = await prisma.blueprint.findMany({
      where: {
        OR: [
          // Starter recipes are always available
          { starterRecipe: true },
          // User meets level requirement AND has unlocked it
          {
            AND: [
              { requiredLevel: { lte: user.craftingLevel } },
              {
                unlockedBy: {
                  some: { userId: userId }
                }
              }
            ]
          }
        ]
      },
      include: {
        output: {
          select: {
            id: true,
            key: true,
            name: true,
            rarity: true
          }
        },
        unlockedBy: {
          where: { userId: userId },
          select: {
            unlockedAt: true,
            unlockedBy: true
          }
        }
      },
      orderBy: [
        { category: 'asc' },
        { requiredLevel: 'asc' },
        { output: { name: 'asc' } }
      ]
    });

    // Parse inputs JSON and add item details
    const blueprintsWithDetails = await Promise.all(
      availableBlueprints.map(async (blueprint) => {
        const inputs = Array.isArray(blueprint.inputs) ? blueprint.inputs : [];
        
        // Get item details for inputs
        const inputsWithDetails = await Promise.all(
          inputs.map(async (input: any) => {
            const item = await prisma.itemDef.findUnique({
              where: { id: input.itemId },
              select: { id: true, key: true, name: true, rarity: true }
            });
            return {
              ...input,
              item
            };
          })
        );

        return {
          ...blueprint,
          inputs: inputsWithDetails,
          isUnlocked: blueprint.starterRecipe || blueprint.unlockedBy.length > 0,
          canCraft: blueprint.requiredLevel <= user.craftingLevel
        };
      })
    );

    return NextResponse.json({
      blueprints: blueprintsWithDetails,
      userStats: {
        level: user.craftingLevel,
        xp: user.craftingXP,
        xpNext: user.craftingXPNext
      }
    });

  } catch (error) {
    console.error('Get blueprints error:', error);
    return NextResponse.json({
      error: 'Failed to fetch blueprints',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}