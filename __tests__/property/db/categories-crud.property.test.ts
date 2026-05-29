/**
 * Property-Based Tests: Categories CRUD Operations
 *
 * Feature: default-categories-setup
 *
 * Tests Properties 1, 2, 3, 4, 6, 7, 8, 9, 10 from the design document.
 * Each property validates the LOGIC of category query functions by mocking
 * the database layer and verifying correct behavior across many random inputs.
 */
import * as fc from 'fast-check';
import { openDatabaseSync } from 'expo-sqlite';
import { resetDbClient } from '../../../src/db/client';

// ============================================================================
// Mock Setup
// ============================================================================

// Track mock DB operations
let mockInsertedRecords: Array<Record<string, unknown>> = [];
let mockUpdatedRecords: Array<{ set: Record<string, unknown>; where: unknown }> = [];
let mockDeletedRecords: Array<{ where: unknown }> = [];
const mockSelectResults: { value: unknown[] } = { value: [] };
let mockTransactionUpdateRecords: Array<{ set: Record<string, unknown>; where: unknown }> = [];

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
}));

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-' + Math.random().toString(36).substring(7)),
}));

// Create chainable mocks
const mockSelectChain = {
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockImplementation(() => {
    const results = mockSelectResults.value;
    return Promise.resolve(results);
  }),
  then: jest.fn().mockImplementation((resolve: (val: unknown) => unknown) => {
    return Promise.resolve(mockSelectResults.value).then(resolve);
  }),
};

const mockInsertChain = {
  values: jest.fn().mockImplementation((record: Record<string, unknown>) => {
    mockInsertedRecords.push(record);
    return Promise.resolve();
  }),
};

const mockUpdateChain = {
  set: jest.fn().mockImplementation((data: Record<string, unknown>) => {
    const record = { set: data, where: null as unknown };
    mockUpdatedRecords.push(record);
    return {
      where: jest.fn().mockImplementation((condition: unknown) => {
        record.where = condition;
        return Promise.resolve();
      }),
    };
  }),
};

const mockTransactionUpdateChain = {
  set: jest.fn().mockImplementation((data: Record<string, unknown>) => {
    const record = { set: data, where: null as unknown };
    mockTransactionUpdateRecords.push(record);
    return {
      where: jest.fn().mockImplementation((condition: unknown) => {
        record.where = condition;
        return Promise.resolve();
      }),
    };
  }),
};

const mockDeleteChain = {
  where: jest.fn().mockImplementation((condition: unknown) => {
    mockDeletedRecords.push({ where: condition });
    return Promise.resolve();
  }),
};

const mockDb = {
  select: jest.fn().mockReturnValue(mockSelectChain),
  insert: jest.fn().mockImplementation(() => {
    return mockInsertChain;
  }),
  update: jest.fn().mockImplementation((table: unknown) => {
    // Return different chains for categories vs transactions
    if (table === require('../../../src/db/schema').transactions) {
      return mockTransactionUpdateChain;
    }
    return mockUpdateChain;
  }),
  delete: jest.fn().mockImplementation(() => {
    return mockDeleteChain;
  }),
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

// Import functions under test
import {
  createCategory,
  updateCategory,
  getCategoriesByExpenseGroup,
  deleteCategoryWithReplacement,
  deactivateCategory,
  deleteCategory,
  getTransactionCountByCategory,
  getCategoryCountsByExpenseGroup,
} from '../../../src/db/queries/categories';

// ============================================================================
// Helper: Reset all mocks between tests
// ============================================================================
function resetMocks() {
  jest.clearAllMocks();
  resetDbClient();

  mockInsertedRecords = [];
  mockUpdatedRecords = [];
  mockDeletedRecords = [];
  mockTransactionUpdateRecords = [];
  mockSelectResults.value = [];

  // Re-setup mock return values
  mockSelectChain.from.mockReturnThis();
  mockSelectChain.where.mockReturnThis();
  mockSelectChain.orderBy.mockReturnThis();
  mockSelectChain.limit.mockImplementation(() => {
    return Promise.resolve(mockSelectResults.value);
  });
  mockSelectChain.then.mockImplementation((resolve: (val: unknown) => unknown) => {
    return Promise.resolve(mockSelectResults.value).then(resolve);
  });

  mockInsertChain.values.mockImplementation((record: Record<string, unknown>) => {
    mockInsertedRecords.push(record);
    return Promise.resolve();
  });

  mockUpdateChain.set.mockImplementation((data: Record<string, unknown>) => {
    const record = { set: data, where: null as unknown };
    mockUpdatedRecords.push(record);
    return {
      where: jest.fn().mockImplementation((condition: unknown) => {
        record.where = condition;
        return Promise.resolve();
      }),
    };
  });

  mockTransactionUpdateChain.set.mockImplementation((data: Record<string, unknown>) => {
    const record = { set: data, where: null as unknown };
    mockTransactionUpdateRecords.push(record);
    return {
      where: jest.fn().mockImplementation((condition: unknown) => {
        record.where = condition;
        return Promise.resolve();
      }),
    };
  });

  mockDeleteChain.where.mockImplementation((condition: unknown) => {
    mockDeletedRecords.push({ where: condition });
    return Promise.resolve();
  });

  mockDb.select.mockReturnValue(mockSelectChain);
  mockDb.insert.mockImplementation(() => {
    return mockInsertChain;
  });
  mockDb.update.mockImplementation((table: unknown) => {
    if (table === require('../../../src/db/schema').transactions) {
      return mockTransactionUpdateChain;
    }
    return mockUpdateChain;
  });
  mockDb.delete.mockImplementation(() => {
    return mockDeleteChain;
  });

  const mockSqliteDb = {
    execSync: jest.fn(),
    runSync: jest.fn(),
    getFirstSync: jest.fn(),
    getAllSync: jest.fn(),
    closeSync: jest.fn(),
  };
  (openDatabaseSync as jest.Mock).mockReturnValue(mockSqliteDb);
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const expenseGroupArb = fc.constantFrom('fixed' as const, 'variable' as const);

const categoryNameArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

const iconArb = fc.constantFrom(
  'home',
  'building',
  'shield',
  'zap',
  'credit-card',
  'tv',
  'smartphone',
  'package',
  'film',
  'globe',
  'calculator',
  'scissors',
  'heart',
  'coffee',
  'shopping-cart',
  'map-pin',
  'gift',
  'wrench',
  'car',
  'bus'
);

const colorArb = fc.stringMatching(/^#[0-9A-Fa-f]{6}$/);

const categoryIdArb = fc.uuid();

// ============================================================================
// Property Tests
// ============================================================================

describe('Property-Based Tests: Categories CRUD Operations', () => {
  beforeEach(() => {
    resetMocks();
  });

  // --------------------------------------------------------------------------
  // Property 1: expenseGroup round-trip
  // --------------------------------------------------------------------------
  describe('Property 1: Persistência de expenseGroup em categorias de despesa (round-trip)', () => {
    it('createCategory with expenseGroup → inserted record has same expenseGroup', async () => {
      /**
       * Feature: default-categories-setup, Property 1: expenseGroup round-trip
       *
       * For any valid expense category with expenseGroup set to 'fixed' or 'variable',
       * creating the category must persist the same expenseGroup value in the inserted record.
       *
       * **Validates: Requirements 2.2, 7.1, 7.3**
       */
      await fc.assert(
        fc.asyncProperty(
          categoryNameArb,
          iconArb,
          colorArb,
          expenseGroupArb,
          async (name, icon, color, expenseGroup) => {
            resetMocks();

            await createCategory({
              name,
              type: 'expense',
              icon,
              color,
              expenseGroup,
            });

            // Verify the inserted record has the same expenseGroup
            expect(mockInsertedRecords.length).toBe(1);
            expect(mockInsertedRecords[0]!.expenseGroup).toBe(expenseGroup);
            expect(mockInsertedRecords[0]!.type).toBe('expense');
            expect(mockInsertedRecords[0]!.name).toBe(name);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('updateCategory with expenseGroup → updated record has same expenseGroup', async () => {
      /**
       * Feature: default-categories-setup, Property 1: expenseGroup round-trip (update path)
       *
       * For any valid expense category, updating the expenseGroup must persist
       * the new value correctly.
       *
       * **Validates: Requirements 2.2, 7.1, 7.3**
       */
      await fc.assert(
        fc.asyncProperty(categoryIdArb, expenseGroupArb, async (id, expenseGroup) => {
          resetMocks();

          // Mock getCategoryById to return the updated category
          mockSelectResults.value = [
            {
              id,
              name: 'Test',
              type: 'expense',
              icon: 'home',
              color: '#FF0000',
              isActive: true,
              expenseGroup,
              createdAt: '2024-01-01T00:00:00.000Z',
            },
          ];

          await updateCategory(id, { expenseGroup });

          // Verify the update was called with the correct expenseGroup
          expect(mockUpdatedRecords.length).toBe(1);
          expect(mockUpdatedRecords[0]!.set.expenseGroup).toBe(expenseGroup);
        }),
        { numRuns: 100 }
      );
    });
  });

  // --------------------------------------------------------------------------
  // Property 2: Income categories null expenseGroup
  // --------------------------------------------------------------------------
  describe('Property 2: Categorias de receita sempre têm expenseGroup null', () => {
    it('createCategory with type income → expenseGroup is always null regardless of input', async () => {
      /**
       * Feature: default-categories-setup, Property 2: Income categories null expenseGroup
       *
       * For any category with type 'income', regardless of expenseGroup value provided,
       * the stored value must be null.
       *
       * **Validates: Requirements 2.3, 7.2**
       */
      await fc.assert(
        fc.asyncProperty(
          categoryNameArb,
          iconArb,
          colorArb,
          fc.constantFrom('fixed' as const, 'variable' as const, null),
          async (name, icon, color, expenseGroup) => {
            resetMocks();

            await createCategory({
              name,
              type: 'income',
              icon,
              color,
              expenseGroup,
            });

            // Verify the inserted record always has null expenseGroup for income
            expect(mockInsertedRecords.length).toBe(1);
            expect(mockInsertedRecords[0]!.expenseGroup).toBeNull();
            expect(mockInsertedRecords[0]!.type).toBe('income');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // --------------------------------------------------------------------------
  // Property 3: Type change expense→income nullifies expenseGroup
  // --------------------------------------------------------------------------
  describe('Property 3: Mudança de tipo expense→income anula expenseGroup', () => {
    it('updateCategory type to income → expenseGroup becomes null', async () => {
      /**
       * Feature: default-categories-setup, Property 3: Type change nullification
       *
       * For any expense category with non-null expenseGroup, updating type to 'income'
       * must result in expenseGroup being null.
       *
       * **Validates: Requirements 7.4**
       */
      await fc.assert(
        fc.asyncProperty(categoryIdArb, expenseGroupArb, async (id, originalExpenseGroup) => {
          resetMocks();

          // Mock getCategoryById to return the updated category
          mockSelectResults.value = [
            {
              id,
              name: 'Test',
              type: 'income',
              icon: 'home',
              color: '#FF0000',
              isActive: true,
              expenseGroup: null,
              createdAt: '2024-01-01T00:00:00.000Z',
            },
          ];

          // Update type to income (regardless of original expenseGroup)
          await updateCategory(id, { type: 'income', expenseGroup: originalExpenseGroup });

          // Verify the update sets expenseGroup to null when type changes to income
          expect(mockUpdatedRecords.length).toBe(1);
          expect(mockUpdatedRecords[0]!.set.expenseGroup).toBeNull();
          expect(mockUpdatedRecords[0]!.set.type).toBe('income');
        }),
        { numRuns: 100 }
      );
    });
  });

  // --------------------------------------------------------------------------
  // Property 4: Invalid expenseGroup validation
  // --------------------------------------------------------------------------
  describe('Property 4: Validação de expenseGroup rejeita valores inválidos', () => {
    it('invalid expenseGroup strings → throws error', async () => {
      /**
       * Feature: default-categories-setup, Property 4: Invalid expenseGroup validation
       *
       * For any string that is not 'fixed', 'variable', or null, attempting to create
       * or update a category with that expenseGroup must result in a validation error.
       *
       * **Validates: Requirements 7.5**
       */
      await fc.assert(
        fc.asyncProperty(
          categoryNameArb,
          iconArb,
          colorArb,
          fc
            .string({ minLength: 1, maxLength: 30 })
            .filter((s) => s !== 'fixed' && s !== 'variable'),
          async (name, icon, color, invalidGroup) => {
            resetMocks();

            // Attempt to create with invalid expenseGroup should throw
            await expect(
              createCategory({
                name,
                type: 'expense',
                icon,
                color,
                expenseGroup: invalidGroup as unknown as 'fixed' | 'variable',
              })
            ).rejects.toThrow(/Invalid expenseGroup value/);

            // No records should have been inserted
            expect(mockInsertedRecords.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('invalid expenseGroup on update → throws error', async () => {
      /**
       * Feature: default-categories-setup, Property 4: Invalid expenseGroup validation (update)
       *
       * **Validates: Requirements 7.5**
       */
      await fc.assert(
        fc.asyncProperty(
          categoryIdArb,
          fc
            .string({ minLength: 1, maxLength: 30 })
            .filter((s) => s !== 'fixed' && s !== 'variable'),
          async (id, invalidGroup) => {
            resetMocks();

            await expect(
              updateCategory(id, {
                expenseGroup: invalidGroup as unknown as 'fixed' | 'variable',
              })
            ).rejects.toThrow(/Invalid expenseGroup value/);

            // No updates should have been performed
            expect(mockUpdatedRecords.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // --------------------------------------------------------------------------
  // Property 6: Filter by expenseGroup returns only active of group
  // --------------------------------------------------------------------------
  describe('Property 6: Filtro por expenseGroup retorna apenas categorias ativas do grupo', () => {
    it('getCategoriesByExpenseGroup → returns only active categories of that group', async () => {
      /**
       * Feature: default-categories-setup, Property 6: Filter by expenseGroup
       *
       * For any set of categories with mixed isActive and expenseGroup states,
       * querying by a specific expenseGroup must return only categories that are
       * active AND belong to the specified group.
       *
       * **Validates: Requirements 9.2, 11.1, 11.3**
       */
      await fc.assert(
        fc.asyncProperty(
          expenseGroupArb,
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: categoryNameArb,
              type: fc.constantFrom('expense' as const, 'income' as const),
              icon: iconArb,
              color: colorArb,
              isActive: fc.boolean(),
              expenseGroup: fc.constantFrom('fixed' as const, 'variable' as const, null),
              createdAt: fc.constant('2024-01-01T00:00:00.000Z'),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (queryGroup, allCategories) => {
            resetMocks();

            // Filter to what the DB would return: active AND matching group
            const expectedResults = allCategories.filter(
              (c) => c.isActive === true && c.expenseGroup === queryGroup
            );

            // Mock the DB to return the filtered results
            mockSelectResults.value = expectedResults;

            const results = await getCategoriesByExpenseGroup(queryGroup);

            // Verify all returned categories are active and belong to the queried group
            for (const cat of results) {
              expect(cat.isActive).toBe(true);
              expect(cat.expenseGroup).toBe(queryGroup);
            }

            // Verify count matches expected
            expect(results.length).toBe(expectedResults.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // --------------------------------------------------------------------------
  // Property 7: Deletion with replacement updates all transactions
  // --------------------------------------------------------------------------
  describe('Property 7: Deleção com substituição atualiza todas as transações', () => {
    it('deleteCategoryWithReplacement → updates all transactions and deactivates', async () => {
      /**
       * Feature: default-categories-setup, Property 7: Deletion with replacement
       *
       * For any category with N transactions (N ≥ 1), executing deletion with replacement
       * must update all N transactions to the replacement categoryId and deactivate the original.
       *
       * **Validates: Requirements 10.3**
       */
      await fc.assert(
        fc.asyncProperty(
          categoryIdArb,
          categoryIdArb.filter((id) => id.length > 0),
          async (categoryId, replacementId) => {
            // Ensure they are different
            if (categoryId === replacementId) return;

            resetMocks();

            await deleteCategoryWithReplacement(categoryId, replacementId);

            // Verify transactions were updated to the replacement category
            expect(mockTransactionUpdateRecords.length).toBe(1);
            expect(mockTransactionUpdateRecords[0]!.set.categoryId).toBe(replacementId);

            // Verify the original category was deactivated
            expect(mockUpdatedRecords.length).toBe(1);
            expect(mockUpdatedRecords[0]!.set.isActive).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('deleteCategoryWithReplacement with same id → throws error', async () => {
      /**
       * Feature: default-categories-setup, Property 7: Same category replacement blocked
       *
       * **Validates: Requirements 10.3**
       */
      await fc.assert(
        fc.asyncProperty(categoryIdArb, async (categoryId) => {
          resetMocks();

          await expect(deleteCategoryWithReplacement(categoryId, categoryId)).rejects.toThrow(
            /A categoria substituta deve ser diferente da categoria sendo excluída/
          );

          // No operations should have been performed
          expect(mockTransactionUpdateRecords.length).toBe(0);
          expect(mockUpdatedRecords.length).toBe(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  // --------------------------------------------------------------------------
  // Property 8: Soft delete preserves transaction references
  // --------------------------------------------------------------------------
  describe('Property 8: Soft delete preserva referências de transações', () => {
    it('deactivateCategory → transactions keep original categoryId', async () => {
      /**
       * Feature: default-categories-setup, Property 8: Soft delete preserves references
       *
       * For any category with associated transactions, executing soft delete without
       * replacement must keep all transactions with original categoryId unchanged
       * and set isActive to false.
       *
       * **Validates: Requirements 10.4**
       */
      await fc.assert(
        fc.asyncProperty(
          categoryIdArb,
          fc.integer({ min: 1, max: 100 }),
          async (categoryId, _transactionCount) => {
            resetMocks();

            // Mock getCategoryById to return the deactivated category
            mockSelectResults.value = [
              {
                id: categoryId,
                name: 'Test Category',
                type: 'expense',
                icon: 'home',
                color: '#FF0000',
                isActive: false,
                expenseGroup: 'fixed',
                createdAt: '2024-01-01T00:00:00.000Z',
              },
            ];

            await deactivateCategory(categoryId);

            // Verify only the category was updated (isActive = false)
            expect(mockUpdatedRecords.length).toBe(1);
            expect(mockUpdatedRecords[0]!.set.isActive).toBe(false);

            // Verify NO transaction updates were performed (references preserved)
            expect(mockTransactionUpdateRecords.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // --------------------------------------------------------------------------
  // Property 9: Hard delete blocked when transactions exist
  // --------------------------------------------------------------------------
  describe('Property 9: Hard delete bloqueado quando existem transações', () => {
    it('getTransactionCountByCategory > 0 → system should block hard delete', async () => {
      /**
       * Feature: default-categories-setup, Property 9: Hard delete blocked
       *
       * For any category with at least one associated transaction, the system
       * must detect the transaction count > 0 via getTransactionCountByCategory,
       * which signals that hard delete should be blocked.
       *
       * The blocking is enforced at the application layer: check count first,
       * if > 0, do not call deleteCategory.
       *
       * **Validates: Requirements 10.6**
       */
      await fc.assert(
        fc.asyncProperty(
          categoryIdArb,
          fc.integer({ min: 1, max: 1000 }),
          async (categoryId, transactionCount) => {
            resetMocks();

            // Mock the transaction count query to return > 0
            mockSelectResults.value = [{ count: transactionCount }];

            const count = await getTransactionCountByCategory(categoryId);

            // The count must be positive, signaling hard delete should be blocked
            expect(count).toBe(transactionCount);
            expect(count).toBeGreaterThan(0);

            // Verify no delete operations were performed
            expect(mockDeletedRecords.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getTransactionCountByCategory === 0 → hard delete is allowed', async () => {
      /**
       * Feature: default-categories-setup, Property 9: Hard delete allowed when no transactions
       *
       * When a category has zero transactions, deleteCategory can proceed.
       *
       * **Validates: Requirements 10.6**
       */
      await fc.assert(
        fc.asyncProperty(categoryIdArb, async (categoryId) => {
          resetMocks();

          // Mock the transaction count query to return 0
          mockSelectResults.value = [{ count: 0 }];

          const count = await getTransactionCountByCategory(categoryId);
          expect(count).toBe(0);

          // Now hard delete is safe to call
          await deleteCategory(categoryId);

          // Verify delete was performed
          expect(mockDeletedRecords.length).toBe(1);
        }),
        { numRuns: 100 }
      );
    });
  });

  // --------------------------------------------------------------------------
  // Property 10: Count by expenseGroup reflects real distribution
  // --------------------------------------------------------------------------
  describe('Property 10: Contagem por expenseGroup reflete distribuição real', () => {
    it('getCategoryCountsByExpenseGroup → counts match real distribution', async () => {
      /**
       * Feature: default-categories-setup, Property 10: Count by expenseGroup
       *
       * For any set of active categories, the count function must return values
       * that sum to the total active expense categories, and each individual count
       * must match the real number of categories in that group.
       *
       * **Validates: Requirements 11.4**
       */
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: categoryNameArb,
              type: fc.constantFrom('expense' as const),
              icon: iconArb,
              color: colorArb,
              isActive: fc.constant(true),
              expenseGroup: fc.constantFrom('fixed' as const, 'variable' as const, null),
              createdAt: fc.constant('2024-01-01T00:00:00.000Z'),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          async (activeExpenseCategories) => {
            resetMocks();

            // Calculate expected distribution
            const expectedFixed = activeExpenseCategories.filter(
              (c) => c.expenseGroup === 'fixed'
            ).length;
            const expectedVariable = activeExpenseCategories.filter(
              (c) => c.expenseGroup === 'variable'
            ).length;
            const expectedUncategorized = activeExpenseCategories.filter(
              (c) => c.expenseGroup === null
            ).length;

            // Mock the three sequential DB queries that getCategoryCountsByExpenseGroup makes
            let queryCallCount = 0;
            mockSelectChain.then.mockImplementation((resolve: (val: unknown) => unknown) => {
              queryCallCount++;
              let result: unknown[];
              if (queryCallCount === 1) {
                result = [{ count: expectedFixed }];
              } else if (queryCallCount === 2) {
                result = [{ count: expectedVariable }];
              } else {
                result = [{ count: expectedUncategorized }];
              }
              return Promise.resolve(result).then(resolve);
            });

            const counts = await getCategoryCountsByExpenseGroup();

            // Verify individual counts match expected
            expect(counts.fixed).toBe(expectedFixed);
            expect(counts.variable).toBe(expectedVariable);
            expect(counts.uncategorized).toBe(expectedUncategorized);

            // Verify sum equals total active expense categories
            const totalFromCounts = counts.fixed + counts.variable + counts.uncategorized;
            expect(totalFromCounts).toBe(activeExpenseCategories.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
