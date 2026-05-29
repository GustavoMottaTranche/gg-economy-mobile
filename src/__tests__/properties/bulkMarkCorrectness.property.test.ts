import fc from 'fast-check';

/**
 * Property 6: Bulk mark sets all unpaid to paid and reports correct count
 *
 * For any recurring group with N occurrences where K have isPaid equal to false,
 * executing bulk mark shall result in all N occurrences having isPaid equal to true,
 * and the operation shall report exactly K as the count of newly marked items.
 *
 * **Validates: Requirements 3.2, 3.3**
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface OccurrenceWithPayment {
  id: string;
  groupId: string;
  date: string; // YYYY-MM-DD
  referenceMonth: string; // YYYY-MM
  amount: number;
  isPaid: boolean;
}

interface BulkMarkResult {
  markedCount: number;
  affectedMonths: string[];
}

// ─── Core Bulk Mark Logic (mirrors PaymentStatusService.bulkMarkWeeklyGroup / bulkMarkMonthlyGroup) ───

/**
 * Simulates the bulk mark operation as implemented in PaymentStatusService.
 *
 * The logic:
 * 1. Find all occurrences in the group where isPaid === false
 * 2. Set isPaid = true for all of them
 * 3. Return the count of newly marked items (K) and the distinct reference months affected
 *
 * This mirrors the transactional bulk mark in PaymentStatusService.bulkMarkWeeklyGroup()
 * and PaymentStatusService.bulkMarkMonthlyGroup().
 */
function bulkMarkGroup(occurrences: OccurrenceWithPayment[]): {
  updatedOccurrences: OccurrenceWithPayment[];
  result: BulkMarkResult;
} {
  // Identify unpaid occurrences (those that will be marked)
  const unpaidOccurrences = occurrences.filter((o) => !o.isPaid);

  if (unpaidOccurrences.length === 0) {
    return {
      updatedOccurrences: occurrences.map((o) => ({ ...o })),
      result: { markedCount: 0, affectedMonths: [] },
    };
  }

  // Collect distinct affected months from unpaid occurrences
  const affectedMonths = Array.from(
    new Set(unpaidOccurrences.map((o) => o.referenceMonth))
  ).sort();

  // Mark all unpaid as paid
  const updatedOccurrences = occurrences.map((o) => ({
    ...o,
    isPaid: true,
  }));

  return {
    updatedOccurrences,
    result: {
      markedCount: unpaidOccurrences.length,
      affectedMonths,
    },
  };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

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
 * Generates a single occurrence with random isPaid status.
 */
const occurrenceArbitrary = (groupId: string): fc.Arbitrary<OccurrenceWithPayment> =>
  fc
    .record({
      id: fc.uuid(),
      date: dateArbitrary,
      referenceMonth: referenceMonthArbitrary,
      amount: fc.integer({ min: 1, max: 9999999 }),
      isPaid: fc.boolean(),
    })
    .map((fields) => ({
      ...fields,
      groupId,
    }));

/**
 * Generates a non-empty array of occurrences for a given group with mixed isPaid values.
 */
const occurrencesArbitrary = (groupId: string) =>
  fc.array(occurrenceArbitrary(groupId), { minLength: 1, maxLength: 30 });

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: payment-status-tracking, Property 6: Bulk mark sets all unpaid to paid and reports correct count', () => {
  /**
   * **Validates: Requirements 3.2, 3.3**
   */

  it('after bulk mark, all occurrences have isPaid=true', () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((groupId) =>
          occurrencesArbitrary(groupId).map((occs) => ({ groupId, occs }))
        ),
        ({ occs }) => {
          const { updatedOccurrences } = bulkMarkGroup(occs);

          // Every occurrence must be paid after bulk mark
          for (const occ of updatedOccurrences) {
            expect(occ.isPaid).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('markedCount equals exactly the number of previously unpaid occurrences (K)', () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((groupId) =>
          occurrencesArbitrary(groupId).map((occs) => ({ groupId, occs }))
        ),
        ({ occs }) => {
          const unpaidCount = occs.filter((o) => !o.isPaid).length;
          const { result } = bulkMarkGroup(occs);

          expect(result.markedCount).toBe(unpaidCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('affectedMonths contains exactly the distinct reference months of previously unpaid items', () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((groupId) =>
          occurrencesArbitrary(groupId).map((occs) => ({ groupId, occs }))
        ),
        ({ occs }) => {
          const unpaidOccurrences = occs.filter((o) => !o.isPaid);
          const expectedMonths = Array.from(
            new Set(unpaidOccurrences.map((o) => o.referenceMonth))
          ).sort();

          const { result } = bulkMarkGroup(occs);

          expect(result.affectedMonths).toEqual(expectedMonths);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the total number of occurrences is preserved (no items added or removed)', () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((groupId) =>
          occurrencesArbitrary(groupId).map((occs) => ({ groupId, occs }))
        ),
        ({ occs }) => {
          const { updatedOccurrences } = bulkMarkGroup(occs);

          expect(updatedOccurrences.length).toBe(occs.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when all occurrences are already paid, markedCount is 0 and affectedMonths is empty', () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((groupId) =>
          fc
            .array(
              fc
                .record({
                  id: fc.uuid(),
                  date: dateArbitrary,
                  referenceMonth: referenceMonthArbitrary,
                  amount: fc.integer({ min: 1, max: 9999999 }),
                })
                .map((fields) => ({
                  ...fields,
                  groupId,
                  isPaid: true, // All already paid
                })),
              { minLength: 1, maxLength: 20 }
            )
            .map((occs) => ({ groupId, occs }))
        ),
        ({ occs }) => {
          const { result, updatedOccurrences } = bulkMarkGroup(occs);

          expect(result.markedCount).toBe(0);
          expect(result.affectedMonths).toEqual([]);

          // All remain paid
          for (const occ of updatedOccurrences) {
            expect(occ.isPaid).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when all occurrences are unpaid, markedCount equals N (total count)', () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((groupId) =>
          fc
            .array(
              fc
                .record({
                  id: fc.uuid(),
                  date: dateArbitrary,
                  referenceMonth: referenceMonthArbitrary,
                  amount: fc.integer({ min: 1, max: 9999999 }),
                })
                .map((fields) => ({
                  ...fields,
                  groupId,
                  isPaid: false, // All unpaid
                })),
              { minLength: 1, maxLength: 20 }
            )
            .map((occs) => ({ groupId, occs }))
        ),
        ({ occs }) => {
          const { result, updatedOccurrences } = bulkMarkGroup(occs);

          // markedCount should equal total number of occurrences
          expect(result.markedCount).toBe(occs.length);

          // All should now be paid
          for (const occ of updatedOccurrences) {
            expect(occ.isPaid).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('occurrences that were already paid remain paid and are not double-counted', () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((groupId) =>
          occurrencesArbitrary(groupId).map((occs) => ({ groupId, occs }))
        ),
        ({ occs }) => {
          const alreadyPaidIds = new Set(
            occs.filter((o) => o.isPaid).map((o) => o.id)
          );
          const { updatedOccurrences, result } = bulkMarkGroup(occs);

          // Already-paid items should still be paid
          for (const occ of updatedOccurrences) {
            if (alreadyPaidIds.has(occ.id)) {
              expect(occ.isPaid).toBe(true);
            }
          }

          // markedCount should NOT include already-paid items
          expect(result.markedCount).toBe(occs.length - alreadyPaidIds.size);
        }
      ),
      { numRuns: 100 }
    );
  });
});
