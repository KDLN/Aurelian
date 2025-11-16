/**
 * Validation utilities for database operations
 * Provides input validation, sanitization, and custom error classes
 */

import { ERROR_CODES, GOLD_LIMITS, VALIDATION_LIMITS } from '../constants/index.js';

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Base error class for database validation errors
 */
export class ValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly code: string,
    message?: string
  ) {
    super(message || `Validation failed for field: ${field}`);
    this.name = 'ValidationError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when a wallet has insufficient funds
 */
export class InsufficientFundsError extends Error {
  constructor(
    public readonly userId: string,
    public readonly required: number,
    public readonly available: number
  ) {
    super(
      `Insufficient funds: required ${required} gold, but only ${available} available`
    );
    this.name = 'InsufficientFundsError';
    this.code = ERROR_CODES.INSUFFICIENT_FUNDS;
    Error.captureStackTrace(this, this.constructor);
  }

  code: string;
}

/**
 * Error thrown when a wallet is not found
 */
export class WalletNotFoundError extends Error {
  constructor(public readonly userId: string) {
    super(`Wallet not found for user: ${userId}`);
    this.name = 'WalletNotFoundError';
    this.code = ERROR_CODES.WALLET_NOT_FOUND;
    Error.captureStackTrace(this, this.constructor);
  }

  code: string;
}

/**
 * Error thrown when a resource is not found
 */
export class ResourceNotFoundError extends Error {
  constructor(
    public readonly resourceType: string,
    public readonly resourceId: string
  ) {
    super(`${resourceType} not found: ${resourceId}`);
    this.name = 'ResourceNotFoundError';
    this.code = ERROR_CODES.RESOURCE_NOT_FOUND;
    Error.captureStackTrace(this, this.constructor);
  }

  code: string;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * UUID validation regex (v4 format)
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates that a string is a valid UUID (v4 format)
 * @param id - The UUID string to validate
 * @param fieldName - Name of the field being validated (for error messages)
 * @throws ValidationError if the UUID is invalid
 */
export function validateUUID(id: string, fieldName = 'id'): void {
  if (!id) {
    throw new ValidationError(
      fieldName,
      ERROR_CODES.REQUIRED_FIELD_MISSING,
      `${fieldName} is required`
    );
  }

  if (typeof id !== 'string') {
    throw new ValidationError(
      fieldName,
      ERROR_CODES.INVALID_UUID,
      `${fieldName} must be a string`
    );
  }

  if (!UUID_REGEX.test(id)) {
    throw new ValidationError(
      fieldName,
      ERROR_CODES.INVALID_UUID,
      `${fieldName} must be a valid UUID v4`
    );
  }
}

/**
 * Validates that an amount is within acceptable gold limits
 * @param amount - The gold amount to validate
 * @param fieldName - Name of the field being validated (for error messages)
 * @param options - Validation options
 * @throws ValidationError if the amount is invalid
 */
export function validateGoldAmount(
  amount: number,
  fieldName = 'amount',
  options: {
    allowZero?: boolean;
    min?: number;
    max?: number;
  } = {}
): void {
  const { allowZero = false, min = GOLD_LIMITS.MIN, max = GOLD_LIMITS.MAX } = options;

  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new ValidationError(
      fieldName,
      ERROR_CODES.INVALID_AMOUNT,
      `${fieldName} must be a valid number`
    );
  }

  if (!Number.isInteger(amount)) {
    throw new ValidationError(
      fieldName,
      ERROR_CODES.INVALID_AMOUNT,
      `${fieldName} must be an integer`
    );
  }

  if (!allowZero && amount <= 0) {
    throw new ValidationError(
      fieldName,
      ERROR_CODES.NEGATIVE_AMOUNT,
      `${fieldName} must be positive`
    );
  }

  if (allowZero && amount < 0) {
    throw new ValidationError(
      fieldName,
      ERROR_CODES.NEGATIVE_AMOUNT,
      `${fieldName} cannot be negative`
    );
  }

  if (amount < min) {
    throw new ValidationError(
      fieldName,
      ERROR_CODES.INVALID_AMOUNT,
      `${fieldName} must be at least ${min}`
    );
  }

  if (amount > max) {
    throw new ValidationError(
      fieldName,
      ERROR_CODES.AMOUNT_EXCEEDS_MAX,
      `${fieldName} cannot exceed ${max.toLocaleString()} gold`
    );
  }
}

/**
 * Validates that a string does not exceed a maximum length
 * @param value - The string to validate
 * @param fieldName - Name of the field being validated
 * @param maxLength - Maximum allowed length
 * @throws ValidationError if the string is too long
 */
export function validateStringLength(
  value: string | null | undefined,
  fieldName: string,
  maxLength: number
): void {
  if (!value) return; // Null/undefined is acceptable for optional fields

  if (typeof value !== 'string') {
    throw new ValidationError(
      fieldName,
      ERROR_CODES.INVALID_AMOUNT,
      `${fieldName} must be a string`
    );
  }

  if (value.length > maxLength) {
    throw new ValidationError(
      fieldName,
      ERROR_CODES.STRING_TOO_LONG,
      `${fieldName} exceeds maximum length of ${maxLength} characters`
    );
  }
}

/**
 * Validates a transaction reason string
 * @param reason - The reason string to validate
 * @throws ValidationError if the reason is invalid
 */
export function validateReason(reason?: string | null): void {
  if (!reason) return;
  validateStringLength(reason, 'reason', VALIDATION_LIMITS.MAX_REASON_LENGTH);
}

/**
 * Validates that two user IDs are different (prevents self-transactions)
 * @param userId1 - First user ID
 * @param userId2 - Second user ID
 * @param operation - Description of the operation (for error messages)
 * @throws ValidationError if the IDs are the same
 */
export function validateDifferentUsers(
  userId1: string,
  userId2: string,
  operation = 'transfer'
): void {
  if (userId1 === userId2) {
    throw new ValidationError(
      'userId',
      ERROR_CODES.SELF_TRANSFER,
      `Cannot ${operation} to yourself`
    );
  }
}

/**
 * Validates all parameters for a wallet transfer operation
 * @param fromUserId - Source user ID
 * @param toUserId - Destination user ID
 * @param amount - Amount to transfer
 * @param reason - Optional reason for the transfer
 * @throws ValidationError if any parameter is invalid
 */
export function validateTransfer(
  fromUserId: string,
  toUserId: string,
  amount: number,
  reason?: string | null
): void {
  validateUUID(fromUserId, 'fromUserId');
  validateUUID(toUserId, 'toUserId');
  validateDifferentUsers(fromUserId, toUserId, 'transfer');
  validateGoldAmount(amount, 'amount');
  validateReason(reason);
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an error is a Prisma error
 */
export function isPrismaError(error: unknown): error is { code: string; meta?: unknown } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if an error is an InsufficientFundsError
 */
export function isInsufficientFundsError(error: unknown): error is InsufficientFundsError {
  return error instanceof InsufficientFundsError;
}

/**
 * Type guard to check if an error is a WalletNotFoundError
 */
export function isWalletNotFoundError(error: unknown): error is WalletNotFoundError {
  return error instanceof WalletNotFoundError;
}
