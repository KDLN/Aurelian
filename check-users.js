import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('=== Database User Check ===');
    
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        wallets: true,
        inventories: {
          include: {
            item: true
          }
        }
      }
    });

    console.log(`Found ${users.length} users in database:`);
    
    for (const user of users) {
      console.log(`\n👤 User: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Profile: ${user.profile?.display || 'No profile'}`);
      console.log(`   Gold: ${user.wallets?.[0]?.gold || 0}`);
      console.log(`   Inventory items: ${user.inventories.length}`);
      
      user.inventories.forEach(inv => {
        console.log(`     - ${inv.item.name}: ${inv.qty} (${inv.location})`);
      });
    }
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();