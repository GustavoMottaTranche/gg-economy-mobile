/**
 * Unit tests for category query functions with expenseGroup support
 *
 * Tests CRUD operations, validation, filtering, counts, and deletion with replacement.
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 11.1, 11.3, 11.4, 10.3, 10.6
 */
import { openDatabaseSync } from 'expo-sqlite';
import { resetDbClient } from '../../../../src/db/client';

// Store mock DB operations for verification
const mockInsertValues: unknown[] = [];
const mockUpdateSets: unknown[] = [];
const mockSelectResults: { value: unknown[] } = { value: [] };
let mockSelectCallCount = 0;
const mockSelectMultiResults: unknown[][] = [];

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
}));

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-' + Math.random().toString(36).substring(7)),
}));

// Create chainable mock for select
const mockSelectChain = {
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockImplementation(() => {
    return Promise.resolve(mockSelectResults.value);
  }),
  then: jest.fn().mockImplementation((resolve: (val: unknown) => unknown) => {
    if (mockSelectMultiResults.length > 0) {
      const result = mockSelectMultiResults[mockSelectCallCount] ?? [];
      mockSelectCallCount++;
      return Promise.resolve(result).then(resolve);
    }
    return Promise.resolve(mockSelectResults.value).then(resolve);
  }),
};

const mockInsertChain = {
  values: jest.fn().mockImplementation((vals: unknown) => {
    mockInsertValues.push(vals);
    return Promise.resolve();
  }),
};

const mockUpdateChain = {
  set: jest.fn().mockImplementation((data: unknown) => {
    mockUpdateSets.push(data);
    return mockUpdateChain;
  }),
  where: jest.fn().mockImplementation(() => {
    return Promise.resolve();
  }),
};

const mockDeleteChain = {
  where: jest.fn().mockImplementation(() => {
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

describe('Category Queries - expenseGroup support', () => {
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

    mockInsertValues.length = 0;
    mockUpdateSets.length = 0;
    mockSelectResults.value = [];
    mockSelectCallCount = 0;
    mockSelectMultiResults.length = 0;

    // Re-setup mock return values after clearAllMocks
    mockSelectChain.from.mockReturnThis();
    mockSelectChain.where.mockReturnThis();
    mockSelectChain.orderBy.mockReturnThis();
    mockSelectChain.limit.mockImplementation(() => {
      return Promise.resolve(mockSelectResults.value);
    });
    mockSelectChain.then.mockImplementation((resolve: (val: unknown) => unknown) => {
      if (mockSelectMultiResults.length > 0) {
        const result = mockSelectMultiResults[mockSelectCallCount] ?? [];
        mockSelectCallCount++;
        return Promise.resolve(result).then(resolve);
      }
      return Promise.resolve(mockSelectResults.value).then(resolve);
    });

    mockInsertChain.values.mockImplementation((vals: unknown) => {
      mockInsertValues.push(vals);
      return Promise.resolve();
    });

    mockUpdateChain.set.mockImplementation((data: unknown) => {
      mockUpdateSets.push(data);
      return mockUpdateChain;
    });
    mockUpdateChain.where.mockImplementation(() => Promise.resolve());

    mockDeleteChain.where.mockImplementation(() => Promise.resolve());

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

  describe('createCategory with expenseGroup', () => {
    it('should persist expenseGroup "fixed" for expense categories (Req 7.1)', async () => {
      const { createCategory } = require('../../../../src/db/queries/categories');

      await createCategory({
        name: 'Aluguel',
        type: 'expense',
        icon: 'home',
        color: '#E63946',
        expenseGroup: 'fixed',
      });

      expect(mockInsertValues).toHaveLength(1);
      expect(mockInsertValues[0]).toMatchObject({
        name: 'Aluguel',
        type: 'expense',
        icon: 'home',
        color: '#E63946',
        expenseGroup: 'fixed',
        isActive: true,
      });
    });

    it('should persist expenseGroup "variable" for expense categories (Req 7.1)', async () => {
      const { createCategory } = require('../../../../src/db/queries/categories');

      await createCategory({
        name: 'Farmacia',
        type: 'expense',
        icon: 'thermometer',
        color: '#E91E63',
        expenseGroup: 'variable',
      });

      expect(mockInsertValues).toHaveLength(1);
      expect(mockInsertValues[0]).toMatchObject({
        name: 'Farmacia',
        type: 'expense',
        expenseGroup: 'variable',
      });
    });

    it('should force expenseGroup to null for income categories (Req 7.2)', async () => {
      const { createCategory } = require('../../../../src/db/queries/categories');

      await createCategory({
        name: 'Salary',
        type: 'income',
        icon: 'wallet',
        color: '#45B7D1',
        expenseGroup: 'fixed', // Should be ignored
      });

      expect(mockInsertValues).toHaveLength(1);
      expect(mockInsertValues[0]).toMatchObject({
        name: 'Salary',
        type: 'income',
        expenseGroup: null,
      });
    });

    it('should allow null expenseGroup for expense categories', async () => {
      const { createCategory } = require('../../../../src/db/queries/categories');

      await createCategory({
        name: 'Misc',
        type: 'expense',
        icon: 'more-horizontal',
        color: '#808080',
        expenseGroup: null,
      });

      expect(mockInsertValues).toHaveLength(1);
      expect(mockInsertValues[0]).toMatchObject({
        name: 'Misc',
        type: 'expense',
        expenseGroup: null,
      });
    });

    it('should return a Category object with expenseGroup field', async () => {
      const { createCategory } = require('../../../../src/db/queries/categories');

      const result = await createCategory({
        name: 'Netflix',
        type: 'expense',
        icon: 'film',
        color: '#E50914',
        expenseGroup: 'fixed',
      });

      expect(result).toMatchObject({
        name: 'Netflix',
        type: 'expense',
        icon: 'film',
        color: '#E50914',
        expenseGroup: 'fixed',
        isActive: true,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('updateCategory with expenseGroup', () => {
    it('should allow changing expenseGroup (Req 7.3)', async () => {
      mockSelectResults.value = [
        {
          id: 'cat-1',
          name: 'Test',
          type: 'expense',
          icon: 'home',
          color: '#000',
          isActive: true,
          expenseGroup: 'variable',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      const { updateCategory } = require('../../../../src/db/queries/categories');

      await updateCategory('cat-1', { expenseGroup: 'variable' });

      expect(mockUpdateSets).toHaveLength(1);
      expect(mockUpdateSets[0]).toMatchObject({
        expenseGroup: 'variable',
      });
    });

    it('should nullify expenseGroup when type changes to income (Req 7.4)', async () => {
      mockSelectResults.value = [
        {
          id: 'cat-1',
          name: 'Test',
          type: 'income',
          icon: 'home',
          color: '#000',
          isActive: true,
          expenseGroup: null,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      const { updateCategory } = require('../../../../src/db/queries/categories');

      await updateCategory('cat-1', { type: 'income', expenseGroup: 'fixed' });

      expect(mockUpdateSets).toHaveLength(1);
      expect(mockUpdateSets[0]).toMatchObject({
        type: 'income',
        expenseGroup: null,
      });
    });

    it('should return updated category with expenseGroup mapped', async () => {
      mockSelectResults.value = [
        {
          id: 'cat-1',
          name: 'Updated',
          type: 'expense',
          icon: 'home',
          color: '#000',
          isActive: true,
          expenseGroup: 'fixed',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      const { updateCategory } = require('../../../../src/db/queries/categories');

      const result = await updateCategory('cat-1', { expenseGroup: 'fixed' });

      expect(result).toMatchObject({
        id: 'cat-1',
        expenseGroup: 'fixed',
      });
    });
  });

  describe('Validation rejects invalid expenseGroup (Req 7.5)', () => {
    it('should reject invalid expenseGroup on create', async () => {
      const { createCategory } = require('../../../../src/db/queries/categories');

      await expect(
        createCategory({
          name: 'Bad',
          type: 'expense',
          icon: 'x',
          color: '#000',
          expenseGroup: 'invalid' as never,
        })
      ).rejects.toThrow(/Invalid expenseGroup/);
    });

    it('should reject invalid expenseGroup on update', async () => {
      const { updateCategory } = require('../../../../src/db/queries/categories');

      await expect(updateCategory('cat-1', { expenseGroup: 'bad-value' as never })).rejects.toThrow(
        /Invalid expenseGroup/
      );
    });

    it('should accept null expenseGroup without error', async () => {
      const { createCategory } = require('../../../../src/db/queries/categories');

      await expect(
        createCategory({
          name: 'OK',
          type: 'expense',
          icon: 'x',
          color: '#000',
          expenseGroup: null,
        })
      ).resolves.toBeDefined();
    });

    it('should accept undefined expenseGroup without error', async () => {
      const { createCategory } = require('../../../../src/db/queries/categories');

      await expect(
        createCategory({
          name: 'OK2',
          type: 'expense',
          icon: 'x',
          color: '#000',
        })
      ).resolves.toBeDefined();
    });
  });

  describe('getCategoriesByExpenseGroup (Req 11.1, 11.3)', () => {
    it('should return only active categories of the specified group', async () => {
      mockSelectResults.value = [
        {
          id: 'cat-1',
          name: 'Aluguel',
          type: 'expense',
          icon: 'home',
          color: '#E63946',
          isActive: true,
          expenseGroup: 'fixed',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'cat-2',
          name: 'Netflix',
          type: 'expense',
          icon: 'film',
          color: '#E50914',
          isActive: true,
          expenseGroup: 'fixed',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      const { getCategoriesByExpenseGroup } = require('../../../../src/db/queries/categories');

      const results = await getCategoriesByExpenseGroup('fixed');

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({ name: 'Aluguel', expenseGroup: 'fixed', isActive: true });
      expect(results[1]).toMatchObject({ name: 'Netflix', expenseGroup: 'fixed', isActive: true });
    });

    it('should return categories with proper date conversion', async () => {
      mockSelectResults.value = [
        {
          id: 'cat-1',
          name: 'Uber',
          type: 'expense',
          icon: 'map-pin',
          color: '#000',
          isActive: true,
          expenseGroup: 'variable',
          createdAt: '2024-06-15T10:30:00.000Z',
        },
      ];

      const { getCategoriesByExpenseGroup } = require('../../../../src/db/queries/categories');

      const results = await getCategoriesByExpenseGroup('variable');

      expect(results[0]!.createdAt).toBeInstanceOf(Date);
    });

    it('should return empty array when no categories match', async () => {
      mockSelectResults.value = [];

      const { getCategoriesByExpenseGroup } = require('../../../../src/db/queries/categories');

      const results = await getCategoriesByExpenseGroup('fixed');

      expect(results).toEqual([]);
    });
  });

  describe('getCategoryCountsByExpenseGroup (Req 11.4)', () => {
    it('should return correct counts for each group', async () => {
      const { getCategoryCountsByExpenseGroup } = require('../../../../src/db/queries/categories');

      // The function makes 3 separate select queries
      mockSelectMultiResults.push([{ count: 5 }], [{ count: 10 }], [{ count: 3 }]);

      const result = await getCategoryCountsByExpenseGroup();

      expect(result).toEqual({
        fixed: 5,
        variable: 10,
        uncategorized: 3,
      });
    });

    it('should return zeros when no categories exist', async () => {
      const { getCategoryCountsByExpenseGroup } = require('../../../../src/db/queries/categories');

      mockSelectMultiResults.push([{ count: 0 }], [{ count: 0 }], [{ count: 0 }]);

      const result = await getCategoryCountsByExpenseGroup();

      expect(result).toEqual({
        fixed: 0,
        variable: 0,
        uncategorized: 0,
      });
    });
  });

  describe('deleteCategoryWithReplacement (Req 10.3)', () => {
    it('should update transactions and deactivate the category', async () => {
      const { deleteCategoryWithReplacement } = require('../../../../src/db/queries/categories');

      await deleteCategoryWithReplacement('cat-to-delete', 'cat-replacement');

      // Should have 2 update operations: one for transactions, one for category deactivation
      expect(mockUpdateSets).toHaveLength(2);
      // First update: transactions categoryId
      expect(mockUpdateSets[0]).toMatchObject({ categoryId: 'cat-replacement' });
      // Second update: category isActive = false
      expect(mockUpdateSets[1]).toMatchObject({ isActive: false });
    });

    it('should reject when categoryId equals replacementCategoryId', async () => {
      const { deleteCategoryWithReplacement } = require('../../../../src/db/queries/categories');

      await expect(deleteCategoryWithReplacement('cat-1', 'cat-1')).rejects.toThrow(
        /categoria substituta deve ser diferente/
      );
    });

    it('should execute within a transaction', async () => {
      const { deleteCategoryWithReplacement } = require('../../../../src/db/queries/categories');

      await deleteCategoryWithReplacement('cat-to-delete', 'cat-replacement');

      // withTransaction calls BEGIN TRANSACTION and COMMIT
      expect(mockSqliteDb.execSync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockSqliteDb.execSync).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('Hard delete blocked when transactions exist (Req 10.6)', () => {
    it('should report transaction count via getTransactionCountByCategory', async () => {
      mockSelectResults.value = [{ count: 5 }];

      const { getTransactionCountByCategory } = require('../../../../src/db/queries/categories');

      const count = await getTransactionCountByCategory('cat-1');

      expect(count).toBe(5);
    });

    it('should return 0 when no transactions exist for category', async () => {
      mockSelectResults.value = [{ count: 0 }];

      const { getTransactionCountByCategory } = require('../../../../src/db/queries/categories');

      const count = await getTransactionCountByCategory('cat-1');

      expect(count).toBe(0);
    });
  });
});
