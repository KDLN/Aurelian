import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Get user's inventory by location
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const url = new URL(request.url);
    const location = url.searchParams.get('location') || 'warehouse';

    // Get user's inventory for the specified location
    const inventory = await prisma.inventory.findMany({
      where: {
        userId: user.id,
        location: location
      },
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
    });

    return NextResponse.json({
      success: true,
      items: inventory,
      location: location
    });

  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}