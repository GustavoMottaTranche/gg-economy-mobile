/**
 * Entry Validation Service
 *
 * Provides validation functions for the restructured entry form with
 * separate title and description fields. Title is the primary required
 * identifier; description is optional.
 *
 * **Validates: Requirements 1.2, 1.3, 2.3, 7.1, 7.2, 7.3**
 */

import type { ValidationResult } from '../types/validation';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum title length after trimming */
export const TITLE_MIN_LENGTH = 1;

/** Maximum title length after trimming */
export const TITLE_MAX_LENGTH = 100;

/** Maximum description length */
export const DESCRIPTION_MAX_LENGTH = 500;

/** Minimum valid amount in cents (R$ 0.01) */
const MIN_AMOUNT = 1;

/** Maximum valid amount in cents (R$ 999,999,999.99) */
const MAX_AMOUNT = 99999999999;

/** Minimum number of parcels for installment */
const MIN_PARCEL_COUNT = 2;

/** Maximum number of parcels for finite installment */
const MAX_PARCEL_COUNT = 48;

/** Pattern for validating YYYY-MM format */
const REFERENCE_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

// ─── Input Interfaces ────────────────────────────────────────────────────────

export interface StandardEntryValidationInput {
  title: string;
  description: string;
  amount: number; // cents
  date: Date;
  categoryId: string | null;
  referenceMonth: string; // YYYY-MM
}

export interface InstallmentEntryValidationInput {
  title: string;
  description: string;
  totalAmount: number; // cents
  parcelCount: number; // 2-48 or Infinity
  startMonth: string; // YYYY-MM
  categoryId: string | null;
  isInfinite: boolean;
}

export interface BatchEntryValidationInput {
  amount: number; // cents
  description: string; // optional per-entry description
  date: Date;
  referenceMonth: string; // YYYY-MM
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

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

function validateDate(date: unknown, errors: string[]): void {
  if (date === null || date === undefined) {
    errors.push('Date is required');
    return;
  }
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    errors.push('Date must be a valid Date');
  }
}

function validateCategoryId(categoryId: string | null, errors: string[]): void {
  if (categoryId === null || categoryId === undefined || categoryId.trim() === '') {
    errors.push('Category is required');
  }
}

function validateReferenceMonthField(referenceMonth: string, errors: string[]): void {
  if (!referenceMonth || typeof referenceMonth !== 'string') {
    errors.push('Reference month is required');
    return;
  }
  if (!REFERENCE_MONTH_PATTERN.test(referenceMonth)) {
    errors.push('Reference month must be in YYYY-MM format (e.g., 2025-01)');
  }
}

// ─── Public Validation Functions ─────────────────────────────────────────────

/**
 * Validates a title field.
 *
 * Accepts if and only if `title.trim().length` is between 1 and 100 (inclusive).
 * Strings composed entirely of whitespace or exceeding 100 characters after
 * trimming are rejected.
 *
 * @param title - The title string to validate
 * @returns ValidationResult with valid flag and error messages
 */
export function validateTitle(title: string): ValidationResult {
  const errors: string[] = [];
  const trimmed = title.trim();

  if (trimmed.length < TITLE_MIN_LENGTH) {
    errors.push('Title is required');
  } else if (trimmed.length > TITLE_MAX_LENGTH) {
    errors.push(`Title must be at most ${TITLE_MAX_LENGTH} characters`);
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Validates a description field.
 *
 * Accepts if and only if `description.length` is at most 500.
 * An empty string is accepted (description is optional).
 *
 * @param description - The description string to validate
 * @returns ValidationResult with valid flag and error messages
 */
export function validateDescription(description: string): ValidationResult {
  const errors: string[] = [];

  if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.push(`Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`);
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Validates a standard (single) entry input.
 *
 * Checks:
 * - Title (1–100 chars after trim, required)
 * - Description (0–500 chars, optional)
 * - Amount range (1 to 99999999999 cents)
 * - Date (required, valid Date)
 * - Category (required)
 * - Reference month (required, YYYY-MM format)
 *
 * @param input - The standard entry validation input
 * @returns ValidationResult with valid flag and error messages
 */
export function validateStandardEntry(input: StandardEntryValidationInput): ValidationResult {
  const errors: string[] = [];

  // Title validation
  const titleResult = validateTitle(input.title);
  if (!titleResult.valid && titleResult.errors) {
    errors.push(...titleResult.errors);
  }

  // Description validation
  const descResult = validateDescription(input.description);
  if (!descResult.valid && descResult.errors) {
    errors.push(...descResult.errors);
  }

  validateAmount(input.amount, errors);
  validateDate(input.date, errors);
  validateCategoryId(input.categoryId, errors);
  validateReferenceMonthField(input.referenceMonth, errors);

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Validates an installment entry input.
 *
 * Checks:
 * - Title (1–100 chars after trim, required)
 * - Description (0–500 chars, optional)
 * - Total amount range (1 to 99999999999 cents)
 * - Parcel count (2–48 for finite, ignored for infinite)
 * - Start month (required, YYYY-MM format)
 * - Category (required)
 * - Minimum parcel value: floor(totalAmount / parcelCount) ≥ 1 cent (finite only)
 *
 * @param input - The installment entry validation input
 * @returns ValidationResult with valid flag and error messages
 */
export function validateInstallmentEntry(input: InstallmentEntryValidationInput): ValidationResult {
  const errors: string[] = [];

  // Title validation
  const titleResult = validateTitle(input.title);
  if (!titleResult.valid && titleResult.errors) {
    errors.push(...titleResult.errors);
  }

  // Description validation
  const descResult = validateDescription(input.description);
  if (!descResult.valid && descResult.errors) {
    errors.push(...descResult.errors);
  }

  validateAmount(input.totalAmount, errors);
  validateCategoryId(input.categoryId, errors);

  // Validate startMonth
  if (!input.startMonth || typeof input.startMonth !== 'string') {
    errors.push('Start month is required');
  } else if (!REFERENCE_MONTH_PATTERN.test(input.startMonth)) {
    errors.push('Start month must be in YYYY-MM format (e.g., 2025-01)');
  }

  // Parcel count validation (only for finite installments)
  if (!input.isInfinite) {
    if (typeof input.parcelCount !== 'number' || !Number.isInteger(input.parcelCount)) {
      errors.push('Parcel count must be an integer');
    } else if (input.parcelCount < MIN_PARCEL_COUNT || input.parcelCount > MAX_PARCEL_COUNT) {
      errors.push(`Parcel count must be between ${MIN_PARCEL_COUNT} and ${MAX_PARCEL_COUNT}`);
    }

    // Validate minimum parcel value (only if amount and parcel count are valid)
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
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Validates a batch entry input.
 *
 * In batch mode, the title is fixed at the session level, so individual
 * entries only validate: amount, description, date, and referenceMonth.
 *
 * Checks:
 * - Amount range (1 to 99999999999 cents)
 * - Description (0–500 chars, optional)
 * - Date (required, valid Date)
 * - Reference month (required, YYYY-MM format)
 *
 * @param input - The batch entry validation input
 * @returns ValidationResult with valid flag and error messages
 */
export function validateBatchEntry(input: BatchEntryValidationInput): ValidationResult {
  const errors: string[] = [];

  validateAmount(input.amount, errors);

  // Description validation (optional in batch mode)
  const descResult = validateDescription(input.description);
  if (!descResult.valid && descResult.errors) {
    errors.push(...descResult.errors);
  }

  validateDate(input.date, errors);
  validateReferenceMonthField(input.referenceMonth, errors);

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}
