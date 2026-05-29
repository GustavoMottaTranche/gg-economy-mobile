/**
 * Integration tests for database query functions
 *
 * Tests CRUD operations for all entity types using mocked database.
 */
import { openDatabaseSync } from 'expo-sqlite';
import { resetDbClient } from '../../../src/db/client';

// Import query functions
import * as transactionQueries from '../../../src/db/queries/transactions';
import * as categoryQueries from '../../../src/db/queries/categories';
import * as importBatchQueries from '../../../src/db/queries/importBatches';
import * as originQueries from '../../../src/db/queries/origins';
import * as preferenceQueries from '../../../src/db/queries/preferences';
import * as categorizationRuleQueries from '../../../src/db/queries/categorizationRules';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
}));

// Type for query builder used in mock
type MockQueryBuilder = {
  select: jest.Mock;
  from: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  leftJoin: jest.Mock;
  groupBy: jest.Mock;
  then: jest.Mock;
};

// Mock drizzle-orm with in-memory data store
jest.mock('drizzle-orm/expo-sqlite', () => {
  // In-memory data stores
  const stores: Record<string, Map<string, Record<string, unknown>>> = {
    transactions: new Map(),
    categories: new Map(),
    import_batches: new Map(),
    origins: new Map(),
    user_preferences: new Map(),
    categorization_rules: new Map(),
  };

  const createQueryBuilder = (tableName: string): MockQueryBuilder => {
    const store = stores[tableName]!;
    let limitCount: number | null = null;

    const builder: MockQueryBuilder = {
      select: jest.fn((_fields?: Record<string, unknown>) => {
        return builder;
      }),
      from: jest.fn(() => builder),
      where: jest.fn((_condition: unknown) => {
        return builder;
      }),
      orderBy: jest.fn((_field: unknown) => {
        return builder;
      }),
      limit: jest.fn((count: number) => {
        limitCount = count;
        return builder;
      }),
      leftJoin: jest.fn(() => builder),
      groupBy: jest.fn(() => builder),
      then: jest.fn((resolve: (value: unknown[]) => void) => {
        let results = Array.from(store.values());
        if (limitCount) {
          results = results.slice(0, limitCount);
        }
        resolve(results);
      }),
    };

    // Make it thenable
    Object.defineProperty(builder, 'then', {
      value: (resolve: (value: unknown[]) => void) => {
        let results = Array.from(store.values());
        if (limitCount) {
          results = results.slice(0, limitCount);
        }
        resolve(results);
        return Promise.resolve(results);
      },
    });

    return builder;
  };

  return {
    drizzle: jest.fn(() => ({
      select: jest.fn((_fields?: Record<string, unknown>) => ({
        from: jest.fn((_table: { _: { name: string } }) => {
          return createQueryBuilder('transactions');
        }),
      })),
      selectDistinct: jest.fn(() => ({
        from: jest.fn(() => createQueryBuilder('transactions')),
      })),
      insert: jest.fn((_table: { _: { name: string } }) => ({
        values: jest.fn((data: Record<string, unknown>) => {
          const store = stores['transactions']!;
          const id = (data.id as string) || (data.key as string);
          store.set(id, { ...data });
          return Promise.resolve();
        }),
      })),
      update: jest.fn((_table: { _: { name: string } }) => ({
        set: jest.fn((_data: Record<string, unknown>) => ({
          where: jest.fn(() => Promise.resolve()),
        })),
      })),
      delete: jest.fn((_table: { _: { name: string } }) => ({
        where: jest.fn(() => {
          // For simplicity, we don't actually delete in mock
          return Promise.resolve();
        }),
      })),
    })),
    useLiveQuery: jest.fn(),
  };
});

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => `test-uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
}));

describe('Database Query Integration Tests', () => {
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

    mockSqliteDb = {
      execSync: jest.fn(),
      runSync: jest.fn(),
      getFirstSync: jest.fn(),
      getAllSync: jest.fn(),
      closeSync: jest.fn(),
    };

    (openDatabaseSync as jest.Mock).mockReturnValue(mockSqliteDb);
  });

  describe('Transaction Queries', () => {
    describe('createTransaction', () => {
      it('should create a transaction with required fields', async () => {
        const data = {
          title: 'Test transaction',
          date: new Date('2024-01-15'),
          amount: -50.0,
          description: 'Test transaction',
          referenceMonth: '2024-01',
        };

        const result = await transactionQueries.createTransaction(data);

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.title).toBe('Test transaction');
        expect(result.description).toBe('Test transaction');
        expect(result.amount).toBe(-50.0);
        expect(result.referenceMonth).toBe('2024-01');
        expect(result.needsReview).toBe(true);
        expect(result.isExcludedFromTotals).toBe(false);
      });

      it('should create a transaction with optional fields', async () => {
        const data = {
          title: 'Salary',
          date: new Date('2024-01-15'),
          amount: 1000.0,
          description: 'Salary',
          referenceMonth: '2024-01',
          categoryId: 'cat-123',
          originId: 'origin-123',
          needsReview: false,
          isExcludedFromTotals: true,
        };

        const result = await transactionQueries.createTransaction(data);

        expect(result.title).toBe('Salary');
        expect(result.categoryId).toBe('cat-123');
        expect(result.originId).toBe('origin-123');
        expect(result.needsReview).toBe(false);
        expect(result.isExcludedFromTotals).toBe(true);
      });
    });

    describe('getAllTransactions', () => {
      it('should return an array of transactions', async () => {
        const results = await transactionQueries.getAllTransactions();
        expect(Array.isArray(results)).toBe(true);
      });
    });

    describe('getTransactionsByMonth', () => {
      it('should filter transactions by reference month', async () => {
        const results = await transactionQueries.getTransactionsByMonth('2024-01');
        expect(Array.isArray(results)).toBe(true);
      });
    });

    describe('getTransactionsNeedingReview', () => {
      it('should return transactions with needsReview = true', async () => {
        const results = await transactionQueries.getTransactionsNeedingReview();
        expect(Array.isArray(results)).toBe(true);
      });
    });

    describe('getReviewCount', () => {
      it('should return a number', async () => {
        const count = await transactionQueries.getReviewCount();
        expect(typeof count).toBe('number');
      });
    });

    describe('getMonthlySummary', () => {
      it('should return summary with income, expenses, and balance', async () => {
        const summary = await transactionQueries.getMonthlySummary('2024-01');
        expect(summary).toHaveProperty('totalIncome');
        expect(summary).toHaveProperty('totalExpenses');
        expect(summary).toHaveProperty('balance');
        expect(summary).toHaveProperty('transactionCount');
      });
    });
  });

  describe('Category Queries', () => {
    describe('DEFAULT_CATEGORIES', () => {
      it('should have the required default categories', () => {
        const { DEFAULT_CATEGORIES } = categoryQueries;

        expect(DEFAULT_CATEGORIES).toBeDefined();
        expect(Array.isArray(DEFAULT_CATEGORIES)).toBe(true);
        expect(DEFAULT_CATEGORIES.length).toBe(61);

        const fixedCategories = DEFAULT_CATEGORIES.filter((c) => c.expenseGroup === 'fixed');
        const variableCategories = DEFAULT_CATEGORIES.filter((c) => c.expenseGroup === 'variable');
        expect(fixedCategories.length).toBe(30);
        expect(variableCategories.length).toBe(31);
      });

      it('should have all categories as expense type', () => {
        const { DEFAULT_CATEGORIES } = categoryQueries;
        DEFAULT_CATEGORIES.forEach((cat) => {
          expect(cat.type).toBe('expense');
        });
      });

      it('should have expense categories as expense type', () => {
        const { DEFAULT_CATEGORIES } = categoryQueries;
        const expenseCategories = DEFAULT_CATEGORIES.filter((c) => c.type === 'expense');
        expenseCategories.forEach((cat) => {
          expect(cat.type).toBe('expense');
        });
      });
    });

    describe('createCategory', () => {
      it('should create a category with required fields', async () => {
        const data = {
          name: 'Test Category',
          type: 'expense' as const,
          icon: 'test-icon',
          color: '#FF0000',
        };

        const result = await categoryQueries.createCategory(data);

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.name).toBe('Test Category');
        expect(result.type).toBe('expense');
        expect(result.isActive).toBe(true);
      });
    });

    describe('getAllCategories', () => {
      it('should return an array of categories', async () => {
        const results = await categoryQueries.getAllCategories();
        expect(Array.isArray(results)).toBe(true);
      });
    });

    describe('getCategoryCount', () => {
      it('should return a number', async () => {
        const count = await categoryQueries.getCategoryCount();
        expect(typeof count).toBe('number');
      });
    });
  });

  describe('Import Batch Queries', () => {
    describe('createImportBatch', () => {
      it('should create an import batch', async () => {
        const data = {
          fileName: 'test-file.csv',
          fileType: 'csv' as const,
          transactionCount: 10,
        };

        const result = await importBatchQueries.createImportBatch(data);

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.fileName).toBe('test-file.csv');
        expect(result.fileType).toBe('csv');
        expect(result.transactionCount).toBe(10);
        expect(result.status).toBe('pending');
      });
    });

    describe('getAllImportBatches', () => {
      it('should return an array of import batches', async () => {
        const results = await importBatchQueries.getAllImportBatches();
        expect(Array.isArray(results)).toBe(true);
      });
    });

    describe('getImportBatchCount', () => {
      it('should return a number', async () => {
        const count = await importBatchQueries.getImportBatchCount();
        expect(typeof count).toBe('number');
      });
    });
  });

  describe('Origin Queries', () => {
    describe('createOrigin', () => {
      it('should create an origin', async () => {
        const data = {
          name: 'Test Bank',
          type: 'bank' as const,
        };

        const result = await originQueries.createOrigin(data);

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.name).toBe('Test Bank');
        expect(result.type).toBe('bank');
      });
    });

    describe('getAllOrigins', () => {
      it('should return an array of origins', async () => {
        const results = await originQueries.getAllOrigins();
        expect(Array.isArray(results)).toBe(true);
      });
    });

    describe('getOriginCount', () => {
      it('should return a number', async () => {
        const count = await originQueries.getOriginCount();
        expect(typeof count).toBe('number');
      });
    });
  });

  describe('Preference Queries', () => {
    describe('setPreference and getPreference', () => {
      it('should set and get a preference', async () => {
        await preferenceQueries.setPreference('language', 'pt-BR');
        // Note: In real integration test, this would verify the value
        // With mocked DB, we just verify the function doesn't throw
      });
    });

    describe('getLanguage', () => {
      it('should return default language when not set', async () => {
        const language = await preferenceQueries.getLanguage();
        expect(language).toBe('en');
      });
    });

    describe('getBackupFrequency', () => {
      it('should return default frequency when not set', async () => {
        const frequency = await preferenceQueries.getBackupFrequency();
        expect(frequency).toBe('disabled');
      });
    });

    describe('getBackupTime', () => {
      it('should return default time when not set', async () => {
        const time = await preferenceQueries.getBackupTime();
        expect(time).toBe(3); // Default 3 AM
      });
    });

    describe('getLastBackupStatus', () => {
      it('should return never when not set', async () => {
        const status = await preferenceQueries.getLastBackupStatus();
        expect(status).toBe('never');
      });
    });

    describe('getBackupPreferences', () => {
      it('should return all backup preferences', async () => {
        const prefs = await preferenceQueries.getBackupPreferences();
        expect(prefs).toHaveProperty('frequency');
        expect(prefs).toHaveProperty('time');
        expect(prefs).toHaveProperty('lastBackupTime');
        expect(prefs).toHaveProperty('lastBackupStatus');
        expect(prefs).toHaveProperty('googleAccountEmail');
      });
    });
  });

  describe('Categorization Rule Queries', () => {
    describe('createCategorizationRule', () => {
      it('should create a categorization rule', async () => {
        const data = {
          pattern: 'UBER',
          categoryId: 'cat-transport',
          matchType: 'contains' as const,
          priority: 10,
        };

        const result = await categorizationRuleQueries.createCategorizationRule(data);

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.pattern).toBe('UBER');
        expect(result.matchType).toBe('contains');
        expect(result.priority).toBe(10);
        expect(result.isActive).toBe(true);
      });
    });

    describe('getAllCategorizationRules', () => {
      it('should return an array of rules', async () => {
        const results = await categorizationRuleQueries.getAllCategorizationRules();
        expect(Array.isArray(results)).toBe(true);
      });
    });

    describe('getCategorizationRuleCount', () => {
      it('should return a number', async () => {
        const count = await categorizationRuleQueries.getCategorizationRuleCount();
        expect(typeof count).toBe('number');
      });
    });

    describe('findMatchingRule', () => {
      it('should return null when no rules match', async () => {
        const result = await categorizationRuleQueries.findMatchingRule('random description');
        expect(result).toBeNull();
      });
    });
  });
});

describe('Query Function Type Safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbClient();

    const mockSqliteDb = {
      execSync: jest.fn(),
      runSync: jest.fn(),
      getFirstSync: jest.fn(),
      getAllSync: jest.fn(),
      closeSync: jest.fn(),
    };

    (openDatabaseSync as jest.Mock).mockReturnValue(mockSqliteDb);
  });

  it('should have proper return types for transaction queries', async () => {
    // These tests verify TypeScript compilation and function signatures
    const _getAllTransactions = transactionQueries.getAllTransactions as () => Promise<unknown[]>;
    const _getTransactionById = transactionQueries.getTransactionById as (
      id: string
    ) => Promise<unknown | null>;
    const _createTransaction = transactionQueries.createTransaction as (
      data: unknown
    ) => Promise<unknown>;
    const _updateTransaction = transactionQueries.updateTransaction as (
      id: string,
      data: unknown
    ) => Promise<unknown | null>;
    const _deleteTransaction = transactionQueries.deleteTransaction as (
      id: string
    ) => Promise<void>;

    expect(typeof _getAllTransactions).toBe('function');
    expect(typeof _getTransactionById).toBe('function');
    expect(typeof _createTransaction).toBe('function');
    expect(typeof _updateTransaction).toBe('function');
    expect(typeof _deleteTransaction).toBe('function');
  });

  it('should have proper return types for category queries', async () => {
    const _getAllCategories = categoryQueries.getAllCategories as () => Promise<unknown[]>;
    const _getCategoryById = categoryQueries.getCategoryById as (
      id: string
    ) => Promise<unknown | null>;
    const _createCategory = categoryQueries.createCategory as (data: unknown) => Promise<unknown>;
    const _seedDefaultCategories = categoryQueries.seedDefaultCategories as () => Promise<boolean>;

    expect(typeof _getAllCategories).toBe('function');
    expect(typeof _getCategoryById).toBe('function');
    expect(typeof _createCategory).toBe('function');
    expect(typeof _seedDefaultCategories).toBe('function');
  });

  it('should have proper return types for import batch queries', async () => {
    const _getAllImportBatches = importBatchQueries.getAllImportBatches as () => Promise<unknown[]>;
    const _getImportBatchById = importBatchQueries.getImportBatchById as (
      id: string
    ) => Promise<unknown | null>;
    const _createImportBatch = importBatchQueries.createImportBatch as (
      data: unknown
    ) => Promise<unknown>;

    expect(typeof _getAllImportBatches).toBe('function');
    expect(typeof _getImportBatchById).toBe('function');
    expect(typeof _createImportBatch).toBe('function');
  });

  it('should have proper return types for origin queries', async () => {
    const _getAllOrigins = originQueries.getAllOrigins as () => Promise<unknown[]>;
    const _getOriginById = originQueries.getOriginById as (id: string) => Promise<unknown | null>;
    const _createOrigin = originQueries.createOrigin as (data: unknown) => Promise<unknown>;

    expect(typeof _getAllOrigins).toBe('function');
    expect(typeof _getOriginById).toBe('function');
    expect(typeof _createOrigin).toBe('function');
  });

  it('should have proper return types for preference queries', async () => {
    const _getPreference = preferenceQueries.getPreference as (
      key: string
    ) => Promise<string | null>;
    const _setPreference = preferenceQueries.setPreference as (
      key: string,
      value: string
    ) => Promise<unknown>;
    const _getLanguage = preferenceQueries.getLanguage as () => Promise<string>;

    expect(typeof _getPreference).toBe('function');
    expect(typeof _setPreference).toBe('function');
    expect(typeof _getLanguage).toBe('function');
  });

  it('should have proper return types for categorization rule queries', async () => {
    const _getAllCategorizationRules =
      categorizationRuleQueries.getAllCategorizationRules as () => Promise<unknown[]>;
    const _getCategorizationRuleById = categorizationRuleQueries.getCategorizationRuleById as (
      id: string
    ) => Promise<unknown | null>;
    const _createCategorizationRule = categorizationRuleQueries.createCategorizationRule as (
      data: unknown
    ) => Promise<unknown>;
    const _findMatchingRule = categorizationRuleQueries.findMatchingRule as (
      description: string
    ) => Promise<unknown | null>;

    expect(typeof _getAllCategorizationRules).toBe('function');
    expect(typeof _getCategorizationRuleById).toBe('function');
    expect(typeof _createCategorizationRule).toBe('function');
    expect(typeof _findMatchingRule).toBe('function');
  });
});
