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

/**
 * Error response for API routes
 */
export interface ErrorResponse {
  status: number;
  message: string;
  details?: Record<string, any>;
}

/**
 * Handle service layer errors and convert to API responses
 * Use this in API routes to standardize error handling
 *
 * @example
 * ```typescript
 * import { handleServiceError } from '@aurelian/database';
 *
 * try {
 *   await services.wallet.transfer(fromId, toId, 1000, 'Guild donation');
 * } catch (error) {
 *   const errorResponse = handleServiceError(error);
 *   return NextResponse.json(
 *     { error: errorResponse.message, ...errorResponse.details },
 *     { status: errorResponse.status }
 *   );
 * }
 * ```
 */
export function handleServiceError(error: unknown): ErrorResponse {
  // Insufficient funds
  if (error instanceof InsufficientFundsError) {
    return {
      status: 400,
      message: error.message,
      details: {
        userId: error.userId,
        required: error.required,
        available: error.available,
      },
    };
  }

  // Insufficient items
  if (error instanceof InsufficientItemsError) {
    return {
      status: 400,
      message: error.message,
      details: {
        userId: error.userId,
        itemKey: error.itemKey,
        required: error.required,
        available: error.available,
      },
    };
  }

  // Resource not found
  if (error instanceof ResourceNotFoundError) {
    return {
      status: 404,
      message: error.message,
      details: {
        resourceType: error.resourceType,
        identifier: error.identifier,
      },
    };
  }

  // Validation error
  if (error instanceof ValidationError) {
    return {
      status: 400,
      message: error.message,
      details: {
        field: error.field,
      },
    };
  }

  // Operation not allowed
  if (error instanceof OperationNotAllowedError) {
    return {
      status: 403,
      message: error.message,
    };
  }

  // Conflict error
  if (error instanceof ConflictError) {
    return {
      status: 409,
      message: error.message,
    };
  }

  // Generic service error
  if (error instanceof ServiceError) {
    return {
      status: 500,
      message: error.message,
    };
  }

  // Unknown error
  if (error instanceof Error) {
    console.error('Unhandled error:', error);
    return {
      status: 500,
      message: 'Internal server error',
      details: {
        error: error.message,
      },
    };
  }

  // Non-Error thrown
  console.error('Unknown error type:', error);
  return {
    status: 500,
    message: 'Internal server error',
  };
}
