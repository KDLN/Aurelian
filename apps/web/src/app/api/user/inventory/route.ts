import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify the JWT token with Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get query parameters for filtering
    const url = new URL(request.url);
    const location = url.searchParams.get('location') || 'warehouse';

    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not configured, returning default inventory data');
      // Return mock inventory data
      const mockInventory = [
        { id: '1', itemId: '1', itemKey: 'iron_ore', itemName: 'Iron Ore', rarity: 'COMMON', quantity: 100, location },
        { id: '2', itemId: '2', itemKey: 'herb', itemName: 'Herb', rarity: 'COMMON', quantity: 100, location },
        { id: '3', itemId: '3', itemKey: 'hide', itemName: 'Hide', rarity: 'COMMON', quantity: 100, location },
        { id: '4', itemId: '4', itemKey: 'pearl', itemName: 'Pearl', rarity: 'UNCOMMON', quantity: 100, location },
        { id: '5', itemId: '5', itemKey: 'relic_fragment', itemName: 'Relic Fragment', rarity: 'RARE', quantity: 100, location },
        { id: '6', itemId: '6', itemKey: 'iron_ingot', itemName: 'Iron Ingot', rarity: 'UNCOMMON', quantity: 100, location },
        { id: '7', itemId: '7', itemKey: 'leather_roll', itemName: 'Leather Roll', rarity: 'UNCOMMON', quantity: 100, location },
        { id: '8', itemId: '8', itemKey: 'healing_tonic', itemName: 'Healing Tonic', rarity: 'UNCOMMON', quantity: 100, location },
      ];
      
      return NextResponse.json({
        inventory: mockInventory,
        location: location,
        totalItems: mockInventory.reduce((sum, item) => sum + item.quantity, 0)
      });
    }

    // Get user's inventory from database
    const inventory = await prisma.inventory.findMany({
      where: { 
        userId: user.id,
        location: location
      },
      include: {
        item: true
      },
      orderBy: {
        item: {
          name: 'asc'
        }
      }
    });

    // Transform the data for frontend consumption
    const inventoryData = inventory.map(inv => ({
      id: inv.id,
      itemId: inv.itemId,
      itemKey: inv.item.key,
      itemName: inv.item.name,
      rarity: inv.item.rarity,
      quantity: inv.qty,
      location: inv.location
    }));

    return NextResponse.json({
      inventory: inventoryData,
      location: location,
      totalItems: inventoryData.reduce((sum, item) => sum + item.quantity, 0)
    });

  } catch (error) {
    console.error('Inventory API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch inventory data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}