/**
 * Fund Validation
 *
 * Provides validation for fund names and monetary inputs with locale-aware parsing.
 * Fund names must be 1-50 characters.
 * Monetary values must be between 0.01 and 999,999,999.99, converted to cents.
 *
 * **Validates: Requirements 2.5, 5.6, 6.7**
 */

import type { SupportedLocale } from '../utils/formatCurrency';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FundNameValidationResult {
  valid: boolean;
  error?: string;
}

export interface MonetaryValidationResult {
  valid: boolean;
  amountInCents?: number;
  error?: string;
}

export interface MonetaryValidationOptions {
  /** Allow zero as a valid value (default: false) */
  allowZero?: boolean;
  /** Maximum amount in cents (default: 99999999999 = 999,999,999.99) */
  maxCents?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum fund name length */
const FUND_NAME_MIN_LENGTH = 1;

/** Maximum fund name length */
const FUND_NAME_MAX_LENGTH = 50;

/** Default minimum monetary value in cents (0.01) */
const DEFAULT_MIN_CENTS = 1;

/** Default maximum monetary value in cents (999,999,999.99) */
const DEFAULT_MAX_CENTS = 99999999999;

/** Minimum monetary value in currency units */
const MIN_MONETARY_VALUE = 0.01;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Validates a fund name.
 *
 * Valid if the trimmed name is between 1 and 50 characters (inclusive).
 *
 * @param name - The fund name to validate
 * @returns Validation result with error i18n key if invalid
 *
 * @example
 * validateFundName("Travel") // { valid: true }
 * validateFundName("") // { valid: false, error: "futurePlans.validation.nameRequired" }
 * validateFundName("A".repeat(51)) // { valid: false, error: "futurePlans.validation.nameTooLong" }
 */
export function validateFundName(name: string): FundNameValidationResult {
  const trimmed = name.trim();

  if (trimmed.length < FUND_NAME_MIN_LENGTH) {
    return { valid: false, error: 'futurePlans.validation.nameRequired' };
  }

  if (trimmed.length > FUND_NAME_MAX_LENGTH) {
    return { valid: false, error: 'futurePlans.validation.nameTooLong' };
  }

  return { valid: true };
}

/**
 * Validates a monetary input and converts to cents.
 *
 * Handles locale-specific decimal separators:
 * - pt-BR: comma (,) as decimal, dot (.) as grouping
 * - en: dot (.) as decimal, comma (,) as grouping
 *
 * @param input - Raw input value (string from user input or number)
 * @param locale - Current locale for parsing
 * @param options - Validation options
 * @returns Validation result with amount in cents if valid, or i18n error key if invalid
 *
 * @example
 * validateMonetaryInput("1.500,00", "pt-BR") // { valid: true, amountInCents: 150000 }
 * validateMonetaryInput("1,500.00", "en") // { valid: true, amountInCents: 150000 }
 * validateMonetaryInput("0", "en") // { valid: false, error: "futurePlans.validation.amountTooLow" }
 * validateMonetaryInput("abc", "en") // { valid: false, error: "futurePlans.validation.invalidFormat" }
 */
export function validateMonetaryInput(
  input: string | number,
  locale: SupportedLocale,
  options?: MonetaryValidationOptions
): MonetaryValidationResult {
  const { allowZero = false, maxCents = DEFAULT_MAX_CENTS } = options ?? {};

  const maxValue = maxCents / 100;
  const minValue = allowZero ? 0 : MIN_MONETARY_VALUE;
  const minCents = allowZero ? 0 : DEFAULT_MIN_CENTS;

  const numericValue = parseInput(input, locale);

  // Check if parsing produced a valid number
  if (numericValue === null) {
    return { valid: false, error: 'futurePlans.validation.invalidFormat' };
  }

  // Check minimum value
  if (numericValue < minValue) {
    return { valid: false, error: 'futurePlans.validation.amountTooLow' };
  }

  // Check maximum value
  if (numericValue > maxValue) {
    return { valid: false, error: 'futurePlans.validation.amountTooHigh' };
  }

  // Convert to cents (round to avoid floating-point imprecision)
  const amountInCents = Math.round(numericValue * 100);

  // Final sanity check on cents range
  if (amountInCents < minCents || amountInCents > maxCents) {
    return { valid: false, error: 'futurePlans.validation.amountTooHigh' };
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
