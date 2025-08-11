import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// This is the webhook secret from Supabase dashboard - we'll need to set this
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Get the webhook payload from Supabase Database Webhook
    const payload = await request.json();
    
    console.log('🔔 Database webhook received:', JSON.stringify(payload, null, 2));

    const { type, table, record, old_record } = payload;

    // Only handle auth.users table events
    if (table !== 'users') {
      console.log('⚠️ Ignoring table:', table);
      return NextResponse.json({ success: true, message: `Ignored table: ${table}` });
    }

    console.log(`📋 Processing ${type} event for users table`);

    // Handle different database events on auth.users
    switch (type) {
      case 'INSERT':
        console.log('🆕 Handling INSERT event');
        await handleUserCreated(record);
        break;
        
      case 'UPDATE':
        console.log('🔄 Handling UPDATE event');
        // Handle user updates (like email confirmations)
        await handleUserUpdated(record, old_record);
        break;
        
      default:
        console.log('❓ Unhandled webhook type:', type);
    }

    return NextResponse.json({ 
      success: true, 
      processed: true, 
      type, 
      table, 
      userId: record?.id 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

async function handleUserCreated(authUser: any) {
  const results = { user: null, profile: null, wallet: null, inventory: 0 };
  
  try {
    console.log(`=== Creating database user for: ${authUser.id} (${authUser.email}) ===`);
    
    // Upsert user in our database (in case they already exist)
    console.log('Step 1: Upserting user...');
    const user = await prisma.user.upsert({
      where: { id: authUser.id },
      update: {
        email: authUser.email || '',
        updatedAt: new Date()
      },
      create: {
        id: authUser.id,
        email: authUser.email || '',
        createdAt: new Date(authUser.created_at || new Date()),
        updatedAt: new Date()
      }
    });
    console.log('✅ User upserted:', user.id);
    results.user = user.id;

    // Create profile (use upsert to handle existing profiles)
    console.log('Step 2: Upserting profile...');
    const profile = await prisma.profile.upsert({
      where: { userId: authUser.id },
      update: {
        display: authUser.user_metadata?.display_name || 
                authUser.email?.split('@')[0] || 
                'Player'
      },
      create: {
        userId: authUser.id,
        display: authUser.user_metadata?.display_name || 
                authUser.email?.split('@')[0] || 
                'Player'
      }
    });
    console.log('✅ Profile upserted:', profile.userId);

    // Create starting wallet (use findFirst then create pattern since userId is not unique)
    console.log('Step 3: Creating wallet...');
    const existingWallet = await prisma.wallet.findFirst({
      where: { userId: authUser.id }
    });
    
    let wallet;
    if (existingWallet) {
      wallet = await prisma.wallet.update({
        where: { id: existingWallet.id },
        data: { gold: 1000 }
      });
      console.log('✅ Wallet updated:', wallet.userId, 'with', wallet.gold, 'gold');
    } else {
      wallet = await prisma.wallet.create({
        data: {
          userId: authUser.id,
          gold: 1000 // Starting gold
        }
      });
      console.log('✅ Wallet created:', wallet.userId, 'with', wallet.gold, 'gold');
    }

    // Add starting inventory
    console.log('Step 4: Adding starting inventory...');
    await addStartingInventory(authUser.id);

    console.log(`✅ Successfully created user ${authUser.id} with starting resources`);
    
  } catch (error) {
    console.error('Error creating user:', error);
    // Don't throw - we don't want to fail the webhook
  }
}

async function handleUserSignIn(authUser: any) {
  try {
    // Check if user exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { id: authUser.id }
    });

    if (!existingUser) {
      // User signed in but doesn't exist in our DB - create them
      console.log(`User ${authUser.id} signed in but not in database - creating`);
      await handleUserCreated(authUser);
    } else {
      // User exists - just update last activity
      await prisma.user.update({
        where: { id: authUser.id },
        data: { updatedAt: new Date() }
      });
    }
    
  } catch (error) {
    console.error('Error handling user sign in:', error);
  }
}

async function handleUserUpdated(authUser: any, oldRecord: any) {
  try {
    // Check if this is an email confirmation (email_confirmed_at changed)
    const wasConfirmed = oldRecord?.email_confirmed_at;
    const isNowConfirmed = authUser.email_confirmed_at;
    
    if (!wasConfirmed && isNowConfirmed) {
      console.log(`User ${authUser.id} confirmed their email - ensuring database sync`);
      
      // Make sure user exists in our database (sometimes INSERT webhook fails)
      const existingUser = await prisma.user.findUnique({
        where: { id: authUser.id }
      });
      
      if (!existingUser) {
        // User confirmed email but not in our DB - create them
        await handleUserCreated(authUser);
        return;
      }
    }
    
    // Update user info in our database
    await prisma.user.update({
      where: { id: authUser.id },
      data: {
        email: authUser.email || '',
        updatedAt: new Date()
      }
    });

    // Update profile if display name changed
    if (authUser.user_metadata?.display_name) {
      await prisma.profile.upsert({
        where: { userId: authUser.id },
        update: {
          display: authUser.user_metadata.display_name
        },
        create: {
          userId: authUser.id,
          display: authUser.user_metadata.display_name
        }
      });
    }
    
  } catch (error) {
    console.error('Error updating user:', error);
  }
}

async function addStartingInventory(userId: string) {
  try {
    // Get all available items
    const items = await prisma.itemDef.findMany();
    
    // Give starting inventory of basic items
    const startingItems = items.filter(item => 
      ['iron_ore', 'herb', 'hide'].includes(item.key)
    );
    
    for (const item of startingItems) {
      await prisma.inventory.create({
        data: {
          userId: userId,
          itemId: item.id,
          qty: 25, // Starting quantity
          location: 'warehouse'
        }
      });
    }
    
    console.log(`Added starting inventory for user ${userId}`);
    
  } catch (error) {
    console.error('Error adding starting inventory:', error);
  }
}