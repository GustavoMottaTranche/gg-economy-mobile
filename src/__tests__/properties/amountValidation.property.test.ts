/**
 * Property 8: Amount validation rejects invalid values
 *
 * For any amount ≤ 0 or > 99999999999, validation returns `valid: false`
 *
 * **Validates: Requirements 8.1**
 */

import * as fc from 'fast-check';
import {
  validateInstallmentEntry,
  validateStandardEntry,
} from '../../validation/installmentValidation';
import type {
  InstallmentValidationInput,
  StandardValidationInput,
} from '../../types/validation';

describe('Property 8: Amount validation rejects invalid values', () => {
  // Valid base inputs to isolate amount validation
  const validInstallmentBase: Omit<InstallmentValidationInput, 'totalAmount'> = {
    parcelCount: 4,
    description: 'Test purchase',
    startMonth: '2025-01',
    categoryId: 'cat-123',
  };

  const validStandardBase: Omit<StandardValidationInput, 'amount'> = {
    description: 'Test purchase',
    date: new Date('2025-01-15'),
    categoryId: 'cat-123',
    referenceMonth: '2025-01',
  };

  describe('validateInstallmentEntry rejects invalid amounts', () => {
    it('should reject amounts ≤ 0 (zero and negative)', () => {
      fc.assert(
        fc.property(
          fc.integer({ max: 0 }),
          (invalidAmount) => {
            const input: InstallmentValidationInput = {
              ...validInstallmentBase,
              totalAmount: invalidAmount,
            };
            const result = validateInstallmentEntry(input);
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject amounts > 99999999999', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100000000000, max: 999999999999 }),
          (invalidAmount) => {
            const input: InstallmentValidationInput = {
              ...validInstallmentBase,
              totalAmount: invalidAmount,
            };
            const result = validateInstallmentEntry(input);
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('validateStandardEntry rejects invalid amounts', () => {
    it('should reject amounts ≤ 0 (zero and negative)', () => {
      fc.assert(
        fc.property(
          fc.integer({ max: 0 }),
          (invalidAmount) => {
            const input: StandardValidationInput = {
              ...validStandardBase,
              amount: invalidAmount,
            };
            const result = validateStandardEntry(input);
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject amounts > 99999999999', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100000000000, max: 999999999999 }),
          (invalidAmount) => {
            const input: StandardValidationInput = {
              ...validStandardBase,
              amount: invalidAmount,
            };
            const result = validateStandardEntry(input);
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
