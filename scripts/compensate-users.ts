import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function compensateUsers() {
  console.log('🎁 Starting user compensation for DB reset...');

  try {
    // Get all users
    const users = await prisma.user.findMany({
      include: {
        wallets: true
      }
    });

    console.log(`Found ${users.length} users to compensate`);

    for (const user of users) {
      console.log(`💰 Compensating user: ${user.email} (${user.id})`);

      // Give 1000 extra gold
      await prisma.wallet.upsert({
        where: { userId: user.id },
        update: {
          gold: { increment: 1000 }
        },
        create: {
          userId: user.id,
          gold: 2000
        }
      });

      // Get all items and give them extra inventory
      const items = await prisma.itemDef.findMany();
      
      for (const item of items) {
        await prisma.inventory.upsert({
          where: {
            userId_itemId_location: {
              userId: user.id,
              itemId: item.id,
              location: 'warehouse'
            }
          },
          update: {
            qty: { increment: 50 } // Add 50 more of each item
          },
          create: {
            userId: user.id,
            itemId: item.id,
            qty: 100,
            location: 'warehouse'
          }
        });
      }

      console.log(`✅ Compensated ${user.email} with 1000 gold and 50 extra items`);
    }

    console.log('🎉 User compensation complete!');
    
  } catch (error) {
    console.error('❌ Error compensating users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compensateUsers();