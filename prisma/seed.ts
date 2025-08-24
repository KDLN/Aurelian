import { PrismaClient, ItemRarity, MissionRisk } from '@prisma/client';
import { seedEquipment } from './seeds/equipment';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create base items if they don't exist
  const items = [
    // Raw Materials
    { key: 'iron_ore', name: 'Iron Ore', rarity: ItemRarity.COMMON },
    { key: 'herb', name: 'Herb', rarity: ItemRarity.COMMON },
    { key: 'hide', name: 'Hide', rarity: ItemRarity.COMMON },
    { key: 'pearl', name: 'Pearl', rarity: ItemRarity.UNCOMMON },
    { key: 'relic_fragment', name: 'Relic Fragment', rarity: ItemRarity.RARE },
    
    // Basic Crafted Materials
    { key: 'iron_ingot', name: 'Iron Ingot', rarity: ItemRarity.UNCOMMON },
    { key: 'leather_roll', name: 'Leather Roll', rarity: ItemRarity.UNCOMMON },
    { key: 'healing_tonic', name: 'Healing Tonic', rarity: ItemRarity.UNCOMMON },
    
    // Advanced Materials
    { key: 'steel_bar', name: 'Steel Bar', rarity: ItemRarity.RARE },
    { key: 'enchanted_leather', name: 'Enchanted Leather', rarity: ItemRarity.RARE },
    { key: 'concentrated_essence', name: 'Concentrated Essence', rarity: ItemRarity.RARE },
    { key: 'pearl_dust', name: 'Pearl Dust', rarity: ItemRarity.RARE },
    
    // Weapons & Tools
    { key: 'iron_sword', name: 'Iron Sword', rarity: ItemRarity.UNCOMMON },
    { key: 'steel_sword', name: 'Steel Sword', rarity: ItemRarity.RARE },
    { key: 'caravan_hammer', name: 'Caravan Hammer', rarity: ItemRarity.UNCOMMON },
    { key: 'traders_pick', name: 'Trader\'s Pick', rarity: ItemRarity.UNCOMMON },
    
    // Armor & Protection
    { key: 'leather_vest', name: 'Leather Vest', rarity: ItemRarity.UNCOMMON },
    { key: 'reinforced_vest', name: 'Reinforced Vest', rarity: ItemRarity.RARE },
    { key: 'traders_cloak', name: 'Trader\'s Cloak', rarity: ItemRarity.RARE },
    
    // Consumables & Potions
    { key: 'stamina_brew', name: 'Stamina Brew', rarity: ItemRarity.UNCOMMON },
    { key: 'merchants_luck', name: 'Merchant\'s Luck Potion', rarity: ItemRarity.RARE },
    { key: 'speed_elixir', name: 'Speed Elixir', rarity: ItemRarity.RARE },
    
    // Mystical Items
    { key: 'relic_compass', name: 'Relic Compass', rarity: ItemRarity.EPIC },
    { key: 'enchanted_satchel', name: 'Enchanted Satchel', rarity: ItemRarity.EPIC },
    { key: 'beacon_crystal', name: 'Beacon Crystal', rarity: ItemRarity.LEGENDARY },
    
    // Equipment Items (for agent gear)
    { key: 'rusty_sword', name: 'Rusty Sword', rarity: ItemRarity.COMMON },
    { key: 'steel_blade', name: 'Steel Blade', rarity: ItemRarity.UNCOMMON },
    { key: 'merchant_knife', name: 'Merchant\'s Knife', rarity: ItemRarity.COMMON },
    { key: 'chainmail', name: 'Chainmail Armor', rarity: ItemRarity.UNCOMMON },
    { key: 'scout_cloak', name: 'Scout\'s Cloak', rarity: ItemRarity.COMMON },
    { key: 'basic_compass', name: 'Basic Compass', rarity: ItemRarity.COMMON },
    { key: 'lockpicks', name: 'Lockpicks', rarity: ItemRarity.UNCOMMON },
    { key: 'trade_ledger', name: 'Trade Ledger', rarity: ItemRarity.COMMON },
    { key: 'lucky_charm', name: 'Lucky Charm', rarity: ItemRarity.COMMON },
    { key: 'guild_signet', name: 'Guild Signet Ring', rarity: ItemRarity.RARE },
    { key: 'speed_boots', name: 'Swift Boots', rarity: ItemRarity.UNCOMMON },
  ];

  for (const item of items) {
    await prisma.itemDef.upsert({
      where: { key: item.key },
      update: {},
      create: item,
    });
    console.log(`Created/Updated item: ${item.name}`);
  }

  // Create blueprints for crafting if they don't exist
  const blueprints = [
    // Basic Material Processing (Level 1, Starter Recipes)
    {
      key: 'craft_iron_ingot',
      outputKey: 'iron_ingot',
      inputs: [{ itemKey: 'iron_ore', qty: 2 }],
      timeMin: 12,
      category: 'materials',
      requiredLevel: 1,
      xpReward: 10,
      starterRecipe: true,
      description: 'Smelt raw iron ore into usable ingots for crafting.'
    },
    {
      key: 'craft_leather_roll',
      outputKey: 'leather_roll',
      inputs: [{ itemKey: 'hide', qty: 2 }],
      timeMin: 12,
      category: 'materials',
      requiredLevel: 1,
      xpReward: 10,
      starterRecipe: true,
      description: 'Process raw hide into flexible leather rolls.'
    },
    {
      key: 'craft_healing_tonic',
      outputKey: 'healing_tonic',
      inputs: [{ itemKey: 'herb', qty: 2 }],
      timeMin: 12,
      category: 'consumables',
      requiredLevel: 1,
      xpReward: 10,
      starterRecipe: true,
      description: 'Brew a basic healing tonic from medicinal herbs.'
    },

    // Advanced Materials (Level 3-5)
    {
      key: 'craft_steel_bar',
      outputKey: 'steel_bar',
      inputs: [{ itemKey: 'iron_ingot', qty: 3 }, { itemKey: 'herb', qty: 1 }],
      timeMin: 25,
      category: 'materials',
      requiredLevel: 3,
      xpReward: 25,
      starterRecipe: false,
      description: 'Forge superior steel using iron and herb extracts as a flux.'
    },
    {
      key: 'craft_pearl_dust',
      outputKey: 'pearl_dust',
      inputs: [{ itemKey: 'pearl', qty: 2 }],
      timeMin: 20,
      category: 'materials',
      requiredLevel: 3,
      xpReward: 20,
      starterRecipe: false,
      description: 'Grind precious pearls into magical dust.'
    },
    {
      key: 'craft_enchanted_leather',
      outputKey: 'enchanted_leather',
      inputs: [{ itemKey: 'leather_roll', qty: 2 }, { itemKey: 'pearl_dust', qty: 1 }],
      timeMin: 30,
      category: 'materials',
      requiredLevel: 4,
      xpReward: 30,
      starterRecipe: false,
      description: 'Infuse leather with pearl dust to create magical leather.'
    },
    {
      key: 'craft_concentrated_essence',
      outputKey: 'concentrated_essence',
      inputs: [{ itemKey: 'herb', qty: 5 }, { itemKey: 'pearl_dust', qty: 1 }],
      timeMin: 35,
      category: 'materials',
      requiredLevel: 5,
      xpReward: 35,
      starterRecipe: false,
      description: 'Distill herbs with pearl dust into potent magical essence.'
    },

    // Weapons & Tools (Level 2-6)
    {
      key: 'craft_iron_sword',
      outputKey: 'iron_sword',
      inputs: [{ itemKey: 'iron_ingot', qty: 3 }, { itemKey: 'leather_roll', qty: 1 }],
      timeMin: 25,
      category: 'weapons',
      requiredLevel: 2,
      xpReward: 20,
      starterRecipe: false,
      description: 'Forge a reliable iron sword with leather grip.'
    },
    {
      key: 'craft_caravan_hammer',
      outputKey: 'caravan_hammer',
      inputs: [{ itemKey: 'iron_ingot', qty: 2 }, { itemKey: 'hide', qty: 1 }],
      timeMin: 20,
      category: 'tools',
      requiredLevel: 2,
      xpReward: 18,
      starterRecipe: false,
      description: 'Craft a sturdy hammer for caravan repairs and construction.'
    },
    {
      key: 'craft_traders_pick',
      outputKey: 'traders_pick',
      inputs: [{ itemKey: 'iron_ingot', qty: 2 }, { itemKey: 'leather_roll', qty: 1 }],
      timeMin: 22,
      category: 'tools',
      requiredLevel: 2,
      xpReward: 18,
      starterRecipe: false,
      description: 'Create a specialized pickaxe for resource gathering.'
    },
    {
      key: 'craft_steel_sword',
      outputKey: 'steel_sword',
      inputs: [{ itemKey: 'steel_bar', qty: 2 }, { itemKey: 'enchanted_leather', qty: 1 }],
      timeMin: 45,
      category: 'weapons',
      requiredLevel: 6,
      xpReward: 50,
      starterRecipe: false,
      description: 'Forge an exceptional steel sword with enchanted grip.'
    },

    // Armor & Protection (Level 2-7)
    {
      key: 'craft_leather_vest',
      outputKey: 'leather_vest',
      inputs: [{ itemKey: 'leather_roll', qty: 3 }, { itemKey: 'iron_ingot', qty: 1 }],
      timeMin: 30,
      category: 'armor',
      requiredLevel: 2,
      xpReward: 25,
      starterRecipe: false,
      description: 'Craft protective leather armor with iron studs.'
    },
    {
      key: 'craft_reinforced_vest',
      outputKey: 'reinforced_vest',
      inputs: [{ itemKey: 'leather_vest', qty: 1 }, { itemKey: 'steel_bar', qty: 1 }],
      timeMin: 40,
      category: 'armor',
      requiredLevel: 5,
      xpReward: 45,
      starterRecipe: false,
      description: 'Reinforce leather armor with steel plates for superior protection.'
    },
    {
      key: 'craft_traders_cloak',
      outputKey: 'traders_cloak',
      inputs: [{ itemKey: 'enchanted_leather', qty: 2 }, { itemKey: 'concentrated_essence', qty: 1 }],
      timeMin: 50,
      category: 'armor',
      requiredLevel: 7,
      xpReward: 60,
      starterRecipe: false,
      description: 'Weave a mystical cloak that enhances trading abilities.'
    },

    // Advanced Consumables (Level 3-8)
    {
      key: 'craft_stamina_brew',
      outputKey: 'stamina_brew',
      inputs: [{ itemKey: 'healing_tonic', qty: 2 }, { itemKey: 'herb', qty: 1 }],
      timeMin: 25,
      category: 'consumables',
      requiredLevel: 3,
      xpReward: 25,
      starterRecipe: false,
      description: 'Brew an energizing potion that restores stamina.'
    },
    {
      key: 'craft_merchants_luck',
      outputKey: 'merchants_luck',
      inputs: [{ itemKey: 'concentrated_essence', qty: 1 }, { itemKey: 'pearl_dust', qty: 2 }],
      timeMin: 40,
      category: 'consumables',
      requiredLevel: 6,
      xpReward: 50,
      starterRecipe: false,
      description: 'Concoct a mystical potion that brings fortune to trades.'
    },
    {
      key: 'craft_speed_elixir',
      outputKey: 'speed_elixir',
      inputs: [{ itemKey: 'stamina_brew', qty: 1 }, { itemKey: 'concentrated_essence', qty: 1 }],
      timeMin: 35,
      category: 'consumables',
      requiredLevel: 8,
      xpReward: 55,
      starterRecipe: false,
      description: 'Distill a powerful elixir that increases movement speed.'
    },

    // Legendary Items (Level 8-10)
    {
      key: 'craft_relic_compass',
      outputKey: 'relic_compass',
      inputs: [{ itemKey: 'relic_fragment', qty: 3 }, { itemKey: 'steel_bar', qty: 2 }, { itemKey: 'pearl_dust', qty: 2 }],
      timeMin: 90,
      category: 'mystical',
      requiredLevel: 8,
      xpReward: 100,
      starterRecipe: false,
      description: 'Forge a mystical compass that reveals hidden trade routes.'
    },
    {
      key: 'craft_enchanted_satchel',
      outputKey: 'enchanted_satchel',
      inputs: [{ itemKey: 'enchanted_leather', qty: 3 }, { itemKey: 'relic_fragment', qty: 2 }, { itemKey: 'concentrated_essence', qty: 2 }],
      timeMin: 75,
      category: 'mystical',
      requiredLevel: 9,
      xpReward: 120,
      starterRecipe: false,
      description: 'Craft a magical bag that can hold more than should be possible.'
    },
    {
      key: 'craft_beacon_crystal',
      outputKey: 'beacon_crystal',
      inputs: [{ itemKey: 'relic_fragment', qty: 5 }, { itemKey: 'concentrated_essence', qty: 3 }, { itemKey: 'pearl_dust', qty: 5 }],
      timeMin: 120,
      category: 'mystical',
      requiredLevel: 10,
      xpReward: 200,
      starterRecipe: false,
      description: 'Channel ancient powers to create the ultimate Beacon Crystal.'
    },
  ];

  for (const blueprint of blueprints) {
    const outputItem = await prisma.itemDef.findUnique({
      where: { key: blueprint.outputKey },
    });

    if (outputItem) {
      // Convert input keys to IDs
      const inputsWithIds = await Promise.all(
        blueprint.inputs.map(async (input) => {
          const item = await prisma.itemDef.findUnique({
            where: { key: input.itemKey },
          });
          return { itemId: item?.id, qty: input.qty };
        })
      );

      await prisma.blueprint.upsert({
        where: { key: blueprint.key },
        update: {},
        create: {
          key: blueprint.key,
          outputId: outputItem.id,
          inputs: inputsWithIds,
          outputQty: 1,
          timeMin: blueprint.timeMin,
          category: blueprint.category || 'general',
          requiredLevel: blueprint.requiredLevel || 1,
          xpReward: blueprint.xpReward || 10,
          discoverable: !blueprint.starterRecipe,
          starterRecipe: blueprint.starterRecipe || false,
          description: blueprint.description,
        },
      });
      console.log(`Created/Updated blueprint: ${blueprint.key}`);
    }
  }

  // Create mission definitions if they don't exist
  const missions = [
    // LOW risk missions (shorter duration, smaller rewards)
    {
      name: 'Herb Gathering Expedition',
      description: 'Send a scout to collect medicinal herbs from the nearby forest.',
      fromHub: 'Home',
      toHub: 'Verdant Grove',
      distance: 80,
      baseDuration: 300, // 5 minutes
      baseReward: 45,
      riskLevel: MissionRisk.LOW,
      itemRewards: [{ itemKey: 'herb', qty: 3 }, { itemKey: 'healing_tonic', qty: 1 }],
    },
    {
      name: 'Iron Ore Survey',
      description: 'Scout the mountain quarries for iron ore deposits.',
      fromHub: 'Home',
      toHub: 'Iron Ridge',
      distance: 100,
      baseDuration: 360, // 6 minutes
      baseReward: 50,
      riskLevel: MissionRisk.LOW,
      itemRewards: [{ itemKey: 'iron_ore', qty: 4 }, { itemKey: 'traders_pick', qty: 1 }],
    },
    {
      name: 'Hide Collection Run',
      description: 'Gather hides from local wildlife traders.',
      fromHub: 'Home',
      toHub: 'Hunters Lodge',
      distance: 75,
      baseDuration: 240, // 4 minutes
      baseReward: 40,
      riskLevel: MissionRisk.LOW,
      itemRewards: [{ itemKey: 'hide', qty: 3 }, { itemKey: 'leather_roll', qty: 1 }],
    },

    // MEDIUM risk missions (moderate duration and rewards)
    {
      name: 'Pearl Diving Expedition',
      description: 'Lead a dangerous diving mission to harvest pearls from the deep waters.',
      fromHub: 'Home',
      toHub: 'Azure Bay',
      distance: 150,
      baseDuration: 600, // 10 minutes
      baseReward: 85,
      riskLevel: MissionRisk.MEDIUM,
      itemRewards: [{ itemKey: 'pearl', qty: 2 }, { itemKey: 'pearl_dust', qty: 1 }],
    },
    {
      name: 'Bandit Route Clearing',
      description: 'Clear bandit camps from important trade routes.',
      fromHub: 'Home',
      toHub: 'Crossroads Fort',
      distance: 180,
      baseDuration: 720, // 12 minutes
      baseReward: 95,
      riskLevel: MissionRisk.MEDIUM,
      itemRewards: [{ itemKey: 'iron_sword', qty: 1 }, { itemKey: 'leather_vest', qty: 1 }],
    },
    {
      name: 'Caravan Escort Mission',
      description: 'Escort a merchant caravan through contested territory.',
      fromHub: 'Home',
      toHub: 'Border Town',
      distance: 200,
      baseDuration: 840, // 14 minutes
      baseReward: 110,
      riskLevel: MissionRisk.MEDIUM,
      itemRewards: [{ itemKey: 'caravan_hammer', qty: 1 }, { itemKey: 'stamina_brew', qty: 2 }],
    },

    // HIGH risk missions (long duration, high rewards)
    {
      name: 'Ancient Relic Recovery',
      description: 'Venture into dangerous ruins to recover ancient relic fragments.',
      fromHub: 'Home',
      toHub: 'Forgotten Ruins',
      distance: 300,
      baseDuration: 1200, // 20 minutes
      baseReward: 180,
      riskLevel: MissionRisk.HIGH,
      itemRewards: [{ itemKey: 'relic_fragment', qty: 2 }, { itemKey: 'concentrated_essence', qty: 1 }],
    },
    {
      name: 'Dragon Territory Survey',
      description: 'A perilous expedition to map dragon territories and collect rare materials.',
      fromHub: 'Home',
      toHub: 'Dragon Peaks',
      distance: 350,
      baseDuration: 1500, // 25 minutes
      baseReward: 250,
      riskLevel: MissionRisk.HIGH,
      itemRewards: [{ itemKey: 'steel_bar', qty: 2 }, { itemKey: 'enchanted_leather', qty: 1 }, { itemKey: 'speed_elixir', qty: 1 }],
    },
    {
      name: 'Deep Dungeon Delve',
      description: 'Explore the deepest levels of ancient dungeons for legendary treasures.',
      fromHub: 'Home',
      toHub: 'Shadowdeep Caverns',
      distance: 400,
      baseDuration: 1800, // 30 minutes
      baseReward: 320,
      riskLevel: MissionRisk.HIGH,
      itemRewards: [{ itemKey: 'relic_compass', qty: 1 }, { itemKey: 'merchants_luck', qty: 2 }],
    },

    // Epic missions (very long, very rewarding)
    {
      name: 'Beacon Crystal Expedition',
      description: 'Lead an epic expedition to secure materials for crafting Beacon Crystals.',
      fromHub: 'Home',
      toHub: 'Crystal Sanctum',
      distance: 500,
      baseDuration: 2400, // 40 minutes
      baseReward: 500,
      riskLevel: MissionRisk.HIGH,
      itemRewards: [{ itemKey: 'beacon_crystal', qty: 1 }, { itemKey: 'enchanted_satchel', qty: 1 }, { itemKey: 'relic_fragment', qty: 3 }],
    }
  ];

  for (const mission of missions) {
    // Convert item reward keys to format expected by database
    const itemRewards = mission.itemRewards ? mission.itemRewards.map(reward => ({
      itemKey: reward.itemKey,
      qty: reward.qty
    })) : null;

    // Check if mission already exists
    const existingMission = await prisma.missionDef.findFirst({
      where: { name: mission.name }
    });

    if (!existingMission) {
      await prisma.missionDef.create({
        data: {
          name: mission.name,
          description: mission.description,
          fromHub: mission.fromHub,
          toHub: mission.toHub,
          distance: mission.distance,
          baseDuration: mission.baseDuration,
          baseReward: mission.baseReward,
          riskLevel: mission.riskLevel,
          itemRewards: itemRewards,
          isActive: true,
        },
      });
      console.log(`Created mission: ${mission.name}`);
    } else {
      console.log(`Mission already exists: ${mission.name}`);
    }
  }

  // Seed equipment definitions
  await seedEquipment();

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });