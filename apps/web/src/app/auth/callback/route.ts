import { supabase } from '@/lib/supabaseClient'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/lobby'

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      // Sync user to database after successful login
      try {
        await syncUserToDatabase(data.user)
        console.log(`✅ User ${data.user.id} synced to database`)
      } catch (syncError) {
        console.error('❌ Failed to sync user to database:', syncError)
        // Continue anyway - user can manually sync later
      }

      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

async function syncUserToDatabase(user: any) {
  try {
    console.log(`🔄 Syncing user: ${user.id} (${user.email})`);
    
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

    // Create/update wallet with starting gold
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {}, // Don't update existing gold
      create: {
        userId: user.id,
        gold: 2000  // Extra gold due to DB reset
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
    
    console.log(`✅ Successfully synced user ${user.id} with database`);
    return userRecord;
    
  } catch (error) {
    console.error('❌ Database sync error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}