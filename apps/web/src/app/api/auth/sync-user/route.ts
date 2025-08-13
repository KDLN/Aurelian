import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get JWT token from headers
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log(`Manual sync request for user: ${user.id} (${user.email})`);

    // Sync user to database using the same logic as auth callback
    await syncUserToDatabase(user);

    return NextResponse.json({ 
      success: true, 
      message: `User ${user.email} synced successfully`,
      userId: user.id 
    });

  } catch (error) {
    console.error('Manual sync error:', error);
    return NextResponse.json({
      error: 'Failed to sync user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

async function syncUserToDatabase(user: any) {
  try {
    console.log(`Syncing user: ${user.id} (${user.email})`);
    
    // Create user in our database
    const userRecord = await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        updatedAt: new Date()
      },
      create: {
        id: user.id,
        email: user.email || 'unknown@example.com',
        // Caravan system defaults
        caravanSlotsUnlocked: 3,
        caravanSlotsPremium: 0,
        // Crafting system defaults
        craftingLevel: 1,
        craftingXP: 0,
        craftingXPNext: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Create profile
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        display: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Anonymous'
      },
      create: {
        userId: user.id,
        display: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Anonymous'
      }
    });

    // Create/update wallet with starting gold (extra due to DB reset)
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {
        gold: { increment: 1000 } // Give existing users extra gold
      },
      create: {
        userId: user.id,
        gold: 2000 // New users get more gold
      }
    });

    // Get available items and add starting inventory
    const items = await prisma.itemDef.findMany();
    
    for (const item of items) {
      await prisma.inventory.upsert({
        where: {
          userId_itemId_location: {
            userId: user.id,
            itemId: item.id,
            location: 'warehouse'
          }
        },
        update: {}, // Don't update existing inventory
        create: {
          userId: user.id,
          itemId: item.id,
          qty: 100, // Extra items due to DB reset
          location: 'warehouse'
        }
      });
    }
    
    console.log(`Successfully synced user ${user.id} with database`);
    return userRecord;
    
  } catch (error) {
    console.error('Database sync error:', error);
    throw error;
  }
}