// Mock Prisma Client
const mockPrismaClient = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn((callback) => callback(mockPrismaClient)),
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  listing: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  itemDef: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  inventory: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  wallet: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  ledgerTx: {
    create: jest.fn(),
    createMany: jest.fn(),
  },
  priceTick: {
    create: jest.fn(),
    findMany: jest.fn(),
  }
}

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
}))

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.SUPABASE_JWT_SECRET = 'test-secret'

// Export mock for use in tests
global.mockPrismaClient = mockPrismaClient