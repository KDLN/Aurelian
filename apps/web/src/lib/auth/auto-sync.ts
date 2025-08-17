import { prisma } from '@/lib/prisma';

// Cache to avoid redundant sync operations
const syncedUsers = new Set<string>();
const SYNC_CACHE_TTL = 300000; // 5 minutes

/**
 * Add starter items to new user's inventory
 * - 5 herbs
 * - 2 iron ore
 */
async function addStarterItems(userId: string) {
  try {
    // Ensure required items exist in database
    const requiredItems = [
      { key: 'herb', name: 'Herb', rarity: 'COMMON' },
      { key: 'iron_ore', name: 'Iron Ore', rarity: 'COMMON' }
    ];

    // Upsert item definitions (create if not exists)
    for (const itemDef of requiredItems) {
      await prisma.itemDef.upsert({
        where: { key: itemDef.key },
        update: {}, // Don't update existing items
        create: {
          key: itemDef.key,
          name: itemDef.name,
          rarity: itemDef.rarity as any
        }
      });
    }

    // Get the item IDs
    const herbItem = await prisma.itemDef.findUnique({ where: { key: 'herb' } });
    const ironItem = await prisma.itemDef.findUnique({ where: { key: 'iron_ore' } });

    if (!herbItem || !ironItem) {
      console.error('Could not find required starter items');
      return;
    }

    // Add starter inventory
    const starterItems = [
      { itemId: herbItem.id, qty: 5, location: 'warehouse' },
      { itemId: ironItem.id, qty: 2, location: 'warehouse' }
    ];

    for (const item of starterItems) {
      await prisma.inventory.create({
        data: {
          userId: userId,
          itemId: item.itemId,
          qty: item.qty,
          location: item.location
        }
      });
    }

    console.log(`✅ Added starter items to user ${userId}: 5 herbs, 2 iron ore`);
  } catch (error) {
    console.error('Error adding starter items:', error);
    // Don't throw - we want signup to succeed even if starter items fail
  }
}

/**
 * Automatically sync Supabase auth user with our database User table
 * This ensures users always have proper records with all required fields
 * Only syncs if user hasn't been synced recently (5 min cache)
 */
export async function ensureUserSynced(authUser: any) {
  const userId = authUser.sub || authUser.id;
  
  // Skip if user was recently synced
  if (syncedUsers.has(userId)) {
    return;
  }
  
  try {
    console.log(`Auto-syncing user: ${userId} (${authUser.email})`);
    
    const email = authUser.email;
    
    // Upsert user with all current system defaults
    const userRecord = await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: email,
        updatedAt: new Date(),
        // Ensure fields exist with defaults if they were somehow missing
        caravanSlotsUnlocked: { set: undefined }, // Don't override existing values
        caravanSlotsPremium: { set: undefined },
        craftingLevel: { set: undefined },
        craftingXP: { set: undefined },
        craftingXPNext: { set: undefined }
      },
      create: {
        id: userId,
        email: email || 'unknown@example.com',
        // Caravan system defaults
        caravanSlotsUnlocked: 3,
        caravanSlotsPremium: 0,
        // Crafting system defaults  
        craftingLevel: 1,
        craftingXP: 0,
        craftingXPNext: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Only create profile if it doesn't exist (don't override existing)
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: userId }
    });

    if (!existingProfile) {
      await prisma.profile.create({
        data: {
          userId: userId,
          display: email?.split('@')[0] || 'Anonymous'
        }
      });
    }

    // Only create wallet if it doesn't exist (don't override existing gold)
    const existingWallet = await prisma.wallet.findUnique({
      where: { userId: userId }
    });

    if (!existingWallet) {
      await prisma.wallet.create({
        data: {
          userId: userId,
          gold: 500  // Starter gold
        }
      });

      // Add starter items for new users only
      await addStarterItems(userId);
    }

    // Cache user as synced for 5 minutes
    syncedUsers.add(userId);
    setTimeout(() => {
      syncedUsers.delete(userId);
    }, SYNC_CACHE_TTL);

    return userRecord;
    
  } catch (error) {
    console.error('Auto-sync error for user:', userId, error);
    // Don't throw - we want the API to still work even if sync fails
    return null;
  }
}

/**
 * Check if user exists in database (fast check)
 */
export async function userExists(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });
    return !!user;
  } catch (error) {
    console.error('User exists check failed:', error);
    return false;
  }
}

/**
 * Optimized sync that only runs if user doesn't exist in database
 */
export async function ensureUserExistsOptimized(authUser: any) {
  const userId = authUser.sub || authUser.id;
  
  // Skip if user was recently synced
  if (syncedUsers.has(userId)) {
    return;
  }

  // Fast check if user exists before attempting sync
  const exists = await userExists(userId);
  if (exists) {
    // Cache that we checked this user
    syncedUsers.add(userId);
    setTimeout(() => {
      syncedUsers.delete(userId);
    }, SYNC_CACHE_TTL);
    return;
  }

  // User doesn't exist, do full sync
  await ensureUserSynced(authUser);
}

/**
 * Wrapper function that combines JWT verification with user sync
 * Use this in all protected API routes
 */
export async function verifyAndSyncUser(token: string, supabase: any) {
  // Verify token with Supabase
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return { user: null, error: 'Invalid token' };
  }

  // Optimized sync - only if user doesn't exist
  await ensureUserExistsOptimized(user);

  return { user, error: null };
}