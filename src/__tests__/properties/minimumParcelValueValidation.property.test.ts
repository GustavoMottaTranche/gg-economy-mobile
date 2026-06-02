/**
 * Property-Based Test: Minimum Parcel Value Validation (Property 10)
 *
 * For any total amount and parcel count where `floor(total / count) < 1`
 * (resulting in sub-cent parcels), the validation function SHALL return
 * `valid: false` and prevent installment creation.
 *
 * **Validates: Requirements 8.4**
 */

import fc from 'fast-check';
import { validateInstallmentEntry } from '../../validation/installmentValidation';

describe('Property 10: Minimum parcel value validation', () => {
  /**
   * Feature: manual-entry-installments, Property 10: Minimum parcel value validation
   *
   * For any total and count where floor(total/count) < 1, validation returns valid: false.
   *
   * **Validates: Requirements 8.4**
   */
  it('should reject installment entries where floor(total/count) < 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 48 }).chain((parcelCount) =>
          fc.record({
            parcelCount: fc.constant(parcelCount),
            totalAmount: fc.integer({ min: 1, max: parcelCount - 1 }),
          })
        ),
        ({ parcelCount, totalAmount }) => {
          // Precondition: floor(total/count) < 1
          expect(Math.floor(totalAmount / parcelCount)).toBeLessThan(1);

          const input = {
            totalAmount,
            parcelCount,
            description: 'Test installment',
            startMonth: '2025-01',
            categoryId: 'category-123',
          };

          const result = validateInstallmentEntry(input);

          expect(result.valid).toBe(false);
          expect(result.errors).toBeDefined();
          expect(result.errors!.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
