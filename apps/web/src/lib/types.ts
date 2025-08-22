// Local type definitions to avoid Prisma dependencies during build time
// These should match the enums defined in prisma/schema.prisma

export enum AgentType {
  SCOUT = 'SCOUT',
  TRADER = 'TRADER', 
  GUARD = 'GUARD',
  SPECIALIST = 'SPECIALIST'
}

export enum EquipmentSlot {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  TOOL = 'TOOL'
}

export enum MissionRisk {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}