import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addTestInventory() {
  try {
    // Get all users from the database
    const users = await prisma.user.findMany();
    console.log('Found users:', users);

    if (users.length === 0) {
      console.log('No users found. Creating a generic user...');
      // Create a test user - you'll need to replace with your actual Supabase user ID
      const testUserId = 'change-me-to-your-user-id';
      
      await prisma.user.upsert({
        where: { id: testUserId },
        update: {},
        create: {
          id: testUserId,
          email: 'test@example.com'
        }
      });

      await addInventoryForUser(testUserId);
    } else {
      // Add inventory for all existing users
      for (const user of users) {
        await addInventoryForUser(user.id);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function addInventoryForUser(userId) {
  console.log(`Adding test inventory for user: ${userId}`);

  // Create/update wallet
  await prisma.wallet.upsert({
    where: { userId },
    update: { gold: 1000 },
    create: {
      userId,
      gold: 1000
    }
  });

  // Get available items
  const items = await prisma.itemDef.findMany();
  
  // Add inventory for each item
  for (const item of items) {
    await prisma.inventory.upsert({
      where: {
        userId_itemId_location: {
          userId,
          itemId: item.id,
          location: 'warehouse'
        }
      },
      update: { qty: 100 },
      create: {
        userId,
        itemId: item.id,
        qty: 100,
        location: 'warehouse'
      }
    });
  }
  
  console.log(`Added test inventory for ${userId}: 100 of each item + 1000 gold`);
}

addTestInventory();