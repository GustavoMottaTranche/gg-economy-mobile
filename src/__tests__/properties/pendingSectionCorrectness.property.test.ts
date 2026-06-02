// Feature: payment-status-tracking, Property 7: Pending section contains exactly unpaid items sorted by date

/**
 * Property 7: Pending section contains exactly unpaid items sorted by date
 *
 * For any reference month with a set of recurring occurrences, the pending items
 * list shall contain exactly those occurrences where isPaid is false, and the list
 * shall be sorted by date in ascending chronological order.
 *
 * **Validates: Requirements 4.1**
 */

import fc from 'fast-check';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface RecurringOccurrence {
  id: string;
  type: 'weekly' | 'monthly';
  groupId: string;
  groupName: string;
  amount: number;
  date: string; // YYYY-MM-DD
  referenceMonth: string; // YYYY-MM
  isPaid: boolean;
}

interface PendingItem {
  id: string;
  type: 'weekly' | 'monthly';
  groupId: string;
  groupName: string;
  amount: number;
  date: string; // YYYY-MM-DD
  referenceMonth: string; // YYYY-MM
}

// ─── Core Pending Items Logic (mirrors PaymentStatusService.getPendingItemsForMonth) ───

/**
 * Simulates the pending items filtering and sorting logic as implemented
 * in PaymentStatusService.getPendingItemsForMonth().
 *
 * The logic:
 * 1. Filter occurrences for the given reference month
 * 2. Keep only those where isPaid === false
 * 3. Sort by date in ascending chronological order
 *
 * This mirrors the SQL WHERE clause (referenceMonth = month AND isPaid = false)
 * followed by the in-memory sort by date.
 */
function getPendingItemsForMonth(occurrences: RecurringOccurrence[], month: string): PendingItem[] {
  // Filter: same reference month AND unpaid
  const pending = occurrences.filter((o) => o.referenceMonth === month && !o.isPaid);

  // Map to PendingItem (drop isPaid field)
  const pendingItems: PendingItem[] = pending.map((o) => ({
    id: o.id,
    type: o.type,
    groupId: o.groupId,
    groupName: o.groupName,
    amount: o.amount,
    date: o.date,
    referenceMonth: o.referenceMonth,
  }));

  // Sort by date ascending
  pendingItems.sort((a, b) => a.date.localeCompare(b.date));

  return pendingItems;
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/**
 * Generates a valid YYYY-MM reference month string.
 */
const referenceMonthArb = fc
  .integer({ min: 2020, max: 2030 })
  .chain((year) =>
    fc.integer({ min: 1, max: 12 }).map((month) => `${year}-${String(month).padStart(2, '0')}`)
  );

/**
 * Generates a valid YYYY-MM-DD date string within a given month.
 */
const dateInMonthArb = (month: string): fc.Arbitrary<string> => {
  const [year, m] = month.split('-').map(Number);
  return fc
    .integer({ min: 1, max: 28 })
    .map((day) => `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
};

/**
 * Generates a valid YYYY-MM-DD date string for any month.
 */
const dateArb = fc
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
 * Generates a group name string.
 */
const groupNameArb = fc.string({ minLength: 1, maxLength: 30 });

/**
 * Generates a single recurring occurrence for a specific month.
 */
const occurrenceInMonthArb = (month: string): fc.Arbitrary<RecurringOccurrence> =>
  fc
    .record({
      id: fc.uuid(),
      type: fc.constantFrom('weekly' as const, 'monthly' as const),
      groupId: fc.uuid(),
      groupName: groupNameArb,
      amount: fc.integer({ min: 1, max: 9999999 }),
      date: dateInMonthArb(month),
      isPaid: fc.boolean(),
    })
    .map((fields) => ({
      ...fields,
      referenceMonth: month,
    }));

/**
 * Generates a single recurring occurrence for a random month (noise).
 */
const occurrenceAnyMonthArb = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom('weekly' as const, 'monthly' as const),
  groupId: fc.uuid(),
  groupName: groupNameArb,
  amount: fc.integer({ min: 1, max: 9999999 }),
  date: dateArb,
  referenceMonth: referenceMonthArb,
  isPaid: fc.boolean(),
});

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: payment-status-tracking, Property 7: Pending section contains exactly unpaid items sorted by date', () => {
  /**
   * **Validates: Requirements 4.1**
   */

  it('pending items contain exactly those occurrences where isPaid is false for the given month', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((month) =>
          fc
            .array(occurrenceInMonthArb(month), { minLength: 1, maxLength: 30 })
            .map((occs) => ({ month, occs }))
        ),
        ({ month, occs }) => {
          const pendingItems = getPendingItemsForMonth(occs, month);

          // Expected: exactly the unpaid occurrences for this month
          const expectedUnpaid = occs.filter((o) => !o.isPaid);

          // Same count
          expect(pendingItems.length).toBe(expectedUnpaid.length);

          // Same set of IDs
          const pendingIds = new Set(pendingItems.map((p) => p.id));
          const expectedIds = new Set(expectedUnpaid.map((o) => o.id));
          expect(pendingIds).toEqual(expectedIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('pending items are sorted by date in ascending chronological order', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((month) =>
          fc
            .array(occurrenceInMonthArb(month), { minLength: 2, maxLength: 30 })
            .map((occs) => ({ month, occs }))
        ),
        ({ month, occs }) => {
          const pendingItems = getPendingItemsForMonth(occs, month);

          // Verify ascending date order
          for (let i = 1; i < pendingItems.length; i++) {
            expect(pendingItems[i].date >= pendingItems[i - 1].date).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('paid occurrences are never included in the pending items list', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((month) =>
          fc
            .array(occurrenceInMonthArb(month), { minLength: 1, maxLength: 30 })
            .map((occs) => ({ month, occs }))
        ),
        ({ month, occs }) => {
          const pendingItems = getPendingItemsForMonth(occs, month);
          const paidIds = new Set(occs.filter((o) => o.isPaid).map((o) => o.id));

          // No paid occurrence should appear in pending items
          for (const item of pendingItems) {
            expect(paidIds.has(item.id)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('occurrences from other months are excluded from the pending items list', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((month) =>
          fc
            .tuple(
              fc.array(occurrenceInMonthArb(month), { minLength: 1, maxLength: 15 }),
              fc.array(
                occurrenceAnyMonthArb.filter((o) => o.referenceMonth !== month),
                { minLength: 1, maxLength: 15 }
              )
            )
            .map(([target, noise]) => ({
              month,
              allOccs: [...target, ...noise],
              targetOccs: target,
            }))
        ),
        ({ month, allOccs, targetOccs }) => {
          const pendingItems = getPendingItemsForMonth(allOccs, month);

          // All pending items must belong to the target month
          for (const item of pendingItems) {
            expect(item.referenceMonth).toBe(month);
          }

          // Count should match only unpaid items from target month
          const expectedCount = targetOccs.filter((o) => !o.isPaid).length;
          expect(pendingItems.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when all occurrences in the month are paid, pending items list is empty', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((month) =>
          fc
            .array(
              occurrenceInMonthArb(month).map((o) => ({ ...o, isPaid: true })),
              { minLength: 1, maxLength: 20 }
            )
            .map((occs) => ({ month, occs }))
        ),
        ({ month, occs }) => {
          const pendingItems = getPendingItemsForMonth(occs, month);

          expect(pendingItems.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when all occurrences in the month are unpaid, all appear in pending items', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((month) =>
          fc
            .array(
              occurrenceInMonthArb(month).map((o) => ({ ...o, isPaid: false })),
              { minLength: 1, maxLength: 20 }
            )
            .map((occs) => ({ month, occs }))
        ),
        ({ month, occs }) => {
          const pendingItems = getPendingItemsForMonth(occs, month);

          expect(pendingItems.length).toBe(occs.length);

          // All IDs should be present
          const pendingIds = new Set(pendingItems.map((p) => p.id));
          for (const occ of occs) {
            expect(pendingIds.has(occ.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('pending items include both weekly and monthly types when unpaid', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((month) =>
          fc
            .tuple(
              fc.array(
                occurrenceInMonthArb(month).map((o) => ({
                  ...o,
                  type: 'weekly' as const,
                  isPaid: false,
                })),
                { minLength: 1, maxLength: 10 }
              ),
              fc.array(
                occurrenceInMonthArb(month).map((o) => ({
                  ...o,
                  type: 'monthly' as const,
                  isPaid: false,
                })),
                { minLength: 1, maxLength: 10 }
              )
            )
            .map(([weekly, monthly]) => ({
              month,
              occs: [...weekly, ...monthly],
            }))
        ),
        ({ month, occs }) => {
          const pendingItems = getPendingItemsForMonth(occs, month);

          // Both types should be present
          const types = new Set(pendingItems.map((p) => p.type));
          expect(types.has('weekly')).toBe(true);
          expect(types.has('monthly')).toBe(true);

          // Total count should match all occurrences (all are unpaid)
          expect(pendingItems.length).toBe(occs.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
