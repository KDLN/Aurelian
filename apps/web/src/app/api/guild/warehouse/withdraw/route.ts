import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Withdraw items from guild warehouse
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

    const { itemId, amount } = await request.json();

    if (!itemId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid item or amount' }, { status: 400 });
    }

    // Get user's guild membership
    const membership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      select: { guildId: true, role: true }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not in a guild' }, { status: 403 });
    }

    // Check if guild has enough items in warehouse
    const guildWarehouse = await prisma.guildWarehouse.findUnique({
      where: {
        guildId_itemId: {
          guildId: membership.guildId,
          itemId: itemId
        }
      }
    });

    if (!guildWarehouse || guildWarehouse.quantity < amount) {
      return NextResponse.json({ error: 'Insufficient items in guild warehouse' }, { status: 400 });
    }

    // Perform the withdrawal transaction
    await prisma.$transaction(async (tx) => {
      // Remove items from guild warehouse
      if (guildWarehouse.quantity === amount) {
        // Remove the warehouse record entirely if withdrawing all items
        await tx.guildWarehouse.delete({
          where: {
            guildId_itemId: {
              guildId: membership.guildId,
              itemId: itemId
            }
          }
        });
      } else {
        // Reduce the quantity
        await tx.guildWarehouse.update({
          where: {
            guildId_itemId: {
              guildId: membership.guildId,
              itemId: itemId
            }
          },
          data: {
            quantity: guildWarehouse.quantity - amount
          }
        });
      }

      // Add items to user's warehouse
      await tx.inventory.upsert({
        where: {
          userId_itemId_location: {
            userId: user.id,
            itemId: itemId,
            location: 'warehouse'
          }
        },
        update: {
          qty: {
            increment: amount
          }
        },
        create: {
          userId: user.id,
          itemId: itemId,
          qty: amount,
          location: 'warehouse'
        }
      });

      // Log the withdrawal activity
      await tx.guildLog.create({
        data: {
          guildId: membership.guildId,
          userId: user.id,
          action: 'withdraw',
          details: {
            itemId: itemId,
            amount: amount,
            location: 'warehouse'
          }
        }
      });
    });

    // Get item name for response
    const item = await prisma.itemDef.findUnique({
      where: { id: itemId },
      select: { name: true }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully withdrew ${amount} ${item?.name || 'items'} from guild warehouse`
    });

  } catch (error) {
    console.error('Error withdrawing from guild warehouse:', error);
    return NextResponse.json(
      { error: 'Failed to withdraw items' },
      { status: 500 }
    );
  }
}