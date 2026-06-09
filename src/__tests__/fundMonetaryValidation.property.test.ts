// Feature: future-plans-funds, Property 7: Monetary input validation

/**
 * Property 7: Monetary input validation
 *
 * For any numeric value ≤ 0, > 999,999,999.99, NaN, or non-numeric input,
 * the monetary validation function SHALL return `{ valid: false }`.
 * For any value between 0.01 and 999,999,999.99, it SHALL return
 * `{ valid: true, amountInCents }` with correct cent conversion.
 *
 * **Validates: Requirements 2.5, 6.7**
 */

import * as fc from 'fast-check';
import { validateMonetaryInput } from '../validation/fundValidation';

describe('Property 7: Monetary input validation', () => {
  describe('Valid numeric values in range [0.01, 999999999.99] return valid with correct cents', () => {
    it('should return { valid: true, amountInCents } for numbers in valid range (en locale)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 999999999.99, noNaN: true }).map(
            (v) =>
              // Round to 2 decimal places to stay within valid range
              Math.round(v * 100) / 100
          ),
          (value) => {
            const result = validateMonetaryInput(value, 'en');
            const expectedCents = Math.round(value * 100);
            return (
              result.valid === true &&
              result.amountInCents === expectedCents &&
              result.error === undefined
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return { valid: true, amountInCents } for numbers in valid range (pt-BR locale)', () => {
      fc.assert(
        fc.property(
          fc
            .double({ min: 0.01, max: 999999999.99, noNaN: true })
            .map((v) => Math.round(v * 100) / 100),
          (value) => {
            const result = validateMonetaryInput(value, 'pt-BR');
            const expectedCents = Math.round(value * 100);
            return (
              result.valid === true &&
              result.amountInCents === expectedCents &&
              result.error === undefined
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle string inputs with valid numeric format (en locale)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 99999999999 }).map((cents) => (cents / 100).toFixed(2)),
          (valueStr) => {
            const result = validateMonetaryInput(valueStr, 'en');
            const expectedCents = Math.round(parseFloat(valueStr) * 100);
            return result.valid === true && result.amountInCents === expectedCents;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle string inputs with pt-BR format (comma as decimal)', () => {
      fc.assert(
        fc.property(
          fc
            .integer({ min: 1, max: 99999999999 })
            .map((cents) => (cents / 100).toFixed(2).replace('.', ',')),
          (valueStr) => {
            const result = validateMonetaryInput(valueStr, 'pt-BR');
            const numericValue = parseFloat(valueStr.replace(',', '.'));
            const expectedCents = Math.round(numericValue * 100);
            return result.valid === true && result.amountInCents === expectedCents;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Values ≤ 0 are always rejected', () => {
    it('should return { valid: false } for zero', () => {
      const result = validateMonetaryInput(0, 'en');
      expect(result.valid).toBe(false);
    });

    it('should return { valid: false } for negative numbers', () => {
      fc.assert(
        fc.property(fc.double({ min: -999999999, max: -0.01, noNaN: true }), (value) => {
          const result = validateMonetaryInput(value, 'en');
          return result.valid === false;
        }),
        { numRuns: 100 }
      );
    });

    it('should return { valid: false } for zero string', () => {
      const resultEn = validateMonetaryInput('0', 'en');
      const resultPtBR = validateMonetaryInput('0', 'pt-BR');
      expect(resultEn.valid).toBe(false);
      expect(resultPtBR.valid).toBe(false);
    });
  });

  describe('Values > 999999999.99 are always rejected', () => {
    it('should return { valid: false } for values exceeding maximum', () => {
      fc.assert(
        fc.property(fc.double({ min: 1000000000, max: 9999999999, noNaN: true }), (value) => {
          const result = validateMonetaryInput(value, 'en');
          return result.valid === false;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('NaN and Infinity are always rejected', () => {
    it('should return { valid: false } for NaN', () => {
      const result = validateMonetaryInput(NaN, 'en');
      expect(result.valid).toBe(false);
    });

    it('should return { valid: false } for Infinity', () => {
      const result = validateMonetaryInput(Infinity, 'en');
      expect(result.valid).toBe(false);
    });

    it('should return { valid: false } for -Infinity', () => {
      const result = validateMonetaryInput(-Infinity, 'en');
      expect(result.valid).toBe(false);
    });
  });

  describe('Non-numeric strings are always rejected', () => {
    it('should return { valid: false } for purely alphabetic strings', () => {
      fc.assert(
        fc.property(
          fc
            .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
              minLength: 1,
              maxLength: 20,
            })
            .map((chars) => chars.join('')),
          (nonNumeric) => {
            const result = validateMonetaryInput(nonNumeric, 'en');
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return { valid: false } for empty string', () => {
      const result = validateMonetaryInput('', 'en');
      expect(result.valid).toBe(false);
    });

    it('should return { valid: false } for whitespace-only strings', () => {
      fc.assert(
        fc.property(
          fc
            .array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 10 })
            .map((chars) => chars.join('')),
          (whitespace) => {
            const result = validateMonetaryInput(whitespace, 'en');
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return { valid: false } for strings with special characters only', () => {
      fc.assert(
        fc.property(
          fc
            .array(fc.constantFrom('!', '@', '#', '%', '&', '*', '?', '/', '\\', '|'), {
              minLength: 1,
              maxLength: 10,
            })
            .map((chars) => chars.join('')),
          (specialChars) => {
            const result = validateMonetaryInput(specialChars, 'en');
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
