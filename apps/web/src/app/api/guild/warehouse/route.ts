import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Get guild warehouse inventory
export async function GET(request: NextRequest) {
  try {
    console.log('Guild warehouse API called');
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token provided');
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log('Auth error:', authError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('User authenticated:', user.id);

    // Get user's guild membership
    const membership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      select: { guildId: true, role: true }
    });

    if (!membership) {
      console.log('User not in guild:', user.id);
      return NextResponse.json({ error: 'Not in a guild' }, { status: 403 });
    }

    console.log('User guild membership:', membership);

    // Get guild warehouse items
    console.log('Fetching warehouse items for guild:', membership.guildId);
    
    // First try a simple query without relations
    const warehouseCount = await prisma.guildWarehouse.count({
      where: { guildId: membership.guildId }
    });
    console.log('Warehouse item count:', warehouseCount);
    
    // Try with existing fields only
    const warehouseItems = await prisma.guildWarehouse.findMany({
      where: { guildId: membership.guildId },
      include: {
        item: {
          select: {
            id: true,
            key: true,
            name: true,
            rarity: true,
            stack: true,
            meta: true
          }
        }
      },
      orderBy: [
        { item: { rarity: 'asc' } },
        { item: { name: 'asc' } }
      ]
    }).catch(error => {
      console.error('Prisma error in guild warehouse:', error);
      throw error;
    });

    console.log('Found warehouse items:', warehouseItems.length);

    return NextResponse.json({
      success: true,
      items: warehouseItems
    });

  } catch (error) {
    console.error('Error fetching guild warehouse:', error);
    return NextResponse.json(
      { error: 'Failed to fetch warehouse data' },
      { status: 500 }
    );
  }
}