/**
 * Unit tests for useCategoryDetailData hook
 *
 * Tests the hook's integration of payment summary, installment info map,
 * sorting behavior, empty state handling, and batch query failure resilience.
 *
 * Requirements: 2.1, 2.7, 3.2, 7.1
 */
import { renderHook, waitFor } from '@testing-library/react-native';
import { useCategoryDetailData } from '../../../src/hooks/useCategoryDetailData';
import * as categoryDetailQueries from '../../../src/db/queries/categoryDetail';

// ============================================================================
// Mocks
// ============================================================================

// Mock @react-navigation/native (useFocusEffect)
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = require('react');
    useEffect(() => {
      callback();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  },
}));

// Mock database client
const mockSelect = jest.fn();
const mockFrom = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();

jest.mock('../../../src/db/client', () => ({
  getDb: jest.fn(() => ({
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return {
        from: (...fArgs: unknown[]) => {
          mockFrom(...fArgs);
          return {
            where: (...wArgs: unknown[]) => {
              mockWhere(...wArgs);
              return {
                limit: (...lArgs: unknown[]) => {
                  mockLimit(...lArgs);
                  return Promise.resolve([
                    {
                      id: 'cat-1',
                      name: 'Food',
                      icon: 'utensils',
                      color: '#FF5722',
                      type: 'expense',
                      expenseGroup: 'variable',
                    },
                  ]);
                },
              };
            },
          };
        },
      };
    },
  })),
}));

// Mock schema (only used for drizzle query building in the hook)
jest.mock('../../../src/db/schema', () => ({
  categories: {
    id: 'categories.id',
    name: 'categories.name',
    icon: 'categories.icon',
    color: 'categories.color',
    type: 'categories.type',
    expenseGroup: 'categories.expenseGroup',
  },
}));

// Mock category detail query functions
jest.mock('../../../src/db/queries/categoryDetail', () => ({
  getCategoryDetailTransactionsQuery: jest.fn(),
  getCategoryDetailWeeklyQuery: jest.fn(),
  getInstallmentGroupInfoBatch: jest.fn(),
}));

const mockGetTransactions =
  categoryDetailQueries.getCategoryDetailTransactionsQuery as jest.MockedFunction<
    typeof categoryDetailQueries.getCategoryDetailTransactionsQuery
  >;
const mockGetWeekly = categoryDetailQueries.getCategoryDetailWeeklyQuery as jest.MockedFunction<
  typeof categoryDetailQueries.getCategoryDetailWeeklyQuery
>;
const mockGetInstallmentBatch =
  categoryDetailQueries.getInstallmentGroupInfoBatch as jest.MockedFunction<
    typeof categoryDetailQueries.getInstallmentGroupInfoBatch
  >;

// ============================================================================
// Test Data
// ============================================================================

const CATEGORY_ID = 'cat-1';
const MONTH = '2024-06';

function makeTransaction(
  overrides: Partial<categoryDetailQueries.CategoryDetailTransactionResult>
) {
  return {
    id: 'tx-1',
    title: 'Transaction 1',
    date: '2024-06-15',
    amount: -5000,
    isPaid: true,
    installmentGroupId: null,
    recurringId: null,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('useCategoryDetailData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: return empty arrays unless overridden
    mockGetTransactions.mockResolvedValue([]);
    mockGetWeekly.mockResolvedValue([]);
    mockGetInstallmentBatch.mockResolvedValue(new Map());
  });

  describe('paymentSummary with correct totals', () => {
    it('should compute paidTotal, pendingTotal, and grandTotal from transaction amounts', async () => {
      mockGetTransactions.mockResolvedValue([
        makeTransaction({ id: 'tx-1', amount: -10000, isPaid: true }),
        makeTransaction({ id: 'tx-2', amount: -5000, isPaid: true }),
        makeTransaction({ id: 'tx-3', amount: -3000, isPaid: false, recurringId: 'rec-1' }),
        makeTransaction({ id: 'tx-4', amount: -7000, isPaid: false, installmentGroupId: 'grp-1' }),
      ]);
      mockGetWeekly.mockResolvedValue([
        {
          id: 'wo-1',
          description: 'Weekly Lunch',
          date: '2024-06-10',
          amount: -2000,
          weeklyGroupId: 'wg-1',
          isPaid: true,
        },
        {
          id: 'wo-2',
          description: 'Weekly Lunch',
          date: '2024-06-17',
          amount: -2000,
          weeklyGroupId: 'wg-1',
          isPaid: false,
        },
      ]);
      mockGetInstallmentBatch.mockResolvedValue(
        new Map([['grp-1', { currentIndex: 2, totalParcels: 6 }]])
      );

      const { result } = renderHook(() => useCategoryDetailData(CATEGORY_ID, MONTH));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // paidTotal = abs(-10000) + abs(-5000) + abs(-2000) = 17000
      // pendingTotal = abs(-3000) + abs(-7000) + abs(-2000) = 12000
      // grandTotal = 17000 + 12000 = 29000
      expect(result.current.paymentSummary).toEqual({
        paidTotal: 17000,
        pendingTotal: 12000,
        grandTotal: 29000,
      });
    });

    it('should return zeros when no items exist', async () => {
      mockGetTransactions.mockResolvedValue([]);
      mockGetWeekly.mockResolvedValue([]);

      const { result } = renderHook(() => useCategoryDetailData(CATEGORY_ID, MONTH));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.paymentSummary).toEqual({
        paidTotal: 0,
        pendingTotal: 0,
        grandTotal: 0,
      });
    });
  });

  describe('installmentInfo map with correct labels', () => {
    it('should return "X/Y" labels for installment transactions', async () => {
      mockGetTransactions.mockResolvedValue([
        makeTransaction({ id: 'tx-inst-1', installmentGroupId: 'grp-A', isPaid: true }),
        makeTransaction({ id: 'tx-inst-2', installmentGroupId: 'grp-B', isPaid: false }),
      ]);

      mockGetInstallmentBatch.mockResolvedValue(
        new Map([
          ['grp-A', { currentIndex: 3, totalParcels: 12 }],
          ['grp-B', { currentIndex: 1, totalParcels: 6 }],
        ])
      );

      const { result } = renderHook(() => useCategoryDetailData(CATEGORY_ID, MONTH));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.installmentInfo.get('tx-inst-1')).toEqual({ label: '3/12' });
      expect(result.current.installmentInfo.get('tx-inst-2')).toEqual({ label: '1/6' });
    });

    it('should return "∞" label for recurring transactions without installmentGroupId', async () => {
      mockGetTransactions.mockResolvedValue([
        makeTransaction({ id: 'tx-rec-1', recurringId: 'rec-A', installmentGroupId: null }),
        makeTransaction({ id: 'tx-rec-2', recurringId: 'rec-B', installmentGroupId: null }),
      ]);

      const { result } = renderHook(() => useCategoryDetailData(CATEGORY_ID, MONTH));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.installmentInfo.get('tx-rec-1')).toEqual({ label: '∞' });
      expect(result.current.installmentInfo.get('tx-rec-2')).toEqual({ label: '∞' });
    });

    it('should not set "∞" for transactions that have both recurringId and installmentGroupId', async () => {
      // If a transaction has both, it should use the installment label, not "∞"
      mockGetTransactions.mockResolvedValue([
        makeTransaction({
          id: 'tx-both',
          recurringId: 'rec-X',
          installmentGroupId: 'grp-X',
          isPaid: true,
        }),
      ]);

      mockGetInstallmentBatch.mockResolvedValue(
        new Map([['grp-X', { currentIndex: 5, totalParcels: 10 }]])
      );

      const { result } = renderHook(() => useCategoryDetailData(CATEGORY_ID, MONTH));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have installment label, not "∞"
      expect(result.current.installmentInfo.get('tx-both')).toEqual({ label: '5/10' });
    });
  });

  describe('sorting: paid first, then pending, date descending within groups', () => {
    it('should sort all paid items before all pending items', async () => {
      mockGetTransactions.mockResolvedValue([
        makeTransaction({ id: 'tx-pending-1', date: '2024-06-20', isPaid: false }),
        makeTransaction({ id: 'tx-paid-1', date: '2024-06-10', isPaid: true }),
        makeTransaction({ id: 'tx-pending-2', date: '2024-06-25', isPaid: false }),
        makeTransaction({ id: 'tx-paid-2', date: '2024-06-15', isPaid: true }),
      ]);

      const { result } = renderHook(() => useCategoryDetailData(CATEGORY_ID, MONTH));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const ids = result.current.items.map((i) => i.id);
      const paidIds = ids.filter((id) => id.startsWith('tx-paid'));
      const pendingIds = ids.filter((id) => id.startsWith('tx-pending'));

      // All paid items should come first
      const lastPaidIndex = ids.lastIndexOf(paidIds[paidIds.length - 1]);
      const firstPendingIndex = ids.indexOf(pendingIds[0]);
      expect(lastPaidIndex).toBeLessThan(firstPendingIndex);
    });

    it('should sort dates descending within each group', async () => {
      mockGetTransactions.mockResolvedValue([
        makeTransaction({ id: 'tx-p1', date: '2024-06-05', isPaid: true }),
        makeTransaction({ id: 'tx-p2', date: '2024-06-20', isPaid: true }),
        makeTransaction({ id: 'tx-p3', date: '2024-06-12', isPaid: true }),
        makeTransaction({ id: 'tx-u1', date: '2024-06-03', isPaid: false }),
        makeTransaction({ id: 'tx-u2', date: '2024-06-18', isPaid: false }),
      ]);

      const { result } = renderHook(() => useCategoryDetailData(CATEGORY_ID, MONTH));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const items = result.current.items;

      // Paid items: tx-p2 (20), tx-p3 (12), tx-p1 (05) — date descending
      const paidItems = items.filter((i) => i.isPaid);
      expect(paidItems.map((i) => i.id)).toEqual(['tx-p2', 'tx-p3', 'tx-p1']);

      // Pending items: tx-u2 (18), tx-u1 (03) — date descending
      const pendingItems = items.filter((i) => !i.isPaid);
      expect(pendingItems.map((i) => i.id)).toEqual(['tx-u2', 'tx-u1']);
    });
  });

  describe('empty installmentGroupIds handling', () => {
    it('should return empty installmentInfo and not call batch query when no installmentGroupIds exist', async () => {
      mockGetTransactions.mockResolvedValue([
        makeTransaction({ id: 'tx-1', installmentGroupId: null, recurringId: null }),
        makeTransaction({ id: 'tx-2', installmentGroupId: null, recurringId: null }),
      ]);

      const { result } = renderHook(() => useCategoryDetailData(CATEGORY_ID, MONTH));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Batch query should NOT be called when there are no group IDs
      expect(mockGetInstallmentBatch).not.toHaveBeenCalled();
      expect(result.current.installmentInfo.size).toBe(0);
    });

    it('should still render items correctly when no installmentGroupIds are present', async () => {
      mockGetTransactions.mockResolvedValue([
        makeTransaction({ id: 'tx-plain-1', amount: -4000, isPaid: true }),
        makeTransaction({ id: 'tx-plain-2', amount: -6000, isPaid: false }),
      ]);

      const { result } = renderHook(() => useCategoryDetailData(CATEGORY_ID, MONTH));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.paymentSummary).toEqual({
        paidTotal: 4000,
        pendingTotal: 6000,
        grandTotal: 10000,
      });
    });
  });

  describe('batch query failure handling', () => {
    it('should return empty installmentInfo but still render items when getInstallmentGroupInfoBatch throws', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockGetTransactions.mockResolvedValue([
        makeTransaction({ id: 'tx-i1', installmentGroupId: 'grp-1', amount: -8000, isPaid: true }),
        makeTransaction({
          id: 'tx-i2',
          installmentGroupId: 'grp-2',
          amount: -3000,
          isPaid: false,
        }),
        makeTransaction({
          id: 'tx-r1',
          recurringId: 'rec-1',
          amount: -2000,
          isPaid: true,
        }),
      ]);
      mockGetWeekly.mockResolvedValue([
        {
          id: 'wo-1',
          description: 'Weekly',
          date: '2024-06-10',
          amount: -1500,
          weeklyGroupId: 'wg-1',
          isPaid: true,
        },
      ]);

      // Simulate batch query failure
      mockGetInstallmentBatch.mockRejectedValue(new Error('Database query failed'));

      const { result } = renderHook(() => useCategoryDetailData(CATEGORY_ID, MONTH));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // installmentInfo should be empty (no installment labels)
      // Note: recurring labels are set AFTER the try/catch, so "∞" for recurring still works
      expect(result.current.installmentInfo.has('tx-i1')).toBe(false);
      expect(result.current.installmentInfo.has('tx-i2')).toBe(false);

      // Items should still render correctly
      expect(result.current.items).toHaveLength(4);

      // Payment summary should still be computed
      expect(result.current.paymentSummary.grandTotal).toBe(14500);

      // Error state should not be set (batch failure is non-fatal)
      expect(result.current.error).toBeNull();

      consoleSpy.mockRestore();
    });

    it('should still assign "∞" to recurring transactions even when batch query fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockGetTransactions.mockResolvedValue([
        makeTransaction({
          id: 'tx-inst',
          installmentGroupId: 'grp-1',
          recurringId: null,
          isPaid: true,
        }),
        makeTransaction({
          id: 'tx-rec',
          recurringId: 'rec-1',
          installmentGroupId: null,
          isPaid: true,
        }),
      ]);

      mockGetInstallmentBatch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useCategoryDetailData(CATEGORY_ID, MONTH));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Recurring transaction should still get "∞" label
      expect(result.current.installmentInfo.get('tx-rec')).toEqual({ label: '∞' });
      // Installment transaction should NOT have a label (batch failed)
      expect(result.current.installmentInfo.has('tx-inst')).toBe(false);

      consoleSpy.mockRestore();
    });
  });
});
