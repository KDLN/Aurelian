import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId, email, username } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log(`Simple sync for user: ${userId} (${email}) username: ${username}`);
    
    // Step 1: Create User record (minimal)
    console.log('Creating User record...');
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: { email: email },
      create: {
        id: userId,
        email: email || 'unknown@example.com',
        caravanSlotsUnlocked: 3,
        caravanSlotsPremium: 0,
      }
    });
    console.log('✅ User created/updated');

    // Step 2: Create Profile record (minimal)
    console.log('Creating Profile record...');
    const displayName = username || email?.split('@')[0] || 'Anonymous';
    
    const profile = await prisma.profile.upsert({
      where: { userId: userId },
      update: { display: displayName },
      create: {
        userId: userId,
        display: displayName
      }
    });
    console.log('✅ Profile created/updated');

    // Step 3: Create Wallet (minimal)
    console.log('Creating Wallet...');
    const wallet = await prisma.wallet.upsert({
      where: { userId: userId },
      update: { gold: 1000 },
      create: {
        userId: userId,
        gold: 1000
      }
    });
    console.log('✅ Wallet created/updated');

    // Skip inventory for now to avoid complexity
    console.log('✅ Simple sync completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: `User ${displayName} synced successfully (simple version)`,
      data: {
        user: { id: user.id, email: user.email },
        profile: { display: profile.display },
        wallet: { gold: wallet.gold }
      }
    });

  } catch (error) {
    console.error('Simple sync error:', error);
    return NextResponse.json({ 
      error: 'Simple sync failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}