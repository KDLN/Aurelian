import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const supabase = createClient(
  'https://apoboundupzmulkqxkxw.supabase.co',
  'sb_service_role_key_here' // We'll need the service role key for this
);

const prisma = new PrismaClient();

async function syncAuthUsers() {
  try {
    console.log('Fetching authenticated users from Supabase Auth...');
    
    // This requires service role key to access auth admin API
    const { data: authUsers, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    console.log(`Found ${authUsers.users.length} authenticated users`);

    for (const authUser of authUsers.users) {
      console.log(`Syncing user: ${authUser.id} (${authUser.email})`);
      
      // Create user in our database
      await prisma.user.upsert({
        where: { id: authUser.id },
        update: {
          email: authUser.email,
          updatedAt: new Date()
        },
        create: {
          id: authUser.id,
          email: authUser.email || 'unknown@example.com',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create profile
      await prisma.profile.upsert({
        where: { userId: authUser.id },
        update: {
          display: authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'Anonymous'
        },
        create: {
          userId: authUser.id,
          display: authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'Anonymous',
          level: 1,
          exp: 0
        }
      });

      // Add test inventory and wallet
      await addInventoryForUser(authUser.id);
    }

    console.log('User sync completed!');
  } catch (error) {
    console.error('Sync error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function addInventoryForUser(userId) {
  console.log(`Adding test inventory for user: ${userId}`);

  // Create/update wallet
  await prisma.wallet.upsert({
    where: { userId },
    update: { gold: 1000 },
    create: {
      userId,
      gold: 1000
    }
  });

  // Get available items
  const items = await prisma.itemDef.findMany();
  
  // Add inventory for each item
  for (const item of items) {
    await prisma.inventory.upsert({
      where: {
        userId_itemId_location: {
          userId,
          itemId: item.id,
          location: 'warehouse'
        }
      },
      update: { qty: 100 },
      create: {
        userId,
        itemId: item.id,
        qty: 100,
        location: 'warehouse'
      }
    });
  }
  
  console.log(`Added test inventory for ${userId}: 100 of each item + 1000 gold`);
}

syncAuthUsers();