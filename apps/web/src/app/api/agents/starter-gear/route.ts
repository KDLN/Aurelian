import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const prisma = new PrismaClient();

// POST /api/agents/starter-gear - Give user basic equipment to test with
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Starter equipment items
    const starterGear = [
      'rusty_sword',
      'leather_vest',
      'basic_compass',
      'lucky_charm',
      'merchant_knife',
      'scout_cloak',
      'trade_ledger'
    ];

    // Add these items to user's inventory
    const result = await prisma.$transaction(async (tx) => {
      const addedItems = [];
      
      for (const itemKey of starterGear) {
        // Find the item definition
        const itemDef = await tx.itemDef.findFirst({
          where: { itemKey }
        });
        
        if (!itemDef) continue;

        // Add to inventory
        const inventoryItem = await tx.inventory.upsert({
          where: {
            userId_itemKey_location: {
              userId: user.id,
              itemKey,
              location: 'warehouse'
            }
          },
          update: {
            quantity: { increment: 1 }
          },
          create: {
            userId: user.id,
            itemId: itemDef.id,
            itemKey,
            location: 'warehouse',
            quantity: 1,
            rarity: 'COMMON'
          }
        });
        
        addedItems.push(inventoryItem);
      }
      
      return addedItems;
    });

    return NextResponse.json({ 
      success: true,
      message: `Added ${result.length} starter equipment items`,
      items: result
    });

  } catch (error) {
    console.error('Error adding starter gear:', error);
    return NextResponse.json({ error: 'Failed to add starter gear' }, { status: 500 });
  }
}