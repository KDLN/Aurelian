import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestMission() {
  try {
    // Create a new active server mission for testing
    const mission = await prisma.serverMission.create({
      data: {
        name: "Test Mission - Material Gathering",
        description: "Help gather materials for the upcoming expansion! This is a test mission to verify the accumulative contribution system.",
        type: "resource_collection",
        globalRequirements: {
          iron_ore: 1000,
          herb: 500,
          hide: 750,
          pearl: 100
        },
        globalProgress: {
          iron_ore: 0,
          herb: 0, 
          hide: 0,
          pearl: 0
        },
        rewards: {
          tiers: {
            bronze: { gold: 500, items: [{ itemKey: "healing_tonic", quantity: 5 }] },
            silver: { gold: 1500, items: [{ itemKey: "healing_tonic", quantity: 15 }, { itemKey: "steel_bar", quantity: 3 }] },
            gold: { gold: 3000, items: [{ itemKey: "enchanted_satchel", quantity: 1 }, { itemKey: "steel_bar", quantity: 10 }] },
            legendary: { gold: 10000, items: [{ itemKey: "beacon_crystal", quantity: 1 }, { itemKey: "enchanted_satchel", quantity: 3 }] }
          },
          serverWide: {
            tradeBonus: 25,
            xpBonus: 50,
            duration: 48,
            rareSpawns: true
          }
        },
        tiers: {
          bronze: 0.25,   // 25% of personal requirement
          silver: 0.75,   // 75% of personal requirement  
          gold: 1.25,     // 125% of personal requirement
          legendary: 2.0  // 200% of personal requirement
        },
        status: "active",
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      }
    });

    console.log(`✅ Created new test mission: "${mission.name}"`);
    console.log(`   ID: ${mission.id}`);
    console.log(`   Status: ${mission.status}`);
    console.log(`   Requirements: Iron Ore (1000), Herb (500), Hide (750), Pearl (100)`);
    console.log(`   Ends: ${mission.endsAt.toISOString()}`);
    console.log(`\n🎯 You can now test contributing small amounts to see the accumulative system!`);

  } catch (error) {
    console.error('❌ Error creating test mission:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestMission();