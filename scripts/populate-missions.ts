import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateMissions() {
  console.log('🚛 Populating mission definitions...');

  try {
    // Get item IDs for mission rewards
    const items = await prisma.itemDef.findMany({
      where: {
        key: {
          in: ['iron_ore', 'herb', 'hide', 'pearl', 'relic_fragment']
        }
      }
    });

    const itemMap = new Map(items.map(item => [item.key, item]));

    const missions = [
      // LOW RISK MISSIONS
      {
        name: 'Village Supply Run',
        description: 'Transport basic goods to nearby village settlements',
        fromHub: 'Capital City',
        toHub: 'Village Clinic',
        distance: 45,
        baseDuration: 120,
        baseReward: 75,
        riskLevel: 'LOW' as const,
        itemRewards: [{ itemKey: 'iron_ore', qty: 2 }, { itemKey: 'herb', qty: 3 }],
        isActive: true
      },
      {
        name: 'Local Market Trade',
        description: 'Quick trade run between nearby market towns',
        fromHub: 'Trading Post',
        toHub: 'Market Square',
        distance: 35,
        baseDuration: 90,
        baseReward: 60,
        riskLevel: 'LOW' as const,
        itemRewards: [{ itemKey: 'hide', qty: 2 }, { itemKey: 'iron_ore', qty: 1 }],
        isActive: true
      },
      {
        name: 'Farm Equipment Delivery',
        description: 'Deliver tools and supplies to agricultural settlements',
        fromHub: 'Industrial District',
        toHub: 'Farming Hamlet',
        distance: 55,
        baseDuration: 150,
        baseReward: 85,
        riskLevel: 'LOW' as const,
        itemRewards: [{ itemKey: 'iron_ore', qty: 3 }, { itemKey: 'herb', qty: 2 }],
        isActive: true
      },
      // MEDIUM RISK MISSIONS
      {
        name: 'Forest Trading Expedition',
        description: 'Navigate through dense forests to trade with woodland settlements',
        fromHub: 'Capital City',
        toHub: 'Forest Outpost',
        distance: 120,
        baseDuration: 240,
        baseReward: 150,
        riskLevel: 'MEDIUM' as const,
        itemRewards: [{ itemKey: 'herb', qty: 5 }, { itemKey: 'hide', qty: 3 }, { itemKey: 'pearl', qty: 1 }],
        isActive: true
      },
      {
        name: 'Mountain Pass Crossing',
        description: 'Cross treacherous mountain passes to reach mining communities',
        fromHub: 'Frontier Town',
        toHub: 'Mining Camp',
        distance: 95,
        baseDuration: 210,
        baseReward: 140,
        riskLevel: 'MEDIUM' as const,
        itemRewards: [{ itemKey: 'iron_ore', qty: 6 }, { itemKey: 'relic_fragment', qty: 1 }],
        isActive: true
      },
      {
        name: 'Tribal Diplomacy Mission',
        description: 'Establish trade relations with indigenous tribal communities',
        fromHub: 'Capital City',
        toHub: 'Tribal Grounds',
        distance: 140,
        baseDuration: 270,
        baseReward: 175,
        riskLevel: 'MEDIUM' as const,
        itemRewards: [{ itemKey: 'hide', qty: 7 }, { itemKey: 'herb', qty: 3 }, { itemKey: 'pearl', qty: 2 }],
        isActive: true
      },
      {
        name: 'Coastal Trading Route',
        description: 'Transport goods along dangerous coastal roads to port towns',
        fromHub: 'Capital City',
        toHub: 'Harbor Town',
        distance: 110,
        baseDuration: 225,
        baseReward: 160,
        riskLevel: 'MEDIUM' as const,
        itemRewards: [{ itemKey: 'pearl', qty: 4 }, { itemKey: 'hide', qty: 2 }],
        isActive: true
      },
      // HIGH RISK MISSIONS
      {
        name: 'Bandit Territory Passage',
        description: 'Navigate through bandit-controlled lands with high-value cargo',
        fromHub: 'Fortress Gate',
        toHub: 'Remote Settlement',
        distance: 200,
        baseDuration: 420,
        baseReward: 300,
        riskLevel: 'HIGH' as const,
        itemRewards: [{ itemKey: 'relic_fragment', qty: 3 }, { itemKey: 'pearl', qty: 5 }, { itemKey: 'iron_ore', qty: 8 }],
        isActive: true
      },
      {
        name: 'Ancient Ruins Expedition',
        description: 'Brave cursed ruins to recover ancient artifacts and treasures',
        fromHub: 'Scholar\'s Tower',
        toHub: 'Ancient Ruins',
        distance: 180,
        baseDuration: 360,
        baseReward: 275,
        riskLevel: 'HIGH' as const,
        itemRewards: [{ itemKey: 'relic_fragment', qty: 5 }, { itemKey: 'pearl', qty: 3 }],
        isActive: true
      },
      {
        name: 'Treasure Island Voyage',
        description: 'Perilous sea voyage to legendary treasure islands',
        fromHub: 'Harbor Town',
        toHub: 'Treasure Island',
        distance: 250,
        baseDuration: 480,
        baseReward: 400,
        riskLevel: 'HIGH' as const,
        itemRewards: [{ itemKey: 'pearl', qty: 8 }, { itemKey: 'relic_fragment', qty: 4 }, { itemKey: 'hide', qty: 5 }],
        isActive: true
      },
      {
        name: 'Void Passage Crossing',
        description: 'Cross the mysterious void passages where reality bends and twists',
        fromHub: 'Mystic Portal',
        toHub: 'Hidden Cove',
        distance: 300,
        baseDuration: 600,
        baseReward: 500,
        riskLevel: 'HIGH' as const,
        itemRewards: [{ itemKey: 'relic_fragment', qty: 7 }, { itemKey: 'pearl', qty: 6 }, { itemKey: 'iron_ore', qty: 10 }],
        isActive: true
      }
    ];

    // Clear existing missions and insert fresh ones
    await prisma.missionDef.deleteMany({});
    console.log('🗑️ Cleared existing missions');

    // Insert missions
    for (const mission of missions) {
      await prisma.missionDef.create({
        data: mission
      });
      console.log(`✅ Added mission: ${mission.name}`);
    }

    console.log(`✨ Successfully populated ${missions.length} missions!`);
    
  } catch (error) {
    console.error('❌ Error populating missions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateMissions();