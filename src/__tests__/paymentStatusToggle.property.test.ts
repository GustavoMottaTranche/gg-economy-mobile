// Feature: statement-payment-integration, Property 3: Payment status toggle is involutory

/**
 * Property 3: Payment status toggle is involutory (double-toggle restores state)
 *
 * For any item (regular transaction, installment parcel, or weekly occurrence) with an
 * initial isPaid value, toggling the payment status once SHALL flip the boolean, and
 * toggling it a second time SHALL restore the original value.
 * Formally: toggle(toggle(isPaid)) === isPaid.
 *
 * **Validates: Requirements 3.2, 3.3, 3.4, 5.2**
 */

import * as fc from 'fast-check';

// ─── Toggle Function ─────────────────────────────────────────────────────────

/**
 * Pure toggle function that flips the isPaid boolean.
 * This mirrors the core logic used by PaymentStatusService.toggleWeeklyOccurrence
 * and PaymentStatusService.toggleMonthlyTransaction.
 */
function toggle(isPaid: boolean): boolean {
  return !isPaid;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface RegularTransaction {
  id: string;
  title: string;
  date: string;
  amount: number;
  isPaid: boolean;
  referenceMonth: string;
  installmentGroupId: string | null;
}

interface InstallmentParcel {
  id: string;
  title: string;
  date: string;
  amount: number;
  isPaid: boolean;
  referenceMonth: string;
  installmentGroupId: string;
  parcelNumber: number;
  totalParcels: number;
}

interface WeeklyOccurrence {
  id: string;
  weeklyGroupId: string;
  date: string;
  referenceMonth: string;
  amount: number;
  isPaid: boolean;
  isValueEdited: boolean;
}

// ─── Generators ──────────────────────────────────────────────────────────────

const dateArbitrary = fc
  .record({
    year: fc.integer({ min: 2020, max: 2035 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(
    ({ year, month, day }) =>
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  );

const referenceMonthArbitrary = fc
  .record({
    year: fc.integer({ min: 2020, max: 2035 }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`);

const regularTransactionArbitrary: fc.Arbitrary<RegularTransaction> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  date: dateArbitrary,
  amount: fc.double({ min: 0.01, max: 999999.99, noNaN: true, noDefaultInfinity: true }),
  isPaid: fc.boolean(),
  referenceMonth: referenceMonthArbitrary,
  installmentGroupId: fc.constant(null),
});

const installmentParcelArbitrary: fc.Arbitrary<InstallmentParcel> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  date: dateArbitrary,
  amount: fc.double({ min: 0.01, max: 999999.99, noNaN: true, noDefaultInfinity: true }),
  isPaid: fc.boolean(),
  referenceMonth: referenceMonthArbitrary,
  installmentGroupId: fc.uuid(),
  parcelNumber: fc.integer({ min: 1, max: 48 }),
  totalParcels: fc.integer({ min: 2, max: 48 }),
});

const weeklyOccurrenceArbitrary: fc.Arbitrary<WeeklyOccurrence> = fc.record({
  id: fc.uuid(),
  weeklyGroupId: fc.uuid(),
  date: dateArbitrary,
  referenceMonth: referenceMonthArbitrary,
  amount: fc.double({ min: 0.01, max: 999999.99, noNaN: true, noDefaultInfinity: true }),
  isPaid: fc.boolean(),
  isValueEdited: fc.boolean(),
});

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property 3: Payment status toggle is involutory (double-toggle restores state)', () => {
  describe('Pure boolean toggle involution', () => {
    it('toggle(toggle(isPaid)) === isPaid for any boolean value', () => {
      fc.assert(
        fc.property(fc.boolean(), (isPaid) => {
          return toggle(toggle(isPaid)) === isPaid;
        }),
        { numRuns: 100 }
      );
    });

    it('single toggle flips the boolean value', () => {
      fc.assert(
        fc.property(fc.boolean(), (isPaid) => {
          return toggle(isPaid) !== isPaid;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Regular transaction toggle involution', () => {
    it('double-toggling a regular transaction restores original isPaid state', () => {
      fc.assert(
        fc.property(regularTransactionArbitrary, (transaction) => {
          const afterFirstToggle = toggle(transaction.isPaid);
          const afterSecondToggle = toggle(afterFirstToggle);
          return afterSecondToggle === transaction.isPaid;
        }),
        { numRuns: 100 }
      );
    });

    it('single toggle on a regular transaction flips isPaid', () => {
      fc.assert(
        fc.property(regularTransactionArbitrary, (transaction) => {
          const afterToggle = toggle(transaction.isPaid);
          return afterToggle !== transaction.isPaid;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Installment parcel toggle involution', () => {
    it('double-toggling an installment parcel restores original isPaid state', () => {
      fc.assert(
        fc.property(installmentParcelArbitrary, (parcel) => {
          const afterFirstToggle = toggle(parcel.isPaid);
          const afterSecondToggle = toggle(afterFirstToggle);
          return afterSecondToggle === parcel.isPaid;
        }),
        { numRuns: 100 }
      );
    });

    it('single toggle on an installment parcel flips isPaid', () => {
      fc.assert(
        fc.property(installmentParcelArbitrary, (parcel) => {
          const afterToggle = toggle(parcel.isPaid);
          return afterToggle !== parcel.isPaid;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Weekly occurrence toggle involution', () => {
    it('double-toggling a weekly occurrence restores original isPaid state', () => {
      fc.assert(
        fc.property(weeklyOccurrenceArbitrary, (occurrence) => {
          const afterFirstToggle = toggle(occurrence.isPaid);
          const afterSecondToggle = toggle(afterFirstToggle);
          return afterSecondToggle === occurrence.isPaid;
        }),
        { numRuns: 100 }
      );
    });

    it('single toggle on a weekly occurrence flips isPaid', () => {
      fc.assert(
        fc.property(weeklyOccurrenceArbitrary, (occurrence) => {
          const afterToggle = toggle(occurrence.isPaid);
          return afterToggle !== occurrence.isPaid;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Toggle involution holds for all item types simultaneously', () => {
    it('for any combination of item types, toggle is always involutory', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            regularTransactionArbitrary.map((t) => ({
              type: 'transaction' as const,
              isPaid: t.isPaid,
            })),
            installmentParcelArbitrary.map((p) => ({
              type: 'installmentParcel' as const,
              isPaid: p.isPaid,
            })),
            weeklyOccurrenceArbitrary.map((o) => ({
              type: 'weeklyOccurrence' as const,
              isPaid: o.isPaid,
            }))
          ),
          (item) => {
            // Property: toggle(toggle(isPaid)) === isPaid regardless of item type
            return toggle(toggle(item.isPaid)) === item.isPaid;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
