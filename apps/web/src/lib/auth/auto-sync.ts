import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Automatically sync Supabase auth user with our database User table
 * This ensures users always have proper records with all required fields
 * Call this in any protected API route after JWT verification
 */
export async function ensureUserSynced(authUser: any) {
  try {
    console.log(`Auto-syncing user: ${authUser.sub || authUser.id} (${authUser.email})`);
    
    const userId = authUser.sub || authUser.id;
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
          gold: 1000
        }
      });

      // Add starting inventory for new users only
      const items = await prisma.itemDef.findMany();
      
      for (const item of items) {
        await prisma.inventory.create({
          data: {
            userId: userId,
            itemId: item.id,
            qty: 50,
            location: 'warehouse'
          }
        });
      }
    }

    return userRecord;
    
  } catch (error) {
    console.error('Auto-sync error for user:', authUser.sub || authUser.id, error);
    // Don't throw - we want the API to still work even if sync fails
    return null;
  } finally {
    await prisma.$disconnect();
  }
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

  // Auto-sync user to our database
  await ensureUserSynced(user);

  return { user, error: null };
}