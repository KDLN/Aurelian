import { BaseService } from './base.service';
import { Inventory, ItemDef } from '@prisma/client';

/**
 * Inventory service for item management
 */
export class InventoryService extends BaseService {
  /**
   * Get user's inventory
   */
  async getUserInventory(userId: string, location: string = 'warehouse') {
    return this.db.inventory.findMany({
      where: {
        userId,
        location,
      },
      include: {
        item: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Get specific item in inventory
   */
  async getInventoryItem(userId: string, itemKey: string, location: string = 'warehouse') {
    const itemDef = await this.db.itemDef.findUnique({
      where: { key: itemKey },
    });

    if (!itemDef) return null;

    return this.db.inventory.findUnique({
      where: {
        userId_itemId_location: {
          userId,
          itemId: itemDef.id,
          location,
        },
      },
      include: {
        item: true,
      },
    });
  }

  /**
   * Add items to inventory
   */
  async addItem(
    userId: string,
    itemKey: string,
    quantity: number,
    location: string = 'warehouse'
  ): Promise<Inventory> {
    const itemDef = await this.db.itemDef.findUnique({
      where: { key: itemKey },
    });

    if (!itemDef) {
      throw new Error(`Item ${itemKey} not found`);
    }

    return this.db.inventory.upsert({
      where: {
        userId_itemId_location: {
          userId,
          itemId: itemDef.id,
          location,
        },
      },
      create: {
        userId,
        itemId: itemDef.id,
        qty: quantity,
        location,
      },
      update: {
        qty: { increment: quantity },
      },
    });
  }

  /**
   * Remove items from inventory
   */
  async removeItem(
    userId: string,
    itemKey: string,
    quantity: number,
    location: string = 'warehouse'
  ): Promise<Inventory> {
    const itemDef = await this.db.itemDef.findUnique({
      where: { key: itemKey },
    });

    if (!itemDef) {
      throw new Error(`Item ${itemKey} not found`);
    }

    const currentInventory = await this.db.inventory.findUnique({
      where: {
        userId_itemId_location: {
          userId,
          itemId: itemDef.id,
          location,
        },
      },
    });

    if (!currentInventory || currentInventory.qty < quantity) {
      throw new Error('Insufficient items in inventory');
    }

    return this.db.inventory.update({
      where: {
        userId_itemId_location: {
          userId,
          itemId: itemDef.id,
          location,
        },
      },
      data: {
        qty: { decrement: quantity },
      },
    });
  }

  /**
   * Transfer items between locations
   */
  async transferItems(
    userId: string,
    itemKey: string,
    quantity: number,
    fromLocation: string,
    toLocation: string
  ): Promise<{ from: Inventory; to: Inventory }> {
    return this.transaction(async (tx) => {
      const itemDef = await tx.itemDef.findUnique({
        where: { key: itemKey },
      });

      if (!itemDef) {
        throw new Error(`Item ${itemKey} not found`);
      }

      // Check source has enough items
      const sourceInventory = await tx.inventory.findUnique({
        where: {
          userId_itemId_location: {
            userId,
            itemId: itemDef.id,
            location: fromLocation,
          },
        },
      });

      if (!sourceInventory || sourceInventory.qty < quantity) {
        throw new Error('Insufficient items in source location');
      }

      // Remove from source
      const from = await tx.inventory.update({
        where: {
          userId_itemId_location: {
            userId,
            itemId: itemDef.id,
            location: fromLocation,
          },
        },
        data: {
          qty: { decrement: quantity },
        },
      });

      // Add to destination
      const to = await tx.inventory.upsert({
        where: {
          userId_itemId_location: {
            userId,
            itemId: itemDef.id,
            location: toLocation,
          },
        },
        create: {
          userId,
          itemId: itemDef.id,
          qty: quantity,
          location: toLocation,
        },
        update: {
          qty: { increment: quantity },
        },
      });

      return { from, to };
    });
  }

  /**
   * Get item definition by key
   */
  async getItemDef(itemKey: string): Promise<ItemDef | null> {
    return this.db.itemDef.findUnique({
      where: { key: itemKey },
    });
  }

  /**
   * Get all item definitions
   */
  async getAllItemDefs(): Promise<ItemDef[]> {
    return this.db.itemDef.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Check if user has enough items
   */
  async hasEnoughItems(
    userId: string,
    itemKey: string,
    quantity: number,
    location: string = 'warehouse'
  ): Promise<boolean> {
    const inventory = await this.getInventoryItem(userId, itemKey, location);
    return inventory ? inventory.qty >= quantity : false;
  }
}
