import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { ensureUserExistsOptimized } from '@/lib/auth/auto-sync';

export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Populate user's inventory with starter items
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

    // Ensure user exists in database
    await ensureUserExistsOptimized(user);

    // Check if user already has items in their inventory
    const existingInventory = await prisma.inventory.findMany({
      where: { 
        userId: user.id,
        location: 'warehouse'
      }
    });

    if (existingInventory.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'User already has items in warehouse',
        existingItems: existingInventory.length
      });
    }

    // First, ensure all necessary item definitions exist
    const itemDefs = [
      { key: 'iron_ore', name: 'Iron Ore', rarity: 'COMMON' },
      { key: 'herb', name: 'Herb', rarity: 'COMMON' },
      { key: 'hide', name: 'Hide', rarity: 'COMMON' },
      { key: 'pearl', name: 'Pearl', rarity: 'UNCOMMON' },
      { key: 'relic_fragment', name: 'Relic Fragment', rarity: 'RARE' }
    ];

    // Upsert item definitions (create if not exists, update if exists)
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

    // Create starter inventory entries
    const starterInventory = [
      { itemKey: 'iron_ore', qty: 25 },
      { itemKey: 'herb', qty: 15 },
      { itemKey: 'hide', qty: 20 },
      { itemKey: 'pearl', qty: 8 },
      { itemKey: 'relic_fragment', qty: 3 }
    ];

    const inventoryEntries = [];
    for (const starter of starterInventory) {
      const item = items.find(i => i.key === starter.itemKey);
      if (item) {
        inventoryEntries.push({
          userId: user.id,
          itemId: item.id,
          qty: starter.qty,
          location: 'warehouse'
        });
      }
    }

    // Create inventory entries in bulk
    const createdInventory = await prisma.inventory.createMany({
      data: inventoryEntries
    });

    console.log(`✅ Created ${createdInventory.count} starter inventory items for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: `Created ${createdInventory.count} starter items in warehouse`,
      items: starterInventory
    });

  } catch (error) {
    console.error('Error populating starter inventory:', error);
    return NextResponse.json(
      { 
        error: 'Failed to populate starter inventory',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}