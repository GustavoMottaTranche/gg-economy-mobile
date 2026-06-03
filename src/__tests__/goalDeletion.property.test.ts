// Feature: variable-expense-goals, Property 2: Goal deletion returns absent state

/**
 * Property 2: Goal deletion returns absent state
 *
 * For any previously persisted goal (per-category), deleting it and then
 * querying SHALL return null, indicating no goal is configured.
 *
 * **Validates: Requirements 1.5, 2.5, 6.3, 6.7**
 */

import * as fc from 'fast-check';
import { CategoryGoalRepository } from '../repositories/CategoryGoalRepository';
import type { CategoryGoal } from '../types/goal';

// ─── Mock Database Layer ─────────────────────────────────────────────────────

jest.mock('../db/client', () => ({
  getDb: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => 'mock-uuid-' + Math.random().toString(36).slice(2, 10),
}));

/**
 * In-memory store simulating the category_goals table.
 * Each entry is keyed by categoryId (unique constraint).
 */
let store: Map<string, CategoryGoal>;

/**
 * Creates a mock repository that uses an in-memory Map to simulate
 * the database behavior for category goals.
 */
function createInMemoryRepository(): CategoryGoalRepository {
  const repo = new CategoryGoalRepository();

  // Override methods to use in-memory store
  repo.getByCategoryId = jest.fn(async (categoryId: string) => {
    return store.get(categoryId) ?? null;
  });

  repo.upsert = jest.fn(async (categoryId: string, amountInCents: number) => {
    const now = new Date().toISOString();
    const existing = store.get(categoryId);
    const goal: CategoryGoal = {
      id: existing?.id ?? `goal-${Math.random().toString(36).slice(2, 10)}`,
      categoryId,
      amount: amountInCents,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    store.set(categoryId, goal);
    return goal;
  });

  repo.delete = jest.fn(async (categoryId: string) => {
    store.delete(categoryId);
  });

  return repo;
}

// ─── Generators ──────────────────────────────────────────────────────────────

const categoryIdArbitrary = fc.uuid();

const validAmountArbitrary = fc.integer({ min: 1, max: 99999999999 });

const goalInputArbitrary = fc.record({
  categoryId: categoryIdArbitrary,
  amount: validAmountArbitrary,
});

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property 2: Goal deletion returns absent state', () => {
  let repo: CategoryGoalRepository;

  beforeEach(() => {
    store = new Map();
    repo = createInMemoryRepository();
  });

  it('deleting a persisted category goal returns null on subsequent query', async () => {
    await fc.assert(
      fc.asyncProperty(goalInputArbitrary, async ({ categoryId, amount }) => {
        // Persist a goal
        await repo.upsert(categoryId, amount);

        // Verify it exists
        const persisted = await repo.getByCategoryId(categoryId);
        expect(persisted).not.toBeNull();
        expect(persisted!.categoryId).toBe(categoryId);

        // Delete the goal
        await repo.delete(categoryId);

        // Verify it returns null (absent state)
        const afterDelete = await repo.getByCategoryId(categoryId);
        expect(afterDelete).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('deleting a non-existent goal does not throw and returns null on query', async () => {
    await fc.assert(
      fc.asyncProperty(categoryIdArbitrary, async (categoryId) => {
        // Delete a goal that was never persisted
        await repo.delete(categoryId);

        // Query should return null
        const result = await repo.getByCategoryId(categoryId);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('deleting one category goal does not affect other persisted goals', async () => {
    await fc.assert(
      fc.asyncProperty(goalInputArbitrary, goalInputArbitrary, async (goal1, goal2) => {
        // Ensure different category IDs
        fc.pre(goal1.categoryId !== goal2.categoryId);

        // Persist both goals
        await repo.upsert(goal1.categoryId, goal1.amount);
        await repo.upsert(goal2.categoryId, goal2.amount);

        // Delete only the first goal
        await repo.delete(goal1.categoryId);

        // First goal should be absent
        const deletedGoal = await repo.getByCategoryId(goal1.categoryId);
        expect(deletedGoal).toBeNull();

        // Second goal should still be present
        const remainingGoal = await repo.getByCategoryId(goal2.categoryId);
        expect(remainingGoal).not.toBeNull();
        expect(remainingGoal!.amount).toBe(goal2.amount);
      }),
      { numRuns: 100 }
    );
  });
});
