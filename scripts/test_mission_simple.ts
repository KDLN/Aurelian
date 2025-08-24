import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simplified completion check without imports
function isMissionCompletedSimple(progress: any, requirements: any): boolean {
  for (const [key, required] of Object.entries(requirements)) {
    if (typeof required === 'number') {
      const current = progress[key] || 0;
      if (current < required) return false;
    }
  }
  return true;
}

async function testAndFixMission() {
  try {
    // Get the current mission
    const mission = await prisma.serverMission.findFirst({
      where: { name: "Fixed Test Mission - Small Requirements" }
    });
    
    if (!mission) {
      console.log('❌ Mission not found');
      return;
    }
    
    console.log(`🎯 Mission: "${mission.name}"`);
    console.log(`📊 Current status: ${mission.status}`);
    console.log(`📊 Current global progress:`, JSON.stringify(mission.globalProgress, null, 2));
    console.log(`📋 Requirements:`, JSON.stringify(mission.globalRequirements, null, 2));
    
    // Check if mission should be completed
    const shouldBeComplete = isMissionCompletedSimple(mission.globalProgress, mission.globalRequirements);
    console.log(`\n🤔 Should be complete: ${shouldBeComplete}`);
    
    if (shouldBeComplete && mission.status !== 'completed') {
      console.log('\n🔧 Marking mission as completed...');
      await prisma.serverMission.update({
        where: { id: mission.id },
        data: {
          status: 'completed',
          completedAt: new Date()
        }
      });
      console.log('✅ Mission marked as completed!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAndFixMission();