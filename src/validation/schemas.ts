/**
 * Validation Schemas Module
 *
 * Centralized validation schemas for transaction data, import options,
 * and reference month format validation.
 *
 * **Validates: Requirements 9**
 */

import {
  DESCRIPTION_MAX_LENGTH,
  AMOUNT_MAX_VALUE,
  AMOUNT_MIN_VALUE,
  REFERENCE_MONTH_PATTERN,
} from '../constants/limits';

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  /** Whether the validation passed */
  valid: boolean;
  /** Array of error messages if validation failed */
  errors: string[];
}

/**
 * Validates transaction data against business rules
 *
 * @param data - Transaction data to validate
 * @returns ValidationResult with valid flag and any error messages
 *
 * @example
 * const result = validateTransaction({
 *   date: new Date(),
 *   amount: 10000,
 *   description: 'Grocery shopping',
 *   referenceMonth: '2024-01'
 * });
 * // { valid: true, errors: [] }
 *
 * @example
 * const result = validateTransaction({
 *   amount: 'invalid',
 *   referenceMonth: '2024/01'
 * });
 * // { valid: false, errors: ['Amount must be a number', 'Reference month must be in YYYY-MM format'] }
 */
export function validateTransaction(data: {
  date?: Date;
  amount?: number;
  description?: string;
  referenceMonth?: string;
}): ValidationResult {
  const errors: string[] = [];

  // Validate date if provided
  if (data.date !== undefined) {
    if (!(data.date instanceof Date) || isNaN(data.date.getTime())) {
      errors.push('Invalid date');
    }
  }

  // Validate amount if provided
  if (data.amount !== undefined) {
    if (typeof data.amount !== 'number' || isNaN(data.amount)) {
      errors.push('Amount must be a number');
    } else if (data.amount > AMOUNT_MAX_VALUE || data.amount < AMOUNT_MIN_VALUE) {
      errors.push(`Amount must be between ${AMOUNT_MIN_VALUE} and ${AMOUNT_MAX_VALUE}`);
    }
  }

  // Validate description if provided
  if (data.description !== undefined) {
    if (typeof data.description !== 'string') {
      errors.push('Description must be a string');
    } else if (data.description.length > DESCRIPTION_MAX_LENGTH) {
      errors.push(`Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`);
    }
  }

  // Validate reference month if provided
  if (data.referenceMonth !== undefined && !REFERENCE_MONTH_PATTERN.test(data.referenceMonth)) {
    errors.push('Reference month must be in YYYY-MM format');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates import options against allowed values
 *
 * @param options - Import options to validate
 * @returns ValidationResult with valid flag and any error messages
 *
 * @example
 * const result = validateImportOptions({
 *   locale: 'pt-BR',
 *   dedupeConfidenceThreshold: 0.8
 * });
 * // { valid: true, errors: [] }
 *
 * @example
 * const result = validateImportOptions({
 *   locale: 'fr-FR',
 *   dedupeConfidenceThreshold: 1.5
 * });
 * // { valid: false, errors: ['Locale must be pt-BR or en', 'Dedupe confidence threshold must be between 0 and 1'] }
 */
export function validateImportOptions(options: {
  locale?: string;
  dedupeConfidenceThreshold?: number;
}): ValidationResult {
  const errors: string[] = [];

  // Validate locale if provided
  if (options.locale !== undefined && options.locale !== null) {
    if (!['pt-BR', 'en'].includes(options.locale)) {
      errors.push('Locale must be pt-BR or en');
    }
  }

  // Validate dedupe confidence threshold if provided
  if (options.dedupeConfidenceThreshold !== undefined) {
    if (
      typeof options.dedupeConfidenceThreshold !== 'number' ||
      isNaN(options.dedupeConfidenceThreshold) ||
      options.dedupeConfidenceThreshold < 0 ||
      options.dedupeConfidenceThreshold > 1
    ) {
      errors.push('Dedupe confidence threshold must be between 0 and 1');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a reference month string against YYYY-MM format
 *
 * @param month - Reference month string to validate
 * @returns true if the month matches YYYY-MM format, false otherwise
 *
 * @example
 * validateReferenceMonth('2024-01') // true
 * validateReferenceMonth('2024-12') // true
 * validateReferenceMonth('2024/01') // false
 * validateReferenceMonth('24-01')   // false
 */
export function validateReferenceMonth(month: string): boolean {
  return REFERENCE_MONTH_PATTERN.test(month);
}
