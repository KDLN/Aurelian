/**
 * Jest setup file for database package tests
 * Ensures database is properly cleaned between tests
 */

// Increase timeout for database operations
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  // Suppress error/warn/info during tests unless needed
  // error: jest.fn(),
  // warn: jest.fn(),
  // info: jest.fn(),
  // debug: jest.fn(),
};
