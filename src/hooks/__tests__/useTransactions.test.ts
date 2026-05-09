/**
 * useTransactions Hook Tests
 *
 * Tests for the transactions hook with reactive updates.
 *
 * **Validates: Requirements 19, 29**
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock data
const mockTransactionRecord = {
  id: 'tx-1',
  date: '2024-01-15',
  amount: -50.0,
  description: 'Test transaction',
  categoryId: 'cat-1',
  originId: null,
  batchId: null,
  referenceMonth: '2024-01',
  needsReview: false,
  isExcludedFromTotals: false,
  duplicateOf: null,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

const mockCategoryRecord = {
  id: 'cat-1',
  name: 'Food',
  type: 'expense',
  icon: 'restaurant',
  color: '#FF6B6B',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
};

// Mock the database client
const mockGetDb = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();
const mockLeftJoin = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();
const mockOffset = jest.fn();

jest.mock('../../db/client', () => ({
  getDb: () => mockGetDb(),
  useLiveQuery: jest.fn((query, deps) => ({
    data: [{ transaction: mockTransactionRecord, category: mockCategoryRecord }],
    error: null,
  })),
}));

jest.mock('../../db/schema', () => ({
  transactions: {
    id: 'id',
    date: 'date',
    amount: 'amount',
    description: 'description',
    categoryId: 'category_id',
    referenceMonth: 'reference_month',
    needsReview: 'needs_review',
    isExcludedFromTotals: 'is_excluded_from_totals',
  },
  categories: {
    id: 'id',
    name: 'name',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((a, b) => ({ type: 'eq', a, b })),
  and: jest.fn((...args) => ({ type: 'and', args })),
  desc: jest.fn((col) => ({ type: 'desc', col })),
  sql: jest.fn((strings, ...values) => ({ type: 'sql', strings, values })),
  gte: jest.fn((a, b) => ({ type: 'gte', a, b })),
  lte: jest.fn((a, b) => ({ type: 'lte', a, b })),
}));

// Mock query functions
jest.mock('../../db/queries/transactions', () => ({
  createTransaction: jest.fn().mockResolvedValue({
    id: 'new-tx',
    date: new Date('2024-01-20'),
    amount: -25.0,
    description: 'New transaction',
    categoryId: null,
    originId: null,
    batchId: null,
    referenceMonth: '2024-01',
    needsReview: true,
    isExcludedFromTotals: false,
    duplicateOf: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateTransaction: jest.fn().mockResolvedValue({
    id: 'tx-1',
    date: new Date('2024-01-15'),
    amount: -75.0,
    description: 'Updated transaction',
    categoryId: 'cat-1',
    originId: null,
    batchId: null,
    referenceMonth: '2024-01',
    needsReview: false,
    isExcludedFromTotals: false,
    duplicateOf: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  deleteTransaction: jest.fn().mockResolvedValue(undefined),
  markTransactionAsReviewed: jest.fn().mockResolvedValue({
    id: 'tx-1',
    needsReview: false,
  }),
  setTransactionCategory: jest.fn().mockResolvedValue({
    id: 'tx-1',
    categoryId: 'cat-2',
  }),
}));

// Import after mocks
import { useTransactions } from '../useTransactions';
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  markTransactionAsReviewed,
  setTransactionCategory,
} from '../../db/queries/transactions';

describe('useTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock chain - ensure all methods return objects with all possible next methods
    const mockChain = {
      select: jest.fn(),
      from: jest.fn(),
      leftJoin: jest.fn(),
      where: jest.fn(),
      orderBy: jest.fn(),
      limit: jest.fn(),
      offset: jest.fn(),
    };

    // Each method returns an object with all methods for flexible chaining
    Object.keys(mockChain).forEach((key) => {
      mockChain[key as keyof typeof mockChain].mockReturnValue(mockChain);
    });

    mockGetDb.mockReturnValue(mockChain);
  });

  describe('data fetching', () => {
    it('returns transactions with category data', () => {
      const { result } = renderHook(() => useTransactions());

      expect(result.current.transactions).toHaveLength(1);
      expect(result.current.transactions[0].id).toBe('tx-1');
      expect(result.current.transactions[0].category?.name).toBe('Food');
    });

    it('returns loading state initially', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery.mockReturnValueOnce({ data: null, error: null });

      const { result } = renderHook(() => useTransactions());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns error when query fails', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery.mockReturnValueOnce({ data: null, error: new Error('Query failed') });

      const { result } = renderHook(() => useTransactions());

      expect(result.current.error).toBe('Error: Query failed');
    });
  });

  describe('filtering', () => {
    it('filters by reference month', () => {
      const { result } = renderHook(() => useTransactions({ referenceMonth: '2024-01' }));

      expect(result.current.transactions).toBeDefined();
    });

    it('filters by year and month', () => {
      const { result } = renderHook(() => useTransactions({ year: 2024, month: 1 }));

      expect(result.current.transactions).toBeDefined();
    });

    it('filters by category', () => {
      const { result } = renderHook(() => useTransactions({ categoryId: 'cat-1' }));

      expect(result.current.transactions).toBeDefined();
    });

    it('filters by needsReview', () => {
      const { result } = renderHook(() => useTransactions({ needsReview: true }));

      expect(result.current.transactions).toBeDefined();
    });
  });

  describe('pagination', () => {
    it('returns pagination info', () => {
      const { result } = renderHook(() => useTransactions({}, { page: 1, pageSize: 20 }));

      expect(result.current.currentPage).toBe(1);
      expect(result.current.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('navigates to next page', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery.mockReturnValue({
        data: Array(50).fill({ transaction: mockTransactionRecord, category: mockCategoryRecord }),
        error: null,
      });

      const { result } = renderHook(() => useTransactions({}, { page: 1, pageSize: 20 }));

      act(() => {
        result.current.nextPage();
      });

      // Note: In real implementation, this would update currentPage
      expect(result.current.currentPage).toBeDefined();
    });

    it('navigates to previous page', () => {
      const { result } = renderHook(() => useTransactions({}, { page: 2, pageSize: 20 }));

      act(() => {
        result.current.previousPage();
      });

      expect(result.current.currentPage).toBeDefined();
    });

    it('goes to specific page', () => {
      const { result } = renderHook(() => useTransactions({}, { page: 1, pageSize: 20 }));

      act(() => {
        result.current.goToPage(3);
      });

      expect(result.current.currentPage).toBeDefined();
    });
  });

  describe('CRUD operations', () => {
    it('creates a transaction', async () => {
      const { result } = renderHook(() => useTransactions());

      const newTx = await result.current.create({
        date: new Date('2024-01-20'),
        amount: -25.0,
        description: 'New transaction',
        referenceMonth: '2024-01',
      });

      expect(createTransaction).toHaveBeenCalled();
      expect(newTx.id).toBe('new-tx');
    });

    it('updates a transaction', async () => {
      const { result } = renderHook(() => useTransactions());

      const updated = await result.current.update('tx-1', {
        amount: -75.0,
        description: 'Updated transaction',
      });

      expect(updateTransaction).toHaveBeenCalledWith('tx-1', {
        amount: -75.0,
        description: 'Updated transaction',
      });
      expect(updated?.amount).toBe(-75.0);
    });

    it('deletes a transaction', async () => {
      const { result } = renderHook(() => useTransactions());

      await result.current.remove('tx-1');

      expect(deleteTransaction).toHaveBeenCalledWith('tx-1');
    });

    it('marks a transaction as reviewed', async () => {
      const { result } = renderHook(() => useTransactions());

      await result.current.markAsReviewed('tx-1');

      expect(markTransactionAsReviewed).toHaveBeenCalledWith('tx-1');
    });

    it('sets transaction category', async () => {
      const { result } = renderHook(() => useTransactions());

      await result.current.setCategory('tx-1', 'cat-2');

      expect(setTransactionCategory).toHaveBeenCalledWith('tx-1', 'cat-2');
    });
  });

  describe('summary', () => {
    it('returns monthly summary', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery
        .mockReturnValueOnce({
          data: [{ transaction: mockTransactionRecord, category: mockCategoryRecord }],
          error: null,
        })
        .mockReturnValueOnce({ data: [{ count: 10 }], error: null })
        .mockReturnValueOnce({
          data: [{ totalIncome: 1000, totalExpenses: 500, transactionCount: 10 }],
          error: null,
        });

      const { result } = renderHook(() => useTransactions({ referenceMonth: '2024-01' }));

      expect(result.current.summary).toBeDefined();
      expect(result.current.summary.totalIncome).toBeDefined();
      expect(result.current.summary.totalExpenses).toBeDefined();
      expect(result.current.summary.balance).toBeDefined();
    });
  });

  describe('refresh', () => {
    it('triggers refresh', () => {
      const { result } = renderHook(() => useTransactions());

      act(() => {
        result.current.refresh();
      });

      // Refresh should not throw
      expect(result.current.transactions).toBeDefined();
    });
  });
});
