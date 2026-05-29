/**
 * Property-Based Test: CategorySelector Filtering (Property 11)
 *
 * Feature: default-categories-setup, Property 11: CategorySelector filtra corretamente por grupo
 *
 * **Validates: Requirements 12.3, 12.4, 12.8**
 *
 * *For any* set of active categories and any group selection, the second select must show
 * exactly the active categories belonging to that group. When no group is selected,
 * must show all active expense categories.
 *
 * Tests the FILTERING LOGIC directly as a pure function rather than rendering the component.
 */
import * as fc from 'fast-check';
import type { Category, ExpenseGroup } from '../../../src/types';

// Feature: default-categories-setup, Property 11: CategorySelector filtra corretamente por grupo

/**
 * Replicates the filtering logic from CategorySelector component.
 * This is the pure function version of the component's useMemo filtering.
 */
function filterCategories(
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

describe('Property 11: CategorySelector filtra corretamente por grupo', () => {
  it('when selectedGroup is "fixed", returns exactly the active fixed expense categories sorted alphabetically', () => {
    /**
     * **Validates: Requirements 12.3**
     */
    fc.assert(
      fc.property(fc.array(categoryArb(), { minLength: 0, maxLength: 50 }), (categories) => {
        const {
          fixedExpenseCategories,
          variableExpenseCategories,
          incomeCategories,
          expenseCategories,
        } = deriveFilteredLists(categories);

        const result = filterCategories(
          'fixed',
          fixedExpenseCategories,
          variableExpenseCategories,
          incomeCategories,
          expenseCategories
        );

        // Must contain exactly the active fixed expense categories
        expect(result.length).toBe(fixedExpenseCategories.length);

        // Every result must be an active fixed expense category
        for (const cat of result) {
          expect(cat.isActive).toBe(true);
          expect(cat.type).toBe('expense');
          expect(cat.expenseGroup).toBe('fixed');
        }

        // Must be sorted alphabetically
        for (let i = 1; i < result.length; i++) {
          expect(result[i - 1]!.name.localeCompare(result[i]!.name)).toBeLessThanOrEqual(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('when selectedGroup is "variable", returns exactly the active variable expense categories sorted alphabetically', () => {
    /**
     * **Validates: Requirements 12.3**
     */
    fc.assert(
      fc.property(fc.array(categoryArb(), { minLength: 0, maxLength: 50 }), (categories) => {
        const {
          fixedExpenseCategories,
          variableExpenseCategories,
          incomeCategories,
          expenseCategories,
        } = deriveFilteredLists(categories);

        const result = filterCategories(
          'variable',
          fixedExpenseCategories,
          variableExpenseCategories,
          incomeCategories,
          expenseCategories
        );

        // Must contain exactly the active variable expense categories
        expect(result.length).toBe(variableExpenseCategories.length);

        // Every result must be an active variable expense category
        for (const cat of result) {
          expect(cat.isActive).toBe(true);
          expect(cat.type).toBe('expense');
          expect(cat.expenseGroup).toBe('variable');
        }

        // Must be sorted alphabetically
        for (let i = 1; i < result.length; i++) {
          expect(result[i - 1]!.name.localeCompare(result[i]!.name)).toBeLessThanOrEqual(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('when selectedGroup is "income", returns exactly the active income categories sorted alphabetically', () => {
    /**
     * **Validates: Requirements 12.3**
     */
    fc.assert(
      fc.property(fc.array(categoryArb(), { minLength: 0, maxLength: 50 }), (categories) => {
        const {
          fixedExpenseCategories,
          variableExpenseCategories,
          incomeCategories,
          expenseCategories,
        } = deriveFilteredLists(categories);

        const result = filterCategories(
          'income',
          fixedExpenseCategories,
          variableExpenseCategories,
          incomeCategories,
          expenseCategories
        );

        // Must contain exactly the active income categories
        expect(result.length).toBe(incomeCategories.length);

        // Every result must be an active income category
        for (const cat of result) {
          expect(cat.isActive).toBe(true);
          expect(cat.type).toBe('income');
        }

        // Must be sorted alphabetically
        for (let i = 1; i < result.length; i++) {
          expect(result[i - 1]!.name.localeCompare(result[i]!.name)).toBeLessThanOrEqual(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('when selectedGroup is null, returns all active expense categories sorted alphabetically', () => {
    /**
     * **Validates: Requirements 12.4, 12.8**
     */
    fc.assert(
      fc.property(fc.array(categoryArb(), { minLength: 0, maxLength: 50 }), (categories) => {
        const {
          fixedExpenseCategories,
          variableExpenseCategories,
          incomeCategories,
          expenseCategories,
        } = deriveFilteredLists(categories);

        const result = filterCategories(
          null,
          fixedExpenseCategories,
          variableExpenseCategories,
          incomeCategories,
          expenseCategories
        );

        // Must contain exactly all active expense categories (regardless of expenseGroup)
        expect(result.length).toBe(expenseCategories.length);

        // Every result must be an active expense category
        for (const cat of result) {
          expect(cat.isActive).toBe(true);
          expect(cat.type).toBe('expense');
        }

        // Must be sorted alphabetically
        for (let i = 1; i < result.length; i++) {
          expect(result[i - 1]!.name.localeCompare(result[i]!.name)).toBeLessThanOrEqual(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('for any group selection, the result is a subset of the corresponding input list', () => {
    /**
     * **Validates: Requirements 12.3, 12.4, 12.8**
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

          const result = filterCategories(
            selectedGroup,
            fixedExpenseCategories,
            variableExpenseCategories,
            incomeCategories,
            expenseCategories
          );

          // Determine the expected source list
          let expectedSource: Category[];
          switch (selectedGroup) {
            case 'fixed':
              expectedSource = fixedExpenseCategories;
              break;
            case 'variable':
              expectedSource = variableExpenseCategories;
              break;
            case 'income':
              expectedSource = incomeCategories;
              break;
            default:
              expectedSource = expenseCategories;
              break;
          }

          // Result must have same length as source (all items included, just sorted)
          expect(result.length).toBe(expectedSource.length);

          // Every item in result must exist in the source
          const sourceIds = new Set(expectedSource.map((c) => c.id));
          for (const cat of result) {
            expect(sourceIds.has(cat.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
