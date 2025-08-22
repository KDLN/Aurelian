import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing database connection and basic operations...');
    
    // Test 1: Database connection
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected. Found ${userCount} users.`);
    
    // Test 2: Check if essential tables exist
    const itemCount = await prisma.itemDef.count();
    console.log(`✅ ItemDef table accessible. Found ${itemCount} items.`);
    
    const profileCount = await prisma.profile.count();
    console.log(`✅ Profile table accessible. Found ${profileCount} profiles.`);
    
    // Test 3: Try a simple operation with proper UUID format
    const testUserId = '123e4567-e89b-12d3-a456-426614174000'; // Valid UUID format
    
    // Clean up any existing test user first
    await prisma.inventory.deleteMany({ where: { userId: testUserId } });
    await prisma.wallet.deleteMany({ where: { userId: testUserId } });
    await prisma.profile.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    
    // Try creating a test user
    const testUser = await prisma.user.create({
      data: {
        id: testUserId,
        email: 'test@example.com',
        caravanSlotsUnlocked: 3,
        caravanSlotsPremium: 0,
      }
    });
    console.log('✅ Test user created successfully');
    
    // Try creating a test profile
    const testProfile = await prisma.profile.create({
      data: {
        userId: testUserId,
        display: 'TestUser123'
      }
    });
    console.log('✅ Test profile created successfully');
    
    // Try creating a test wallet
    const testWallet = await prisma.wallet.create({
      data: {
        userId: testUserId,
        gold: 1000
      }
    });
    console.log('✅ Test wallet created successfully');
    
    // Clean up test data
    await prisma.wallet.delete({ where: { id: testWallet.id } });
    await prisma.profile.delete({ where: { id: testProfile.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log('✅ Test cleanup completed');
    
    return NextResponse.json({
      success: true,
      message: 'All database operations successful',
      stats: {
        users: userCount,
        items: itemCount,
        profiles: profileCount
      }
    });
    
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}