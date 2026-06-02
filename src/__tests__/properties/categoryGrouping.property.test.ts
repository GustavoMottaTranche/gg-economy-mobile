import fc from 'fast-check';
import { groupByExpenseGroup } from '../../utils/groupByExpenseGroup';

/**
 * Property 1: Category grouping partitions by expenseGroup
 *
 * For any array of expense categories with mixed expenseGroup values ('fixed', 'variable', or null),
 * the grouping function SHALL place all categories with expenseGroup = 'fixed' into the fixed group,
 * all categories with expenseGroup = 'variable' into the variable group, and exclude all categories
 * with expenseGroup = null from both groups.
 *
 * **Validates: Requirements 1.1**
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
  total: fc.integer({ min: 0, max: 99999999 }),
  count: fc.integer({ min: 0, max: 1000 }),
  percentage: fc.integer({ min: 0, max: 100 }),
});

describe('Property 1: Category grouping partitions by expenseGroup', () => {
  it('all items in fixed group have expenseGroup = "fixed"', () => {
    fc.assert(
      fc.property(
        fc.array(categoryBreakdownItemArb, { minLength: 0, maxLength: 30 }),
        (categories: CategoryBreakdownItem[]) => {
          const result = groupByExpenseGroup(categories);
          for (const item of result.fixed) {
            expect(item.expenseGroup).toBe('fixed');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all items in variable group have expenseGroup = "variable"', () => {
    fc.assert(
      fc.property(
        fc.array(categoryBreakdownItemArb, { minLength: 0, maxLength: 30 }),
        (categories: CategoryBreakdownItem[]) => {
          const result = groupByExpenseGroup(categories);
          for (const item of result.variable) {
            expect(item.expenseGroup).toBe('variable');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('items with expenseGroup = null are excluded from both groups', () => {
    fc.assert(
      fc.property(
        fc.array(categoryBreakdownItemArb, { minLength: 0, maxLength: 30 }),
        (categories: CategoryBreakdownItem[]) => {
          const result = groupByExpenseGroup(categories);
          const allGrouped = [...result.fixed, ...result.variable];
          for (const item of allGrouped) {
            expect(item.expenseGroup).not.toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('every fixed item from input appears in the fixed group', () => {
    fc.assert(
      fc.property(
        fc.array(categoryBreakdownItemArb, { minLength: 0, maxLength: 30 }),
        (categories: CategoryBreakdownItem[]) => {
          const result = groupByExpenseGroup(categories);
          const fixedFromInput = categories.filter((c) => c.expenseGroup === 'fixed');
          expect(result.fixed).toHaveLength(fixedFromInput.length);
          for (const item of fixedFromInput) {
            expect(result.fixed).toContain(item);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('every variable item from input appears in the variable group', () => {
    fc.assert(
      fc.property(
        fc.array(categoryBreakdownItemArb, { minLength: 0, maxLength: 30 }),
        (categories: CategoryBreakdownItem[]) => {
          const result = groupByExpenseGroup(categories);
          const variableFromInput = categories.filter((c) => c.expenseGroup === 'variable');
          expect(result.variable).toHaveLength(variableFromInput.length);
          for (const item of variableFromInput) {
            expect(result.variable).toContain(item);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('total items in both groups equals input items minus null expenseGroup items', () => {
    fc.assert(
      fc.property(
        fc.array(categoryBreakdownItemArb, { minLength: 0, maxLength: 30 }),
        (categories: CategoryBreakdownItem[]) => {
          const result = groupByExpenseGroup(categories);
          const nullCount = categories.filter((c) => c.expenseGroup === null).length;
          expect(result.fixed.length + result.variable.length).toBe(categories.length - nullCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
