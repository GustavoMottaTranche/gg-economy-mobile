/**
 * Parcel Amount Validation
 *
 * Validates amount input for weekly parcel editing in the statement screen.
 * Accepts raw form input (string or number) and rejects zero, negative,
 * or non-numeric values.
 *
 * **Validates: Requirements 2.4**
 */

import type { ValidationResult } from '../types/validation';

// ─── Result Type ─────────────────────────────────────────────────────────────

/**
 * Result of parcel amount validation.
 * On success, contains the validated numeric amount.
 * On failure, contains the validation error message.
 */
export type ParcelAmountValidationResult =
  | { valid: true; amount: number }
  | { valid: false; error: string };

// ─── Public Validation Function ──────────────────────────────────────────────

/**
 * Validates a parcel amount value from form input.
 *
 * Accepts string or number input (as typically received from a text input field)
 * and ensures the value is a valid positive number suitable for a weekly parcel amount.
 *
 * Rules:
 * - Input must be defined and non-null
 * - Input must be convertible to a finite number
 * - Amount must not be zero
 * - Amount must not be negative
 *
 * @param input - Raw input value from the form (could be string, number, or any other type)
 * @returns ParcelAmountValidationResult with either the validated amount or an error message
 *
 * @example
 * validateParcelAmount(150.50)  // { valid: true, amount: 150.50 }
 * validateParcelAmount("42.00") // { valid: true, amount: 42 }
 * validateParcelAmount(0)       // { valid: false, error: "Amount must be greater than zero" }
 * validateParcelAmount(-10)     // { valid: false, error: "Amount must be greater than zero" }
 * validateParcelAmount("")      // { valid: false, error: "Amount must be a valid number" }
 * validateParcelAmount(null)    // { valid: false, error: "Amount must be a valid number" }
 */
export function validateParcelAmount(input: unknown): ParcelAmountValidationResult {
  // Reject null, undefined, and non-string/non-number types
  if (input === null || input === undefined) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  // Convert to number if string
  let numericValue: number;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') {
      return { valid: false, error: 'Amount must be a valid number' };
    }
    numericValue = Number(trimmed);
  } else if (typeof input === 'number') {
    numericValue = input;
  } else {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  // Reject NaN and Infinity
  if (!Number.isFinite(numericValue)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  // Reject zero and negative
  if (numericValue <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }

  return { valid: true, amount: numericValue };
}

/**
 * Validates a parcel amount and returns a standard ValidationResult.
 *
 * This is a convenience wrapper that returns the same ValidationResult format
 * used by other validation functions in the project.
 *
 * @param input - Raw input value from the form
 * @returns ValidationResult with valid flag and error messages
 */
export function validateParcelAmountStandard(input: unknown): ValidationResult {
  const result = validateParcelAmount(input);

  if (result.valid) {
    return { valid: true };
  }

  return { valid: false, errors: [result.error] };
}
