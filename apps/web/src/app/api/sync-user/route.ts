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

    console.log(`Syncing user: ${userId} (${email})`);
    
    // Create user in our database
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

    // Create profile with provided username or email-based default
    const displayName = username || email?.split('@')[0] || 'Anonymous';
    
    // If a specific username was provided, check if it's already taken
    if (username) {
      const existingProfile = await prisma.profile.findFirst({
        where: {
          display: username,
          userId: { not: userId }
        }
      });
      
      if (existingProfile) {
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

    // Create/update wallet with test gold
    await prisma.wallet.upsert({
      where: { userId: userId },
      update: { gold: 1000 },
      create: {
        userId: userId,
        gold: 1000
      }
    });

    // Get available items and add test inventory
    const items = await prisma.itemDef.findMany();
    
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
    
    console.log(`Successfully synced user ${userId} with test inventory`);
    
    return NextResponse.json({ 
      success: true, 
      message: `User ${email} synced with database and given test inventory`,
      userId: userId
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ 
      error: 'Failed to sync user', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}