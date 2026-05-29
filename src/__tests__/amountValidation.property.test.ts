// Feature: statement-payment-integration, Property 4: Invalid amounts are always rejected

/**
 * Property 4: Invalid amounts are always rejected
 *
 * For any input value that is zero, negative, or non-numeric, the amount validation
 * function SHALL reject it and return an error, leaving the occurrence amount unchanged.
 *
 * **Validates: Requirements 2.4**
 */

import * as fc from 'fast-check';
import { validateParcelAmount } from '../validation/parcelAmountValidation';

describe('Property 4: Invalid amounts are always rejected', () => {
  describe('Negative numbers are always rejected', () => {
    it('should return { valid: false } for any negative number', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1e15, max: -Number.MIN_VALUE, noNaN: true, noDefaultInfinity: true }),
          (negativeValue) => {
            const result = validateParcelAmount(negativeValue);
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return { valid: false } for any negative integer', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000000, max: -1 }),
          (negativeInt) => {
            const result = validateParcelAmount(negativeInt);
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Zero is always rejected', () => {
    it('should return { valid: false } for zero', () => {
      const result = validateParcelAmount(0);
      expect(result.valid).toBe(false);
    });

    it('should return { valid: false } for zero as string', () => {
      const result = validateParcelAmount('0');
      expect(result.valid).toBe(false);
    });
  });

  describe('Positive numbers are always accepted', () => {
    it('should return { valid: true, amount } for any positive number', () => {
      fc.assert(
        fc.property(
          fc.double({ min: Number.MIN_VALUE, max: 1e15, noNaN: true, noDefaultInfinity: true }),
          (positiveValue) => {
            const result = validateParcelAmount(positiveValue);
            return result.valid === true && result.amount === positiveValue;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return { valid: true, amount } for any positive integer', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000000 }),
          (positiveInt) => {
            const result = validateParcelAmount(positiveInt);
            return result.valid === true && result.amount === positiveInt;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return { valid: true, amount } for positive number strings', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 1e10, noNaN: true, noDefaultInfinity: true }),
          (positiveValue) => {
            const result = validateParcelAmount(String(positiveValue));
            return result.valid === true && result.amount === positiveValue;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Non-numeric values are always rejected', () => {
    it('should return { valid: false } for arbitrary non-numeric strings', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => {
            const trimmed = s.trim();
            if (trimmed === '') return true; // empty strings are non-numeric
            const num = Number(trimmed);
            return isNaN(num) || !isFinite(num);
          }),
          (nonNumericString) => {
            const result = validateParcelAmount(nonNumericString);
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return { valid: false } for objects', () => {
      fc.assert(
        fc.property(
          fc.object(),
          (obj) => {
            const result = validateParcelAmount(obj);
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return { valid: false } for null and undefined', () => {
      expect(validateParcelAmount(null).valid).toBe(false);
      expect(validateParcelAmount(undefined).valid).toBe(false);
    });

    it('should return { valid: false } for NaN and Infinity', () => {
      expect(validateParcelAmount(NaN).valid).toBe(false);
      expect(validateParcelAmount(Infinity).valid).toBe(false);
      expect(validateParcelAmount(-Infinity).valid).toBe(false);
    });

    it('should return { valid: false } for boolean values', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (boolVal) => {
            const result = validateParcelAmount(boolVal);
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return { valid: false } for arrays', () => {
      fc.assert(
        fc.property(
          fc.array(fc.anything()),
          (arr) => {
            const result = validateParcelAmount(arr);
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
