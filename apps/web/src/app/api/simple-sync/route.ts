import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId, email, username } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log(`Simple sync for user: ${userId} (${email}) username: ${username}`);
    
    // Step 1: Create User record (minimal)
    console.log('Creating User record...');
    
    // Check if a user with this email already exists but different ID
    if (email) {
      const existingEmailUser = await prisma.user.findFirst({
        where: { 
          email: email,
          id: { not: userId }
        }
      });
      
      if (existingEmailUser) {
        return NextResponse.json({ 
          error: 'Email already registered with different account' 
        }, { status: 400 });
      }
    }
    
    const user = await prisma.user.upsert({
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
      }
    });
    console.log('✅ User created/updated');

    // Step 2: Create Profile record (minimal)
    console.log('Creating Profile record...');
    const displayName = username || email?.split('@')[0] || 'Anonymous';
    
    // Check if username is already taken (only if a specific username was provided)
    if (username) {
      const existingProfile = await prisma.profile.findFirst({
        where: {
          display: username,
          userId: { not: userId }
        }
      });
      
      if (existingProfile) {
        return NextResponse.json({ 
          error: 'Username already taken' 
        }, { status: 400 });
      }
    }
    
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
  }
}