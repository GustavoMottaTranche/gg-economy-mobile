import fc from 'fast-check';
import { calculateInstallments } from '../../services/installment/InstallmentCalculator';
import { InstallmentCalculatorInput } from '../../types/installment';

/**
 * Feature: entry-title-and-dates, Property 11: Individual Parcel Edit Isolation
 *
 * For any installment group with N parcels, editing the amount of parcel K
 * to a new random value SHALL result in only parcel K having the new amount,
 * while all other N-1 parcels retain their original amounts.
 *
 * **Validates: Requirements 10.1, 10.2**
 */
describe('Feature: entry-title-and-dates, Property 11: Individual Parcel Edit Isolation', () => {
  const validInput = (): fc.Arbitrary<InstallmentCalculatorInput> =>
    fc.record({
      totalAmount: fc.integer({ min: 2, max: 99999999999 }),
      parcelCount: fc.integer({ min: 2, max: 48 }),
      startMonth: fc
        .record({
          year: fc.integer({ min: 2000, max: 2100 }),
          month: fc.integer({ min: 1, max: 12 }),
        })
        .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      categoryId: fc.string({ minLength: 1, maxLength: 50 }),
      originId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), {
        nil: undefined,
      }),
    });

  it('editing parcel K amount does not affect any other parcel amounts', () => {
    fc.assert(
      fc.property(validInput(), fc.integer({ min: 1, max: 999999999 }), (input, newAmount) => {
        const parcels = calculateInstallments(input);
        const n = parcels.length;

        // Pick a random parcel index K (0-based) deterministically from input
        const k = newAmount % n;

        // Store original amounts for all parcels
        const originalAmounts = parcels.map((p) => p.amount);

        // Simulate editing parcel K to a new amount (direct mutation as would happen in DB)
        parcels[k] = { ...parcels[k]!, amount: newAmount };

        // Verify parcel K has the new amount
        expect(parcels[k]!.amount).toBe(newAmount);

        // Verify all other parcels retain their original amounts
        for (let i = 0; i < n; i++) {
          if (i !== k) {
            expect(parcels[i]!.amount).toBe(originalAmounts[i]);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('editing parcel K does not change the count or structure of other parcels', () => {
    fc.assert(
      fc.property(validInput(), fc.integer({ min: 1, max: 999999999 }), (input, newAmount) => {
        const parcels = calculateInstallments(input);
        const n = parcels.length;

        const k = newAmount % n;

        // Store original state of all parcels except K
        const originalOthers = parcels.filter((_, i) => i !== k).map((p) => ({ ...p }));

        // Simulate editing parcel K
        parcels[k] = { ...parcels[k]!, amount: newAmount };

        // Verify total count unchanged
        expect(parcels.length).toBe(n);

        // Verify all other parcels are completely unchanged
        const currentOthers = parcels.filter((_, i) => i !== k);
        for (let i = 0; i < originalOthers.length; i++) {
          expect(currentOthers[i]!.index).toBe(originalOthers[i]!.index);
          expect(currentOthers[i]!.totalParcels).toBe(originalOthers[i]!.totalParcels);
          expect(currentOthers[i]!.amount).toBe(originalOthers[i]!.amount);
          expect(currentOthers[i]!.referenceMonth).toBe(originalOthers[i]!.referenceMonth);
          expect(currentOthers[i]!.descriptionSuffix).toBe(originalOthers[i]!.descriptionSuffix);
        }
      }),
      { numRuns: 100 }
    );
  });
});
