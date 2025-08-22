import { PrismaClient } from '@prisma/client';

export interface StarterItem {
  key: string;
  qty: number;
}

const STARTER_ITEMS: StarterItem[] = [
  { key: 'iron_ore', qty: 10 },
  { key: 'herb', qty: 8 },
  { key: 'hide', qty: 6 },
  { key: 'healing_tonic', qty: 3 },
  { key: 'leather_vest', qty: 1 },
  { key: 'rusty_sword', qty: 1 },
  { key: 'basic_compass', qty: 1 },
];

const STARTING_GOLD = 500;

export async function createStarterPackage(userId: string, prisma?: PrismaClient) {
  const db = prisma || new PrismaClient();
  const shouldDisconnect = !prisma;

  try {
    console.log(`Creating starter package for user: ${userId}`);

    // Ensure user has a wallet with starting gold
    await db.wallet.upsert({
      where: { userId },
      update: {}, // Don't overwrite existing wallet
      create: {
        userId,
        gold: STARTING_GOLD,
      },
    });

    // Add starter items to warehouse
    for (const starterItem of STARTER_ITEMS) {
      const itemDef = await db.itemDef.findUnique({
        where: { key: starterItem.key }
      });

      if (itemDef) {
        // Check if user already has this item in warehouse
        const existingInventory = await db.inventory.findFirst({
          where: {
            userId,
            itemId: itemDef.id,
            location: 'warehouse'
          }
        });

        if (existingInventory) {
          // Add to existing stack
          await db.inventory.update({
            where: { id: existingInventory.id },
            data: {
              qty: existingInventory.qty + starterItem.qty
            }
          });
          console.log(`Added ${starterItem.qty} ${starterItem.key} to existing inventory`);
        } else {
          // Create new inventory item
          await db.inventory.create({
            data: {
              userId,
              itemId: itemDef.id,
              qty: starterItem.qty,
              location: 'warehouse'
            }
          });
          console.log(`Created ${starterItem.qty} ${starterItem.key} in warehouse`);
        }
      } else {
        console.warn(`Item ${starterItem.key} not found in database`);
      }
    }

    // Unlock starter blueprints for the user
    const starterBlueprints = await db.blueprint.findMany({
      where: { starterRecipe: true }
    });

    for (const blueprint of starterBlueprints) {
      await db.blueprintUnlock.upsert({
        where: {
          userId_blueprintId: {
            userId,
            blueprintId: blueprint.id
          }
        },
        update: {},
        create: {
          userId,
          blueprintId: blueprint.id,
          unlockedAt: new Date()
        }
      });
    }

    console.log(`Unlocked ${starterBlueprints.length} starter blueprints`);
    console.log('Starter package created successfully!');

    return {
      success: true,
      itemsAdded: STARTER_ITEMS.length,
      blueprintsUnlocked: starterBlueprints.length,
      goldGranted: STARTING_GOLD
    };

  } catch (error) {
    console.error('Error creating starter package:', error);
    throw error;
  } finally {
    if (shouldDisconnect) {
      await db.$disconnect();
    }
  }
}

export async function hasStarterPackage(userId: string, prisma?: PrismaClient): Promise<boolean> {
  const db = prisma || new PrismaClient();
  const shouldDisconnect = !prisma;

  try {
    // Check if user has any inventory items (indicating they've received starter package)
    const inventoryCount = await db.inventory.count({
      where: { userId, location: 'warehouse' }
    });

    return inventoryCount > 0;
  } catch (error) {
    console.error('Error checking starter package status:', error);
    return false;
  } finally {
    if (shouldDisconnect) {
      await db.$disconnect();
    }
  }
}