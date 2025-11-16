/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.{ts}',
    '!src/**/*.d.ts',
    '!src/env.ts', // Env validation has its own setup
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Handle .js imports for ESM
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        module: 'commonjs',
      }
    }],
  },
  testMatch: [
    '**/__tests__/**/*.+(ts)',
    '**/?(*.)+(spec|test).+(ts)'
  ],
  // Better async handling
  testTimeout: 30000, // 30 seconds for database tests
  detectOpenHandles: true,
  forceExit: true,
  // Prevent memory leaks
  clearMocks: true,
  restoreMocks: true,
}
