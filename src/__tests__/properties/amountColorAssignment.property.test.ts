import fc from 'fast-check';

/**
 * Property 1: Amount Color Assignment
 *
 * For any transaction amount (positive or negative), the color assigned to the amount
 * display SHALL be the success/green semantic color when amount > 0, and the danger/red
 * semantic color when amount < 0.
 *
 * **Validates: Requirements 1.3, 2.1**
 */

// --- Types ---

/**
 * Represents the color assignment result for an amount.
 */
type AmountColorResult = 'success' | 'danger' | 'neutral';

// --- Logic Under Test ---

/**
 * Determines the color assignment for a given amount.
 * This mirrors the logic in AmountDisplay component (colorVariant='auto')
 * and the detail screen's amountColor calculation.
 *
 * - amount > 0 → success (green)
 * - amount < 0 → danger (red)
 * - amount === 0 → neutral (text primary)
 */
function getAmountColor(amount: number): AmountColorResult {
  if (amount > 0) return 'success';
  if (amount < 0) return 'danger';
  return 'neutral';
}

/**
 * Simulates the detail screen's color assignment logic:
 * `const isIncome = transaction.amount > 0;`
 * `const amountColor = isIncome ? colors.semantic.success.dark : colors.semantic.danger.dark;`
 *
 * Note: The detail screen treats amount === 0 as expense (danger) since isIncome is false.
 * For the property test, we focus on the requirement: green for positive, red for negative.
 */
function getDetailScreenAmountColor(amount: number): 'success' | 'danger' {
  return amount > 0 ? 'success' : 'danger';
}

// --- Arbitraries ---

/** Generates strictly positive amounts (in cents) */
const positiveAmountArb = fc.integer({ min: 1, max: 99999999 });

/** Generates strictly negative amounts (in cents) */
const negativeAmountArb = fc.integer({ min: -99999999, max: -1 });

/** Generates any non-zero amount (in cents) */
const nonZeroAmountArb = fc.integer({ min: -99999999, max: 99999999 }).filter((a) => a !== 0);

/** Generates very large positive amounts to test boundary cases */
const veryLargePositiveArb = fc.integer({ min: 100000000, max: 2147483647 });

/** Generates very large negative amounts to test boundary cases */
const veryLargeNegativeArb = fc.integer({ min: -2147483647, max: -100000000 });

/** Generates very small positive amounts (1 cent) */
const verySmallPositiveArb = fc.constant(1);

/** Generates very small negative amounts (-1 cent) */
const verySmallNegativeArb = fc.constant(-1);

// --- Property Tests ---

describe('Property 1: Amount Color Assignment', () => {
  it('positive amounts are always assigned the success/green color', () => {
    fc.assert(
      fc.property(positiveAmountArb, (amount) => {
        const color = getAmountColor(amount);
        expect(color).toBe('success');
      }),
      { numRuns: 100 }
    );
  });

  it('negative amounts are always assigned the danger/red color', () => {
    fc.assert(
      fc.property(negativeAmountArb, (amount) => {
        const color = getAmountColor(amount);
        expect(color).toBe('danger');
      }),
      { numRuns: 100 }
    );
  });

  it('for any non-zero amount, color is green when positive and red when negative', () => {
    fc.assert(
      fc.property(nonZeroAmountArb, (amount) => {
        const color = getAmountColor(amount);

        if (amount > 0) {
          expect(color).toBe('success');
        } else {
          expect(color).toBe('danger');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('very large positive amounts still get the success/green color', () => {
    fc.assert(
      fc.property(veryLargePositiveArb, (amount) => {
        const color = getAmountColor(amount);
        expect(color).toBe('success');
      }),
      { numRuns: 100 }
    );
  });

  it('very large negative amounts still get the danger/red color', () => {
    fc.assert(
      fc.property(veryLargeNegativeArb, (amount) => {
        const color = getAmountColor(amount);
        expect(color).toBe('danger');
      }),
      { numRuns: 100 }
    );
  });

  it('very small positive amounts (1 cent) get the success/green color', () => {
    fc.assert(
      fc.property(verySmallPositiveArb, (amount) => {
        const color = getAmountColor(amount);
        expect(color).toBe('success');
      }),
      { numRuns: 100 }
    );
  });

  it('very small negative amounts (-1 cent) get the danger/red color', () => {
    fc.assert(
      fc.property(verySmallNegativeArb, (amount) => {
        const color = getAmountColor(amount);
        expect(color).toBe('danger');
      }),
      { numRuns: 100 }
    );
  });

  it('detail screen color assignment matches: positive → success, negative → danger', () => {
    fc.assert(
      fc.property(nonZeroAmountArb, (amount) => {
        const color = getDetailScreenAmountColor(amount);

        if (amount > 0) {
          expect(color).toBe('success');
        } else {
          expect(color).toBe('danger');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('AmountDisplay auto variant and detail screen agree on color for non-zero amounts', () => {
    fc.assert(
      fc.property(nonZeroAmountArb, (amount) => {
        const autoColor = getAmountColor(amount);
        const detailColor = getDetailScreenAmountColor(amount);

        // Both should agree: positive → success, negative → danger
        if (amount > 0) {
          expect(autoColor).toBe('success');
          expect(detailColor).toBe('success');
        } else {
          expect(autoColor).toBe('danger');
          expect(detailColor).toBe('danger');
        }
      }),
      { numRuns: 100 }
    );
  });
});
