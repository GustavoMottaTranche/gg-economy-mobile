// Feature: variable-expense-goals, Property 3: Goal validation rejects invalid amounts

/**
 * Property 3: Goal validation rejects invalid amounts
 *
 * For any numeric value that is ≤ 0, > 999,999,999.99, NaN, or non-numeric input,
 * the goal validation function SHALL return `{ valid: false }` and never persist the value.
 * For any valid amount in range [0.01, 999,999,999.99], it SHALL return `{ valid: true }`.
 *
 * **Validates: Requirements 1.8, 2.7, 7.5**
 */

import * as fc from 'fast-check';
import { validateGoalAmount } from '../validation/goalValidation';
import type { SupportedLocale } from '../utils/formatCurrency';

const locales: SupportedLocale[] = ['pt-BR', 'en'];

describe('Property 3: Goal validation rejects invalid amounts', () => {
  describe('Values ≤ 0 are always rejected', () => {
    it('should return { valid: false } for any negative number', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1e12, max: -0.01, noNaN: true, noDefaultInfinity: true }),
          fc.constantFrom(...locales),
          (negativeValue, locale) => {
            const result = validateGoalAmount(negativeValue, locale);
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return { valid: false } for zero', () => {
      for (const locale of locales) {
        const result = validateGoalAmount(0, locale);
        expect(result.valid).toBe(false);
      }
    });

    it('should return { valid: false } for zero as string', () => {
      for (const locale of locales) {
        const result = validateGoalAmount('0', locale);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('Values > 999,999,999.99 are always rejected', () => {
    it('should return { valid: false } for any value exceeding the maximum', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 999999999.995, max: 1e15, noNaN: true, noDefaultInfinity: true }),
          fc.constantFrom(...locales),
          (largeValue, locale) => {
            const result = validateGoalAmount(largeValue, locale);
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('NaN and non-finite values are always rejected', () => {
    it('should return { valid: false } for NaN', () => {
      for (const locale of locales) {
        const result = validateGoalAmount(NaN, locale);
        expect(result.valid).toBe(false);
      }
    });

    it('should return { valid: false } for Infinity', () => {
      for (const locale of locales) {
        expect(validateGoalAmount(Infinity, locale).valid).toBe(false);
        expect(validateGoalAmount(-Infinity, locale).valid).toBe(false);
      }
    });
  });

  describe('Non-numeric strings are always rejected', () => {
    it('should return { valid: false } for arbitrary non-numeric strings', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => {
            const trimmed = s.trim();
            if (trimmed === '') return true;
            // Filter to strings that are clearly non-numeric after locale processing
            return !/^\d/.test(trimmed) && !trimmed.startsWith('R$');
          }),
          fc.constantFrom(...locales),
          (nonNumericString, locale) => {
            const result = validateGoalAmount(nonNumericString, locale);
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return { valid: false } for empty string', () => {
      for (const locale of locales) {
        const result = validateGoalAmount('', locale);
        expect(result.valid).toBe(false);
      }
    });

    it('should return { valid: false } for whitespace-only strings', () => {
      fc.assert(
        fc.property(
          fc
            .array(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 10 })
            .map((chars) => chars.join('')),
          fc.constantFrom(...locales),
          (whitespace, locale) => {
            const result = validateGoalAmount(whitespace, locale);
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Valid amounts in range [0.01, 999,999,999.99] are always accepted', () => {
    it('should return { valid: true } for any valid number in range', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 999999999.99, noNaN: true, noDefaultInfinity: true }),
          fc.constantFrom(...locales),
          (validValue, locale) => {
            const result = validateGoalAmount(validValue, locale);
            return result.valid === true && typeof result.amountInCents === 'number';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return { valid: true } with correct cents conversion for valid integers', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 999999999 }),
          fc.constantFrom(...locales),
          (validInt, locale) => {
            const result = validateGoalAmount(validInt, locale);
            return result.valid === true && result.amountInCents === Math.round(validInt * 100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return { valid: true } for valid string inputs in en locale', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 99999999 }),
          fc.integer({ min: 0, max: 99 }),
          (whole, cents) => {
            const input = cents > 0 ? `${whole}.${String(cents).padStart(2, '0')}` : `${whole}`;
            const result = validateGoalAmount(input, 'en');
            return result.valid === true && typeof result.amountInCents === 'number';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return { valid: true } for valid string inputs in pt-BR locale', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 99999999 }),
          fc.integer({ min: 0, max: 99 }),
          (whole, cents) => {
            const input = cents > 0 ? `${whole},${String(cents).padStart(2, '0')}` : `${whole}`;
            const result = validateGoalAmount(input, 'pt-BR');
            return result.valid === true && typeof result.amountInCents === 'number';
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
