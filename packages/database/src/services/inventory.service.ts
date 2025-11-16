import { BaseService } from './base.service';
import { Inventory, ItemDef } from '@prisma/client';
import {
  InsufficientItemsError,
  ResourceNotFoundError,
  ValidationError,
} from '../errors';
import { INVENTORY_LIMITS } from '../constants';

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
   * @param userId - User ID
   * @param itemKey - Item key
   * @param quantity - Quantity to add (1 - 999,999)
   * @param location - Inventory location (default: warehouse)
   */
  async addItem(
    userId: string,
    itemKey: string,
    quantity: number,
    location: string = 'warehouse'
  ): Promise<Inventory> {
    // Input validation
    if (quantity < INVENTORY_LIMITS.MIN_QUANTITY) {
      throw new ValidationError('quantity', 'Quantity must be at least 1');
    }
    if (quantity > INVENTORY_LIMITS.MAX_QUANTITY) {
      throw new ValidationError('quantity', `Quantity exceeds maximum (${INVENTORY_LIMITS.MAX_QUANTITY.toLocaleString()})`);
    }

    const itemDef = await this.db.itemDef.findUnique({
      where: { key: itemKey },
    });

    if (!itemDef) {
      throw new ResourceNotFoundError('ItemDef', itemKey);
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
   * @param userId - User ID
   * @param itemKey - Item key
   * @param quantity - Quantity to remove (must be positive)
   * @param location - Inventory location (default: warehouse)
   */
  async removeItem(
    userId: string,
    itemKey: string,
    quantity: number,
    location: string = 'warehouse'
  ): Promise<Inventory> {
    // Input validation
    if (quantity < INVENTORY_LIMITS.MIN_QUANTITY) {
      throw new ValidationError('quantity', 'Quantity must be at least 1');
    }

    const itemDef = await this.db.itemDef.findUnique({
      where: { key: itemKey },
    });

    if (!itemDef) {
      throw new ResourceNotFoundError('ItemDef', itemKey);
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
      throw new InsufficientItemsError(
        userId,
        itemKey,
        quantity,
        currentInventory?.qty ?? 0
      );
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
   * @param userId - User ID
   * @param itemKey - Item key
   * @param quantity - Quantity to transfer (must be positive)
   * @param fromLocation - Source location
   * @param toLocation - Destination location
   */
  async transferItems(
    userId: string,
    itemKey: string,
    quantity: number,
    fromLocation: string,
    toLocation: string
  ): Promise<{ from: Inventory; to: Inventory }> {
    // Input validation
    if (quantity < INVENTORY_LIMITS.MIN_QUANTITY) {
      throw new ValidationError('quantity', 'Quantity must be at least 1');
    }
    if (fromLocation === toLocation) {
      throw new ValidationError('toLocation', 'Cannot transfer to same location');
    }

    return this.transaction(async (tx) => {
      const itemDef = await tx.itemDef.findUnique({
        where: { key: itemKey },
      });

      if (!itemDef) {
        throw new ResourceNotFoundError('ItemDef', itemKey);
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
        throw new InsufficientItemsError(
          userId,
          itemKey,
          quantity,
          sourceInventory?.qty ?? 0
        );
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
