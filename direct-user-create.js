import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createUserDirectly() {
  const userId = 'c7c7261e-42c0-411e-a6b1-d671d0113d45';
  const email = 'colinjohnsonw@gmail.com';
  
  try {
    console.log('Creating user directly with Prisma...');
    
    // Create profile
    console.log('Step 1: Creating profile...');
    const profile = await prisma.profile.upsert({
      where: { userId: userId },
      update: {
        display: 'Colin'
      },
      create: {
        userId: userId,
        display: 'Colin'
      }
    });
    console.log('✅ Profile created:', profile);

    // Create wallet
    console.log('Step 2: Creating wallet...');
    const wallet = await prisma.wallet.upsert({
      where: { userId: userId },
      update: { gold: 1000 },
      create: {
        userId: userId,
        gold: 1000
      }
    });
    console.log('✅ Wallet created:', wallet);

    // Create basic inventory
    console.log('Step 3: Creating inventory...');
    const items = await prisma.itemDef.findMany();
    console.log('Available items:', items.length);
    
    const ironOre = items.find(item => item.key === 'iron_ore');
    if (ironOre) {
      const inventory = await prisma.inventory.upsert({
        where: {
          userId_itemId_location: {
            userId: userId,
            itemId: ironOre.id,
            location: 'warehouse'
          }
        },
        update: { qty: 50 },
        create: {
          userId: userId,
          itemId: ironOre.id,
          qty: 50,
          location: 'warehouse'
        }
      });
      console.log('✅ Iron ore inventory created:', inventory);
    }

    console.log('🎉 User setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUserDirectly();