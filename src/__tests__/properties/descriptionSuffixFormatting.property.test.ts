/**
 * Property-Based Test: Description Suffix Formatting (Property 3)
 *
 * For any non-empty description string and valid parcel count N (2 to 48),
 * the installment creation logic SHALL produce N descriptions where the i-th
 * description suffix equals " (i/N)" for i from 1 to N.
 *
 * **Validates: Requirements 3.3**
 */

import fc from 'fast-check';
import { calculateInstallments } from '../../services/installment/InstallmentCalculator';
import { InstallmentCalculatorInput } from '../../types/installment';

describe('Feature: manual-entry-installments, Property 3: Description suffix formatting', () => {
  // Generate non-empty description strings (1–100 chars, non-whitespace-only)
  const nonEmptyDescriptionArbitrary = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0);

  // Generate valid parcel counts (2–48)
  const parcelCountArbitrary = fc.integer({ min: 2, max: 48 });

  // Generate a valid start month in YYYY-MM format
  const startMonthArbitrary = fc
    .record({
      year: fc.integer({ min: 2000, max: 2099 }),
      month: fc.integer({ min: 1, max: 12 }),
    })
    .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`);

  it('should produce descriptionSuffix "title (i/N)" for each i-th installment', () => {
    fc.assert(
      fc.property(
        nonEmptyDescriptionArbitrary,
        parcelCountArbitrary,
        startMonthArbitrary,
        (title, parcelCount, startMonth) => {
          // Use a valid totalAmount that ensures each parcel >= 1 cent
          const totalAmount = parcelCount * 100;

          const input: InstallmentCalculatorInput = {
            totalAmount,
            parcelCount,
            startMonth,
            title,
            categoryId: 'test-category',
          };

          const installments = calculateInstallments(input);

          // Should produce exactly N installments
          expect(installments.length).toBe(parcelCount);

          // Each installment's descriptionSuffix should equal "title (i/N)"
          for (let i = 0; i < parcelCount; i++) {
            const expectedSuffix = `${title} (${i + 1}/${parcelCount})`;
            expect(installments[i]!.descriptionSuffix).toBe(expectedSuffix);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce correct suffix format for boundary parcel counts', () => {
    fc.assert(
      fc.property(
        nonEmptyDescriptionArbitrary,
        fc.constantFrom(2, 48), // boundary values
        startMonthArbitrary,
        (title, parcelCount, startMonth) => {
          const totalAmount = parcelCount * 100;

          const input: InstallmentCalculatorInput = {
            totalAmount,
            parcelCount,
            startMonth,
            title,
            categoryId: 'test-category',
          };

          const installments = calculateInstallments(input);

          // First installment suffix should be "title (1/N)"
          expect(installments[0]!.descriptionSuffix).toBe(`${title} (1/${parcelCount})`);

          // Last installment suffix should be "title (N/N)"
          expect(installments[parcelCount - 1]!.descriptionSuffix).toBe(
            `${title} (${parcelCount}/${parcelCount})`
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
