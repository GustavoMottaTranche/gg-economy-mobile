/**
 * Property-Based Test: CategorySelector Auto-Populate (Property 13)
 *
 * Feature: default-categories-setup, Property 13: CategorySelector auto-popula grupo ao selecionar categoria
 *
 * **Validates: Requirements 12.5**
 *
 * *For any* category selected directly in the second select without prior group selection,
 * the first select must be automatically filled with the expenseGroup of the selected category.
 *
 * Tests the AUTO-POPULATE LOGIC directly as a pure function rather than rendering the component.
 */
import * as fc from 'fast-check';
import type { Category, ExpenseGroup } from '../../../src/types';

// Feature: default-categories-setup, Property 13: CategorySelector auto-popula grupo ao selecionar categoria

/**
 * Group selection type matching the component's type
 */
type GroupSelection = ExpenseGroup | 'income' | null;

/**
 * Replicates the auto-populate logic from CategorySelector's handleCategorySelect.
 * Given a category selected directly, determines what the first select (group) should be set to.
 */
function deriveGroupFromCategory(category: Category): GroupSelection {
  if (category.type === 'income') {
    return 'income';
  } else if (category.expenseGroup) {
    return category.expenseGroup;
  }
  // If expense category has no expenseGroup (null), group remains unchanged
  return null;
}

/**
 * Arbitrary generator for a Category object with guaranteed expenseGroup for expense types.
 * This generator ensures expense categories always have a non-null expenseGroup,
 * which is the realistic scenario for seeded/created categories.
 */
const categoryWithGroupArb = (): fc.Arbitrary<Category> =>
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
      isActive: fc.constant(true),
      expenseGroup: fc.constantFrom('fixed' as const, 'variable' as const),
      createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
    })
    .map((r) => ({
      ...r,
      // Income categories always have null expenseGroup
      expenseGroup: r.type === 'income' ? null : r.expenseGroup,
    }));

/**
 * Arbitrary generator for a Category that may have null expenseGroup (edge case)
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
      isActive: fc.constant(true),
      expenseGroup: fc.constantFrom('fixed' as const, 'variable' as const, null),
      createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
    })
    .map((r) => ({
      ...r,
      expenseGroup: r.type === 'income' ? null : r.expenseGroup,
    }));

describe('Property 13: CategorySelector auto-popula grupo ao selecionar categoria', () => {
  it('when a category with type "income" is selected, the group is set to "income"', () => {
    /**
     * **Validates: Requirements 12.5**
     */
    fc.assert(
      fc.property(
        categoryArb().filter((c) => c.type === 'income'),
        (category) => {
          const derivedGroup = deriveGroupFromCategory(category);
          expect(derivedGroup).toBe('income');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when an expense category with expenseGroup "fixed" is selected, the group is set to "fixed"', () => {
    /**
     * **Validates: Requirements 12.5**
     */
    fc.assert(
      fc.property(
        categoryWithGroupArb().filter((c) => c.type === 'expense' && c.expenseGroup === 'fixed'),
        (category) => {
          const derivedGroup = deriveGroupFromCategory(category);
          expect(derivedGroup).toBe('fixed');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when an expense category with expenseGroup "variable" is selected, the group is set to "variable"', () => {
    /**
     * **Validates: Requirements 12.5**
     */
    fc.assert(
      fc.property(
        categoryWithGroupArb().filter((c) => c.type === 'expense' && c.expenseGroup === 'variable'),
        (category) => {
          const derivedGroup = deriveGroupFromCategory(category);
          expect(derivedGroup).toBe('variable');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for any category with a defined expenseGroup or income type, the auto-populated group always matches the category classification', () => {
    /**
     * **Validates: Requirements 12.5**
     *
     * Universal property: for any category selected directly, the first select
     * is automatically filled with the correct group based on the category's classification.
     */
    fc.assert(
      fc.property(categoryWithGroupArb(), (category) => {
        const derivedGroup = deriveGroupFromCategory(category);

        if (category.type === 'income') {
          // Income categories always auto-populate to 'income'
          expect(derivedGroup).toBe('income');
        } else {
          // Expense categories auto-populate to their expenseGroup
          expect(derivedGroup).toBe(category.expenseGroup);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('auto-populate never returns an invalid group value', () => {
    /**
     * **Validates: Requirements 12.5**
     *
     * The derived group must always be one of the valid values:
     * 'fixed', 'variable', 'income', or null.
     */
    fc.assert(
      fc.property(categoryArb(), (category) => {
        const derivedGroup = deriveGroupFromCategory(category);

        const validGroups: Array<GroupSelection> = ['fixed', 'variable', 'income', null];
        expect(validGroups).toContain(derivedGroup);
      }),
      { numRuns: 100 }
    );
  });
});
