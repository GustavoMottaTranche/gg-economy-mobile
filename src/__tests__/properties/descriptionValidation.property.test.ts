/**
 * Property-Based Test: Description validation rejects invalid inputs (Property 9)
 *
 * For any string that is empty, composed entirely of whitespace characters,
 * or longer than 100 characters, the validation function SHALL return
 * `valid: false` with an appropriate error message.
 *
 * **Validates: Requirements 8.2**
 */

import fc from 'fast-check';
import {
  validateInstallmentEntry,
  validateStandardEntry,
} from '../../validation/installmentValidation';

/**
 * Helper: creates a valid InstallmentValidationInput with a custom description.
 */
function makeValidInstallmentInput(description: string) {
  return {
    totalAmount: 10000, // R$ 100.00 in cents
    parcelCount: 3,
    description,
    startMonth: '2025-01',
    categoryId: 'cat-123',
  };
}

/**
 * Helper: creates a valid StandardValidationInput with a custom description.
 */
function makeValidStandardInput(description: string) {
  return {
    amount: 5000, // R$ 50.00 in cents
    description,
    date: new Date('2025-01-15'),
    categoryId: 'cat-123',
    referenceMonth: '2025-01',
  };
}

describe('Property 9: Description validation rejects invalid inputs', () => {
  /**
   * Feature: manual-entry-installments, Property 9: Description validation rejects invalid inputs
   *
   * **Validates: Requirements 8.2**
   */

  describe('validateInstallmentEntry rejects invalid descriptions', () => {
    it('should reject empty string description', () => {
      fc.assert(
        fc.property(fc.constant(''), (description) => {
          const input = makeValidInstallmentInput(description);
          const result = validateInstallmentEntry(input);
          expect(result.valid).toBe(false);
          expect(result.errors).toBeDefined();
          expect(result.errors!.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject whitespace-only descriptions', () => {
      const whitespaceArbitrary = fc
        .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), {
          minLength: 1,
          maxLength: 100,
        })
        .map((chars) => chars.join(''));

      fc.assert(
        fc.property(whitespaceArbitrary, (description) => {
          const input = makeValidInstallmentInput(description);
          const result = validateInstallmentEntry(input);
          expect(result.valid).toBe(false);
          expect(result.errors).toBeDefined();
          expect(result.errors!.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject descriptions longer than 100 characters', () => {
      const longStringArbitrary = fc.string({ minLength: 101, maxLength: 500 });

      fc.assert(
        fc.property(longStringArbitrary, (description) => {
          const input = makeValidInstallmentInput(description);
          const result = validateInstallmentEntry(input);
          expect(result.valid).toBe(false);
          expect(result.errors).toBeDefined();
          expect(result.errors!.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('validateStandardEntry rejects invalid descriptions', () => {
    it('should reject empty string description', () => {
      fc.assert(
        fc.property(fc.constant(''), (description) => {
          const input = makeValidStandardInput(description);
          const result = validateStandardEntry(input);
          expect(result.valid).toBe(false);
          expect(result.errors).toBeDefined();
          expect(result.errors!.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject whitespace-only descriptions', () => {
      const whitespaceArbitrary = fc
        .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), {
          minLength: 1,
          maxLength: 100,
        })
        .map((chars) => chars.join(''));

      fc.assert(
        fc.property(whitespaceArbitrary, (description) => {
          const input = makeValidStandardInput(description);
          const result = validateStandardEntry(input);
          expect(result.valid).toBe(false);
          expect(result.errors).toBeDefined();
          expect(result.errors!.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject descriptions longer than 100 characters', () => {
      const longStringArbitrary = fc.string({ minLength: 101, maxLength: 500 });

      fc.assert(
        fc.property(longStringArbitrary, (description) => {
          const input = makeValidStandardInput(description);
          const result = validateStandardEntry(input);
          expect(result.valid).toBe(false);
          expect(result.errors).toBeDefined();
          expect(result.errors!.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });
});
