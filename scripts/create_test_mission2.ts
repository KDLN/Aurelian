import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestMission2() {
  try {
    // Create a new test mission with small requirements for testing
    const mission = await prisma.serverMission.create({
      data: {
        name: "Test Mission 2 - Header Update Test",
        description: "Testing header refresh after contributions. Small requirements for easy testing.",
        type: "resource_collection",
        
        // Requirements in flat structure (matches our fixed format)
        globalRequirements: {
          iron_ore: 25,   // Small requirement for quick testing
          herb: 15,
          hide: 20
        },
        
        // Progress in flat structure 
        globalProgress: {
          iron_ore: 0,
          herb: 0,
          hide: 0
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

    console.log(`✅ Created new test mission: "${mission.name}"`);
    console.log(`   ID: ${mission.id}`);
    console.log(`   Requirements: Iron Ore (25), Herb (15), Hide (20)`);
    console.log(`   Status: ${mission.status}`);
    console.log(`\n🎯 Ready to test header updates! Try contributing small amounts and see if the header refreshes.`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestMission2();