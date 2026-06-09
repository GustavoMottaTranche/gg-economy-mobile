// Feature: future-plans-funds, Property 6: Fund name validation

/**
 * Property 6: Fund name validation
 *
 * For any string of length 0 or greater than 50 characters, the fund name validation
 * SHALL return `{ valid: false }`. For any string of length 1-50, the validation
 * SHALL return `{ valid: true }`.
 *
 * **Validates: Requirements 5.6**
 */

import * as fc from 'fast-check';
import { validateFundName } from '../validation/fundValidation';

describe('Property 6: Fund name validation', () => {
  describe('Empty strings are always rejected', () => {
    it('should return { valid: false } for empty string', () => {
      const result = validateFundName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('futurePlans.validation.nameRequired');
    });

    it('should return { valid: false } for whitespace-only strings', () => {
      fc.assert(
        fc.property(
          fc
            .array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 20 })
            .map((chars) => chars.join('')),
          (whitespace) => {
            const result = validateFundName(whitespace);
            return result.valid === false && result.error === 'futurePlans.validation.nameRequired';
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Strings longer than 50 characters are always rejected', () => {
    it('should return { valid: false } for any string with trimmed length > 50', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 51, maxLength: 200 }).filter((s) => s.trim().length > 50),
          (longString) => {
            const result = validateFundName(longString);
            return result.valid === false && result.error === 'futurePlans.validation.nameTooLong';
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Strings with trimmed length 1-50 are always accepted', () => {
    it('should return { valid: true } for any non-whitespace string of length 1-50', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim().length >= 1 && s.trim().length <= 50),
          (validName) => {
            const result = validateFundName(validName);
            return result.valid === true && result.error === undefined;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return { valid: true } for boundary length 1', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1 }).filter((c) => c.trim().length === 1),
          (singleChar) => {
            const result = validateFundName(singleChar);
            return result.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return { valid: true } for boundary length 50', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 50, maxLength: 50 }).filter((s) => s.trim().length === 50),
          (exactly50) => {
            const result = validateFundName(exactly50);
            return result.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
