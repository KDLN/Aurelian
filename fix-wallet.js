const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixWallet() {
  try {
    const userId = '3bfe603e-66d0-4d52-99f8-feae116f78fa';
    
    // Create wallet for Kidlion
    const wallet = await prisma.wallet.create({
      data: {
        userId: userId,
        gold: 1000  // Starting gold
      }
    });

    console.log('✅ Created wallet:', JSON.stringify(wallet, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixWallet();