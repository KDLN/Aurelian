const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUser() {
  try {
    // Find user by email or display name containing 'kidlion'
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'kidlion', mode: 'insensitive' } },
          { profile: { display: { contains: 'kidlion', mode: 'insensitive' } } }
        ]
      },
      include: {
        profile: true,
        wallets: true
      }
    });

    console.log('Found users:', JSON.stringify(users, null, 2));

    if (users.length === 0) {
      console.log('No users found with kidlion in email or display name');
      
      // Let's check all users to see what we have
      const allUsers = await prisma.user.findMany({
        include: {
          profile: true,
          wallets: true
        },
        take: 10
      });
      
      console.log('\nAll users (first 10):');
      allUsers.forEach(user => {
        console.log(`- ID: ${user.id}, Email: ${user.email}, Display: ${user.profile?.display}, Gold: ${user.wallets?.gold}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();