/**
 * Base AppError class for all application errors
 *
 * Provides a foundation for typed error handling with:
 * - Unique error codes for categorization
 * - User-friendly message keys for i18n
 * - Optional original error for chaining
 * - Metadata for debugging (without sensitive data)
 *
 * **Validates: Requirements 35, 29**
 */

import type { ErrorCode, ErrorContext, ErrorMessageKey } from './types';

/**
 * Base error class for all application errors
 *
 * @example
 * ```typescript
 * throw new AppError(
 *   'Operation failed',
 *   'APP_ERROR',
 *   true,
 *   { key: 'errors.generic' },
 *   { operation: 'save' }
 * );
 * ```
 */
export class AppError extends Error {
  /** Error code for categorization */
  public readonly code: ErrorCode;

  /** Whether the error is recoverable (user can retry) */
  public readonly recoverable: boolean;

  /** i18n message key for user-facing messages */
  public readonly messageKey: ErrorMessageKey;

  /** Additional context for debugging (sanitized) */
  public readonly context?: ErrorContext;

  /** Original error if this error wraps another */
  public readonly cause?: Error;

  /**
   * Creates a new AppError
   *
   * @param message - Technical error message for logging
   * @param code - Error code for categorization
   * @param recoverable - Whether the user can retry the operation
   * @param messageKey - i18n key for user-facing message
   * @param context - Additional debugging context (will be sanitized)
   * @param cause - Original error being wrapped
   */
  constructor(
    message: string,
    code: ErrorCode = 'APP_ERROR',
    recoverable: boolean = true,
    messageKey: ErrorMessageKey = { key: 'errors.generic' },
    context?: ErrorContext,
    cause?: Error
  ) {
    super(message);

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }

    this.name = 'AppError';
    this.code = code;
    this.recoverable = recoverable;
    this.messageKey = messageKey;
    this.context = context;
    this.cause = cause;

    // Ensure prototype chain is properly set
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Creates an AppError from an unknown error value
   *
   * @param error - Unknown error value
   * @param defaultMessage - Default message if error has no message
   * @returns AppError instance
   */
  static from(error: unknown, defaultMessage: string = 'An unknown error occurred'): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(
        error.message || defaultMessage,
        'UNKNOWN_ERROR',
        true,
        { key: 'errors.generic' },
        { originalError: error.message },
        error
      );
    }

    if (typeof error === 'string') {
      return new AppError(error, 'UNKNOWN_ERROR', true, { key: 'errors.generic' });
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const msg = String((error as { message: unknown }).message);
      return new AppError(msg, 'UNKNOWN_ERROR', true, { key: 'errors.generic' });
    }

    return new AppError(defaultMessage, 'UNKNOWN_ERROR', true, { key: 'errors.generic' });
  }

  /**
   * Returns a JSON-serializable representation of the error
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      recoverable: this.recoverable,
      messageKey: this.messageKey,
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * Returns a string representation of the error
   */
  toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }
}
