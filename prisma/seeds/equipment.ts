import { PrismaClient, AgentType, EquipmentSlot, ItemRarity } from '@prisma/client';

const prisma = new PrismaClient();

export const equipmentSeed = [
  // WEAPONS
  {
    itemKey: 'rusty_sword',
    name: 'Rusty Sword',
    description: 'A worn blade that has seen better days',
    slot: EquipmentSlot.WEAPON,
    rarity: ItemRarity.COMMON,
    successBonus: 5,
    speedBonus: 0,
    rewardBonus: 0,
    minLevel: 1,
    agentType: AgentType.GUARD,
  },
  {
    itemKey: 'steel_blade',
    name: 'Steel Blade',
    description: 'A reliable weapon for experienced guards',
    slot: EquipmentSlot.WEAPON,
    rarity: ItemRarity.UNCOMMON,
    successBonus: 12,
    speedBonus: 0,
    rewardBonus: 0,
    minLevel: 3,
    agentType: AgentType.GUARD,
  },
  {
    itemKey: 'merchant_knife',
    name: 'Merchant\'s Knife',
    description: 'A sharp tool for negotiations',
    slot: EquipmentSlot.WEAPON,
    rarity: ItemRarity.COMMON,
    successBonus: 3,
    speedBonus: 0,
    rewardBonus: 8,
    minLevel: 1,
    agentType: AgentType.TRADER,
  },

  // ARMOR
  {
    itemKey: 'leather_vest',
    name: 'Leather Vest',
    description: 'Basic protection for the road',
    slot: EquipmentSlot.ARMOR,
    rarity: ItemRarity.COMMON,
    successBonus: 3,
    speedBonus: 0,
    rewardBonus: 0,
    minLevel: 1,
    agentType: null, // Any agent can use
  },
  {
    itemKey: 'chainmail',
    name: 'Chainmail Armor',
    description: 'Sturdy protection against bandits',
    slot: EquipmentSlot.ARMOR,
    rarity: ItemRarity.UNCOMMON,
    successBonus: 8,
    speedBonus: -2, // Heavier armor slows down
    rewardBonus: 0,
    minLevel: 2,
    agentType: AgentType.GUARD,
  },
  {
    itemKey: 'scout_cloak',
    name: 'Scout\'s Cloak',
    description: 'Light protection that doesn\'t hinder movement',
    slot: EquipmentSlot.ARMOR,
    rarity: ItemRarity.COMMON,
    successBonus: 2,
    speedBonus: 5,
    rewardBonus: 0,
    minLevel: 1,
    agentType: AgentType.SCOUT,
  },

  // TOOLS
  {
    itemKey: 'basic_compass',
    name: 'Basic Compass',
    description: 'Helps navigate unfamiliar routes',
    slot: EquipmentSlot.TOOL,
    rarity: ItemRarity.COMMON,
    successBonus: 0,
    speedBonus: 8,
    rewardBonus: 0,
    minLevel: 1,
    agentType: AgentType.SCOUT,
  },
  {
    itemKey: 'lockpicks',
    name: 'Lockpicks',
    description: 'Useful for accessing restricted areas',
    slot: EquipmentSlot.TOOL,
    rarity: ItemRarity.UNCOMMON,
    successBonus: 10,
    speedBonus: 0,
    rewardBonus: 5,
    minLevel: 2,
    agentType: AgentType.SPECIALIST,
  },
  {
    itemKey: 'trade_ledger',
    name: 'Trade Ledger',
    description: 'Helps track profitable opportunities',
    slot: EquipmentSlot.TOOL,
    rarity: ItemRarity.COMMON,
    successBonus: 0,
    speedBonus: 0,
    rewardBonus: 12,
    minLevel: 1,
    agentType: AgentType.TRADER,
  },

  // ACCESSORIES
  {
    itemKey: 'lucky_charm',
    name: 'Lucky Charm',
    description: 'A trinket that brings good fortune',
    slot: EquipmentSlot.ACCESSORY,
    rarity: ItemRarity.COMMON,
    successBonus: 5,
    speedBonus: 0,
    rewardBonus: 5,
    minLevel: 1,
    agentType: null, // Any agent can use
  },
  {
    itemKey: 'guild_signet',
    name: 'Guild Signet Ring',
    description: 'Shows affiliation with a prestigious guild',
    slot: EquipmentSlot.ACCESSORY,
    rarity: ItemRarity.RARE,
    successBonus: 8,
    speedBonus: 3,
    rewardBonus: 15,
    minLevel: 5,
    agentType: null, // Any agent can use
  },
  {
    itemKey: 'speed_boots',
    name: 'Swift Boots',
    description: 'Enchanted footwear for faster travel',
    slot: EquipmentSlot.ACCESSORY,
    rarity: ItemRarity.UNCOMMON,
    successBonus: 0,
    speedBonus: 15,
    rewardBonus: 0,
    minLevel: 3,
    agentType: AgentType.SCOUT,
  },
];

export async function seedEquipment() {
  console.log('Seeding equipment...');
  
  for (const equipment of equipmentSeed) {
    await prisma.equipmentDef.upsert({
      where: { itemKey: equipment.itemKey },
      update: equipment,
      create: equipment,
    });
  }
  
  console.log('Equipment seeded successfully!');
}