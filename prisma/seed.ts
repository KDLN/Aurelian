import { PrismaClient, ItemRarity } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create base items if they don't exist
  const items = [
    { key: 'iron_ore', name: 'Iron Ore', rarity: ItemRarity.COMMON },
    { key: 'herb', name: 'Herb', rarity: ItemRarity.COMMON },
    { key: 'hide', name: 'Hide', rarity: ItemRarity.COMMON },
    { key: 'pearl', name: 'Pearl', rarity: ItemRarity.UNCOMMON },
    { key: 'relic_fragment', name: 'Relic Fragment', rarity: ItemRarity.RARE },
    { key: 'iron_ingot', name: 'Iron Ingot', rarity: ItemRarity.UNCOMMON },
    { key: 'leather_roll', name: 'Leather Roll', rarity: ItemRarity.UNCOMMON },
    { key: 'healing_tonic', name: 'Healing Tonic', rarity: ItemRarity.UNCOMMON },
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
    {
      key: 'craft_iron_ingot',
      outputKey: 'iron_ingot',
      inputs: [{ itemKey: 'iron_ore', qty: 2 }],
      timeMin: 12,
    },
    {
      key: 'craft_leather_roll',
      outputKey: 'leather_roll',
      inputs: [{ itemKey: 'hide', qty: 2 }],
      timeMin: 12,
    },
    {
      key: 'craft_healing_tonic',
      outputKey: 'healing_tonic',
      inputs: [{ itemKey: 'herb', qty: 2 }],
      timeMin: 12,
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
          timeMin: blueprint.timeMin,
        },
      });
      console.log(`Created/Updated blueprint: ${blueprint.key}`);
    }
  }

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