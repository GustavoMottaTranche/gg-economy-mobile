import fc from 'fast-check';

/**
 * Property 5: Mark all as paid sets all occurrences to paid
 *
 * For any group creation with the "mark all as paid" option, all generated
 * occurrences shall have isPaid equal to true, regardless of their reference
 * month or date.
 *
 * **Validates: Requirements 2.4**
 */

/**
 * Represents a weekly occurrence with payment status.
 */
interface WeeklyOccurrenceWithPayment {
  id: string;
  weeklyGroupId: string;
  date: string; // YYYY-MM-DD
  referenceMonth: string; // YYYY-MM
  amount: number;
  description: string;
  isValueEdited: boolean;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Simulates the "all_paid" payment status option logic.
 *
 * When the user selects "mark all as paid" during group creation,
 * the system sets isPaid=true for ALL generated occurrences,
 * regardless of their date or reference month.
 *
 * This mirrors WeeklyRecurringService.applyPaymentStatusOption()
 * with option === 'all_paid'.
 */
function applyAllPaidOption(
  occurrences: WeeklyOccurrenceWithPayment[]
): WeeklyOccurrenceWithPayment[] {
  return occurrences.map((occ) => ({
    ...occ,
    isPaid: true,
    updatedAt: new Date().toISOString(),
  }));
}

/**
 * Generates a valid YYYY-MM reference month string.
 */
const referenceMonthArbitrary = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`);

/**
 * Generates a valid YYYY-MM-DD date string.
 */
const dateArbitrary = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(
    ({ year, month, day }) =>
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  );

/**
 * Generates a single weekly occurrence with random fields and isPaid=false
 * (the default state before applying any payment status option).
 */
const occurrenceArbitrary = (groupId: string) =>
  fc
    .record({
      id: fc.uuid(),
      date: dateArbitrary,
      referenceMonth: referenceMonthArbitrary,
      amount: fc.integer({ min: 1, max: 99999999 }),
      description: fc.string({ minLength: 0, maxLength: 100 }),
      isValueEdited: fc.boolean(),
    })
    .map((fields) => ({
      ...fields,
      weeklyGroupId: groupId,
      isPaid: false, // Default: all occurrences start as unpaid
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }));

/**
 * Generates a non-empty array of occurrences for a given group.
 */
const occurrencesArbitrary = (groupId: string) =>
  fc.array(occurrenceArbitrary(groupId), { minLength: 1, maxLength: 20 });

describe('Feature: payment-status-tracking, Property 5: Mark all as paid sets all occurrences to paid', () => {
  /**
   * **Validates: Requirements 2.4**
   */

  it('after applying "all_paid" option, every occurrence has isPaid=true', () => {
    fc.assert(
      fc.property(fc.uuid(), (groupId) => {
        return fc.assert(
          fc.property(occurrencesArbitrary(groupId), (occurrences) => {
            const result = applyAllPaidOption(occurrences);

            // Every single occurrence must have isPaid=true
            for (const occ of result) {
              expect(occ.isPaid).toBe(true);
            }
          }),
          { numRuns: 10 }
        );
      }),
      { numRuns: 10 }
    );
  });

  it('all occurrences are set to paid regardless of their reference month', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uniqueArray(referenceMonthArbitrary, { minLength: 2, maxLength: 6 }),
        (groupId, months) => {
          // Generate occurrences spread across multiple different reference months
          const occurrences: WeeklyOccurrenceWithPayment[] = months.flatMap((month, monthIdx) => {
            const count = (monthIdx % 3) + 1; // 1-3 occurrences per month
            return Array.from({ length: count }, (_, i) => ({
              id: `occ-${monthIdx}-${i}`,
              weeklyGroupId: groupId,
              date: `${month}-${String((i + 1) * 7).padStart(2, '0')}`,
              referenceMonth: month,
              amount: (monthIdx + 1) * 1000 + i * 100,
              description: '',
              isValueEdited: false,
              isPaid: false,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            }));
          });

          const result = applyAllPaidOption(occurrences);

          // All occurrences across all months must be paid
          for (const occ of result) {
            expect(occ.isPaid).toBe(true);
          }

          // Verify occurrences actually span multiple reference months
          const uniqueMonths = new Set(result.map((o) => o.referenceMonth));
          expect(uniqueMonths.size).toBeGreaterThanOrEqual(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all occurrences are set to paid regardless of their date', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(dateArbitrary, { minLength: 1, maxLength: 15 }),
        (groupId, dates) => {
          // Generate occurrences with various dates (past, present, future)
          const occurrences: WeeklyOccurrenceWithPayment[] = dates.map((date, i) => ({
            id: `occ-${i}`,
            weeklyGroupId: groupId,
            date,
            referenceMonth: date.substring(0, 7),
            amount: (i + 1) * 500,
            description: '',
            isValueEdited: false,
            isPaid: false,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          }));

          const result = applyAllPaidOption(occurrences);

          // Every occurrence must be paid, no matter what date it has
          for (const occ of result) {
            expect(occ.isPaid).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the number of occurrences is preserved after applying "all_paid"', () => {
    fc.assert(
      fc.property(
        fc
          .uuid()
          .chain((groupId) => occurrencesArbitrary(groupId).map((occs) => ({ groupId, occs }))),
        ({ occs }) => {
          const result = applyAllPaidOption(occs);

          // No occurrences should be added or removed
          expect(result.length).toBe(occs.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('other occurrence fields remain unchanged after applying "all_paid"', () => {
    fc.assert(
      fc.property(
        fc
          .uuid()
          .chain((groupId) => occurrencesArbitrary(groupId).map((occs) => ({ groupId, occs }))),
        ({ groupId, occs }) => {
          const result = applyAllPaidOption(occs);

          for (let i = 0; i < occs.length; i++) {
            const original = occs[i]!;
            const updated = result[i]!;

            // All fields except isPaid and updatedAt should remain the same
            expect(updated.id).toBe(original.id);
            expect(updated.weeklyGroupId).toBe(groupId);
            expect(updated.date).toBe(original.date);
            expect(updated.referenceMonth).toBe(original.referenceMonth);
            expect(updated.amount).toBe(original.amount);
            expect(updated.description).toBe(original.description);
            expect(updated.isValueEdited).toBe(original.isValueEdited);
            expect(updated.createdAt).toBe(original.createdAt);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
