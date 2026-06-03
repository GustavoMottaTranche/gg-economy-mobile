/**
 * Goal Validation
 *
 * Provides validation for budget goal amounts with locale-aware parsing.
 * Accepts values between 0.01 and 999,999,999.99, converts to cents.
 *
 * **Validates: Requirements 1.8, 2.7, 7.5, 7.6**
 */

import type { SupportedLocale } from '../utils/formatCurrency';
import type { GoalValidationResult } from '../types/goal';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum goal value in cents (R$ 0.01) */
const MIN_GOAL_CENTS = 1;

/** Maximum goal value in cents (R$ 999,999,999.99) */
const MAX_GOAL_CENTS = 99999999999;

/** Minimum goal value in currency units */
const MIN_GOAL_VALUE = 0.01;

/** Maximum goal value in currency units */
const MAX_GOAL_VALUE = 999999999.99;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Validates a goal amount input and converts to cents.
 *
 * Handles locale-specific decimal separators:
 * - pt-BR: comma (,) as decimal, dot (.) as grouping
 * - en: dot (.) as decimal, comma (,) as grouping
 *
 * @param input - Raw input value (string from user input or number)
 * @param locale - Current locale for parsing
 * @returns Validation result with amount in cents if valid, or i18n error key if invalid
 *
 * @example
 * validateGoalAmount("1.500,00", "pt-BR") // { valid: true, amountInCents: 150000 }
 * validateGoalAmount("1,500.00", "en") // { valid: true, amountInCents: 150000 }
 * validateGoalAmount("0", "en") // { valid: false, error: "goals.validation.tooLow" }
 * validateGoalAmount("abc", "en") // { valid: false, error: "goals.validation.invalidFormat" }
 */
export function validateGoalAmount(
  input: string | number,
  locale: SupportedLocale
): GoalValidationResult {
  const numericValue = parseInput(input, locale);

  // Check if parsing produced a valid number
  if (numericValue === null) {
    return { valid: false, error: 'goals.validation.invalidFormat' };
  }

  // Check minimum value
  if (numericValue < MIN_GOAL_VALUE) {
    return { valid: false, error: 'goals.validation.tooLow' };
  }

  // Check maximum value
  if (numericValue > MAX_GOAL_VALUE) {
    return { valid: false, error: 'goals.validation.tooHigh' };
  }

  // Convert to cents (round to avoid floating-point imprecision)
  const amountInCents = Math.round(numericValue * 100);

  // Final sanity check on cents range
  if (amountInCents < MIN_GOAL_CENTS || amountInCents > MAX_GOAL_CENTS) {
    return { valid: false, error: 'goals.validation.tooHigh' };
  }

  return { valid: true, amountInCents };
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Parses a string or number input into a numeric currency value based on locale.
 *
 * @returns The parsed numeric value, or null if the input is invalid.
 */
function parseInput(input: string | number, locale: SupportedLocale): number | null {
  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) {
      return null;
    }
    return input;
  }

  if (typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();

  if (trimmed === '') {
    return null;
  }

  // Remove currency symbols and whitespace
  let cleaned = trimmed.replace(/[R$€£¥\s]/g, '').trim();

  // Reject negative values
  if (cleaned.startsWith('-') || cleaned.includes('(')) {
    return null;
  }

  // Parse based on locale decimal/grouping separators
  if (locale === 'pt-BR') {
    // pt-BR: dot (.) is grouping separator, comma (,) is decimal
    cleaned = cleaned.replace(/\./g, ''); // Remove grouping separators
    cleaned = cleaned.replace(',', '.'); // Convert decimal separator to standard
  } else {
    // en: comma (,) is grouping separator, dot (.) is decimal
    cleaned = cleaned.replace(/,/g, ''); // Remove grouping separators
  }

  // Reject if not a valid numeric string after cleaning
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) {
    return null;
  }

  const parsed = parseFloat(cleaned);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return null;
  }

  return parsed;
}
