import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    
    if (!userId && !email) {
      return NextResponse.json({ error: 'userId or email required' }, { status: 400 });
    }

    let userToDelete;
    
    if (userId) {
      userToDelete = await prisma.user.findUnique({ where: { id: userId } });
    } else if (email) {
      userToDelete = await prisma.user.findUnique({ where: { email: email } });
    }
    
    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUserId = userToDelete.id;
    console.log(`Deleting user: ${targetUserId} (${userToDelete.email})`);

    // Delete in correct order to handle foreign key constraints
    console.log('Deleting user data...');
    
    // Delete mission instances first
    const deletedMissions = await prisma.missionInstance.deleteMany({
      where: { userId: targetUserId }
    });
    console.log(`Deleted ${deletedMissions.count} mission instances`);
    
    // Delete inventory
    const deletedInventory = await prisma.inventory.deleteMany({
      where: { userId: targetUserId }
    });
    console.log(`Deleted ${deletedInventory.count} inventory items`);
    
    // Delete wallet
    const deletedWallet = await prisma.wallet.deleteMany({
      where: { userId: targetUserId }
    });
    console.log(`Deleted ${deletedWallet.count} wallets`);
    
    // Delete profile
    const deletedProfile = await prisma.profile.deleteMany({
      where: { userId: targetUserId }
    });
    console.log(`Deleted ${deletedProfile.count} profiles`);
    
    // Finally delete user
    const deletedUser = await prisma.user.delete({
      where: { id: targetUserId }
    });
    console.log('User deleted successfully');

    return NextResponse.json({
      success: true,
      message: `User ${deletedUser.email} and all related data deleted successfully`,
      deletedCounts: {
        missions: deletedMissions.count,
        inventory: deletedInventory.count,
        wallets: deletedWallet.count,
        profiles: deletedProfile.count,
        users: 1
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({
      error: 'Failed to delete user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // List all users for admin reference
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true,
        profile: {
          select: {
            display: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      users: users,
      total: users.length
    });

  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json({
      error: 'Failed to list users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}