/**
 * Custom error classes for the database service layer
 * These provide better error handling and type safety
 */

/**
 * Base class for all database service errors
 */
export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when user has insufficient funds for an operation
 */
export class InsufficientFundsError extends ServiceError {
  constructor(
    public userId: string,
    public required: number,
    public available: number
  ) {
    super(`Insufficient gold: need ${required}, have ${available}`);
  }
}

/**
 * Thrown when inventory has insufficient items
 */
export class InsufficientItemsError extends ServiceError {
  constructor(
    public userId: string,
    public itemKey: string,
    public required: number,
    public available: number
  ) {
    super(
      `Insufficient ${itemKey}: need ${required}, have ${available}`
    );
  }
}

/**
 * Thrown when a resource is not found
 */
export class ResourceNotFoundError extends ServiceError {
  constructor(
    public resourceType: string,
    public identifier: string
  ) {
    super(`${resourceType} not found: ${identifier}`);
  }
}

/**
 * Thrown when input validation fails
 */
export class ValidationError extends ServiceError {
  constructor(
    public field: string,
    public message: string
  ) {
    super(`Validation failed for ${field}: ${message}`);
  }
}

/**
 * Thrown when an operation is not allowed due to business rules
 */
export class OperationNotAllowedError extends ServiceError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when a race condition or conflict occurs
 */
export class ConflictError extends ServiceError {
  constructor(message: string) {
    super(message);
  }
}
