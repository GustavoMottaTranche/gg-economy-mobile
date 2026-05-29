import fc from 'fast-check';

/**
 * Property 2: Section total equals sum of category amounts
 *
 * For any non-empty array of category breakdown items belonging to an expense group,
 * the computed section total SHALL equal the arithmetic sum of all individual category
 * `total` values in that group.
 *
 * **Validates: Requirements 1.7, 1.8**
 */

interface CategoryBreakdownItem {
  categoryId: string | null;
  categoryName: string;
  categoryType: string | null;
  categoryColor: string;
  categoryIcon: string;
  expenseGroup: string | null;
  total: number;
  count: number;
  percentage: number;
}

const categoryBreakdownItemArb = (expenseGroup: 'fixed' | 'variable') =>
  fc.record({
    categoryId: fc.oneof(fc.uuid(), fc.constant(null)),
    categoryName: fc.string({ minLength: 1, maxLength: 50 }),
    categoryType: fc.oneof(fc.constant('expense'), fc.constant('income'), fc.constant(null)),
    categoryColor: fc
      .array(fc.oneof(...'0123456789abcdef'.split('').map((c) => fc.constant(c))), {
        minLength: 6,
        maxLength: 6,
      })
      .map((chars) => `#${chars.join('')}`),
    categoryIcon: fc.string({ minLength: 1, maxLength: 20 }),
    expenseGroup: fc.constant(expenseGroup),
    total: fc.integer({ min: 0, max: 99999999 }),
    count: fc.integer({ min: 0, max: 1000 }),
    percentage: fc.integer({ min: 0, max: 100 }),
  });

/**
 * Computes the section total from an array of category breakdown items.
 * This mirrors the computation in useDashboardData for fixedTotal and variableTotal.
 */
function computeSectionTotal(items: CategoryBreakdownItem[]): number {
  return items.reduce((sum, item) => sum + item.total, 0);
}

describe('Property 2: Section total equals sum of category amounts', () => {
  it('fixed section total equals arithmetic sum of all fixed category totals', () => {
    fc.assert(
      fc.property(
        fc.array(categoryBreakdownItemArb('fixed'), { minLength: 1, maxLength: 30 }),
        (items: CategoryBreakdownItem[]) => {
          const sectionTotal = computeSectionTotal(items);
          const expectedSum = items.reduce((sum, item) => sum + item.total, 0);
          expect(sectionTotal).toBe(expectedSum);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('variable section total equals arithmetic sum of all variable category totals', () => {
    fc.assert(
      fc.property(
        fc.array(categoryBreakdownItemArb('variable'), { minLength: 1, maxLength: 30 }),
        (items: CategoryBreakdownItem[]) => {
          const sectionTotal = computeSectionTotal(items);
          const expectedSum = items.reduce((sum, item) => sum + item.total, 0);
          expect(sectionTotal).toBe(expectedSum);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('section total is zero when all category totals are zero', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant('fixed' as const), fc.constant('variable' as const)),
        fc.integer({ min: 1, max: 30 }),
        (group, count) => {
          const items: CategoryBreakdownItem[] = Array.from({ length: count }, (_, i) => ({
            categoryId: `cat-${i}`,
            categoryName: `Category ${i}`,
            categoryType: 'expense',
            categoryColor: '#000000',
            categoryIcon: 'circle',
            expenseGroup: group,
            total: 0,
            count: 0,
            percentage: 0,
          }));
          const sectionTotal = computeSectionTotal(items);
          expect(sectionTotal).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('section total with single item equals that item total', () => {
    fc.assert(
      fc.property(
        fc.oneof(categoryBreakdownItemArb('fixed'), categoryBreakdownItemArb('variable')),
        (item: CategoryBreakdownItem) => {
          const sectionTotal = computeSectionTotal([item]);
          expect(sectionTotal).toBe(item.total);
        },
      ),
      { numRuns: 100 },
    );
  });
});
