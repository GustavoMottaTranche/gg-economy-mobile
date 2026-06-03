// Feature: variable-expense-goals, Property 6: Categories displayed in alphabetical order

/**
 * Property 6: Categories displayed in alphabetical order
 *
 * For any set of variable categories with arbitrary names, the Budget Goals screen
 * SHALL display them sorted in ascending alphabetical order by name.
 *
 * Tests the sorting logic used in the Budget Goals screen:
 * [...categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
 *
 * **Validates: Requirements 7.9**
 */

import * as fc from 'fast-check';

/**
 * Replicates the sorting logic from the BudgetGoals screen.
 * This is the pure function extracted from the component's useMemo.
 */
function sortCategoriesAlphabetically<T extends { name: string }>(categories: T[]): T[] {
  return [...categories].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

/**
 * Generator for category name strings.
 * Generates non-empty strings that represent realistic category names.
 */
const categoryNameArb = fc.string({ minLength: 1, maxLength: 30 });

describe('Property 6: Categories displayed in alphabetical order', () => {
  it('sorting any array of category names produces ascending alphabetical order', () => {
    /**
     * **Validates: Requirements 7.9**
     */
    fc.assert(
      fc.property(fc.array(categoryNameArb, { minLength: 0, maxLength: 50 }), (names) => {
        const categories = names.map((name, i) => ({ id: `cat-${i}`, name }));
        const sorted = sortCategoriesAlphabetically(categories);

        // Verify ascending alphabetical order (case-insensitive)
        for (let i = 1; i < sorted.length; i++) {
          const comparison = sorted[i - 1]!.name.localeCompare(sorted[i]!.name, undefined, {
            sensitivity: 'base',
          });
          expect(comparison).toBeLessThanOrEqual(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('sorting is idempotent — sorting an already sorted array produces the same result', () => {
    /**
     * **Validates: Requirements 7.9**
     */
    fc.assert(
      fc.property(fc.array(categoryNameArb, { minLength: 0, maxLength: 50 }), (names) => {
        const categories = names.map((name, i) => ({ id: `cat-${i}`, name }));
        const sortedOnce = sortCategoriesAlphabetically(categories);
        const sortedTwice = sortCategoriesAlphabetically(sortedOnce);

        expect(sortedTwice.map((c) => c.name)).toEqual(sortedOnce.map((c) => c.name));
      }),
      { numRuns: 100 }
    );
  });

  it('sorting preserves all original elements (no additions or removals)', () => {
    /**
     * **Validates: Requirements 7.9**
     */
    fc.assert(
      fc.property(fc.array(categoryNameArb, { minLength: 0, maxLength: 50 }), (names) => {
        const categories = names.map((name, i) => ({ id: `cat-${i}`, name }));
        const sorted = sortCategoriesAlphabetically(categories);

        // Same length
        expect(sorted.length).toBe(categories.length);

        // Same set of names (sorted vs original)
        const originalNames = [...categories.map((c) => c.name)].sort();
        const sortedNames = [...sorted.map((c) => c.name)].sort();
        expect(sortedNames).toEqual(originalNames);
      }),
      { numRuns: 100 }
    );
  });

  it('sorting is case-insensitive — "apple" and "Apple" are treated as equivalent order', () => {
    /**
     * **Validates: Requirements 7.9**
     *
     * The sensitivity: 'base' option means case differences and accents do not affect ordering.
     */
    fc.assert(
      fc.property(
        fc.array(
          fc
            .tuple(categoryNameArb, fc.boolean())
            .map(([name, upper]) => (upper ? name.toUpperCase() : name.toLowerCase())),
          { minLength: 2, maxLength: 30 }
        ),
        (names) => {
          const categories = names.map((name, i) => ({ id: `cat-${i}`, name }));
          const sorted = sortCategoriesAlphabetically(categories);

          // The result must still be in ascending order with case-insensitive comparison
          for (let i = 1; i < sorted.length; i++) {
            const comparison = sorted[i - 1]!.name.localeCompare(sorted[i]!.name, undefined, {
              sensitivity: 'base',
            });
            expect(comparison).toBeLessThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
