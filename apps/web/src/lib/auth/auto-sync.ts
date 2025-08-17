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
    // Validate userId is a proper UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('Invalid userId format for starter items:', userId);
      return;
    }

    // Verify user exists before creating inventory
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      console.error('User not found when adding starter items:', userId);
      return;
    }

    // Get existing item definitions (they should already exist)
    const [herbItem, ironItem] = await Promise.all([
      prisma.itemDef.findUnique({ where: { key: 'herb' } }),
      prisma.itemDef.findUnique({ where: { key: 'iron_ore' } })
    ]);

    if (!herbItem || !ironItem) {
      console.error('Required starter items not found in database');
      console.error('Herb item exists:', !!herbItem);
      console.error('Iron item exists:', !!ironItem);
      return;
    }

    // Check if user already has these items to avoid duplicates
    const existingInventory = await prisma.inventory.findMany({
      where: {
        userId: userId,
        itemId: { in: [herbItem.id, ironItem.id] },
        location: 'warehouse'
      }
    });

    if (existingInventory.length > 0) {
      console.log(`User ${userId} already has starter items, skipping`);
      return;
    }

    // Add starter inventory in a single transaction
    await prisma.$transaction(async (tx) => {
      // Create herb inventory
      await tx.inventory.create({
        data: {
          userId: userId,
          itemId: herbItem.id,
          qty: 5,
          location: 'warehouse'
        }
      });

      // Create iron ore inventory  
      await tx.inventory.create({
        data: {
          userId: userId,
          itemId: ironItem.id,
          qty: 2,
          location: 'warehouse'
        }
      });
    });

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
        updatedAt: new Date()
        // Don't override existing caravan/crafting values for existing users
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