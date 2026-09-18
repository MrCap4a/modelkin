/**
 * Base class for all expected/handled application errors. Anything thrown
 * that is NOT an AppError is treated as an unexpected bug: its stack trace
 * is logged server-side but never leaked to the client (ТЗ §40).
 */
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  /** Extra context safe to return to the client (never secrets/internals). */
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly httpStatus = 400;
}

export class AuthenticationError extends AppError {
  readonly code = "AUTHENTICATION_ERROR";
  readonly httpStatus = 401;
}

export class AuthorizationError extends AppError {
  readonly code = "AUTHORIZATION_ERROR";
  readonly httpStatus = 403;
}

export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
  readonly httpStatus = 404;
}

export class ConflictError extends AppError {
  readonly code = "CONFLICT";
  readonly httpStatus = 409;
}

export class RateLimitError extends AppError {
  readonly code = "RATE_LIMITED";
  readonly httpStatus = 429;
}

export class PaymentError extends AppError {
  readonly code = "PAYMENT_ERROR";
  readonly httpStatus = 402;
}

export class StorageError extends AppError {
  readonly code = "STORAGE_ERROR";
  readonly httpStatus = 502;
}

export class ExternalServiceError extends AppError {
  readonly code = "EXTERNAL_SERVICE_ERROR";
  readonly httpStatus = 502;
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
