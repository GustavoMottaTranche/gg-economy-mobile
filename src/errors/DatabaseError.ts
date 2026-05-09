/**
 * Database-related error classes
 *
 * Provides specialized error types for database operations including:
 * - General database errors
 * - Migration errors
 * - Constraint violation errors
 *
 * **Validates: Requirements 35, 29**
 */

import { AppError } from './AppError';
import type { ErrorContext, ErrorMessageKey } from './types';

/**
 * Error thrown when a database operation fails
 *
 * @example
 * ```typescript
 * throw new DatabaseError(
 *   'Failed to insert transaction',
 *   { operation: 'insert', table: 'transactions' }
 * );
 * ```
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    context?: ErrorContext,
    cause?: Error,
    messageKey: ErrorMessageKey = { key: 'errors.database' }
  ) {
    super(message, 'DATABASE_ERROR', false, messageKey, context, cause);
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }

  /**
   * Creates a DatabaseError from an unknown error
   */
  static from(error: unknown, defaultMessage: string = 'Database operation failed'): DatabaseError {
    if (error instanceof DatabaseError) {
      return error;
    }

    if (error instanceof Error) {
      return new DatabaseError(
        error.message || defaultMessage,
        { originalError: error.message },
        error
      );
    }

    return new DatabaseError(typeof error === 'string' ? error : defaultMessage, {
      originalError: String(error),
    });
  }
}

/**
 * Error thrown when a database migration fails
 *
 * @example
 * ```typescript
 * throw new MigrationError(
 *   'Migration 0003 failed: syntax error',
 *   3,
 *   { sql: 'ALTER TABLE...' }
 * );
 * ```
 */
export class MigrationError extends AppError {
  /** The migration version that failed */
  public readonly migrationVersion: number;

  constructor(message: string, migrationVersion: number, context?: ErrorContext, cause?: Error) {
    super(
      message,
      'MIGRATION_ERROR',
      false,
      { key: 'errors.database', params: { detail: 'migration' } },
      { ...context, migrationVersion },
      cause
    );
    this.name = 'MigrationError';
    this.migrationVersion = migrationVersion;
    Object.setPrototypeOf(this, MigrationError.prototype);
  }
}

/**
 * Error thrown when a database constraint is violated
 *
 * @example
 * ```typescript
 * throw new ConstraintViolationError(
 *   'Foreign key constraint failed',
 *   'category_id',
 *   'FOREIGN_KEY'
 * );
 * ```
 */
export class ConstraintViolationError extends DatabaseError {
  /** The constraint that was violated */
  public readonly constraint: string;

  /** Type of constraint violation */
  public readonly constraintType: 'FOREIGN_KEY' | 'UNIQUE' | 'NOT_NULL' | 'CHECK';

  constructor(
    message: string,
    constraint: string,
    constraintType: 'FOREIGN_KEY' | 'UNIQUE' | 'NOT_NULL' | 'CHECK',
    context?: ErrorContext,
    cause?: Error
  ) {
    super(message, { ...context, constraint, constraintType }, cause, {
      key: 'errors.database',
      params: { detail: 'constraint' },
    });
    this.name = 'ConstraintViolationError';
    this.constraint = constraint;
    this.constraintType = constraintType;
    Object.setPrototypeOf(this, ConstraintViolationError.prototype);
  }
}
