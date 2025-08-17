import { supabase } from '@/lib/supabaseClient'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Add starter items for new users (consistent with auto-sync)
 * - 5 herbs
 * - 2 iron ore
 */
async function addStarterItemsForNewUser(userId: string) {
  try {
    // Get existing item definitions (they should already exist)
    const [herbItem, ironItem] = await Promise.all([
      prisma.itemDef.findUnique({ where: { key: 'herb' } }),
      prisma.itemDef.findUnique({ where: { key: 'iron_ore' } })
    ]);

    if (!herbItem || !ironItem) {
      console.error('Required starter items not found in database for OAuth signup');
      return;
    }

    // Check if user already has these items to avoid duplicates
    const existingInventory = await prisma.inventory.findMany({
      where: {
        userId: userId,
        itemId: { in: [herbItem.id, ironItem.id] },
        location: 'warehouse'
      }
    });

    if (existingInventory.length > 0) {
      console.log(`OAuth user ${userId} already has starter items, skipping`);
      return;
    }

    // Add starter inventory
    await prisma.inventory.createMany({
      data: [
        {
          userId: userId,
          itemId: herbItem.id,
          qty: 5,
          location: 'warehouse'
        },
        {
          userId: userId,
          itemId: ironItem.id,
          qty: 2,
          location: 'warehouse'
        }
      ]
    });

    console.log(`✅ Added OAuth starter items to user ${userId}: 5 herbs, 2 iron ore`);
  } catch (error) {
    console.error('Error adding OAuth starter items:', error);
    // Don't throw - we want signup to succeed even if starter items fail
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const { searchParams, origin } = url
  const code = searchParams.get('code')
  const error_description = searchParams.get('error_description')
  const error = searchParams.get('error')
  
  // Check for implicit flow tokens (these come as URL fragments, which we handle client-side)
  // If there's no code and no error, this might be an implicit flow redirect
  const access_token = searchParams.get('access_token')
  const refresh_token = searchParams.get('refresh_token')
  
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  // Enhanced logging for debugging
  console.log(`🔄 Auth callback received:`)
  console.log(`   Full URL: ${request.url}`)
  console.log(`   Code present: ${!!code}`)
  console.log(`   Access token present: ${!!access_token}`)
  console.log(`   Error: ${error}`)
  console.log(`   Error description: ${error_description}`)
  console.log(`   All search params:`, Object.fromEntries(searchParams.entries()))

  // Handle OAuth errors
  if (error) {
    console.error(`❌ OAuth error: ${error} - ${error_description}`)
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error_description || error)}`)
  }

  // For implicit flow, tokens are in URL fragment (not accessible server-side)
  // If we have no code and no error, assume it's implicit flow and redirect to homepage
  if (!code && !error) {
    console.log(`🔄 No code parameter - likely implicit flow, redirecting to homepage`)
    return NextResponse.redirect(`${origin}/`)
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
      // For Discord OAuth, try to use Discord username, otherwise trigger selection flow
      const discordUsername = user.user_metadata?.full_name || 
                             user.user_metadata?.name || 
                             user.user_metadata?.username ||
                             user.user_metadata?.preferred_username;
      
      console.log(`🎮 Discord username candidates:`, {
        full_name: user.user_metadata?.full_name,
        name: user.user_metadata?.name,
        username: user.user_metadata?.username,
        preferred_username: user.user_metadata?.preferred_username,
        selected: discordUsername
      });
      
      await prisma.profile.upsert({
        where: { userId: user.id },
        update: {
          // Don't update display name for existing OAuth users to preserve their choice
        },
        create: {
          userId: user.id,
          display: discordUsername || null // Use Discord username or trigger selection
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

    // Create/update wallet with starter gold
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {}, // Don't update existing gold
      create: {
        userId: user.id,
        gold: 500  // Consistent starter gold
      }
    });

    // Add starter items (consistent with auto-sync)
    await addStarterItemsForNewUser(user.id);
    
    console.log(`✅ Successfully synced user ${user.id} with database`);
    return userRecord;
    
  } catch (error) {
    console.error('❌ Database sync error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}