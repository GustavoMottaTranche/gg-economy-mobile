// Feature: variable-expense-goals, Property 4: Expected Future Spending calculation

/**
 * Property 4: Expected Future Spending calculation
 *
 * For any array of categories with optional goals and actual spending amounts,
 * the `calculateExpectedFutureSpending` function SHALL return the sum of
 * `max(0, goal - actualSpending)` for categories that have goals, and exclude
 * categories without goals entirely. The result SHALL always be >= 0.
 *
 * **Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.6**
 */

import fc from 'fast-check';
import {
  calculateExpectedFutureSpending,
  type CategorySpendingWithGoal,
} from '../services/goals/ExpectedFutureSpending';

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Generates a UUID-like category ID */
const categoryIdArb = fc.uuid();

/** Generates a positive amount in cents (1 to 99,999,999,99 — matching max goal range) */
const amountInCentsArb = fc.integer({ min: 0, max: 9999999999 });

/** Generates a goal value (positive cents, or null for no goal) */
const goalArb = fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 9999999999 }));

/** Generates a single CategorySpendingWithGoal entry */
const categorySpendingWithGoalArb: fc.Arbitrary<CategorySpendingWithGoal> = fc.record({
  categoryId: categoryIdArb,
  actualSpending: amountInCentsArb,
  goal: goalArb,
});

/** Generates an array of CategorySpendingWithGoal entries */
const categoriesArb = fc.array(categorySpendingWithGoalArb, { minLength: 0, maxLength: 20 });

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: variable-expense-goals, Property 4: Expected Future Spending calculation', () => {
  it('result equals manual sum of max(0, goal - actual) for categories with goals', () => {
    fc.assert(
      fc.property(categoriesArb, (categories) => {
        const result = calculateExpectedFutureSpending(categories);

        // Manually compute expected value
        const expected = categories.reduce((sum, cat) => {
          if (cat.goal === null) {
            return sum;
          }
          return sum + Math.max(0, cat.goal - cat.actualSpending);
        }, 0);

        expect(result).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('result is always >= 0', () => {
    fc.assert(
      fc.property(categoriesArb, (categories) => {
        const result = calculateExpectedFutureSpending(categories);
        expect(result).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });

  it('categories without goals contribute nothing to the result', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            categoryId: categoryIdArb,
            actualSpending: amountInCentsArb,
            goal: fc.constant(null as null),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (categoriesWithoutGoals) => {
          const result = calculateExpectedFutureSpending(categoriesWithoutGoals);
          expect(result).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when actual spending exceeds goal, that category contributes zero (not negative)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999999999 }).chain((goal) =>
          fc.record({
            categoryId: categoryIdArb,
            actualSpending: fc.integer({ min: goal, max: goal + 9999999999 }),
            goal: fc.constant(goal),
          })
        ),
        (category) => {
          const result = calculateExpectedFutureSpending([category]);
          expect(result).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when actual spending is zero, full goal amount is contributed', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: categoryIdArb,
          actualSpending: fc.constant(0),
          goal: fc.integer({ min: 1, max: 9999999999 }),
        }),
        (category) => {
          const result = calculateExpectedFutureSpending([category]);
          expect(result).toBe(category.goal);
        }
      ),
      { numRuns: 100 }
    );
  });
});
