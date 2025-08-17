import { supabase } from '@/lib/supabaseClient'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error_description = searchParams.get('error_description')
  const error = searchParams.get('error')
  
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  console.log(`🔄 Auth callback received:`, { code: !!code, error, error_description })

  // Handle OAuth errors
  if (error) {
    console.error(`❌ OAuth error: ${error} - ${error_description}`)
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error_description || error)}`)
  }

  if (code) {
    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error(`❌ Exchange code error:`, exchangeError)
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(exchangeError.message)}`)
      }

      if (data.user) {
        console.log(`✅ User authenticated: ${data.user.id} via ${data.user.app_metadata?.provider}`)
        
        // Sync user to database after successful login
        try {
          await syncUserToDatabase(data.user)
          console.log(`✅ User ${data.user.id} synced to database`)
        } catch (syncError) {
          console.error('❌ Failed to sync user to database:', syncError)
          // Continue anyway - user can manually sync later via the app
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
    } catch (error) {
      console.error(`❌ Auth callback error:`, error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('Authentication failed')}`)
    }
  }

  console.log(`❌ No auth code received`)
  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('No authentication code received')}`)
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

    // For OAuth providers (Discord, etc.), don't auto-assign username
    // Let users choose their own trading name through the UI
    const isOAuthProvider = user.app_metadata?.provider !== 'email';
    
    console.log(`🔤 User provider: ${user.app_metadata?.provider}, isOAuth: ${isOAuthProvider}`);
    console.log(`🔤 User metadata: ${JSON.stringify(user.user_metadata)}`);
    
    if (isOAuthProvider) {
      // For OAuth users, create profile without display name (null)
      // This will trigger the username selection flow in the frontend
      await prisma.profile.upsert({
        where: { userId: user.id },
        update: {
          // Don't update display name for existing OAuth users
        },
        create: {
          userId: user.id,
          display: null // This will trigger username selection
        }
      });
    } else {
      // For email/password users, use the username from signup metadata
      const displayName = user.user_metadata?.username || 
                         user.user_metadata?.display_name || 
                         user.email?.split('@')[0] || 
                         'Anonymous';
                         
      console.log(`🔤 Setting display name to: ${displayName} (from metadata)`);
      
      await prisma.profile.upsert({
        where: { userId: user.id },
        update: {
          display: displayName
        },
        create: {
          userId: user.id,
          display: displayName
        }
      });
    }

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