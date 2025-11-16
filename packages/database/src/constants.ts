/**
 * Validation constants for the service layer
 * Centralized configuration for input validation limits
 */

/**
 * Gold/currency validation limits
 */
export const GOLD_LIMITS = {
  /**
   * Maximum amount of gold that can be added in a single operation
   * Set high to allow for large quest rewards and admin operations
   */
  MAX_ADD_AMOUNT: 10_000_000,

  /**
   * Maximum amount of gold that can be transferred between users
   * Lower than MAX_ADD to prevent large unauthorized transfers
   */
  MAX_TRANSFER_AMOUNT: 1_000_000,

  /**
   * Minimum amount for any gold operation
   */
  MIN_AMOUNT: 1,
} as const;

/**
 * Inventory validation limits
 */
export const INVENTORY_LIMITS = {
  /**
   * Maximum quantity for a single item operation
   */
  MAX_QUANTITY: 999_999,

  /**
   * Minimum quantity for any inventory operation
   */
  MIN_QUANTITY: 1,
} as const;

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  /**
   * Default TTL for cached queries (5 minutes)
   */
  DEFAULT_TTL: 5 * 60 * 1000,

  /**
   * Cleanup interval for expired cache entries (1 minute)
   */
  CLEANUP_INTERVAL: 60_000,
} as const;

/**
 * Transaction configuration
 */
export const TRANSACTION_CONFIG = {
  /**
   * Maximum wait time for transaction lock (5 seconds)
   */
  MAX_WAIT: 5000,

  /**
   * Transaction timeout (10 seconds)
   */
  TIMEOUT: 10000,
} as const;
