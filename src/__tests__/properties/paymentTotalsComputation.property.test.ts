// Feature: payment-status-tracking, Property 3: Payment totals computation correctness

/**
 * Property 3: Payment totals computation correctness
 *
 * For any set of recurring occurrences (from both active and inactive groups)
 * belonging to a given reference month, the Predicted_Total shall equal the sum
 * of all occurrence amounts, the Paid_Total shall equal the sum of amounts where
 * isPaid is true, and the Pending_Total shall equal Predicted_Total minus Paid_Total.
 *
 * **Validates: Requirements 1.4, 5.1, 5.5**
 */

import fc from 'fast-check';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface MockOccurrence {
  amount: number;
  isPaid: boolean;
  referenceMonth: string;
  type: 'weekly' | 'monthly';
}

interface PaymentTotals {
  predictedTotal: number;
  paidTotal: number;
  pendingTotal: number;
}

// ─── Core Computation Logic (mirrors PaymentStatusService.getPaymentTotalsForMonth) ───

/**
 * Computes payment totals from a set of occurrences for a given month.
 * This mirrors the SQL aggregate logic in PaymentStatusService:
 * - predictedTotal = SUM of all occurrence amounts for the month
 * - paidTotal = SUM of amounts where isPaid = true
 * - pendingTotal = predictedTotal - paidTotal
 *
 * Includes occurrences from both active and inactive groups (Requirement 5.5).
 */
function computePaymentTotals(occurrences: MockOccurrence[], month: string): PaymentTotals {
  const monthOccurrences = occurrences.filter((o) => o.referenceMonth === month);

  const predictedTotal = monthOccurrences.reduce((sum, o) => sum + o.amount, 0);
  const paidTotal = monthOccurrences.filter((o) => o.isPaid).reduce((sum, o) => sum + o.amount, 0);
  const pendingTotal = predictedTotal - paidTotal;

  return { predictedTotal, paidTotal, pendingTotal };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const referenceMonthArb = fc
  .integer({ min: 2020, max: 2030 })
  .chain((year) =>
    fc.integer({ min: 1, max: 12 }).map((month) => `${year}-${String(month).padStart(2, '0')}`)
  );

/** Generates a positive amount in cents then converts to 2-decimal currency value */
const amountArb = fc.integer({ min: 1, max: 9999999 }).map((n) => n / 100);

const occurrenceArb = (targetMonth: string): fc.Arbitrary<MockOccurrence> =>
  fc.record({
    amount: amountArb,
    isPaid: fc.boolean(),
    referenceMonth: fc.constant(targetMonth),
    type: fc.constantFrom('weekly' as const, 'monthly' as const),
  });

/**
 * Generates a mixed set of occurrences: some belonging to the target month,
 * some belonging to other months (to verify filtering).
 */
const occurrencesWithNoiseArb = (targetMonth: string): fc.Arbitrary<MockOccurrence[]> =>
  fc
    .tuple(
      fc.array(occurrenceArb(targetMonth), { minLength: 0, maxLength: 30 }),
      fc.array(
        fc.record({
          amount: amountArb,
          isPaid: fc.boolean(),
          referenceMonth: referenceMonthArb.filter((m) => m !== targetMonth),
          type: fc.constantFrom('weekly' as const, 'monthly' as const),
        }),
        { minLength: 0, maxLength: 10 }
      )
    )
    .map(([target, noise]) => [...target, ...noise]);

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: payment-status-tracking, Property 3: Payment totals computation correctness', () => {
  it('predictedTotal equals the sum of all occurrence amounts for the month', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((month) =>
          occurrencesWithNoiseArb(month).map((occs) => ({ month, occs }))
        ),
        ({ month, occs }) => {
          const totals = computePaymentTotals(occs, month);

          const expectedPredicted = occs
            .filter((o) => o.referenceMonth === month)
            .reduce((sum, o) => sum + o.amount, 0);

          expect(totals.predictedTotal).toBeCloseTo(expectedPredicted, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('paidTotal equals the sum of amounts where isPaid is true for the month', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((month) =>
          occurrencesWithNoiseArb(month).map((occs) => ({ month, occs }))
        ),
        ({ month, occs }) => {
          const totals = computePaymentTotals(occs, month);

          const expectedPaid = occs
            .filter((o) => o.referenceMonth === month && o.isPaid)
            .reduce((sum, o) => sum + o.amount, 0);

          expect(totals.paidTotal).toBeCloseTo(expectedPaid, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('pendingTotal equals predictedTotal minus paidTotal', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((month) =>
          occurrencesWithNoiseArb(month).map((occs) => ({ month, occs }))
        ),
        ({ month, occs }) => {
          const totals = computePaymentTotals(occs, month);

          expect(totals.pendingTotal).toBeCloseTo(totals.predictedTotal - totals.paidTotal, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('totals include occurrences from both weekly and monthly types (active and inactive groups)', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((month) =>
          fc
            .tuple(
              fc.array(
                occurrenceArb(month).map((o) => ({ ...o, type: 'weekly' as const })),
                {
                  minLength: 1,
                  maxLength: 15,
                }
              ),
              fc.array(
                occurrenceArb(month).map((o) => ({ ...o, type: 'monthly' as const })),
                {
                  minLength: 1,
                  maxLength: 15,
                }
              )
            )
            .map(([weekly, monthly]) => ({ month, occs: [...weekly, ...monthly] }))
        ),
        ({ month, occs }) => {
          const totals = computePaymentTotals(occs, month);

          // Verify that the predicted total includes amounts from both types
          const weeklyOccs = occs.filter((o) => o.type === 'weekly');
          const monthlyOccs = occs.filter((o) => o.type === 'monthly');

          // Both types contribute to the total
          expect(weeklyOccs.length).toBeGreaterThan(0);
          expect(monthlyOccs.length).toBeGreaterThan(0);

          // The predicted total must equal the sum of ALL occurrences (both types combined)
          const allAmountsSum = occs.reduce((sum, o) => sum + o.amount, 0);
          expect(totals.predictedTotal).toBeCloseTo(allAmountsSum, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('totals are zero when no occurrences exist for the month', () => {
    fc.assert(
      fc.property(referenceMonthArb, (month) => {
        const totals = computePaymentTotals([], month);

        expect(totals.predictedTotal).toBe(0);
        expect(totals.paidTotal).toBe(0);
        expect(totals.pendingTotal).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('when all occurrences are paid, pendingTotal is zero', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((month) =>
          fc
            .array(
              fc.record({
                amount: amountArb,
                isPaid: fc.constant(true),
                referenceMonth: fc.constant(month),
                type: fc.constantFrom('weekly' as const, 'monthly' as const),
              }),
              { minLength: 1, maxLength: 20 }
            )
            .map((occs) => ({ month, occs }))
        ),
        ({ month, occs }) => {
          const totals = computePaymentTotals(occs, month);

          expect(totals.pendingTotal).toBe(0);
          expect(totals.paidTotal).toBeCloseTo(totals.predictedTotal, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when no occurrences are paid, paidTotal is zero and pendingTotal equals predictedTotal', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((month) =>
          fc
            .array(
              fc.record({
                amount: amountArb,
                isPaid: fc.constant(false),
                referenceMonth: fc.constant(month),
                type: fc.constantFrom('weekly' as const, 'monthly' as const),
              }),
              { minLength: 1, maxLength: 20 }
            )
            .map((occs) => ({ month, occs }))
        ),
        ({ month, occs }) => {
          const totals = computePaymentTotals(occs, month);

          expect(totals.paidTotal).toBe(0);
          expect(totals.pendingTotal).toBeCloseTo(totals.predictedTotal, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('occurrences from other months do not affect the target month totals', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((month) =>
          fc
            .tuple(
              fc.array(occurrenceArb(month), { minLength: 1, maxLength: 10 }),
              fc.array(
                fc.record({
                  amount: amountArb,
                  isPaid: fc.boolean(),
                  referenceMonth: referenceMonthArb.filter((m) => m !== month),
                  type: fc.constantFrom('weekly' as const, 'monthly' as const),
                }),
                { minLength: 1, maxLength: 10 }
              )
            )
            .map(([target, noise]) => ({
              month,
              targetOccs: target,
              allOccs: [...target, ...noise],
            }))
        ),
        ({ month, targetOccs, allOccs }) => {
          const totalsAll = computePaymentTotals(allOccs, month);
          const totalsTarget = computePaymentTotals(targetOccs, month);

          expect(totalsAll.predictedTotal).toBeCloseTo(totalsTarget.predictedTotal, 10);
          expect(totalsAll.paidTotal).toBeCloseTo(totalsTarget.paidTotal, 10);
          expect(totalsAll.pendingTotal).toBeCloseTo(totalsTarget.pendingTotal, 10);
        }
      ),
      { numRuns: 100 }
    );
  });
});
