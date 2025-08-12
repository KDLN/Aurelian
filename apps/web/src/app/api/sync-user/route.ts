import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Get user data from request body (sent from client)
    const { userId, email, username } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log(`Syncing user: ${userId} (${email}) with username: ${username}`);
    
    // Create user in our database
    console.log('Step 1: Creating/updating User record...');
    await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: email,
        updatedAt: new Date()
      },
      create: {
        id: userId,
        email: email || 'unknown@example.com',
        caravanSlotsUnlocked: 3,
        caravanSlotsPremium: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('Step 1: User record created/updated successfully');

    // Create profile with provided username or email-based default
    console.log('Step 2: Creating/updating Profile record...');
    const displayName = username || email?.split('@')[0] || 'Anonymous';
    
    // If a specific username was provided, check if it's already taken
    if (username) {
      console.log(`Checking if username '${username}' is available...`);
      const existingProfile = await prisma.profile.findFirst({
        where: {
          display: username,
          userId: { not: userId }
        }
      });
      
      if (existingProfile) {
        console.log(`Username '${username}' is already taken`);
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
      }
    }
    
    await prisma.profile.upsert({
      where: { userId: userId },
      update: {
        display: displayName
      },
      create: {
        userId: userId,
        display: displayName
      }
    });
    console.log(`Step 2: Profile created/updated with display name: ${displayName}`);

    // Create/update wallet with test gold
    console.log('Step 3: Creating/updating Wallet...');
    await prisma.wallet.upsert({
      where: { userId: userId },
      update: { gold: 1000 },
      create: {
        userId: userId,
        gold: 1000
      }
    });
    console.log('Step 3: Wallet created/updated successfully');

    // Get available items and add test inventory (but don't fail if no items exist)
    console.log('Step 4: Creating inventory...');
    try {
      const items = await prisma.itemDef.findMany();
      console.log(`Found ${items.length} items for inventory creation`);
      
      for (const item of items) {
        await prisma.inventory.upsert({
          where: {
            userId_itemId_location: {
              userId: userId,
              itemId: item.id,
              location: 'warehouse'
            }
          },
          update: { qty: 100 },
          create: {
            userId: userId,
            itemId: item.id,
            qty: 100,
            location: 'warehouse'
          }
        });
      }
      console.log(`Successfully created inventory for ${items.length} items`);
    } catch (inventoryError) {
      console.warn('Failed to create inventory (non-critical):', inventoryError);
      // Don't fail the entire sync if inventory creation fails
    }
    
    console.log(`Successfully synced user ${userId} with test inventory`);
    
    return NextResponse.json({ 
      success: true, 
      message: `User ${email} synced with database and given test inventory`,
      userId: userId
    });

  } catch (error) {
    console.error('Sync error:', error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('23505')) {
        return NextResponse.json({ 
          error: 'Username already taken', 
          details: error.message 
        }, { status: 400 });
      }
      
      if (error.message.includes('23503')) {
        return NextResponse.json({ 
          error: 'Database constraint violation', 
          details: error.message 
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to sync user', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}