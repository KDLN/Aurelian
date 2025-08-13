import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateBlueprints() {
  console.log('⚒️ Populating crafting blueprints...');

  try {
    // Get all items for blueprint creation
    const items = await prisma.itemDef.findMany();
    const itemMap = new Map(items.map(item => [item.key, item]));

    const blueprints = [
      // Basic Processing Recipes
      {
        key: 'smelt_iron_ingot',
        outputQty: 1,
        inputs: [{ itemId: itemMap.get('iron_ore')?.id || '', qty: 2 }],
        timeMin: 5,
        category: 'processing',
        requiredLevel: 1,
        xpReward: 10,
        starterRecipe: true,
        discoverable: false,
        description: 'Smelt iron ore into refined iron ingots for crafting.'
      },
      {
        key: 'cure_leather_roll',
        outputQty: 1,
        inputs: [{ itemId: itemMap.get('hide')!.id, qty: 3 }],
        timeMin: 8,
        category: 'processing',
        requiredLevel: 1,
        xpReward: 12,
        starterRecipe: true,
        discoverable: false,
        description: 'Process raw hides into flexible leather rolls.'
      },
      {
        key: 'brew_healing_tonic',
        outputQty: 1,
        inputs: [{ itemId: itemMap.get('herb')!.id, qty: 4 }],
        timeMin: 6,
        category: 'alchemy',
        requiredLevel: 1,
        xpReward: 15,
        starterRecipe: true,
        discoverable: false,
        description: 'Brew herbs into potent healing tonics.'
      },
      
      // Advanced Processing
      {
        key: 'forge_steel_bar',
        outputQty: 1,
        inputs: [
          { itemId: itemMap.get('iron_ingot')!.id, qty: 2 },
          { itemId: itemMap.get('iron_ore')!.id, qty: 1 }
        ],
        timeMin: 12,
        category: 'processing',
        requiredLevel: 3,
        xpReward: 25,
        starterRecipe: false,
        discoverable: true,
        description: 'Combine iron ingots with ore to create superior steel bars.'
      },
      {
        key: 'craft_enchanted_leather',
        outputQty: 1,
        inputs: [
          { itemId: itemMap.get('leather_roll')!.id, qty: 2 },
          { itemId: itemMap.get('healing_tonic')!.id, qty: 1 }
        ],
        timeMin: 15,
        category: 'enchanting',
        requiredLevel: 4,
        xpReward: 30,
        starterRecipe: false,
        discoverable: true,
        description: 'Infuse leather with healing properties for magical equipment.'
      },
      {
        key: 'distill_essence',
        outputQty: 1,
        inputs: [
          { itemId: itemMap.get('healing_tonic')!.id, qty: 3 },
          { itemId: itemMap.get('herb')!.id, qty: 5 }
        ],
        timeMin: 20,
        category: 'alchemy',
        requiredLevel: 5,
        xpReward: 40,
        starterRecipe: false,
        discoverable: true,
        description: 'Extract concentrated magical essence from herbs and tonics.'
      },

      // Rare Material Processing
      {
        key: 'grind_pearl_dust',
        outputQty: 2,
        inputs: [{ itemId: itemMap.get('pearl')!.id, qty: 1 }],
        timeMin: 10,
        category: 'processing',
        requiredLevel: 6,
        xpReward: 50,
        starterRecipe: false,
        discoverable: true,
        description: 'Carefully grind pearls into fine dust for enchanting.'
      },

      // Weapon Crafting
      {
        key: 'forge_iron_sword',
        outputQty: 1,
        inputs: [
          { itemId: itemMap.get('iron_ingot')!.id, qty: 3 },
          { itemId: itemMap.get('leather_roll')!.id, qty: 1 }
        ],
        timeMin: 25,
        category: 'weapons',
        requiredLevel: 2,
        xpReward: 35,
        starterRecipe: false,
        discoverable: true,
        description: 'Forge a reliable iron sword with leather grip.'
      },
      {
        key: 'craft_steel_sword',
        outputQty: 1,
        inputs: [
          { itemId: itemMap.get('steel_bar')!.id, qty: 2 },
          { itemId: itemMap.get('leather_roll')!.id, qty: 1 },
          { itemId: itemMap.get('iron_ingot')!.id, qty: 1 }
        ],
        timeMin: 35,
        category: 'weapons',
        requiredLevel: 5,
        xpReward: 60,
        starterRecipe: false,
        discoverable: true,
        description: 'Craft a superior steel sword with expert smithing techniques.'
      },

      // Tools
      {
        key: 'craft_caravan_hammer',
        outputQty: 1,
        inputs: [
          { itemId: itemMap.get('iron_ingot')!.id, qty: 2 },
          { itemId: itemMap.get('hide')!.id, qty: 2 }
        ],
        timeMin: 18,
        category: 'tools',
        requiredLevel: 3,
        xpReward: 25,
        starterRecipe: false,
        discoverable: true,
        description: 'Craft a sturdy hammer for caravan maintenance and repairs.'
      },
      {
        key: 'craft_traders_pick',
        outputQty: 1,
        inputs: [
          { itemId: itemMap.get('steel_bar')!.id, qty: 1 },
          { itemId: itemMap.get('leather_roll')!.id, qty: 1 }
        ],
        timeMin: 22,
        category: 'tools',
        requiredLevel: 4,
        xpReward: 30,
        starterRecipe: false,
        discoverable: true,
        description: 'Craft a specialized pick for prospecting and mining.'
      },

      // Armor & Clothing
      {
        key: 'craft_leather_vest',
        outputQty: 1,
        inputs: [
          { itemId: itemMap.get('leather_roll')!.id, qty: 4 },
          { itemId: itemMap.get('iron_ore')!.id, qty: 2 }
        ],
        timeMin: 30,
        category: 'armor',
        requiredLevel: 2,
        xpReward: 40,
        starterRecipe: false,
        discoverable: true,
        description: 'Craft protective leather vest reinforced with metal studs.'
      },
      {
        key: 'craft_reinforced_vest',
        outputQty: 1,
        inputs: [
          { itemId: itemMap.get('enchanted_leather')!.id, qty: 2 },
          { itemId: itemMap.get('iron_ingot')!.id, qty: 3 }
        ],
        timeMin: 45,
        category: 'armor',
        requiredLevel: 6,
        xpReward: 70,
        starterRecipe: false,
        discoverable: true,
        description: 'Create advanced armor with enchanted leather and iron reinforcement.'
      },
      {
        key: 'sew_traders_cloak',
        outputQty: 1,
        inputs: [
          { itemId: itemMap.get('hide')!.id, qty: 6 },
          { itemId: itemMap.get('herb')!.id, qty: 3 }
        ],
        timeMin: 28,
        category: 'clothing',
        requiredLevel: 3,
        xpReward: 35,
        starterRecipe: false,
        discoverable: true,
        description: 'Sew a weather-resistant cloak for long trading journeys.'
      },

      // Consumables & Potions
      {
        key: 'brew_stamina_brew',
        outputQty: 2,
        inputs: [
          { itemId: itemMap.get('healing_tonic')!.id, qty: 1 },
          { itemId: itemMap.get('herb')!.id, qty: 6 }
        ],
        timeMin: 12,
        category: 'consumables',
        requiredLevel: 2,
        xpReward: 20,
        starterRecipe: false,
        discoverable: true,
        description: 'Brew invigorating potions that restore energy and stamina.'
      },
      {
        key: 'mix_luck_potion',
        outputQty: 1,
        inputs: [
          { itemId: itemMap.get('pearl_dust')!.id, qty: 1 },
          { itemId: itemMap.get('healing_tonic')!.id, qty: 2 }
        ],
        timeMin: 25,
        category: 'consumables',
        requiredLevel: 7,
        xpReward: 60,
        starterRecipe: false,
        discoverable: true,
        description: 'Create a rare potion that enhances fortune and trading luck.'
      },
      {
        key: 'distill_speed_elixir',
        outputQty: 1,
        inputs: [
          { itemId: itemMap.get('concentrated_essence')!.id, qty: 1 },
          { itemId: itemMap.get('pearl_dust')!.id, qty: 2 }
        ],
        timeMin: 40,
        category: 'consumables',
        requiredLevel: 8,
        xpReward: 80,
        starterRecipe: false,
        discoverable: true,
        description: 'Distill a powerful elixir that greatly increases movement speed.'
      },

      // Mystical Items
      {
        key: 'enchant_relic_compass',
        outputQty: 1,
        inputs: [
          { itemId: itemMap.get('relic_fragment')!.id, qty: 3 },
          { itemId: itemMap.get('iron_ingot')!.id, qty: 2 },
          { itemId: itemMap.get('concentrated_essence')!.id, qty: 1 }
        ],
        timeMin: 60,
        category: 'mystical',
        requiredLevel: 9,
        xpReward: 120,
        starterRecipe: false,
        discoverable: true,
        description: 'Create a mystical compass that points toward hidden treasures.'
      },
      {
        key: 'weave_enchanted_satchel',
        outputQty: 1,
        inputs: [
          { itemId: itemMap.get('enchanted_leather')!.id, qty: 3 },
          { itemId: itemMap.get('relic_fragment')!.id, qty: 2 },
          { itemId: itemMap.get('pearl_dust')!.id, qty: 1 }
        ],
        timeMin: 50,
        category: 'mystical',
        requiredLevel: 8,
        xpReward: 100,
        starterRecipe: false,
        discoverable: true,
        description: 'Weave a magical satchel that can carry more than should be possible.'
      },
      {
        key: 'craft_beacon_crystal',
        outputQty: 1,
        inputs: [
          { itemId: itemMap.get('pearl')!.id, qty: 5 },
          { itemId: itemMap.get('relic_fragment')!.id, qty: 4 },
          { itemId: itemMap.get('concentrated_essence')!.id, qty: 2 }
        ],
        timeMin: 90,
        category: 'mystical',
        requiredLevel: 10,
        xpReward: 200,
        starterRecipe: false,
        discoverable: true,
        description: 'Craft a powerful beacon crystal that can guide caravans through any danger.'
      }
    ];

    // Clear existing blueprints and insert fresh ones
    await prisma.blueprint.deleteMany({});
    console.log('🗑️ Cleared existing blueprints');

    // Insert blueprints
    for (const blueprint of blueprints) {
      const outputItem = items.find(item => item.key === blueprint.key.replace(/^(smelt_|cure_|brew_|forge_|craft_|grind_|distill_|sew_|mix_|enchant_|weave_)/, ''));
      
      if (!outputItem) {
        console.log(`⚠️ Skipping ${blueprint.key} - output item not found`);
        continue;
      }

      await prisma.blueprint.create({
        data: {
          key: blueprint.key,
          outputId: outputItem.id,
          outputQty: blueprint.outputQty,
          inputs: blueprint.inputs,
          timeMin: blueprint.timeMin,
          category: blueprint.category,
          requiredLevel: blueprint.requiredLevel,
          xpReward: blueprint.xpReward,
          starterRecipe: blueprint.starterRecipe,
          discoverable: blueprint.discoverable,
          description: blueprint.description
        }
      });
      console.log(`✅ Added blueprint: ${blueprint.key} -> ${outputItem.name}`);
    }

    console.log(`✨ Successfully populated ${blueprints.length} blueprints!`);
    
  } catch (error) {
    console.error('❌ Error populating blueprints:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateBlueprints();