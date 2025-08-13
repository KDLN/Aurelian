import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function giveEquipmentToUsers() {
  console.log('🎁 Giving starter equipment to all users...');

  try {
    // Get all users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users`);

    // Get all equipment items
    const equipmentItems = await prisma.itemDef.findMany({
      where: {
        key: {
          in: [
            'rusty_blade', 'leather_vest', 'basic_compass', 'lucky_charm',
            'steel_sword', 'chain_mail', 'trade_ledger', 'silver_ring'
          ]
        }
      }
    });

    console.log(`Found ${equipmentItems.length} equipment items`);

    for (const user of users) {
      console.log(`🎒 Adding equipment to user: ${user.email} (${user.id})`);

      for (const item of equipmentItems) {
        await prisma.inventory.upsert({
          where: {
            userId_itemId_location: {
              userId: user.id,
              itemId: item.id,
              location: 'warehouse'
            }
          },
          update: {
            qty: { increment: 5 } // Add 5 more of each equipment item
          },
          create: {
            userId: user.id,
            itemId: item.id,
            qty: 10, // Give 10 of each starter equipment
            location: 'warehouse'
          }
        });
      }

      console.log(`✅ Added equipment to ${user.email}`);
    }

    console.log('🎉 Equipment distribution complete!');
    
  } catch (error) {
    console.error('❌ Error giving equipment:', error);
  } finally {
    await prisma.$disconnect();
  }
}

giveEquipmentToUsers();