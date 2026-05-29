/**
 * Entry Validation Service
 *
 * Provides validation functions for installment entries, standard entries,
 * and batch entries. All amounts are in cents (integer arithmetic).
 *
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**
 */

import type {
  ValidationResult,
  InstallmentValidationInput,
  StandardValidationInput,
} from '../types/validation';

/** Minimum valid amount in cents (R$ 0.01) */
const MIN_AMOUNT = 1;

/** Maximum valid amount in cents (R$ 999,999,999.99) */
const MAX_AMOUNT = 99999999999;

/** Minimum number of parcels for installment */
const MIN_PARCEL_COUNT = 2;

/** Maximum number of parcels for installment */
const MAX_PARCEL_COUNT = 48;

/** Maximum description length in characters */
const MAX_DESCRIPTION_LENGTH = 100;

/** Pattern for validating YYYY-MM format */
const REFERENCE_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Validates the amount is within the allowed range (1 to 99999999999 cents).
 */
function validateAmount(amount: number, errors: string[]): void {
  if (typeof amount !== 'number' || isNaN(amount)) {
    errors.push('Amount must be a valid number');
    return;
  }
  if (!Number.isInteger(amount)) {
    errors.push('Amount must be an integer (in cents)');
    return;
  }
  if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    errors.push(
      `Amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT} cents (R$ 0.01 to R$ 999,999,999.99)`
    );
  }
}

/**
 * Validates the description is non-blank and within 1–100 characters.
 */
function validateDescription(description: string, errors: string[]): void {
  if (typeof description !== 'string') {
    errors.push('Description must be a string');
    return;
  }
  if (description.trim().length === 0) {
    errors.push('Description must not be empty or contain only whitespace');
    return;
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`);
  }
}

/**
 * Validates a date field is present and valid.
 */
function validateDate(date: unknown, errors: string[]): void {
  if (date === null || date === undefined) {
    errors.push('Date is required');
    return;
  }
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    errors.push('Date must be a valid Date');
  }
}

/**
 * Validates a categoryId is present (non-null, non-empty).
 */
function validateCategoryId(categoryId: string | null, errors: string[]): void {
  if (categoryId === null || categoryId === undefined || categoryId.trim() === '') {
    errors.push('Category is required');
  }
}

/**
 * Validates a referenceMonth is present and in YYYY-MM format.
 */
function validateReferenceMonth(referenceMonth: string, errors: string[]): void {
  if (!referenceMonth || typeof referenceMonth !== 'string') {
    errors.push('Reference month is required');
    return;
  }
  if (!REFERENCE_MONTH_PATTERN.test(referenceMonth)) {
    errors.push('Reference month must be in YYYY-MM format (e.g., 2025-01)');
  }
}

/**
 * Validates an installment entry input.
 *
 * Checks:
 * - Amount range (1 to 99999999999 cents)
 * - Parcel count (2–48)
 * - Description (1–100 chars, non-blank)
 * - Minimum parcel value: floor(totalAmount / parcelCount) ≥ 1 cent
 * - Required fields: categoryId, startMonth
 *
 * @param input - The installment validation input
 * @returns ValidationResult with valid flag and error messages
 */
export function validateInstallmentEntry(input: InstallmentValidationInput): ValidationResult {
  const errors: string[] = [];

  validateAmount(input.totalAmount, errors);
  validateDescription(input.description, errors);
  validateCategoryId(input.categoryId, errors);

  // Validate parcel count
  if (typeof input.parcelCount !== 'number' || !Number.isInteger(input.parcelCount)) {
    errors.push('Parcel count must be an integer');
  } else if (input.parcelCount < MIN_PARCEL_COUNT || input.parcelCount > MAX_PARCEL_COUNT) {
    errors.push(`Parcel count must be between ${MIN_PARCEL_COUNT} and ${MAX_PARCEL_COUNT}`);
  }

  // Validate startMonth
  if (!input.startMonth || typeof input.startMonth !== 'string') {
    errors.push('Start month is required');
  } else if (!REFERENCE_MONTH_PATTERN.test(input.startMonth)) {
    errors.push('Start month must be in YYYY-MM format (e.g., 2025-01)');
  }

  // Validate minimum parcel value (only if amount and parcel count are valid numbers)
  if (
    typeof input.totalAmount === 'number' &&
    Number.isInteger(input.totalAmount) &&
    input.totalAmount >= MIN_AMOUNT &&
    typeof input.parcelCount === 'number' &&
    Number.isInteger(input.parcelCount) &&
    input.parcelCount >= MIN_PARCEL_COUNT
  ) {
    const minParcelValue = Math.floor(input.totalAmount / input.parcelCount);
    if (minParcelValue < 1) {
      errors.push(
        'Total amount is too small for the number of parcels (each parcel must be at least R$ 0.01)'
      );
    }
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Validates a standard (single) entry input.
 *
 * Checks:
 * - Amount range (1 to 99999999999 cents)
 * - Description (1–100 chars, non-blank)
 * - Date (required, valid Date)
 * - Category (required)
 * - Reference month (required, YYYY-MM format)
 *
 * @param input - The standard validation input
 * @returns ValidationResult with valid flag and error messages
 */
export function validateStandardEntry(input: StandardValidationInput): ValidationResult {
  const errors: string[] = [];

  validateAmount(input.amount, errors);
  validateDescription(input.description, errors);
  validateDate(input.date, errors);
  validateCategoryId(input.categoryId, errors);
  validateReferenceMonth(input.referenceMonth, errors);

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Validates a batch entry input.
 *
 * Same as standard entry validation but without categoryId check,
 * since the category is derived from the batch session.
 *
 * Checks:
 * - Amount range (1 to 99999999999 cents)
 * - Description (1–100 chars, non-blank)
 * - Date (required, valid Date)
 * - Reference month (required, YYYY-MM format)
 *
 * @param input - The batch validation input (StandardValidationInput without categoryId)
 * @returns ValidationResult with valid flag and error messages
 */
export function validateBatchEntry(
  input: Omit<StandardValidationInput, 'categoryId'>
): ValidationResult {
  const errors: string[] = [];

  validateAmount(input.amount, errors);
  validateDescription(input.description, errors);
  validateDate(input.date, errors);
  validateReferenceMonth(input.referenceMonth, errors);

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}
