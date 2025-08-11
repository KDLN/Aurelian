const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearMissions() {
  try {
    await prisma.missionInstance.deleteMany();
    console.log('✅ Cleared all mission instances');
  } catch (error) {
    console.error('❌ Error clearing missions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearMissions();