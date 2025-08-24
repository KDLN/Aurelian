import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAndCreateMission() {
  try {
    // Delete old test missions
    await prisma.serverMission.deleteMany({
      where: {
        OR: [
          { name: { contains: "Test Mission" } },
          { name: { contains: "Great Iron Rush" } }
        ]
      }
    });
    console.log('✅ Deleted old test missions');

    // Create a new test mission with smaller requirements and correct structure
    const mission = await prisma.serverMission.create({
      data: {
        name: "Fixed Test Mission - Small Requirements",
        description: "Testing the fixed accumulative contribution system with small requirements.",
        type: "resource_collection",
        
        // Requirements in nested structure
        globalRequirements: {
          items: {
            iron_ore: 50,   // Very small requirement
            hide: 30,
            herb: 20
          }
        },
        
        // Progress in flat structure (matching the fix)
        globalProgress: {
          iron_ore: 0,
          hide: 0,
          herb: 0
        },
        
        rewards: {
          tiers: {
            bronze: { gold: 100 },
            silver: { gold: 250 },
            gold: { gold: 500 },
            legendary: { gold: 1000 }
          }
        },
        
        tiers: {
          bronze: 0.25,    
          silver: 0.75,    
          gold: 1.25,      
          legendary: 2.0   
        },
        
        status: "active",
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    console.log(`✅ Created new fixed test mission: "${mission.name}"`);
    console.log(`   ID: ${mission.id}`);
    console.log(`   Requirements: Iron Ore (50), Hide (30), Herb (20)`);
    console.log(`   Status: ${mission.status}`);
    console.log(`\n🎯 Now test contributing 5-10 items at a time to see accumulation work correctly!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAndCreateMission();