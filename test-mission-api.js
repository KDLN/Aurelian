const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMissionCreation() {
  console.log('🧪 Testing mission creation directly...');

  try {
    const userId = 'c7c7261e-42c0-411e-a6b1-d671d0113d45'; // The user from debug output
    const missionId = '08ffe1f7-2eff-4577-bd9b-d97a25f2b4c6'; // Iron Ore Delivery

    console.log('📝 Creating mission instance directly in database...');
    
    // Get mission definition first
    const missionDef = await prisma.missionDef.findUnique({
      where: { id: missionId }
    });
    
    if (!missionDef) {
      console.error('❌ Mission definition not found');
      return;
    }
    
    console.log('✅ Found mission definition:', missionDef.name);
    
    // Calculate end time
    const endTime = new Date(Date.now() + missionDef.baseDuration * 1000);
    
    // Create mission instance
    const missionInstance = await prisma.missionInstance.create({
      data: {
        userId,
        missionId,
        status: 'active',
        endTime
      }
    });
    
    console.log('✅ Created mission instance:', missionInstance.id);
    
    // Verify it exists
    const allInstances = await prisma.missionInstance.findMany();
    console.log('📊 Total mission instances in database:', allInstances.length);
    
  } catch (error) {
    console.error('❌ Error testing mission creation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMissionCreation();