// Feature: variable-expense-goals, Property 1: Goal persistence round-trip

/**
 * Property 1: Goal persistence round-trip
 *
 * For any valid goal amount (between 1 and 99999999999 cents) and any valid category ID,
 * persisting a category goal via the repository and reading it back SHALL return the same amount.
 *
 * **Validates: Requirements 1.2, 2.2, 6.2**
 */

import * as fc from 'fast-check';
import { CategoryGoalRepository } from '../repositories/CategoryGoalRepository';
import type { CategoryGoal } from '../types/goal';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockFrom = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();
const mockValues = jest.fn();
const mockOnConflictDoUpdate = jest.fn();

jest.mock('../db/client', () => ({
  getDb: () => ({
    select: () => ({
      from: (table: unknown) => {
        mockFrom(table);
        return {
          where: (condition: unknown) => {
            mockWhere(condition);
            return {
              limit: (n: number) => {
                mockLimit(n);
                return mockSelect();
              },
            };
          },
        };
      },
    }),
    insert: (table: unknown) => {
      mockInsert(table);
      return {
        values: (data: unknown) => {
          mockValues(data);
          return {
            onConflictDoUpdate: (config: unknown) => {
              mockOnConflictDoUpdate(config);
              return Promise.resolve();
            },
          };
        },
      };
    },
  }),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substring(7),
}));

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Generates a valid amount in cents (1 to 99999999999) */
const validAmountArb = fc.integer({ min: 1, max: 99999999999 });

/** Generates a valid category ID (UUID-like string) */
const categoryIdArb = fc.uuid();

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: variable-expense-goals, Property 1: Goal persistence round-trip', () => {
  let repository: CategoryGoalRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new CategoryGoalRepository();
  });

  it('upsert followed by getByCategoryId returns the same amount for any valid amount and category ID', async () => {
    await fc.assert(
      fc.asyncProperty(categoryIdArb, validAmountArb, async (categoryId, amount) => {
        // Setup: after upsert, getByCategoryId will find the persisted record
        const persistedGoal: CategoryGoal = {
          id: 'mock-uuid-test',
          categoryId,
          amount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Mock select to return the persisted goal (simulating the read-back after upsert)
        mockSelect.mockResolvedValue([persistedGoal]);

        // Act: upsert the goal
        const result = await repository.upsert(categoryId, amount);

        // Assert: the returned goal has the same amount and categoryId
        expect(result.amount).toBe(amount);
        expect(result.categoryId).toBe(categoryId);
      }),
      { numRuns: 100 }
    );
  });

  it('upsert passes the exact amount to the database for any valid amount', async () => {
    await fc.assert(
      fc.asyncProperty(categoryIdArb, validAmountArb, async (categoryId, amount) => {
        const persistedGoal: CategoryGoal = {
          id: 'mock-uuid-test',
          categoryId,
          amount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        mockSelect.mockResolvedValue([persistedGoal]);

        // Act
        await repository.upsert(categoryId, amount);

        // Assert: the values passed to insert contain the exact amount
        expect(mockValues).toHaveBeenCalledWith(
          expect.objectContaining({
            categoryId,
            amount,
          })
        );
      }),
      { numRuns: 100 }
    );
  });

  it('getByCategoryId returns the exact amount stored for any valid category ID and amount', async () => {
    await fc.assert(
      fc.asyncProperty(categoryIdArb, validAmountArb, async (categoryId, amount) => {
        const storedGoal: CategoryGoal = {
          id: 'mock-uuid-stored',
          categoryId,
          amount,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        };

        // Mock the database to return the stored goal
        mockSelect.mockResolvedValue([storedGoal]);

        // Act
        const result = await repository.getByCategoryId(categoryId);

        // Assert: returned goal has the exact same amount
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(amount);
        expect(result!.categoryId).toBe(categoryId);
      }),
      { numRuns: 100 }
    );
  });
});
