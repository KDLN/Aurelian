/**
 * Database package constants
 * Centralizes configuration values, limits, and error codes
 */

// ============================================================================
// Gold & Wallet Limits
// ============================================================================

export const GOLD_LIMITS = {
  MIN: 0,
  MAX: 1_000_000_000, // 1 billion gold maximum
  DEFAULT_STARTING_AMOUNT: 1000,
} as const;

// ============================================================================
// Transaction Configuration
// ============================================================================

export const TRANSACTION_CONFIG = {
  DEFAULT_TIMEOUT: 10000, // 10 seconds
  CRITICAL_TIMEOUT: 5000, // 5 seconds for high-contention operations
  MAX_RETRIES: 3,
} as const;

// ============================================================================
// Cache Configuration
// ============================================================================

export const CACHE_CONFIG = {
  MAX_SIZE: 1000, // Maximum number of cached entries (LRU eviction)
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes in milliseconds
  CLEANUP_INTERVAL: 60 * 1000, // 1 minute cleanup cycle
} as const;

// ============================================================================
// Validation Limits
// ============================================================================

export const VALIDATION_LIMITS = {
  MAX_REASON_LENGTH: 500, // Maximum length for transaction reason strings
  MAX_USERNAME_LENGTH: 50,
  MAX_GUILD_NAME_LENGTH: 100,
} as const;

// ============================================================================
// Error Codes
// ============================================================================

export const ERROR_CODES = {
  // Wallet errors
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  NEGATIVE_AMOUNT: 'NEGATIVE_AMOUNT',
  AMOUNT_EXCEEDS_MAX: 'AMOUNT_EXCEEDS_MAX',
  SELF_TRANSFER: 'SELF_TRANSFER',

  // Validation errors
  INVALID_UUID: 'INVALID_UUID',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  STRING_TOO_LONG: 'STRING_TOO_LONG',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',

  // Transaction errors
  TRANSACTION_TIMEOUT: 'TRANSACTION_TIMEOUT',
  DEADLOCK_DETECTED: 'DEADLOCK_DETECTED',
  SERIALIZATION_FAILURE: 'SERIALIZATION_FAILURE',

  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  [ERROR_CODES.INSUFFICIENT_FUNDS]: 'Insufficient funds in wallet',
  [ERROR_CODES.WALLET_NOT_FOUND]: 'Wallet not found for user',
  [ERROR_CODES.NEGATIVE_AMOUNT]: 'Amount must be positive',
  [ERROR_CODES.AMOUNT_EXCEEDS_MAX]: `Amount exceeds maximum limit of ${GOLD_LIMITS.MAX.toLocaleString()} gold`,
  [ERROR_CODES.SELF_TRANSFER]: 'Cannot transfer to yourself',
  [ERROR_CODES.INVALID_UUID]: 'Invalid UUID format',
  [ERROR_CODES.INVALID_AMOUNT]: 'Invalid amount',
  [ERROR_CODES.STRING_TOO_LONG]: 'String exceeds maximum length',
  [ERROR_CODES.REQUIRED_FIELD_MISSING]: 'Required field is missing',
  [ERROR_CODES.TRANSACTION_TIMEOUT]: 'Transaction timed out',
  [ERROR_CODES.DEADLOCK_DETECTED]: 'Deadlock detected, transaction aborted',
  [ERROR_CODES.SERIALIZATION_FAILURE]: 'Serialization failure, transaction aborted',
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'Resource not found',
  [ERROR_CODES.DUPLICATE_RESOURCE]: 'Resource already exists',
  [ERROR_CODES.RESOURCE_LOCKED]: 'Resource is locked by another transaction',
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type ErrorCode = keyof typeof ERROR_CODES;
export type ErrorMessage = typeof ERROR_MESSAGES[ErrorCode];
