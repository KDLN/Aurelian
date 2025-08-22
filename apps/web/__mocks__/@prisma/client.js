// Comprehensive Prisma Client mock for tests

// Mock Prisma enums that match the schema
export const AgentType = {
  SCOUT: 'SCOUT',
  TRADER: 'TRADER',
  GUARD: 'GUARD',
  SPECIALIST: 'SPECIALIST'
};

export const EquipmentSlot = {
  WEAPON: 'WEAPON',
  ARMOR: 'ARMOR',
  TOOL: 'TOOL',
  ACCESSORY: 'ACCESSORY'
};

export const MissionRisk = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
};

export const MissionStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

export const GuildRole = {
  MEMBER: 'MEMBER',
  OFFICER: 'OFFICER',
  LEADER: 'LEADER'
};

// Mock database operations
const createMockCRUD = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn().mockResolvedValue([]),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
  aggregate: jest.fn(),
  groupBy: jest.fn(),
});

// Mock PrismaClient class
export class PrismaClient {
  constructor() {
    // Database models
    this.user = createMockCRUD();
    this.profile = createMockCRUD();
    this.character = createMockCRUD();
    this.agent = createMockCRUD();
    this.itemDef = createMockCRUD();
    this.inventory = createMockCRUD();
    this.listing = createMockCRUD();
    this.contract = createMockCRUD();
    this.blueprint = createMockCRUD();
    this.craftJob = createMockCRUD();
    this.mission = createMockCRUD();
    this.missionDef = createMockCRUD();
    this.missionInstance = createMockCRUD();
    this.hub = createMockCRUD();
    this.link = createMockCRUD();
    this.trailNode = createMockCRUD();
    this.priceTick = createMockCRUD();
    this.ledgerTx = createMockCRUD();
    this.guild = createMockCRUD();
    this.guildMembership = createMockCRUD();
    this.guildInvitation = createMockCRUD();
    this.guildRequest = createMockCRUD();
    
    // Transaction and utility methods
    this.$transaction = jest.fn().mockImplementation((fn) => {
      if (typeof fn === 'function') {
        return fn(this);
      }
      return Promise.resolve(fn);
    });
    this.$connect = jest.fn().mockResolvedValue(undefined);
    this.$disconnect = jest.fn().mockResolvedValue(undefined);
    this.$executeRaw = jest.fn();
    this.$queryRaw = jest.fn();
    this.$use = jest.fn();
    this.$on = jest.fn();
  }
}

// Default export
export default PrismaClient;

// Mock the $Enums namespace
export const $Enums = {
  AgentType,
  EquipmentSlot,
  MissionRisk,
  MissionStatus,
  GuildRole
};