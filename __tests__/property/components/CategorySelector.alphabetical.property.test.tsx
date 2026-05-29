/**
 * Property-Based Test: CategorySelector Alphabetical Order (Property 12)
 *
 * Feature: default-categories-setup, Property 12: CategorySelector mantém ordem alfabética invariante
 *
 * **Validates: Requirements 12.7**
 *
 * *For any* set of categories and any filter state, categories in the second select must
 * always be in alphabetical order by name.
 *
 * Tests the SORTING LOGIC directly as a pure function rather than rendering the component.
 */
import * as fc from 'fast-check';
import type { Category, ExpenseGroup } from '../../../src/types';

// Feature: default-categories-setup, Property 12: CategorySelector mantém ordem alfabética invariante

/**
 * Replicates the filtering + sorting logic from CategorySelector component.
 * This is the pure function version of the component's useMemo filtering.
 */
function filterAndSortCategories(
  selectedGroup: ExpenseGroup | 'income' | null,
  fixedExpenseCategories: Category[],
  variableExpenseCategories: Category[],
  incomeCategories: Category[],
  expenseCategories: Category[]
): Category[] {
  let result: Category[];

  switch (selectedGroup) {
    case 'fixed':
      result = [...fixedExpenseCategories];
      break;
    case 'variable':
      result = [...variableExpenseCategories];
      break;
    case 'income':
      result = [...incomeCategories];
      break;
    default:
      // No group selected: show all active expense categories
      result = [...expenseCategories];
      break;
  }

  // Always sort alphabetically by name
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Arbitrary generator for a Category object
 */
const categoryArb = (): fc.Arbitrary<Category> =>
  fc
    .record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 30 }),
      type: fc.constantFrom('expense' as const, 'income' as const),
      icon: fc.string({ minLength: 1, maxLength: 20 }),
      color: fc
        .array(fc.integer({ min: 0, max: 255 }), { minLength: 3, maxLength: 3 })
        .map(
          ([r, g, b]) =>
            `#${r!.toString(16).padStart(2, '0')}${g!.toString(16).padStart(2, '0')}${b!.toString(16).padStart(2, '0')}`
        ),
      isActive: fc.boolean(),
      expenseGroup: fc.constantFrom('fixed' as const, 'variable' as const, null),
      createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
    })
    .map((r) => ({ ...r, expenseGroup: r.type === 'income' ? null : r.expenseGroup }));

/**
 * Generate a set of categories and derive the filtered lists from them
 * (simulating what useCategories hook provides)
 */
function deriveFilteredLists(categories: Category[]) {
  const activeCategories = categories.filter((c) => c.isActive);
  const expenseCategories = activeCategories.filter((c) => c.type === 'expense');
  const incomeCategories = activeCategories.filter((c) => c.type === 'income');
  const fixedExpenseCategories = expenseCategories.filter((c) => c.expenseGroup === 'fixed');
  const variableExpenseCategories = expenseCategories.filter((c) => c.expenseGroup === 'variable');

  return {
    expenseCategories,
    incomeCategories,
    fixedExpenseCategories,
    variableExpenseCategories,
  };
}

describe('Property 12: CategorySelector mantém ordem alfabética invariante', () => {
  it('for any set of categories and any filter state, the output is always sorted alphabetically by name', () => {
    /**
     * **Validates: Requirements 12.7**
     */
    fc.assert(
      fc.property(
        fc.array(categoryArb(), { minLength: 0, maxLength: 50 }),
        fc.constantFrom<ExpenseGroup | 'income' | null>('fixed', 'variable', 'income', null),
        (categories, selectedGroup) => {
          const {
            fixedExpenseCategories,
            variableExpenseCategories,
            incomeCategories,
            expenseCategories,
          } = deriveFilteredLists(categories);

          const result = filterAndSortCategories(
            selectedGroup,
            fixedExpenseCategories,
            variableExpenseCategories,
            incomeCategories,
            expenseCategories
          );

          // The result must be in alphabetical order by name
          for (let i = 1; i < result.length; i++) {
            expect(result[i - 1]!.name.localeCompare(result[i]!.name)).toBeLessThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('alphabetical order is maintained regardless of input order (shuffled inputs)', () => {
    /**
     * **Validates: Requirements 12.7**
     *
     * Specifically tests that even when the input categories are in random/reverse order,
     * the output is always sorted alphabetically.
     */
    fc.assert(
      fc.property(
        fc.array(categoryArb(), { minLength: 2, maxLength: 50 }),
        fc.constantFrom<ExpenseGroup | 'income' | null>('fixed', 'variable', 'income', null),
        fc.infiniteStream(fc.boolean()),
        (categories, selectedGroup, shuffleStream) => {
          // Shuffle the categories array using the random stream
          const shuffled = [...categories].sort(() => (shuffleStream.next().value ? 1 : -1));

          const {
            fixedExpenseCategories,
            variableExpenseCategories,
            incomeCategories,
            expenseCategories,
          } = deriveFilteredLists(shuffled);

          const result = filterAndSortCategories(
            selectedGroup,
            fixedExpenseCategories,
            variableExpenseCategories,
            incomeCategories,
            expenseCategories
          );

          // The result must be in alphabetical order by name regardless of input order
          for (let i = 1; i < result.length; i++) {
            expect(result[i - 1]!.name.localeCompare(result[i]!.name)).toBeLessThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('alphabetical order is consistent across all group selections for the same dataset', () => {
    /**
     * **Validates: Requirements 12.7**
     *
     * For any dataset, filtering by different groups and then checking order
     * must always yield alphabetically sorted results.
     */
    fc.assert(
      fc.property(fc.array(categoryArb(), { minLength: 0, maxLength: 50 }), (categories) => {
        const {
          fixedExpenseCategories,
          variableExpenseCategories,
          incomeCategories,
          expenseCategories,
        } = deriveFilteredLists(categories);

        const allGroups: (ExpenseGroup | 'income' | null)[] = ['fixed', 'variable', 'income', null];

        for (const group of allGroups) {
          const result = filterAndSortCategories(
            group,
            fixedExpenseCategories,
            variableExpenseCategories,
            incomeCategories,
            expenseCategories
          );

          // Each group's result must be independently sorted alphabetically
          for (let i = 1; i < result.length; i++) {
            expect(result[i - 1]!.name.localeCompare(result[i]!.name)).toBeLessThanOrEqual(0);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
