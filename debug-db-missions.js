const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugMissionDatabase() {
  console.log('🔍 Debugging mission database state...');
  
  try {
    // Check all mission instances (not just active)
    const allMissions = await prisma.missionInstance.findMany({
      include: {
        mission: {
          select: {
            name: true,
            baseDuration: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });
    
    console.log(`\n📊 Found ${allMissions.length} total mission instances:`);
    allMissions.forEach(mission => {
      const now = new Date();
      const endTime = new Date(mission.endTime);
      const timeLeft = Math.max(0, Math.ceil((endTime - now) / 1000));
      const isReady = timeLeft <= 0;
      
      console.log(`\n🎯 Mission: ${mission.mission.name}`);
      console.log(`   ID: ${mission.id}`);
      console.log(`   Status: ${mission.status}`);
      console.log(`   User: ${mission.userId}`);
      console.log(`   Started: ${mission.startTime}`);
      console.log(`   Ends: ${mission.endTime}`);
      console.log(`   Time Left: ${timeLeft}s`);
      console.log(`   Ready: ${isReady ? '✅ YES' : '❌ NO'}`);
    });
    
    // Check only active missions
    const activeMissions = await prisma.missionInstance.findMany({
      where: { status: 'active' },
      include: {
        mission: {
          select: { name: true }
        }
      }
    });
    
    console.log(`\n✅ Active missions only: ${activeMissions.length}`);
    activeMissions.forEach(mission => {
      console.log(`   - ${mission.mission.name} (${mission.id})`);
    });
    
    // Check for missions that might be stuck in other statuses
    const nonActiveMissions = await prisma.missionInstance.findMany({
      where: { 
        status: { not: 'active' },
        endTime: { gt: new Date() } // End time is in the future
      },
      include: {
        mission: {
          select: { name: true }
        }
      }
    });
    
    if (nonActiveMissions.length > 0) {
      console.log(`\n⚠️ Found ${nonActiveMissions.length} missions with non-active status but future end time:`);
      nonActiveMissions.forEach(mission => {
        console.log(`   - ${mission.mission.name}: ${mission.status} (should be active)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMissionDatabase();