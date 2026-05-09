/**
 * Validation-related error classes
 *
 * Provides specialized error types for form and data validation including:
 * - Single field validation errors
 * - Multiple field validation errors
 *
 * **Validates: Requirements 35, 29**
 */

import { AppError } from './AppError';
import type { ErrorContext, ErrorMessageKey } from './types';

/**
 * Error thrown when form or data validation fails
 *
 * @example
 * ```typescript
 * throw new ValidationError(
 *   'Amount is required',
 *   'amount',
 *   { key: 'validation.required' }
 * );
 * ```
 */
export class ValidationError extends AppError {
  /** The field that failed validation */
  public readonly field: string;

  constructor(
    message: string,
    field: string,
    messageKey: ErrorMessageKey = { key: 'validation.required' },
    context?: ErrorContext
  ) {
    super(message, 'VALIDATION_ERROR', true, messageKey, { ...context, field });

    this.name = 'ValidationError';
    this.field = field;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  /**
   * Creates a required field validation error
   */
  static required(field: string): ValidationError {
    return new ValidationError(`${field} is required`, field, { key: 'validation.required' });
  }

  /**
   * Creates an invalid amount validation error
   */
  static invalidAmount(field: string = 'amount'): ValidationError {
    return new ValidationError('Invalid amount', field, { key: 'validation.invalidAmount' });
  }

  /**
   * Creates an invalid date validation error
   */
  static invalidDate(field: string = 'date'): ValidationError {
    return new ValidationError('Invalid date', field, { key: 'validation.invalidDate' });
  }

  /**
   * Creates a min length validation error
   */
  static minLength(field: string, min: number): ValidationError {
    return new ValidationError(`${field} must be at least ${min} characters`, field, {
      key: 'validation.minLength',
      params: { min },
    });
  }

  /**
   * Creates a max length validation error
   */
  static maxLength(field: string, max: number): ValidationError {
    return new ValidationError(`${field} must be at most ${max} characters`, field, {
      key: 'validation.maxLength',
      params: { max },
    });
  }

  /**
   * Creates a positive number validation error
   */
  static positiveNumber(field: string = 'amount'): ValidationError {
    return new ValidationError('Value must be positive', field, {
      key: 'validation.positiveNumber',
    });
  }

  /**
   * Creates a future date validation error
   */
  static futureDate(field: string = 'date'): ValidationError {
    return new ValidationError('Date cannot be in the future', field, {
      key: 'validation.futureDate',
    });
  }
}

/**
 * Represents a single field error in a multi-field validation
 */
export interface FieldError {
  /** Field name */
  field: string;
  /** Error message */
  message: string;
  /** i18n message key */
  messageKey: ErrorMessageKey;
}

/**
 * Error thrown when multiple validation errors occur
 *
 * @example
 * ```typescript
 * throw new MultiValidationError([
 *   { field: 'amount', message: 'Required', messageKey: { key: 'validation.required' } },
 *   { field: 'date', message: 'Invalid', messageKey: { key: 'validation.invalidDate' } },
 * ]);
 * ```
 */
export class MultiValidationError extends AppError {
  /** Array of field errors */
  public readonly fieldErrors: FieldError[];

  constructor(fieldErrors: FieldError[]) {
    const fields = fieldErrors.map((e) => e.field).join(', ');
    super(
      `Validation failed for fields: ${fields}`,
      'VALIDATION_ERROR',
      true,
      { key: 'errors.validation' },
      { fields: fieldErrors.map((e) => e.field) }
    );

    this.name = 'MultiValidationError';
    this.fieldErrors = fieldErrors;
    Object.setPrototypeOf(this, MultiValidationError.prototype);
  }

  /**
   * Gets the error for a specific field
   */
  getFieldError(field: string): FieldError | undefined {
    return this.fieldErrors.find((e) => e.field === field);
  }

  /**
   * Checks if a specific field has an error
   */
  hasFieldError(field: string): boolean {
    return this.fieldErrors.some((e) => e.field === field);
  }

  /**
   * Gets all field names with errors
   */
  getErrorFields(): string[] {
    return this.fieldErrors.map((e) => e.field);
  }

  /**
   * Creates a MultiValidationError from an array of ValidationErrors
   */
  static fromValidationErrors(errors: ValidationError[]): MultiValidationError {
    return new MultiValidationError(
      errors.map((e) => ({
        field: e.field,
        message: e.message,
        messageKey: e.messageKey,
      }))
    );
  }
}
