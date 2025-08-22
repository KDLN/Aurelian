import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (user && !error) {
      // Automatically sync user with database on successful auth
      await syncUserToDatabase(user);
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${requestUrl.origin}/creator`);
}

async function syncUserToDatabase(user: any) {
  try {
    console.log(`Auto-syncing user: ${user.id} (${user.email})`);
    
    // Create user in our database
    await prisma.user.upsert({
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

    // Create/update wallet with starting gold
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: { gold: 1000 },
      create: {
        userId: user.id,
        gold: 1000
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
        update: { qty: 50 },
        create: {
          userId: user.id,
          itemId: item.id,
          qty: 50,
          location: 'warehouse'
        }
      });
    }
    
    console.log(`Successfully auto-synced user ${user.id} with starting inventory`);
    
  } catch (error) {
    console.error('Auto-sync error:', error);
  }
}