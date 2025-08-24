import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugMissionData() {
  try {
    // Get the latest completed mission
    const mission = await prisma.serverMission.findFirst({
      where: { name: "Test Mission - Material Gathering" },
      include: {
        participants: {
          include: {
            user: { include: { profile: true } }
          }
        }
      }
    });

    if (!mission) {
      console.log('❌ Mission not found');
      return;
    }

    console.log(`🔍 Debugging mission: ${mission.name}`);
    console.log(`Status: ${mission.status}`);
    console.log(`Created: ${mission.createdAt}`);
    console.log(`Completed: ${mission.completedAt}`);
    
    console.log('\n📊 Raw globalRequirements from DB:');
    console.log(JSON.stringify(mission.globalRequirements, null, 2));
    
    console.log('\n📊 Raw globalProgress from DB:');
    console.log(JSON.stringify(mission.globalProgress, null, 2));
    
    console.log('\n👥 Participants:');
    mission.participants.forEach(p => {
      console.log(`- ${p.user.profile?.display}: ${JSON.stringify(p.contribution)}`);
    });

    // Test the completion logic with the actual data
    const requirements = mission.globalRequirements as any;
    const progress = mission.globalProgress as any;
    
    console.log('\n🧪 Testing completion logic with actual data:');
    console.log(`Requirements type: ${typeof requirements}`);
    console.log(`Progress type: ${typeof progress}`);
    
    if (requirements?.items) {
      console.log('\n🔍 Item-by-item check:');
      for (const [itemKey, required] of Object.entries(requirements.items)) {
        const current = progress?.items?.[itemKey] || 0;
        console.log(`  ${itemKey}: ${current} / ${required} (${current >= required ? '✅' : '❌'})`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMissionData();