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
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user's guild membership
    const membership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      select: { guildId: true, role: true }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not in a guild' }, { status: 403 });
    }

    // Get guild warehouse items
    const warehouseItems = await prisma.guildWarehouse.findMany({
      where: { guildId: membership.guildId },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            baseValue: true
          }
        }
      },
      orderBy: [
        { item: { category: 'asc' } },
        { item: { name: 'asc' } }
      ]
    }).catch(error => {
      console.error('Prisma error in guild warehouse:', error);
      throw error;
    });

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