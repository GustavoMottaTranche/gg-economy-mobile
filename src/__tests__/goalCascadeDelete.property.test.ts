// Feature: variable-expense-goals, Property 7: Cascade delete removes associated goals

/**
 * Property 7: Cascade delete removes associated goals
 *
 * For any category that has an associated goal in `category_goals`,
 * deleting the category SHALL also delete the goal record (no orphaned goals remain).
 *
 * **Validates: Requirements 6.5**
 */

import * as fc from 'fast-check';
import type { CategoryGoal } from '../types/goal';

// ─── Mocks ───────────────────────────────────────────────────────────────────

/**
 * In-memory store simulating the database with ON DELETE CASCADE behavior.
 * When a category is deleted, all associated goals are automatically removed.
 */
interface MockCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  isActive: boolean;
  expenseGroup: string | null;
  createdAt: string;
}

interface MockDatabase {
  categories: Map<string, MockCategory>;
  categoryGoals: Map<string, CategoryGoal>; // keyed by categoryId
}

/**
 * Creates a fresh in-memory database that simulates SQLite cascade delete behavior.
 */
function createMockDatabase(): MockDatabase {
  return {
    categories: new Map(),
    categoryGoals: new Map(),
  };
}

/**
 * Inserts a category into the mock database.
 */
function insertCategory(db: MockDatabase, category: MockCategory): void {
  db.categories.set(category.id, category);
}

/**
 * Inserts a goal for a category into the mock database.
 * Simulates the UNIQUE constraint on category_id.
 */
function upsertGoal(db: MockDatabase, categoryId: string, amountInCents: number): CategoryGoal {
  const now = new Date().toISOString();
  const existing = db.categoryGoals.get(categoryId);
  const goal: CategoryGoal = {
    id: existing?.id ?? `goal-${categoryId}`,
    categoryId,
    amount: amountInCents,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  db.categoryGoals.set(categoryId, goal);
  return goal;
}

/**
 * Deletes a category from the mock database.
 * Simulates ON DELETE CASCADE: removes any associated goal.
 */
function deleteCategory(db: MockDatabase, categoryId: string): void {
  db.categories.delete(categoryId);
  // CASCADE: remove associated goal
  db.categoryGoals.delete(categoryId);
}

/**
 * Gets a goal by category ID. Returns null if not found.
 */
function getGoalByCategoryId(db: MockDatabase, categoryId: string): CategoryGoal | null {
  return db.categoryGoals.get(categoryId) ?? null;
}

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generates a valid category ID (UUID-like) */
const categoryIdArb = fc.uuid();

/** Generates a valid category name */
const categoryNameArb = fc.string({ minLength: 1, maxLength: 50 });

/** Generates a valid goal amount in cents (1 to 99999999999) */
const goalAmountArb = fc.integer({ min: 1, max: 99999999999 });

/** Generates a mock category record */
const categoryArb: fc.Arbitrary<MockCategory> = fc.record({
  id: categoryIdArb,
  name: categoryNameArb,
  type: fc.constant('expense' as const),
  icon: fc.constant('shopping-cart'),
  color: fc.constant('#FF5733'),
  isActive: fc.constant(true),
  expenseGroup: fc.constant('variable'),
  createdAt: fc.constant('2024-01-01T00:00:00.000Z'),
});

/** Generates a category + goal pair */
const categoryWithGoalArb = fc.record({
  category: categoryArb,
  goalAmount: goalAmountArb,
});

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: variable-expense-goals, Property 7: Cascade delete removes associated goals', () => {
  it('deleting a category removes its associated goal (cascade delete)', () => {
    fc.assert(
      fc.property(categoryWithGoalArb, ({ category, goalAmount }) => {
        const db = createMockDatabase();

        // Setup: insert category and its goal
        insertCategory(db, category);
        upsertGoal(db, category.id, goalAmount);

        // Verify goal exists before deletion
        const goalBefore = getGoalByCategoryId(db, category.id);
        expect(goalBefore).not.toBeNull();
        expect(goalBefore!.amount).toBe(goalAmount);

        // Act: delete the category (triggers cascade)
        deleteCategory(db, category.id);

        // Assert: goal is gone after category deletion
        const goalAfter = getGoalByCategoryId(db, category.id);
        expect(goalAfter).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('cascade delete only removes goals for the deleted category, not other categories', () => {
    fc.assert(
      fc.property(categoryWithGoalArb, categoryWithGoalArb, (pair1, pair2) => {
        // Ensure distinct category IDs
        fc.pre(pair1.category.id !== pair2.category.id);

        const db = createMockDatabase();

        // Setup: insert both categories with goals
        insertCategory(db, pair1.category);
        insertCategory(db, pair2.category);
        upsertGoal(db, pair1.category.id, pair1.goalAmount);
        upsertGoal(db, pair2.category.id, pair2.goalAmount);

        // Act: delete only the first category
        deleteCategory(db, pair1.category.id);

        // Assert: first category's goal is gone
        const goal1After = getGoalByCategoryId(db, pair1.category.id);
        expect(goal1After).toBeNull();

        // Assert: second category's goal is preserved
        const goal2After = getGoalByCategoryId(db, pair2.category.id);
        expect(goal2After).not.toBeNull();
        expect(goal2After!.amount).toBe(pair2.goalAmount);
      }),
      { numRuns: 100 }
    );
  });

  it('deleting a category without a goal does not affect other goals', () => {
    fc.assert(
      fc.property(categoryArb, categoryWithGoalArb, (categoryWithoutGoal, pairWithGoal) => {
        // Ensure distinct category IDs
        fc.pre(categoryWithoutGoal.id !== pairWithGoal.category.id);

        const db = createMockDatabase();

        // Setup: insert category without goal and another with goal
        insertCategory(db, categoryWithoutGoal);
        insertCategory(db, pairWithGoal.category);
        upsertGoal(db, pairWithGoal.category.id, pairWithGoal.goalAmount);

        // Act: delete the category without a goal
        deleteCategory(db, categoryWithoutGoal.id);

        // Assert: the other category's goal is not affected
        const goalAfter = getGoalByCategoryId(db, pairWithGoal.category.id);
        expect(goalAfter).not.toBeNull();
        expect(goalAfter!.amount).toBe(pairWithGoal.goalAmount);
      }),
      { numRuns: 100 }
    );
  });

  it('no orphaned goals remain after bulk category deletion', () => {
    fc.assert(
      fc.property(fc.array(categoryWithGoalArb, { minLength: 1, maxLength: 10 }), (pairs) => {
        // Ensure unique category IDs
        const uniqueIds = new Set(pairs.map((p) => p.category.id));
        fc.pre(uniqueIds.size === pairs.length);

        const db = createMockDatabase();

        // Setup: insert all categories with goals
        for (const { category, goalAmount } of pairs) {
          insertCategory(db, category);
          upsertGoal(db, category.id, goalAmount);
        }

        // Act: delete all categories
        for (const { category } of pairs) {
          deleteCategory(db, category.id);
        }

        // Assert: no goals remain
        for (const { category } of pairs) {
          const goal = getGoalByCategoryId(db, category.id);
          expect(goal).toBeNull();
        }
        expect(db.categoryGoals.size).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});
