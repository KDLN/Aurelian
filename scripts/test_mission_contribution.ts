import { updateMissionProgress } from '../apps/web/src/lib/serverMissions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testMissionContribution() {
  try {
    // Get the current mission
    const mission = await prisma.serverMission.findFirst({
      where: { name: "Fixed Test Mission - Small Requirements" },
      include: { participants: true }
    });
    
    if (!mission) {
      console.log('❌ Mission not found');
      return;
    }
    
    console.log(`🎯 Testing contribution to: "${mission.name}"`);
    console.log(`📊 Current global progress:`, JSON.stringify(mission.globalProgress, null, 2));
    
    // Simulate a new contribution (nested format like from the client)
    const newContribution = {
      items: {
        herb: 5,
        hide: 3
      }
    };
    
    // Get existing participant contribution
    const participant = mission.participants[0];
    const previousContribution = participant?.contribution as any;
    
    console.log(`📦 Previous contribution:`, JSON.stringify(previousContribution, null, 2));
    console.log(`➕ New contribution:`, JSON.stringify(newContribution, null, 2));
    
    // Test our updateMissionProgress function
    console.log('\n🔄 Testing updateMissionProgress...');
    const result = await updateMissionProgress(mission.id, newContribution, previousContribution);
    
    console.log('✅ Function completed, result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Check the updated progress
    const updatedMission = await prisma.serverMission.findUnique({
      where: { id: mission.id }
    });
    
    console.log('\n📊 Updated global progress:');
    console.log(JSON.stringify(updatedMission?.globalProgress, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMissionContribution();