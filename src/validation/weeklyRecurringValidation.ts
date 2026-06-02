/**
 * Weekly Recurring Validation
 *
 * Provides validation functions for weekly recurring groups and occurrences.
 * Amounts are in real values (not cents) with max 2 decimal places.
 *
 * **Validates: Requirements 1.2, 3.3, 3.5, 4.7**
 */

import type { ValidationResult } from '../types/validation';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum title length after trimming */
const TITLE_MIN_LENGTH = 1;

/** Maximum title length after trimming */
const TITLE_MAX_LENGTH = 100;

/** Minimum valid amount for a weekly group (R$ 0.01) */
const GROUP_MIN_AMOUNT = 0.01;

/** Maximum valid amount for a weekly group (R$ 999,999,999.99) */
const GROUP_MAX_AMOUNT = 999999999.99;

/** Minimum valid occurrence amount (negative allowed) */
const OCCURRENCE_MIN_AMOUNT = -999999999;

/** Maximum valid occurrence amount */
const OCCURRENCE_MAX_AMOUNT = 999999999;

/** Maximum years in the past for occurrence dates */
const DATE_PAST_YEARS = 5;

/** Maximum years in the future for occurrence dates */
const DATE_FUTURE_YEARS = 1;

/** Pattern for YYYY-MM-DD format */
const DATE_FORMAT_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// ─── Input Interfaces ────────────────────────────────────────────────────────

export interface WeeklyGroupValidationInput {
  title: string;
  amount: number;
  dayOfWeek: number;
  categoryId: string | null;
}

export interface OccurrenceValueValidationInput {
  amount: number;
}

export interface OccurrenceDateValidationInput {
  date: string; // YYYY-MM-DD
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Checks if a number has more than 2 decimal places.
 */
function hasMoreThanTwoDecimals(value: number): boolean {
  const str = String(value);
  const dotIndex = str.indexOf('.');
  if (dotIndex === -1) return false;
  return str.length - dotIndex - 1 > 2;
}

/**
 * Checks if a date string represents a valid calendar date.
 * For example, 2024-02-30 is not valid.
 */
function isValidCalendarDate(dateStr: string): boolean {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Create a date and check if it matches the input
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Checks if a date is within the allowed range (5 years past to 1 year future).
 */
function isDateInAllowedRange(dateStr: string): boolean {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const inputDate = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = new Date(today);
  minDate.setFullYear(minDate.getFullYear() - DATE_PAST_YEARS);

  const maxDate = new Date(today);
  maxDate.setFullYear(maxDate.getFullYear() + DATE_FUTURE_YEARS);

  return inputDate >= minDate && inputDate <= maxDate;
}

// ─── Public Validation Functions ─────────────────────────────────────────────

/**
 * Validates input for creating or editing a weekly recurring group.
 *
 * Rules:
 * - title: 1-100 chars after trim, not whitespace-only
 * - amount: 0.01 to 999999999.99, max 2 decimal places
 * - dayOfWeek: integer 0-6
 * - categoryId: non-null, non-empty string
 *
 * @param input - The weekly group validation input
 * @returns ValidationResult with valid flag and error messages
 */
export function validateWeeklyGroup(input: WeeklyGroupValidationInput): ValidationResult {
  const errors: string[] = [];

  // Title validation
  const trimmedTitle = input.title.trim();
  if (trimmedTitle.length < TITLE_MIN_LENGTH) {
    errors.push('Title is required');
  } else if (trimmedTitle.length > TITLE_MAX_LENGTH) {
    errors.push(`Title must be at most ${TITLE_MAX_LENGTH} characters`);
  }

  // Amount validation
  if (typeof input.amount !== 'number' || isNaN(input.amount)) {
    errors.push('Amount must be a valid number');
  } else if (input.amount < GROUP_MIN_AMOUNT || input.amount > GROUP_MAX_AMOUNT) {
    errors.push(`Amount must be between ${GROUP_MIN_AMOUNT} and ${GROUP_MAX_AMOUNT}`);
  } else if (hasMoreThanTwoDecimals(input.amount)) {
    errors.push('Amount must have at most 2 decimal places');
  }

  // Day of week validation
  if (
    typeof input.dayOfWeek !== 'number' ||
    isNaN(input.dayOfWeek) ||
    !Number.isInteger(input.dayOfWeek) ||
    input.dayOfWeek < 0 ||
    input.dayOfWeek > 6
  ) {
    errors.push('Day of week must be an integer between 0 (Sunday) and 6 (Saturday)');
  }

  // Category validation
  if (
    input.categoryId === null ||
    input.categoryId === undefined ||
    input.categoryId.trim() === ''
  ) {
    errors.push('Category is required');
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Validates the value for an individual occurrence edit.
 *
 * Rules:
 * - amount: not zero, within [-999999999, 999999999], max 2 decimal places
 *
 * @param input - The occurrence value validation input
 * @returns ValidationResult with valid flag and error messages
 */
export function validateOccurrenceValue(input: OccurrenceValueValidationInput): ValidationResult {
  const errors: string[] = [];

  if (typeof input.amount !== 'number' || isNaN(input.amount)) {
    errors.push('Amount must be a valid number');
  } else if (input.amount === 0) {
    errors.push('Amount cannot be zero');
  } else if (input.amount < OCCURRENCE_MIN_AMOUNT || input.amount > OCCURRENCE_MAX_AMOUNT) {
    errors.push(`Amount must be between ${OCCURRENCE_MIN_AMOUNT} and ${OCCURRENCE_MAX_AMOUNT}`);
  } else if (hasMoreThanTwoDecimals(input.amount)) {
    errors.push('Amount must have at most 2 decimal places');
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Validates the date for an individual occurrence edit.
 *
 * Rules:
 * - format: YYYY-MM-DD
 * - valid calendar date (e.g., reject 2024-02-30)
 * - within range: 5 years past to 1 year future from today
 *
 * @param input - The occurrence date validation input
 * @returns ValidationResult with valid flag and error messages
 */
export function validateOccurrenceDate(input: OccurrenceDateValidationInput): ValidationResult {
  const errors: string[] = [];

  // Format validation
  if (!input.date || !DATE_FORMAT_PATTERN.test(input.date)) {
    errors.push('Date must be in YYYY-MM-DD format');
    return { valid: false, errors };
  }

  // Calendar validity
  if (!isValidCalendarDate(input.date)) {
    errors.push('Date must be a valid calendar date');
    return { valid: false, errors };
  }

  // Range validation
  if (!isDateInAllowedRange(input.date)) {
    errors.push(
      `Date must be within ${DATE_PAST_YEARS} years in the past and ${DATE_FUTURE_YEARS} year in the future`
    );
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}
