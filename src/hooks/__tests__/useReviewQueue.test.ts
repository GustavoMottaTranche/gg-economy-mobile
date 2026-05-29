/**
 * useReviewQueue Hook Tests
 *
 * Tests for the review queue hook with reactive updates.
 *
 * **Validates: Requirements 16, 29**
 */
import { renderHook, act } from '@testing-library/react-native';

// Mock data
const mockTransactionRecord = {
  id: 'tx-1',
  date: '2024-01-15',
  amount: -50.0,
  description: 'Test transaction',
  categoryId: null,
  originId: null,
  batchId: 'batch-1',
  referenceMonth: '2024-01',
  needsReview: true,
  isExcludedFromTotals: false,
  duplicateOf: null,
  title: '',
  installmentGroupId: null,
  recurringId: null,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

const mockBatchRecord = {
  id: 'batch-1',
  fileName: 'import.csv',
  fileType: 'csv',
  importedAt: '2024-01-15T09:00:00Z',
  transactionCount: 10,
  status: 'reviewing',
};

// Mock the database client
const mockGetDb = jest.fn();

jest.mock('../../db/client', () => ({
  getDb: () => mockGetDb(),
  useLiveQuery: jest.fn((_query, _deps) => ({
    data: [
      {
        transaction: mockTransactionRecord,
        category: null,
        importBatch: mockBatchRecord,
      },
    ],
    error: null,
  })),
}));

jest.mock('../../db/schema', () => ({
  transactions: {
    id: 'id',
    needsReview: 'needs_review',
    categoryId: 'category_id',
    batchId: 'batch_id',
    date: 'date',
  },
  categories: {
    id: 'id',
  },
  importBatches: {
    id: 'id',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((a, b) => ({ type: 'eq', a, b })),
  and: jest.fn((...args) => ({ type: 'and', args })),
  desc: jest.fn((col) => ({ type: 'desc', col })),
  sql: jest.fn((strings, ...values) => ({ type: 'sql', strings, values })),
}));

// Mock query functions
jest.mock('../../db/queries/transactions', () => ({
  updateTransaction: jest.fn().mockResolvedValue({
    id: 'tx-1',
    needsReview: false,
  }),
  markTransactionAsReviewed: jest.fn().mockResolvedValue({
    id: 'tx-1',
    needsReview: false,
  }),
  markTransactionsAsReviewed: jest.fn().mockResolvedValue(undefined),
  setTransactionCategory: jest.fn().mockResolvedValue({
    id: 'tx-1',
    categoryId: 'cat-1',
  }),
  deleteTransaction: jest.fn().mockResolvedValue(undefined),
  deleteTransactions: jest.fn().mockResolvedValue(undefined),
}));

// Import after mocks
import { useReviewQueue } from '../useReviewQueue';
import {
  updateTransaction,
  markTransactionAsReviewed,
  markTransactionsAsReviewed,
  setTransactionCategory,
  deleteTransaction,
  deleteTransactions,
} from '../../db/queries/transactions';

describe('useReviewQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
    });
  });

  describe('data fetching', () => {
    it('returns transactions needing review', () => {
      const { result } = renderHook(() => useReviewQueue());

      expect(result.current.transactions).toHaveLength(1);
      expect(result.current.transactions[0]!.needsReview).toBe(true);
    });

    it('returns transactions with batch info', () => {
      const { result } = renderHook(() => useReviewQueue());

      expect(result.current.transactions[0]!.importBatch).toBeDefined();
      expect(result.current.transactions[0]!.importBatch?.fileName).toBe('import.csv');
    });

    it('returns loading state initially', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery.mockReturnValueOnce({ data: null, error: null });

      const { result } = renderHook(() => useReviewQueue());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns error when query fails', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery.mockReturnValueOnce({ data: null, error: new Error('Query failed') });

      const { result } = renderHook(() => useReviewQueue());

      expect(result.current.error).toBe('Error: Query failed');
    });
  });

  describe('grouping', () => {
    it('groups transactions by batch', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery.mockReturnValue({
        data: [
          {
            transaction: { ...mockTransactionRecord, id: 'tx-1', batchId: 'batch-1' },
            category: null,
            importBatch: mockBatchRecord,
          },
          {
            transaction: { ...mockTransactionRecord, id: 'tx-2', batchId: 'batch-1' },
            category: null,
            importBatch: mockBatchRecord,
          },
          {
            transaction: { ...mockTransactionRecord, id: 'tx-3', batchId: 'batch-2' },
            category: null,
            importBatch: { ...mockBatchRecord, id: 'batch-2' },
          },
        ],
        error: null,
      });

      const { result } = renderHook(() => useReviewQueue());

      expect(result.current.groupedByBatch).toHaveLength(2);
      expect(result.current.groupedByBatch[0]!.count).toBe(2);
      expect(result.current.groupedByBatch[1]!.count).toBe(1);
    });

    it('handles transactions without batch', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery.mockReturnValue({
        data: [
          {
            transaction: { ...mockTransactionRecord, batchId: null },
            category: null,
            importBatch: null,
          },
        ],
        error: null,
      });

      const { result } = renderHook(() => useReviewQueue());

      expect(result.current.groupedByBatch).toHaveLength(1);
      expect(result.current.groupedByBatch[0]!.batchId).toBeNull();
    });
  });

  describe('count', () => {
    it('returns review count', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery
        .mockReturnValueOnce({
          data: [
            { transaction: mockTransactionRecord, category: null, importBatch: mockBatchRecord },
          ],
          error: null,
        })
        .mockReturnValueOnce({ data: [{ count: 5 }], error: null });

      const { result } = renderHook(() => useReviewQueue());

      expect(result.current.count).toBe(5);
    });
  });

  describe('mark as reviewed', () => {
    it('marks a single transaction as reviewed', async () => {
      const { result } = renderHook(() => useReviewQueue());

      await act(async () => {
        await result.current.markAsReviewed('tx-1');
      });

      expect(markTransactionAsReviewed).toHaveBeenCalledWith('tx-1');
    });

    it('marks multiple transactions as reviewed', async () => {
      const { result } = renderHook(() => useReviewQueue());

      await act(async () => {
        await result.current.markMultipleAsReviewed(['tx-1', 'tx-2', 'tx-3']);
      });

      expect(markTransactionsAsReviewed).toHaveBeenCalledWith(['tx-1', 'tx-2', 'tx-3']);
    });

    it('marks all transactions in a batch as reviewed', async () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery.mockReturnValue({
        data: [
          {
            transaction: { ...mockTransactionRecord, id: 'tx-1', batchId: 'batch-1' },
            category: null,
            importBatch: mockBatchRecord,
          },
          {
            transaction: { ...mockTransactionRecord, id: 'tx-2', batchId: 'batch-1' },
            category: null,
            importBatch: mockBatchRecord,
          },
        ],
        error: null,
      });

      const { result } = renderHook(() => useReviewQueue());

      await act(async () => {
        await result.current.markBatchAsReviewed('batch-1');
      });

      expect(markTransactionsAsReviewed).toHaveBeenCalledWith(['tx-1', 'tx-2']);
    });

    it('marks all transactions as reviewed', async () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery.mockReturnValue({
        data: [
          {
            transaction: { ...mockTransactionRecord, id: 'tx-1' },
            category: null,
            importBatch: mockBatchRecord,
          },
          {
            transaction: { ...mockTransactionRecord, id: 'tx-2' },
            category: null,
            importBatch: mockBatchRecord,
          },
        ],
        error: null,
      });

      const { result } = renderHook(() => useReviewQueue());

      await act(async () => {
        await result.current.markAllAsReviewed();
      });

      expect(markTransactionsAsReviewed).toHaveBeenCalledWith(['tx-1', 'tx-2']);
    });
  });

  describe('update operations', () => {
    it('updates a transaction', async () => {
      const { result } = renderHook(() => useReviewQueue());

      await act(async () => {
        await result.current.update('tx-1', { description: 'Updated' });
      });

      expect(updateTransaction).toHaveBeenCalledWith('tx-1', { description: 'Updated' });
    });

    it('sets transaction category', async () => {
      const { result } = renderHook(() => useReviewQueue());

      await act(async () => {
        await result.current.setCategory('tx-1', 'cat-1');
      });

      expect(setTransactionCategory).toHaveBeenCalledWith('tx-1', 'cat-1');
    });

    it('sets category for multiple transactions', async () => {
      const { result } = renderHook(() => useReviewQueue());

      await act(async () => {
        await result.current.setCategoryForMultiple(['tx-1', 'tx-2'], 'cat-1');
      });

      expect(setTransactionCategory).toHaveBeenCalledTimes(2);
      expect(setTransactionCategory).toHaveBeenCalledWith('tx-1', 'cat-1');
      expect(setTransactionCategory).toHaveBeenCalledWith('tx-2', 'cat-1');
    });
  });

  describe('delete operations', () => {
    it('deletes a transaction', async () => {
      const { result } = renderHook(() => useReviewQueue());

      await act(async () => {
        await result.current.remove('tx-1');
      });

      expect(deleteTransaction).toHaveBeenCalledWith('tx-1');
    });

    it('deletes multiple transactions', async () => {
      const { result } = renderHook(() => useReviewQueue());

      await act(async () => {
        await result.current.removeMultiple(['tx-1', 'tx-2']);
      });

      expect(deleteTransactions).toHaveBeenCalledWith(['tx-1', 'tx-2']);
    });
  });

  describe('refresh', () => {
    it('triggers refresh', () => {
      const { result } = renderHook(() => useReviewQueue());

      act(() => {
        result.current.refresh();
      });

      expect(result.current.transactions).toBeDefined();
    });
  });
});
