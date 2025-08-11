const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugMissions() {
  console.log('🔍 Debugging missions database...');

  try {
    // Check mission definitions
    const missionDefs = await prisma.missionDef.findMany();
    console.log(`\n📋 Found ${missionDefs.length} mission definitions:`);
    missionDefs.forEach(mission => {
      console.log(`  - ${mission.name} (${mission.id})`);
    });

    // Check mission instances
    const missionInstances = await prisma.missionInstance.findMany({
      include: {
        mission: true
      }
    });
    console.log(`\n🎯 Found ${missionInstances.length} mission instances:`);
    missionInstances.forEach(instance => {
      console.log(`  - ${instance.mission.name} (${instance.status}) - User: ${instance.userId}`);
      console.log(`    Started: ${instance.startTime}`);
      console.log(`    Ends: ${instance.endTime}`);
    });

    // Check users
    const users = await prisma.user.findMany();
    console.log(`\n👥 Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`);
    });

    console.log('\n✅ Debug complete!');
  } catch (error) {
    console.error('❌ Error debugging missions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMissions();