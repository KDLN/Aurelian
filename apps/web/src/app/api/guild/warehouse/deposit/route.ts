import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Deposit items to guild warehouse
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

    // Check if user has enough items in personal warehouse
    const userInventory = await prisma.inventory.findUnique({
      where: {
        userId_itemId_location: {
          userId: user.id,
          itemId: itemId,
          location: 'warehouse'
        }
      }
    });

    if (!userInventory || userInventory.qty < amount) {
      return NextResponse.json({ error: 'Insufficient items in your warehouse' }, { status: 400 });
    }

    // Perform the deposit transaction
    await prisma.$transaction(async (tx) => {
      // Remove items from user's warehouse
      if (userInventory.qty === amount) {
        // Remove the inventory record entirely if depositing all items
        await tx.inventory.delete({
          where: {
            userId_itemId_location: {
              userId: user.id,
              itemId: itemId,
              location: 'warehouse'
            }
          }
        });
      } else {
        // Reduce the quantity
        await tx.inventory.update({
          where: {
            userId_itemId_location: {
              userId: user.id,
              itemId: itemId,
              location: 'warehouse'
            }
          },
          data: {
            qty: userInventory.qty - amount
          }
        });
      }

      // Add items to guild warehouse
      await tx.guildWarehouse.upsert({
        where: {
          guildId_itemId: {
            guildId: membership.guildId,
            itemId: itemId
          }
        },
        update: {
          quantity: {
            increment: amount
          }
        },
        create: {
          guildId: membership.guildId,
          itemId: itemId,
          quantity: amount
        }
      });

      // Log the deposit activity
      await tx.guildLog.create({
        data: {
          guildId: membership.guildId,
          userId: user.id,
          action: 'deposit',
          details: {
            itemId: itemId,
            amount: amount,
            location: 'warehouse'
          }
        }
      });

      // Update member contribution points
      await tx.guildMember.update({
        where: { userId: user.id },
        data: {
          contributionPoints: {
            increment: amount * 10 // 10 points per item deposited
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
      message: `Successfully deposited ${amount} ${item?.name || 'items'} to guild warehouse`
    });

  } catch (error) {
    console.error('Error depositing to guild warehouse:', error);
    return NextResponse.json(
      { error: 'Failed to deposit items' },
      { status: 500 }
    );
  }
}