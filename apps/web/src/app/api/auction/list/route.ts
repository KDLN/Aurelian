import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    // Get auth token from headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { itemKey, quantity, pricePerUnit } = body;

    // Validate input
    if (!itemKey || !quantity || !pricePerUnit) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (quantity <= 0 || pricePerUnit <= 0) {
      return NextResponse.json({ error: 'Invalid quantity or price' }, { status: 400 });
    }

    // Find the item definition
    const itemDef = await prisma.itemDef.findUnique({
      where: { key: itemKey }
    });

    if (!itemDef) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check user's inventory
    const inventory = await prisma.inventory.findFirst({
      where: {
        userId: user.id,
        itemId: itemDef.id,
        location: 'warehouse'
      }
    });

    if (!inventory || inventory.qty < quantity) {
      return NextResponse.json({ error: 'Insufficient inventory' }, { status: 400 });
    }

    // Create the listing and update inventory in a transaction
    const listing = await prisma.$transaction(async (tx) => {
      // Reduce inventory
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { qty: inventory.qty - quantity }
      });

      // Create listing
      return await tx.listing.create({
        data: {
          sellerId: user.id,
          itemId: itemDef.id,
          qty: quantity,
          price: pricePerUnit,
          status: 'active'
        },
        include: {
          item: true,
          seller: {
            include: {
              profile: true
            }
          }
        }
      });
    });

    return NextResponse.json({ 
      success: true, 
      listing: {
        id: listing.id,
        item: listing.item.name,
        itemKey: listing.item.key,
        qty: listing.qty,
        price: listing.price,
        seller: listing.seller.profile?.display || 'Unknown',
        createdAt: listing.createdAt
      }
    });

  } catch (error) {
    console.error('List item error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}