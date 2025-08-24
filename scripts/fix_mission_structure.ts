import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMissionStructure() {
  try {
    // Update the mission to have flat requirements structure
    const mission = await prisma.serverMission.updateMany({
      where: { name: "Fixed Test Mission - Small Requirements" },
      data: {
        // Flat requirements structure (no nested "items")
        globalRequirements: {
          iron_ore: 50,
          hide: 30,
          herb: 20
        },
        // Flat progress structure 
        globalProgress: {
          iron_ore: 0,
          hide: 0,
          herb: 0
        }
      }
    });

    console.log(`✅ Updated ${mission.count} missions with flat structure`);
    
    // Verify the fix
    const updatedMission = await prisma.serverMission.findFirst({
      where: { name: "Fixed Test Mission - Small Requirements" }
    });
    
    if (updatedMission) {
      console.log('\n📊 Updated Requirements:');
      console.log(JSON.stringify(updatedMission.globalRequirements, null, 2));
      console.log('\n📊 Updated Progress:');
      console.log(JSON.stringify(updatedMission.globalProgress, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissionStructure();