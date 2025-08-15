import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Populate database with starter crafting blueprints
export async function POST(request: NextRequest) {
  try {
    // Get JWT token from headers
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if blueprints already exist
    const existingBlueprints = await prisma.blueprint.findMany();

    if (existingBlueprints.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Blueprints already exist',
        existingCount: existingBlueprints.length
      });
    }

    // First, ensure all item definitions exist
    const itemDefs = [
      { key: 'iron_ore', name: 'Iron Ore', rarity: 'COMMON' },
      { key: 'herb', name: 'Herb', rarity: 'COMMON' },
      { key: 'hide', name: 'Hide', rarity: 'COMMON' },
      { key: 'iron_ingot', name: 'Iron Ingot', rarity: 'UNCOMMON' },
      { key: 'leather_roll', name: 'Leather Roll', rarity: 'UNCOMMON' },
      { key: 'healing_tonic', name: 'Healing Tonic', rarity: 'UNCOMMON' },
      { key: 'iron_sword', name: 'Iron Sword', rarity: 'RARE' },
      { key: 'leather_armor', name: 'Leather Armor', rarity: 'RARE' }
    ];

    // Upsert item definitions
    for (const itemDef of itemDefs) {
      await prisma.itemDef.upsert({
        where: { key: itemDef.key },
        update: {
          name: itemDef.name,
          rarity: itemDef.rarity as any
        },
        create: {
          key: itemDef.key,
          name: itemDef.name,
          rarity: itemDef.rarity as any
        }
      });
    }

    // Get the created/updated item definitions
    const items = await prisma.itemDef.findMany({
      where: {
        key: {
          in: itemDefs.map(def => def.key)
        }
      }
    });

    const itemMap = new Map(items.map(item => [item.key, item.id]));

    // Define starter blueprints
    const starterBlueprints = [
      {
        key: 'smelt_iron_ingot',
        outputId: itemMap.get('iron_ingot')!,
        outputQty: 2,
        timeMin: 5,
        category: 'smelting',
        requiredLevel: 1,
        xpReward: 25,
        starterRecipe: true,
        inputs: [
          { itemId: itemMap.get('iron_ore')!, qty: 3 }
        ]
      },
      {
        key: 'craft_leather_roll',
        outputId: itemMap.get('leather_roll')!,
        outputQty: 1,
        timeMin: 3,
        category: 'crafting',
        requiredLevel: 1,
        xpReward: 20,
        starterRecipe: true,
        inputs: [
          { itemId: itemMap.get('hide')!, qty: 2 }
        ]
      },
      {
        key: 'brew_healing_tonic',
        outputId: itemMap.get('healing_tonic')!,
        outputQty: 1,
        timeMin: 4,
        category: 'alchemy',
        requiredLevel: 2,
        xpReward: 30,
        starterRecipe: true,
        inputs: [
          { itemId: itemMap.get('herb')!, qty: 3 }
        ]
      },
      {
        key: 'forge_iron_sword',
        outputId: itemMap.get('iron_sword')!,
        outputQty: 1,
        timeMin: 8,
        category: 'smithing',
        requiredLevel: 3,
        xpReward: 50,
        starterRecipe: false,
        inputs: [
          { itemId: itemMap.get('iron_ingot')!, qty: 2 },
          { itemId: itemMap.get('hide')!, qty: 1 }
        ]
      },
      {
        key: 'craft_leather_armor',
        outputId: itemMap.get('leather_armor')!,
        outputQty: 1,
        timeMin: 10,
        category: 'crafting',
        requiredLevel: 4,
        xpReward: 60,
        starterRecipe: false,
        inputs: [
          { itemId: itemMap.get('leather_roll')!, qty: 3 },
          { itemId: itemMap.get('iron_ingot')!, qty: 1 }
        ]
      }
    ];

    // Create blueprints
    const createdBlueprints = await prisma.blueprint.createMany({
      data: starterBlueprints
    });

    console.log(`✅ Created ${createdBlueprints.count} starter blueprints`);

    return NextResponse.json({
      success: true,
      message: `Created ${createdBlueprints.count} starter crafting recipes`,
      recipes: starterBlueprints.map(bp => ({ 
        key: bp.key, 
        category: bp.category, 
        requiredLevel: bp.requiredLevel,
        starter: bp.starterRecipe 
      }))
    });

  } catch (error) {
    console.error('Error populating starter blueprints:', error);
    return NextResponse.json(
      { 
        error: 'Failed to populate starter blueprints',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}