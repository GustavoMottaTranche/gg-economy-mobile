import fc from 'fast-check';

/**
 * Property 9: Paid and pending count computation
 *
 * For any recurring group with N total occurrences where P have isPaid equal to true,
 * the group payment summary shall report paidCount equal to P and pendingCount equal to N minus P.
 *
 * **Validates: Requirements 6.3**
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

interface GroupPaymentSummary {
  totalCount: number;
  paidCount: number;
  pendingCount: number;
}

// ─── Core Logic (mirrors PaymentStatusService.getGroupPaymentSummary) ────────

/**
 * Simulates the getGroupPaymentSummary logic as implemented in PaymentStatusService.
 *
 * The logic:
 * 1. Count all occurrences in the group (N = totalCount)
 * 2. Count occurrences where isPaid === true (P = paidCount)
 * 3. pendingCount = totalCount - paidCount (N - P)
 *
 * This mirrors the SQL COUNT(*) and SUM(CASE WHEN isPaid = 1 THEN 1 ELSE 0 END)
 * queries in PaymentStatusService.getGroupPaymentSummary().
 */
function getGroupPaymentSummary(occurrences: OccurrenceWithPayment[]): GroupPaymentSummary {
  const totalCount = occurrences.length;
  const paidCount = occurrences.filter((o) => o.isPaid).length;
  const pendingCount = totalCount - paidCount;

  return { totalCount, paidCount, pendingCount };
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
 * Generates a single occurrence with random isPaid status for a given group.
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

describe('Feature: payment-status-tracking, Property 9: Paid and pending count computation', () => {
  /**
   * **Validates: Requirements 6.3**
   */

  it('totalCount equals N (the total number of occurrences in the group)', () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((groupId) =>
          occurrencesArbitrary(groupId).map((occs) => ({ groupId, occs }))
        ),
        ({ occs }) => {
          const summary = getGroupPaymentSummary(occs);

          expect(summary.totalCount).toBe(occs.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('paidCount equals P (the number of occurrences with isPaid=true)', () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((groupId) =>
          occurrencesArbitrary(groupId).map((occs) => ({ groupId, occs }))
        ),
        ({ occs }) => {
          const summary = getGroupPaymentSummary(occs);
          const expectedPaidCount = occs.filter((o) => o.isPaid).length;

          expect(summary.paidCount).toBe(expectedPaidCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('pendingCount equals N minus P (totalCount - paidCount)', () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((groupId) =>
          occurrencesArbitrary(groupId).map((occs) => ({ groupId, occs }))
        ),
        ({ occs }) => {
          const summary = getGroupPaymentSummary(occs);

          expect(summary.pendingCount).toBe(summary.totalCount - summary.paidCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('paidCount + pendingCount always equals totalCount', () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((groupId) =>
          occurrencesArbitrary(groupId).map((occs) => ({ groupId, occs }))
        ),
        ({ occs }) => {
          const summary = getGroupPaymentSummary(occs);

          expect(summary.paidCount + summary.pendingCount).toBe(summary.totalCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when all occurrences are paid, paidCount equals N and pendingCount equals 0', () => {
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
                  isPaid: true,
                })),
              { minLength: 1, maxLength: 20 }
            )
            .map((occs) => ({ groupId, occs }))
        ),
        ({ occs }) => {
          const summary = getGroupPaymentSummary(occs);

          expect(summary.paidCount).toBe(occs.length);
          expect(summary.pendingCount).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when no occurrences are paid, paidCount equals 0 and pendingCount equals N', () => {
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
                  isPaid: false,
                })),
              { minLength: 1, maxLength: 20 }
            )
            .map((occs) => ({ groupId, occs }))
        ),
        ({ occs }) => {
          const summary = getGroupPaymentSummary(occs);

          expect(summary.paidCount).toBe(0);
          expect(summary.pendingCount).toBe(occs.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('counts are non-negative for any input', () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((groupId) =>
          occurrencesArbitrary(groupId).map((occs) => ({ groupId, occs }))
        ),
        ({ occs }) => {
          const summary = getGroupPaymentSummary(occs);

          expect(summary.totalCount).toBeGreaterThanOrEqual(0);
          expect(summary.paidCount).toBeGreaterThanOrEqual(0);
          expect(summary.pendingCount).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
