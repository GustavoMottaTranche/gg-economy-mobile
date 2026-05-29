import fc from 'fast-check';
import { groupByExpenseGroup } from '../../utils/groupByExpenseGroup';
import { roundPercentages } from '../../utils/roundPercentages';

/**
 * Property 5: Filtered chart shows only matching group with correct relative percentages
 *
 * For any set of expense categories and a selected filter ('fixed' or 'variable'),
 * the chart SHALL display only categories belonging to the selected expense group,
 * and their displayed percentages SHALL sum to exactly 100 (relative to the group total,
 * not the overall total).
 *
 * **Validates: Requirements 4.2, 4.3**
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

const categoryBreakdownItemArb = fc.record({
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
  expenseGroup: fc.oneof(fc.constant('fixed'), fc.constant('variable'), fc.constant(null)),
  total: fc.integer({ min: 1, max: 99999999 }),
  count: fc.integer({ min: 1, max: 1000 }),
  percentage: fc.integer({ min: 0, max: 100 }),
});

const filterArb = fc.oneof(fc.constant('fixed' as const), fc.constant('variable' as const));

describe('Property 5: Filtered chart shows only matching group with correct relative percentages', () => {
  it('filtered categories contain only items from the selected expense group', () => {
    fc.assert(
      fc.property(
        fc.array(categoryBreakdownItemArb, { minLength: 1, maxLength: 30 }),
        filterArb,
        (categories: CategoryBreakdownItem[], filter) => {
          const grouped = groupByExpenseGroup(categories);
          const filteredCategories = grouped[filter];

          for (const item of filteredCategories) {
            expect(item.expenseGroup).toBe(filter);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('filtered percentages sum to exactly 100 when group has items with positive totals', () => {
    fc.assert(
      fc.property(
        fc
          .array(categoryBreakdownItemArb, { minLength: 1, maxLength: 30 })
          .filter((cats) => {
            // Ensure at least one item in either fixed or variable group
            return (
              cats.some((c) => c.expenseGroup === 'fixed') ||
              cats.some((c) => c.expenseGroup === 'variable')
            );
          }),
        filterArb,
        (categories: CategoryBreakdownItem[], filter) => {
          const grouped = groupByExpenseGroup(categories);
          const filteredCategories = grouped[filter];

          // Skip if no categories in the selected group
          if (filteredCategories.length === 0) return;

          const values = filteredCategories.map((c) => c.total);
          const groupTotal = values.reduce((sum, v) => sum + v, 0);

          // Skip if group total is zero (edge case handled by empty state)
          if (groupTotal === 0) return;

          const percentages = roundPercentages(values, groupTotal);
          const sum = percentages.reduce((acc, v) => acc + v, 0);

          expect(sum).toBe(100);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('number of filtered percentages matches number of categories in the selected group', () => {
    fc.assert(
      fc.property(
        fc.array(categoryBreakdownItemArb, { minLength: 1, maxLength: 30 }),
        filterArb,
        (categories: CategoryBreakdownItem[], filter) => {
          const grouped = groupByExpenseGroup(categories);
          const filteredCategories = grouped[filter];

          if (filteredCategories.length === 0) return;

          const values = filteredCategories.map((c) => c.total);
          const groupTotal = values.reduce((sum, v) => sum + v, 0);

          if (groupTotal === 0) return;

          const percentages = roundPercentages(values, groupTotal);

          expect(percentages.length).toBe(filteredCategories.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('categories with null expenseGroup are never included in filtered results', () => {
    fc.assert(
      fc.property(
        fc.array(categoryBreakdownItemArb, { minLength: 1, maxLength: 30 }),
        filterArb,
        (categories: CategoryBreakdownItem[], filter) => {
          const grouped = groupByExpenseGroup(categories);
          const filteredCategories = grouped[filter];

          for (const item of filteredCategories) {
            expect(item.expenseGroup).not.toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
