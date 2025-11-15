// Mock Prisma Client
const mockPrismaClient = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn((callback) => callback(mockPrismaClient)),
  user: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  mission: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  craftJob: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  priceTick: {
    create: jest.fn(),
    createMany: jest.fn(),
  },
  marketEvent: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  }
}

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
}))

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

// Export mock for use in tests
global.mockPrismaClient = mockPrismaClient