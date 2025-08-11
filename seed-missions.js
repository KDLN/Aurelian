const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const missionDefinitions = [
  {
    name: 'Iron Ore Delivery',
    description: 'Transport iron ore from the eastern mines to the Capital City forges. A safe but essential route for the city\'s blacksmiths.',
    fromHub: 'Mining Camp',
    toHub: 'Capital City',
    distance: 120,
    baseDuration: 240, // 4 minutes
    baseReward: 60,
    riskLevel: 'LOW',
    itemRewards: [{ itemKey: 'iron_ore', qty: 2 }]
  },
  {
    name: 'Herb Collection',
    description: 'Gather rare medicinal herbs from the Whispering Forest. Some bandits patrol the area, but the healers pay well.',
    fromHub: 'Forest Outpost',
    toHub: 'Capital City',
    distance: 180,
    baseDuration: 360, // 6 minutes
    baseReward: 90,
    riskLevel: 'MEDIUM',
    itemRewards: [{ itemKey: 'herb', qty: 3 }]
  },
  {
    name: 'Pearl Diving Expedition',
    description: 'A profitable but dangerous journey to the coastal pearl beds. Pirates and sea monsters make this a high-risk venture.',
    fromHub: 'Harbor Town',
    toHub: 'Coastal Ruins',
    distance: 250,
    baseDuration: 480, // 8 minutes
    baseReward: 150,
    riskLevel: 'HIGH',
    itemRewards: [{ itemKey: 'pearl', qty: 1 }]
  },
  {
    name: 'Hide Trading Run',
    description: 'Purchase animal hides from nomadic tribes and transport them to city leather workers. Moderate risk but steady profit.',
    fromHub: 'Tribal Grounds',
    toHub: 'Capital City',
    distance: 160,
    baseDuration: 300, // 5 minutes
    baseReward: 75,
    riskLevel: 'MEDIUM',
    itemRewards: [{ itemKey: 'hide', qty: 4 }]
  },
  {
    name: 'Relic Recovery',
    description: 'Venture into the Ancient Ruins to recover valuable relic fragments. Extremely dangerous but potentially very rewarding.',
    fromHub: 'Capital City',
    toHub: 'Ancient Ruins',
    distance: 300,
    baseDuration: 600, // 10 minutes
    baseReward: 200,
    riskLevel: 'HIGH',
    itemRewards: [{ itemKey: 'relic_fragment', qty: 1 }]
  },
  {
    name: 'Supply Run',
    description: 'Deliver basic supplies to frontier settlements. Safe route with guaranteed payment upon delivery.',
    fromHub: 'Capital City',
    toHub: 'Frontier Town',
    distance: 100,
    baseDuration: 180, // 3 minutes
    baseReward: 45,
    riskLevel: 'LOW',
    itemRewards: [{ itemKey: 'iron_ore', qty: 1 }]
  },
  {
    name: 'Treasure Hunt',
    description: 'Follow ancient maps to buried treasure sites. High risk of ambush, but the potential rewards justify the danger.',
    fromHub: 'Treasure Island',
    toHub: 'Hidden Cove',
    distance: 280,
    baseDuration: 540, // 9 minutes
    baseReward: 180,
    riskLevel: 'HIGH',
    itemRewards: [{ itemKey: 'pearl', qty: 2 }, { itemKey: 'relic_fragment', qty: 1 }]
  },
  {
    name: 'Medicine Delivery',
    description: 'Rush critical medical supplies to plague-stricken villages. Time is of the essence, but the route is well-protected.',
    fromHub: 'Capital City',
    toHub: 'Village Clinic',
    distance: 90,
    baseDuration: 150, // 2.5 minutes
    baseReward: 40,
    riskLevel: 'LOW',
    itemRewards: [{ itemKey: 'herb', qty: 1 }]
  }
];

async function seedMissions() {
  console.log('Seeding mission definitions...');

  try {
    for (const mission of missionDefinitions) {
      console.log(`Creating mission: ${mission.name}`);
      await prisma.missionDef.create({
        data: mission
      });
    }

    console.log('✅ Successfully seeded mission definitions!');
  } catch (error) {
    console.error('❌ Error seeding missions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMissions();