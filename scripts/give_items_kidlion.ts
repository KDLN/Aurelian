import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function giveItemsToKidlion() {
  try {
    // Find kidlion user (try different case variations)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'kidlion', mode: 'insensitive' } },
          { profile: { display: { contains: 'kidlion', mode: 'insensitive' } } }
        ]
      },
      include: {
        profile: true
      }
    });

    if (!user) {
      console.log('❌ User kidlion not found');
      console.log('Looking for any user with similar name...');
      
      // Try to find any user
      const allUsers = await prisma.user.findMany({
        include: { profile: true },
        take: 10
      });
      
      console.log('Available users:');
      allUsers.forEach(u => {
        console.log(`- ${u.email} (${u.profile?.display || 'No display name'}) - ID: ${u.id}`);
      });
      return;
    }

    console.log(`✅ Found user: ${user.email} (${user.profile?.display}) - ID: ${user.id}`);

    // Get all item definitions
    const items = await prisma.itemDef.findMany({
      select: { id: true, key: true, name: true }
    });

    console.log(`Found ${items.length} items in the database`);

    // Give 99,000 of each item to kidlion
    const itemsToGive = 99000;
    
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
          qty: itemsToGive
        },
        create: {
          userId: user.id,
          itemId: item.id,
          location: 'warehouse',
          qty: itemsToGive
        }
      });
      
      console.log(`✅ Gave ${itemsToGive.toLocaleString()} ${item.name} (${item.key})`);
    }

    // Also give a lot of gold
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: { gold: 999999 },
      create: { 
        userId: user.id,
        gold: 999999
      }
    });

    console.log(`✅ Gave 999,999 gold to ${user.profile?.display || user.email}`);
    console.log(`🎉 Successfully gave ${itemsToGive.toLocaleString()} of each item (${items.length} items total) to kidlion!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

giveItemsToKidlion();