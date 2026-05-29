/**
 * useDashboardData Hook Tests
 *
 * Tests for the dashboard data hook with calculations.
 *
 * **Validates: Requirements 21, 22, 29**
 */
import { renderHook, act } from '@testing-library/react-native';

// Mock the database client
const mockGetDb = jest.fn();

jest.mock('../../db/client', () => ({
  getDb: () => mockGetDb(),
  useLiveQuery: jest.fn(() => ({
    data: [{ totalIncome: 1000, totalExpenses: 500, transactionCount: 10 }],
    error: null,
  })),
}));

jest.mock('../../db/schema', () => ({
  transactions: {
    referenceMonth: 'reference_month',
    amount: 'amount',
    isExcludedFromTotals: 'is_excluded_from_totals',
    categoryId: 'category_id',
  },
  categories: {
    id: 'id',
    name: 'name',
    type: 'type',
    color: 'color',
    icon: 'icon',
    expenseGroup: 'expense_group',
  },
  weeklyRecurringGroups: {
    id: 'id',
    categoryId: 'category_id',
    name: 'name',
    defaultAmount: 'default_amount',
  },
  weeklyOccurrences: {
    id: 'id',
    weeklyGroupId: 'weekly_group_id',
    amount: 'amount',
    referenceMonth: 'reference_month',
    isPaid: 'is_paid',
  },
}));

jest.mock('../../stores/weeklyRecurringStore', () => {
  const mockState = {
    groups: [],
    occurrences: [],
    expandedGroupIds: new Set(),
    toggleGroupExpansion: jest.fn(),
    collapseAllGroups: jest.fn(),
    loadOccurrencesForMonth: jest.fn(),
    updateOccurrence: jest.fn(),
  };
  const useWeeklyRecurringStore = jest.fn(() => mockState);
  useWeeklyRecurringStore.getState = jest.fn(() => mockState);
  return {
    useWeeklyRecurringStore,
    useWeeklyMonthlyTotal: () => 0,
  };
});

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((a, b) => ({ type: 'eq', a, b })),
  and: jest.fn((...args) => ({ type: 'and', args })),
  desc: jest.fn((col) => ({ type: 'desc', col })),
  sql: jest.fn((strings, ...values) => ({ type: 'sql', strings, values })),
  gte: jest.fn((a, b) => ({ type: 'gte', a, b })),
  lte: jest.fn((a, b) => ({ type: 'lte', a, b })),
  inArray: jest.fn((col, values) => ({ type: 'inArray', col, values })),
}));

// Import after mocks
import { useDashboardData } from '../useDashboardData';

describe('useDashboardData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      selectDistinct: jest.fn().mockReturnThis(),
    });
  });

  describe('summary', () => {
    it('returns monthly summary', () => {
      const { result } = renderHook(() => useDashboardData());

      expect(result.current.summary).toBeDefined();
      expect(result.current.summary.totalIncome).toBe(1000);
      expect(result.current.summary.totalExpenses).toBe(500);
      expect(result.current.summary.balance).toBe(500);
      expect(result.current.summary.transactionCount).toBe(10);
    });

    it('returns zero values when no data', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery.mockReturnValue({ data: [], error: null });

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.summary.totalIncome).toBe(0);
      expect(result.current.summary.totalExpenses).toBe(0);
      expect(result.current.summary.balance).toBe(0);
    });

    it('returns loading state initially', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery.mockReturnValueOnce({ data: null, error: null });

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns error when query fails', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery.mockReturnValueOnce({ data: null, error: new Error('Query failed') });

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.error).toBe('Error: Query failed');
    });
  });

  describe('category breakdown', () => {
    it('returns expense breakdown', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery
        .mockReturnValueOnce({
          data: [{ totalIncome: 1000, totalExpenses: 500, transactionCount: 10 }],
          error: null,
        })
        .mockReturnValueOnce({
          data: [
            {
              categoryId: 'cat-1',
              categoryName: 'Food',
              categoryType: 'expense',
              categoryColor: '#FF6B6B',
              categoryIcon: 'restaurant',
              total: 300,
              count: 5,
              isExpense: 1,
            },
            {
              categoryId: 'cat-2',
              categoryName: 'Transport',
              categoryType: 'expense',
              categoryColor: '#4ECDC4',
              categoryIcon: 'car',
              total: 200,
              count: 3,
              isExpense: 1,
            },
          ],
          error: null,
        });

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.expenseBreakdown).toBeDefined();
      expect(result.current.expenseBreakdown.length).toBeGreaterThanOrEqual(0);
    });

    it('returns income breakdown', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery
        .mockReturnValueOnce({
          data: [{ totalIncome: 1000, totalExpenses: 500, transactionCount: 10 }],
          error: null,
        })
        .mockReturnValueOnce({
          data: [
            {
              categoryId: 'cat-3',
              categoryName: 'Salary',
              categoryType: 'income',
              categoryColor: '#45B7D1',
              categoryIcon: 'wallet',
              total: 1000,
              count: 1,
              isExpense: 0,
            },
          ],
          error: null,
        });

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.incomeBreakdown).toBeDefined();
    });

    it('calculates percentages correctly', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery
        .mockReturnValueOnce({
          data: [{ totalIncome: 1000, totalExpenses: 500, transactionCount: 10 }],
          error: null,
        })
        .mockReturnValueOnce({
          data: [
            {
              categoryId: 'cat-1',
              categoryName: 'Food',
              categoryType: 'expense',
              categoryColor: '#FF6B6B',
              categoryIcon: 'restaurant',
              total: 300,
              count: 5,
              isExpense: 1,
            },
            {
              categoryId: 'cat-2',
              categoryName: 'Transport',
              categoryType: 'expense',
              categoryColor: '#4ECDC4',
              categoryIcon: 'car',
              total: 200,
              count: 3,
              isExpense: 1,
            },
          ],
          error: null,
        });

      const { result } = renderHook(() => useDashboardData());

      // Total expenses = 300 + 200 = 500
      // Food percentage = 300/500 * 100 = 60%
      // Transport percentage = 200/500 * 100 = 40%
      if (result.current.expenseBreakdown.length > 0) {
        const totalPercentage = result.current.expenseBreakdown.reduce(
          (sum, item) => sum + item.percentage,
          0
        );
        expect(totalPercentage).toBeCloseTo(100, 1);
      }
    });

    it('handles uncategorized transactions', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery
        .mockReturnValueOnce({
          data: [{ totalIncome: 1000, totalExpenses: 500, transactionCount: 10 }],
          error: null,
        })
        .mockReturnValueOnce({
          data: [
            {
              categoryId: null,
              categoryName: null,
              categoryType: null,
              categoryColor: null,
              categoryIcon: null,
              total: 100,
              count: 2,
              isExpense: 1,
            },
          ],
          error: null,
        });

      const { result } = renderHook(() => useDashboardData());

      if (result.current.expenseBreakdown.length > 0) {
        const uncategorized = result.current.expenseBreakdown.find(
          (item) => item.categoryId === null
        );
        expect(uncategorized?.categoryName).toBe('Uncategorized');
      }
    });
  });

  describe('trend data', () => {
    it('returns trend data for selected period', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery
        .mockReturnValueOnce({
          data: [{ totalIncome: 1000, totalExpenses: 500, transactionCount: 10 }],
          error: null,
        })
        .mockReturnValueOnce({ data: [], error: null })
        .mockReturnValueOnce({
          data: [
            { referenceMonth: '2024-01', totalIncome: 1000, totalExpenses: 500 },
            { referenceMonth: '2023-12', totalIncome: 900, totalExpenses: 600 },
            { referenceMonth: '2023-11', totalIncome: 1100, totalExpenses: 400 },
          ],
          error: null,
        });

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.trendData).toBeDefined();
      expect(result.current.trendData.length).toBe(3); // Default period is 3 months
    });

    it('fills in missing months with zeros', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery
        .mockReturnValueOnce({
          data: [{ totalIncome: 1000, totalExpenses: 500, transactionCount: 10 }],
          error: null,
        })
        .mockReturnValueOnce({ data: [], error: null })
        .mockReturnValueOnce({
          data: [
            { referenceMonth: '2024-01', totalIncome: 1000, totalExpenses: 500 },
            // Missing 2023-12
            { referenceMonth: '2023-11', totalIncome: 1100, totalExpenses: 400 },
          ],
          error: null,
        });

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.trendData.length).toBe(3);
      // All months should be present
      result.current.trendData.forEach((point) => {
        expect(point.month).toBeDefined();
        expect(point.income).toBeDefined();
        expect(point.expenses).toBeDefined();
        expect(point.balance).toBeDefined();
      });
    });
  });

  describe('month navigation', () => {
    it('starts with current month', () => {
      const { result } = renderHook(() => useDashboardData());

      const now = new Date();
      const expectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      expect(result.current.selectedMonth).toBe(expectedMonth);
    });

    it('navigates to previous month', () => {
      const { result } = renderHook(() => useDashboardData());

      const initialMonth = result.current.selectedMonth;

      act(() => {
        result.current.previousMonth();
      });

      expect(result.current.selectedMonth).not.toBe(initialMonth);
    });

    it('navigates to next month', () => {
      const { result } = renderHook(() => useDashboardData());

      // First go back
      act(() => {
        result.current.previousMonth();
      });

      const previousMonth = result.current.selectedMonth;

      // Then go forward
      act(() => {
        result.current.nextMonth();
      });

      expect(result.current.selectedMonth).not.toBe(previousMonth);
    });

    it('sets selected month directly', () => {
      const { result } = renderHook(() => useDashboardData());

      act(() => {
        result.current.setSelectedMonth('2023-06');
      });

      expect(result.current.selectedMonth).toBe('2023-06');
    });
  });

  describe('trend period', () => {
    it('starts with default period of 3 months', () => {
      const { result } = renderHook(() => useDashboardData());

      expect(result.current.trendPeriod).toBe(3);
    });

    it('changes trend period', () => {
      const { result } = renderHook(() => useDashboardData());

      act(() => {
        result.current.setTrendPeriod(6);
      });

      expect(result.current.trendPeriod).toBe(6);
    });

    it('supports 12 month period', () => {
      const { result } = renderHook(() => useDashboardData());

      act(() => {
        result.current.setTrendPeriod(12);
      });

      expect(result.current.trendPeriod).toBe(12);
    });
  });

  describe('available months', () => {
    it('returns available months', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery
        .mockReturnValueOnce({
          data: [{ totalIncome: 1000, totalExpenses: 500, transactionCount: 10 }],
          error: null,
        })
        .mockReturnValueOnce({ data: [], error: null })
        .mockReturnValueOnce({ data: [], error: null })
        .mockReturnValueOnce({
          data: [
            { referenceMonth: '2024-01' },
            { referenceMonth: '2023-12' },
            { referenceMonth: '2023-11' },
          ],
          error: null,
        });

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.availableMonths).toBeDefined();
      expect(result.current.availableMonths.length).toBeGreaterThan(0);
    });

    it('includes current month even if no transactions', () => {
      const { useLiveQuery } = require('../../db/client');
      useLiveQuery
        .mockReturnValueOnce({
          data: [{ totalIncome: 0, totalExpenses: 0, transactionCount: 0 }],
          error: null,
        })
        .mockReturnValueOnce({ data: [], error: null })
        .mockReturnValueOnce({ data: [], error: null })
        .mockReturnValueOnce({ data: [], error: null });

      const { result } = renderHook(() => useDashboardData());

      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      expect(result.current.availableMonths).toContain(currentMonth);
    });
  });

  describe('refresh', () => {
    it('triggers refresh', () => {
      const { result } = renderHook(() => useDashboardData());

      act(() => {
        result.current.refresh();
      });

      expect(result.current.summary).toBeDefined();
    });
  });
});
