import { updateMissionProgress } from '../apps/web/src/lib/serverMissions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function triggerProgressUpdate() {
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
    
    console.log(`🎯 Found mission: "${mission.name}"`);
    console.log(`📊 Current global progress:`, JSON.stringify(mission.globalProgress, null, 2));
    
    if (mission.participants.length === 0) {
      console.log('❌ No participants found');
      return;
    }
    
    // Get the participant contribution
    const participant = mission.participants[0];
    console.log(`👤 Participant: ${participant.userId}`);
    console.log(`📦 Participant contribution:`, JSON.stringify(participant.contribution, null, 2));
    
    // Trigger a progress update by calling updateMissionProgress with current contribution
    console.log('\n🔄 Triggering progress update...');
    await updateMissionProgress(mission.id, participant.contribution as any);
    
    // Check the updated progress
    const updatedMission = await prisma.serverMission.findUnique({
      where: { id: mission.id }
    });
    
    console.log('\n✅ Updated global progress:');
    console.log(JSON.stringify(updatedMission?.globalProgress, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

triggerProgressUpdate();