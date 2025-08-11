import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

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