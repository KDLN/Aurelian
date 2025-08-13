import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateEquipment() {
  console.log('Populating equipment data...');

  // Equipment definitions
  const equipmentData = [
    // Weapons
    { itemKey: 'rusty_blade', name: 'Rusty Blade', description: 'A worn but functional blade for protection', slot: 'WEAPON', rarity: 'COMMON', successBonus: 2, speedBonus: 0, rewardBonus: 0, minLevel: 1, agentType: null },
    { itemKey: 'steel_sword', name: 'Steel Sword', description: 'A well-crafted steel blade', slot: 'WEAPON', rarity: 'UNCOMMON', successBonus: 5, speedBonus: 0, rewardBonus: 0, minLevel: 3, agentType: null },
    { itemKey: 'guard_halberd', name: 'Guard Halberd', description: 'Heavy weapon favored by guards', slot: 'WEAPON', rarity: 'UNCOMMON', successBonus: 8, speedBonus: -2, rewardBonus: 0, minLevel: 5, agentType: 'GUARD' },
    { itemKey: 'scout_dagger', name: 'Scout Dagger', description: 'Light, swift blade for quick strikes', slot: 'WEAPON', rarity: 'UNCOMMON', successBonus: 3, speedBonus: 5, rewardBonus: 0, minLevel: 4, agentType: 'SCOUT' },
    { itemKey: 'enchanted_blade', name: 'Enchanted Blade', description: 'A magical weapon humming with power', slot: 'WEAPON', rarity: 'RARE', successBonus: 10, speedBonus: 3, rewardBonus: 5, minLevel: 8, agentType: null },

    // Armor
    { itemKey: 'leather_vest', name: 'Leather Vest', description: 'Basic protection from the elements', slot: 'ARMOR', rarity: 'COMMON', successBonus: 3, speedBonus: 0, rewardBonus: 0, minLevel: 1, agentType: null },
    { itemKey: 'chain_mail', name: 'Chain Mail', description: 'Flexible metal protection', slot: 'ARMOR', rarity: 'UNCOMMON', successBonus: 6, speedBonus: -1, rewardBonus: 0, minLevel: 4, agentType: null },
    { itemKey: 'plate_armor', name: 'Plate Armor', description: 'Heavy protection for guards', slot: 'ARMOR', rarity: 'UNCOMMON', successBonus: 10, speedBonus: -3, rewardBonus: 0, minLevel: 6, agentType: 'GUARD' },
    { itemKey: 'scout_cloak', name: 'Scout Cloak', description: 'Light cloak for stealth and speed', slot: 'ARMOR', rarity: 'UNCOMMON', successBonus: 2, speedBonus: 8, rewardBonus: 0, minLevel: 5, agentType: 'SCOUT' },
    { itemKey: 'enchanted_robes', name: 'Enchanted Robes', description: 'Magical robes that enhance abilities', slot: 'ARMOR', rarity: 'RARE', successBonus: 5, speedBonus: 2, rewardBonus: 8, minLevel: 7, agentType: 'SPECIALIST' },

    // Tools
    { itemKey: 'basic_compass', name: 'Basic Compass', description: 'Simple navigation tool', slot: 'TOOL', rarity: 'COMMON', successBonus: 1, speedBonus: 3, rewardBonus: 0, minLevel: 1, agentType: null },
    { itemKey: 'trade_ledger', name: 'Trade Ledger', description: 'Helps track profitable opportunities', slot: 'TOOL', rarity: 'COMMON', successBonus: 0, speedBonus: 0, rewardBonus: 5, minLevel: 2, agentType: 'TRADER' },
    { itemKey: 'master_compass', name: 'Master Compass', description: 'Precise navigation instrument', slot: 'TOOL', rarity: 'UNCOMMON', successBonus: 3, speedBonus: 8, rewardBonus: 0, minLevel: 5, agentType: null },
    { itemKey: 'lockpicks', name: 'Lockpicks', description: 'Tools for accessing secured areas', slot: 'TOOL', rarity: 'UNCOMMON', successBonus: 5, speedBonus: 2, rewardBonus: 3, minLevel: 4, agentType: 'SCOUT' },
    { itemKey: 'negotiation_manual', name: 'Negotiation Manual', description: 'Guide to successful trading', slot: 'TOOL', rarity: 'RARE', successBonus: 0, speedBonus: 0, rewardBonus: 15, minLevel: 6, agentType: 'TRADER' },

    // Accessories
    { itemKey: 'lucky_charm', name: 'Lucky Charm', description: 'A simple trinket that brings fortune', slot: 'ACCESSORY', rarity: 'COMMON', successBonus: 2, speedBonus: 1, rewardBonus: 1, minLevel: 1, agentType: null },
    { itemKey: 'silver_ring', name: 'Silver Ring', description: 'Fine jewelry that commands respect', slot: 'ACCESSORY', rarity: 'UNCOMMON', successBonus: 1, speedBonus: 0, rewardBonus: 6, minLevel: 3, agentType: null },
    { itemKey: 'speed_boots', name: 'Speed Boots', description: 'Magical boots that enhance movement', slot: 'ACCESSORY', rarity: 'UNCOMMON', successBonus: 0, speedBonus: 10, rewardBonus: 0, minLevel: 4, agentType: 'SCOUT' },
    { itemKey: 'merchant_seal', name: 'Merchant Seal', description: 'Official seal for better trade deals', slot: 'ACCESSORY', rarity: 'UNCOMMON', successBonus: 2, speedBonus: 0, rewardBonus: 10, minLevel: 5, agentType: 'TRADER' },
    { itemKey: 'guardian_amulet', name: 'Guardian Amulet', description: 'Protective charm against danger', slot: 'ACCESSORY', rarity: 'RARE', successBonus: 8, speedBonus: 0, rewardBonus: 0, minLevel: 6, agentType: 'GUARD' },
    { itemKey: 'masters_insignia', name: "Master's Insignia", description: 'Symbol of expertise and authority', slot: 'ACCESSORY', rarity: 'EPIC', successBonus: 5, speedBonus: 5, rewardBonus: 10, minLevel: 10, agentType: null },
  ];

  // Insert equipment definitions
  for (const equipment of equipmentData) {
    await prisma.equipmentDef.upsert({
      where: { itemKey: equipment.itemKey },
      update: equipment,
      create: equipment,
    });
    console.log(`✅ Added equipment: ${equipment.name}`);
  }

  // Create corresponding ItemDef entries for equipment
  for (const equipment of equipmentData) {
    await prisma.itemDef.upsert({
      where: { key: equipment.itemKey },
      update: {
        name: equipment.name,
        rarity: equipment.rarity as any,
        stack: 1, // Equipment doesn't stack
        meta: {
          equipmentSlot: equipment.slot,
          isEquipment: true,
        },
      },
      create: {
        key: equipment.itemKey,
        name: equipment.name,
        rarity: equipment.rarity as any,
        stack: 1, // Equipment doesn't stack
        meta: {
          equipmentSlot: equipment.slot,
          isEquipment: true,
        },
      },
    });
    console.log(`✅ Added ItemDef: ${equipment.name}`);
  }

  console.log('✨ Equipment population complete!');
}

populateEquipment()
  .catch((e) => {
    console.error('❌ Error populating equipment:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });