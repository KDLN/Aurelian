// Quick script to create test user with inventory for auction testing
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestData() {
  try {
    // Create a test user (you'll need to replace this with a real user ID from Supabase)
    const testUserId = 'test-user-123'; // Replace with actual user ID from your Supabase auth
    
    console.log('Creating test data for user:', testUserId);

    // Get available items
    const items = await prisma.itemDef.findMany();
    console.log('Found items:', items.map(i => i.name));

    // Create a wallet for the user
    await prisma.wallet.upsert({
      where: { userId: testUserId },
      update: { gold: 1000 },
      create: {
        userId: testUserId,
        gold: 1000
      }
    });

    // Add some inventory for each item
    for (const item of items) {
      await prisma.inventory.upsert({
        where: {
          userId_itemId_location: {
            userId: testUserId,
            itemId: item.id,
            location: 'warehouse'
          }
        },
        update: { qty: 50 },
        create: {
          userId: testUserId,
          itemId: item.id,
          qty: 50,
          location: 'warehouse'
        }
      });
      console.log(`Added 50 ${item.name} to warehouse for ${testUserId}`);
    }

    console.log('Test data created successfully!');
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();