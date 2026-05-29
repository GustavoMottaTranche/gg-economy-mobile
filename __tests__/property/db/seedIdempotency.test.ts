/**
 * Property-Based Test: Seed Idempotency (Property 5)
 *
 * Feature: default-categories-setup, Property 5: Seed é idempotente
 *
 * **Validates: Requirements 6.3**
 *
 * *For any* database that already contains categories, calling `seedDefaultCategories()`
 * must not modify, duplicate, or remove existing categories.
 *
 * The seed function checks `hasDefaultCategories()` which returns true when
 * `getCategoryCount() > 0`. When categories already exist, the function
 * returns false immediately without performing any insert operations.
 */
import * as fc from 'fast-check';
import { openDatabaseSync } from 'expo-sqlite';
import { resetDbClient } from '../../../src/db/client';

// Track mock DB operations for verification
let mockInsertCallCount = 0;
let mockDeleteCallCount = 0;
let mockUpdateCallCount = 0;
let mockCategoryCount = 0;

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
}));

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-' + Math.random().toString(36).substring(7)),
}));

// Create chainable mock for select — returns category count
const mockSelectChain = {
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockImplementation(() => {
    return Promise.resolve([]);
  }),
  then: jest.fn().mockImplementation((resolve: (val: unknown) => unknown) => {
    return Promise.resolve([{ count: mockCategoryCount }]).then(resolve);
  }),
};

const mockInsertChain = {
  values: jest.fn().mockImplementation(() => {
    mockInsertCallCount++;
    return Promise.resolve();
  }),
};

const mockUpdateChain = {
  set: jest.fn().mockImplementation(() => {
    mockUpdateCallCount++;
    return mockUpdateChain;
  }),
  where: jest.fn().mockImplementation(() => {
    return Promise.resolve();
  }),
};

const mockDeleteChain = {
  where: jest.fn().mockImplementation(() => {
    mockDeleteCallCount++;
    return Promise.resolve();
  }),
};

const mockDb = {
  select: jest.fn().mockReturnValue(mockSelectChain),
  insert: jest.fn().mockReturnValue(mockInsertChain),
  update: jest.fn().mockReturnValue(mockUpdateChain),
  delete: jest.fn().mockReturnValue(mockDeleteChain),
};

// Mock drizzle-orm/expo-sqlite
jest.mock('drizzle-orm/expo-sqlite', () => ({
  drizzle: jest.fn(() => mockDb),
  useLiveQuery: jest.fn(),
}));

// Mock drizzle-orm operators
jest.mock('drizzle-orm', () => ({
  eq: jest.fn((_col, val) => ({ type: 'eq', value: val })),
  and: jest.fn((...args) => ({ type: 'and', conditions: args })),
  sql: jest.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    type: 'sql',
    strings,
    values,
  })),
  relations: jest.fn(() => ({})),
}));

// Mock drizzle-orm/sqlite-core
jest.mock('drizzle-orm/sqlite-core', () => ({
  sqliteTable: jest.fn((_name: string, columns: unknown) => columns),
  text: jest.fn(() => ({
    primaryKey: jest.fn().mockReturnThis(),
    notNull: jest.fn().mockReturnThis(),
    default: jest.fn().mockReturnThis(),
    references: jest.fn().mockReturnThis(),
  })),
  integer: jest.fn(() => ({
    primaryKey: jest.fn().mockReturnThis(),
    notNull: jest.fn().mockReturnThis(),
    default: jest.fn().mockReturnThis(),
  })),
  real: jest.fn(() => ({
    notNull: jest.fn().mockReturnThis(),
    default: jest.fn().mockReturnThis(),
  })),
  index: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
  })),
}));

// Import the function under test (uses the mocks above)
import { seedDefaultCategories } from '../../../src/db/queries/categories';

describe('Property 5: Seed é idempotente', () => {
  let mockSqliteDb: {
    execSync: jest.Mock;
    runSync: jest.Mock;
    getFirstSync: jest.Mock;
    getAllSync: jest.Mock;
    closeSync: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetDbClient();

    mockInsertCallCount = 0;
    mockDeleteCallCount = 0;
    mockUpdateCallCount = 0;
    mockCategoryCount = 0;

    // Re-setup mock return values after clearAllMocks
    mockSelectChain.from.mockReturnThis();
    mockSelectChain.where.mockReturnThis();
    mockSelectChain.orderBy.mockReturnThis();
    mockSelectChain.limit.mockImplementation(() => {
      return Promise.resolve([]);
    });
    mockSelectChain.then.mockImplementation((resolve: (val: unknown) => unknown) => {
      return Promise.resolve([{ count: mockCategoryCount }]).then(resolve);
    });

    mockInsertChain.values.mockImplementation(() => {
      mockInsertCallCount++;
      return Promise.resolve();
    });

    mockUpdateChain.set.mockImplementation(() => {
      mockUpdateCallCount++;
      return mockUpdateChain;
    });
    mockUpdateChain.where.mockImplementation(() => Promise.resolve());

    mockDeleteChain.where.mockImplementation(() => {
      mockDeleteCallCount++;
      return Promise.resolve();
    });

    mockDb.select.mockReturnValue(mockSelectChain);
    mockDb.insert.mockReturnValue(mockInsertChain);
    mockDb.update.mockReturnValue(mockUpdateChain);
    mockDb.delete.mockReturnValue(mockDeleteChain);

    mockSqliteDb = {
      execSync: jest.fn(),
      runSync: jest.fn(),
      getFirstSync: jest.fn(),
      getAllSync: jest.fn(),
      closeSync: jest.fn(),
    };

    (openDatabaseSync as jest.Mock).mockReturnValue(mockSqliteDb);
  });

  it('should not modify database when categories already exist (property-based)', async () => {
    /**
     * Property: For any database that already contains categories (count > 0),
     * calling seedDefaultCategories() must return false and perform no inserts,
     * updates, or deletes.
     *
     * **Validates: Requirements 6.3**
     */
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary category data representing existing categories
        fc.record({
          categoryCount: fc.integer({ min: 1, max: 200 }),
          categoryName: fc.string({ minLength: 1, maxLength: 50 }),
          categoryType: fc.constantFrom('expense', 'income'),
          categoryIcon: fc.string({ minLength: 1, maxLength: 30 }),
          categoryColor: fc.stringMatching(/^#[0-9a-f]{6}$/),
          expenseGroup: fc.constantFrom('fixed', 'variable', null),
        }),
        async ({ categoryCount }) => {
          // Reset counters for each iteration
          mockInsertCallCount = 0;
          mockDeleteCallCount = 0;
          mockUpdateCallCount = 0;

          // Simulate a database that already has categories
          mockCategoryCount = categoryCount;

          const result = await seedDefaultCategories();

          // seedDefaultCategories must return false (no re-seeding)
          expect(result).toBe(false);

          // No insert operations should have been performed
          expect(mockInsertCallCount).toBe(0);

          // No update operations should have been performed
          expect(mockUpdateCallCount).toBe(0);

          // No delete operations should have been performed
          expect(mockDeleteCallCount).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return false for any positive category count', async () => {
    /**
     * Property: For any positive integer representing existing category count,
     * seedDefaultCategories() must return false without side effects.
     *
     * **Validates: Requirements 6.3**
     */
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 10000 }), async (existingCount) => {
        // Reset counters
        mockInsertCallCount = 0;
        mockDeleteCallCount = 0;
        mockUpdateCallCount = 0;

        // Simulate database with existing categories
        mockCategoryCount = existingCount;

        const result = await seedDefaultCategories();

        expect(result).toBe(false);
        expect(mockInsertCallCount).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should not duplicate categories regardless of existing data shape', async () => {
    /**
     * Property: For any set of existing categories with arbitrary names, types,
     * icons, colors, and expenseGroups, calling seedDefaultCategories() must not
     * insert any new records.
     *
     * **Validates: Requirements 6.3**
     */
    await fc.assert(
      fc.asyncProperty(
        // Generate a list of arbitrary existing categories
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            type: fc.constantFrom('expense', 'income'),
            icon: fc.string({ minLength: 1, maxLength: 30 }),
            color: fc.stringMatching(/^#[0-9a-f]{6}$/),
            expenseGroup: fc.constantFrom('fixed', 'variable', null),
          }),
          { minLength: 1, maxLength: 100 }
        ),
        async (existingCategories) => {
          // Reset counters
          mockInsertCallCount = 0;
          mockDeleteCallCount = 0;
          mockUpdateCallCount = 0;

          // The count of existing categories determines idempotency guard
          mockCategoryCount = existingCategories.length;

          const result = await seedDefaultCategories();

          // Must return false — no re-seeding
          expect(result).toBe(false);

          // Must not insert any new categories
          expect(mockInsertCallCount).toBe(0);

          // Must not modify existing categories
          expect(mockUpdateCallCount).toBe(0);

          // Must not remove existing categories
          expect(mockDeleteCallCount).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
