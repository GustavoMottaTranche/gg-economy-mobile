/**
 * Validation utilities for form inputs and data integrity
 *
 * Provides validators for:
 * - Amount validation (numeric, range)
 * - Date validation
 * - Required field validation
 * - Reference month validation
 * - Category validation
 */

import { SupportedLocale } from './formatCurrency';

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  /** Error message if validation failed */
  errorMessage?: string;
  /** Error code for i18n lookup */
  errorCode?: string;
}

/**
 * Validation success result
 */
const VALID: ValidationResult = { isValid: true };

/**
 * Creates a validation error result
 */
function invalid(errorMessage: string, errorCode?: string): ValidationResult {
  return { isValid: false, errorMessage, errorCode };
}

/**
 * Validates that a value is not empty (required field)
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field for error message
 * @returns Validation result
 *
 * @example
 * validateRequired("", "description") // { isValid: false, errorMessage: "description is required" }
 * validateRequired("test", "description") // { isValid: true }
 */
export function validateRequired(value: unknown, fieldName: string): ValidationResult {
  if (value === null || value === undefined) {
    return invalid(`${fieldName} is required`, 'REQUIRED');
  }

  if (typeof value === 'string' && value.trim() === '') {
    return invalid(`${fieldName} is required`, 'REQUIRED');
  }

  return VALID;
}

/**
 * Validates that a value is a valid numeric amount
 *
 * @param value - Value to validate (number or string)
 * @param options - Validation options
 * @returns Validation result
 *
 * @example
 * validateAmount(100) // { isValid: true }
 * validateAmount("100.50") // { isValid: true }
 * validateAmount("abc") // { isValid: false, errorMessage: "Invalid amount" }
 * validateAmount(0, { allowZero: false }) // { isValid: false }
 */
export function validateAmount(
  value: unknown,
  options: {
    /** Allow zero value (default: true) */
    allowZero?: boolean;
    /** Allow negative values (default: true) */
    allowNegative?: boolean;
    /** Minimum value (inclusive) */
    min?: number;
    /** Maximum value (inclusive) */
    max?: number;
    /** Locale for parsing string amounts */
    locale?: SupportedLocale;
  } = {}
): ValidationResult {
  const { allowZero = true, allowNegative = true, min, max, locale = 'pt-BR' } = options;

  // Handle null/undefined
  if (value === null || value === undefined) {
    return invalid('Amount is required', 'REQUIRED');
  }

  let numericValue: number;

  if (typeof value === 'number') {
    numericValue = value;
  } else if (typeof value === 'string') {
    // Parse string value based on locale
    let cleaned = value.trim();

    if (cleaned === '') {
      return invalid('Amount is required', 'REQUIRED');
    }

    // Handle locale-specific decimal separators
    if (locale === 'pt-BR') {
      // pt-BR uses . for grouping and , for decimal
      cleaned = cleaned.replace(/\./g, ''); // Remove grouping separators
      cleaned = cleaned.replace(',', '.'); // Convert decimal separator
    } else {
      // en uses , for grouping and . for decimal
      cleaned = cleaned.replace(/,/g, ''); // Remove grouping separators
    }

    numericValue = parseFloat(cleaned);
  } else {
    return invalid('Invalid amount type', 'INVALID_TYPE');
  }

  // Check if it's a valid number
  if (isNaN(numericValue) || !isFinite(numericValue)) {
    return invalid('Invalid amount', 'INVALID_AMOUNT');
  }

  // Check zero
  if (!allowZero && numericValue === 0) {
    return invalid('Amount cannot be zero', 'ZERO_NOT_ALLOWED');
  }

  // Check negative
  if (!allowNegative && numericValue < 0) {
    return invalid('Amount cannot be negative', 'NEGATIVE_NOT_ALLOWED');
  }

  // Check min
  if (min !== undefined && numericValue < min) {
    return invalid(`Amount must be at least ${min}`, 'BELOW_MIN');
  }

  // Check max
  if (max !== undefined && numericValue > max) {
    return invalid(`Amount must be at most ${max}`, 'ABOVE_MAX');
  }

  return VALID;
}

/**
 * Validates that a value is a valid date
 *
 * @param value - Value to validate (Date, string, or number timestamp)
 * @param options - Validation options
 * @returns Validation result
 *
 * @example
 * validateDate(new Date()) // { isValid: true }
 * validateDate("2024-01-15") // { isValid: true }
 * validateDate("invalid") // { isValid: false }
 */
export function validateDate(
  value: unknown,
  options: {
    /** Minimum date (inclusive) */
    minDate?: Date;
    /** Maximum date (inclusive) */
    maxDate?: Date;
    /** Allow future dates (default: true) */
    allowFuture?: boolean;
    /** Allow past dates (default: true) */
    allowPast?: boolean;
  } = {}
): ValidationResult {
  const { minDate, maxDate, allowFuture = true, allowPast = true } = options;

  // Handle null/undefined
  if (value === null || value === undefined) {
    return invalid('Date is required', 'REQUIRED');
  }

  let dateValue: Date;

  if (value instanceof Date) {
    dateValue = value;
  } else if (typeof value === 'string') {
    if (value.trim() === '') {
      return invalid('Date is required', 'REQUIRED');
    }
    dateValue = new Date(value);
  } else if (typeof value === 'number') {
    dateValue = new Date(value);
  } else {
    return invalid('Invalid date type', 'INVALID_TYPE');
  }

  // Check if it's a valid date
  if (isNaN(dateValue.getTime())) {
    return invalid('Invalid date', 'INVALID_DATE');
  }

  const now = new Date();
  now.setHours(23, 59, 59, 999); // End of today for future check

  // Check future dates
  if (!allowFuture && dateValue > now) {
    return invalid('Date cannot be in the future', 'FUTURE_NOT_ALLOWED');
  }

  // Check past dates
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (!allowPast && dateValue < startOfToday) {
    return invalid('Date cannot be in the past', 'PAST_NOT_ALLOWED');
  }

  // Check min date
  if (minDate && dateValue < minDate) {
    return invalid(
      `Date must be on or after ${minDate.toISOString().split('T')[0]}`,
      'BEFORE_MIN_DATE'
    );
  }

  // Check max date
  if (maxDate && dateValue > maxDate) {
    return invalid(
      `Date must be on or before ${maxDate.toISOString().split('T')[0]}`,
      'AFTER_MAX_DATE'
    );
  }

  return VALID;
}

/**
 * Validates a reference month string (YYYY-MM format)
 *
 * @param value - Value to validate
 * @returns Validation result
 *
 * @example
 * validateReferenceMonth("2024-01") // { isValid: true }
 * validateReferenceMonth("2024-13") // { isValid: false }
 * validateReferenceMonth("invalid") // { isValid: false }
 */
export function validateReferenceMonth(value: unknown): ValidationResult {
  if (value === null || value === undefined) {
    return invalid('Reference month is required', 'REQUIRED');
  }

  if (typeof value !== 'string') {
    return invalid('Reference month must be a string', 'INVALID_TYPE');
  }

  const trimmed = value.trim();

  if (trimmed === '') {
    return invalid('Reference month is required', 'REQUIRED');
  }

  // Check format YYYY-MM
  const match = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return invalid('Reference month must be in YYYY-MM format', 'INVALID_FORMAT');
  }

  const yearStr = match[1];
  const monthStr = match[2];
  if (!yearStr || !monthStr) {
    return invalid('Reference month must be in YYYY-MM format', 'INVALID_FORMAT');
  }

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Validate year range (reasonable range)
  if (year < 1900 || year > 2100) {
    return invalid('Year must be between 1900 and 2100', 'INVALID_YEAR');
  }

  // Validate month range
  if (month < 1 || month > 12) {
    return invalid('Month must be between 01 and 12', 'INVALID_MONTH');
  }

  return VALID;
}

/**
 * Validates a description field
 *
 * @param value - Value to validate
 * @param options - Validation options
 * @returns Validation result
 */
export function validateDescription(
  value: unknown,
  options: {
    /** Minimum length (default: 1) */
    minLength?: number;
    /** Maximum length (default: 500) */
    maxLength?: number;
    /** Whether the field is required (default: true) */
    required?: boolean;
  } = {}
): ValidationResult {
  const { minLength = 1, maxLength = 500, required = true } = options;

  if (value === null || value === undefined) {
    if (required) {
      return invalid('Description is required', 'REQUIRED');
    }
    return VALID;
  }

  if (typeof value !== 'string') {
    return invalid('Description must be a string', 'INVALID_TYPE');
  }

  const trimmed = value.trim();

  if (trimmed === '') {
    if (required) {
      return invalid('Description is required', 'REQUIRED');
    }
    // Empty string is valid when not required
    return VALID;
  }

  if (trimmed.length < minLength) {
    return invalid(`Description must be at least ${minLength} characters`, 'TOO_SHORT');
  }

  if (trimmed.length > maxLength) {
    return invalid(`Description must be at most ${maxLength} characters`, 'TOO_LONG');
  }

  return VALID;
}

/**
 * Validates a category ID
 *
 * @param value - Value to validate
 * @param options - Validation options
 * @returns Validation result
 */
export function validateCategoryId(
  value: unknown,
  options: {
    /** Whether the field is required (default: false) */
    required?: boolean;
    /** List of valid category IDs */
    validIds?: string[];
  } = {}
): ValidationResult {
  const { required = false, validIds } = options;

  if (value === null || value === undefined) {
    if (required) {
      return invalid('Category is required', 'REQUIRED');
    }
    return VALID;
  }

  if (typeof value !== 'string') {
    return invalid('Category ID must be a string', 'INVALID_TYPE');
  }

  const trimmed = value.trim();

  if (trimmed === '') {
    if (required) {
      return invalid('Category is required', 'REQUIRED');
    }
    return VALID;
  }

  // Validate against list of valid IDs if provided
  if (validIds && !validIds.includes(trimmed)) {
    return invalid('Invalid category', 'INVALID_CATEGORY');
  }

  return VALID;
}

/**
 * Validates a complete transaction form
 *
 * @param data - Form data to validate
 * @returns Object with validation results for each field
 */
export function validateTransactionForm(data: {
  date?: unknown;
  amount?: unknown;
  description?: unknown;
  categoryId?: unknown;
  referenceMonth?: unknown;
}): Record<string, ValidationResult> {
  return {
    date: validateDate(data.date),
    amount: validateAmount(data.amount, { allowZero: false }),
    description: validateDescription(data.description),
    categoryId: validateCategoryId(data.categoryId),
    referenceMonth: validateReferenceMonth(data.referenceMonth),
  };
}

/**
 * Checks if all validation results are valid
 *
 * @param results - Validation results object
 * @returns True if all validations passed
 */
export function isFormValid(results: Record<string, ValidationResult>): boolean {
  return Object.values(results).every((result) => result.isValid);
}

/**
 * Gets all error messages from validation results
 *
 * @param results - Validation results object
 * @returns Array of error messages
 */
export function getValidationErrors(results: Record<string, ValidationResult>): string[] {
  return Object.values(results)
    .filter((result) => !result.isValid && result.errorMessage)
    .map((result) => result.errorMessage!);
}

/**
 * Gets the first error message from validation results
 *
 * @param results - Validation results object
 * @returns First error message or undefined if all valid
 */
export function getFirstError(results: Record<string, ValidationResult>): string | undefined {
  const errors = getValidationErrors(results);
  return errors.length > 0 ? errors[0] : undefined;
}
