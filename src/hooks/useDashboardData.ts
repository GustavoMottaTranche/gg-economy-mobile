/**
 * useDashboardData Hook
 *
 * Custom hook for dashboard data with calculations including income, expenses,
 * balance, category breakdown, and trend data.
 *
 * **Validates: Requirements 21, 22, 29**
 */
import { useMemo, useCallback, useState } from 'react';
import { useLiveQuery } from '../db/client';
import {
  getMonthlySummaryQuery,
  getCategoryBreakdownQuery,
  getTrendDataQuery,
  getAvailableMonthsQuery,
} from '../db/queries/dashboard';
import type { CategoryType } from '../types';

/**
 * Monthly summary data
 */
export interface MonthlySummary {
  /** Reference month (YYYY-MM) */
  referenceMonth: string;
  /** Total income for the month */
  totalIncome: number;
  /** Total expenses for the month */
  totalExpenses: number;
  /** Balance (income - expenses) */
  balance: number;
  /** Number of transactions */
  transactionCount: number;
}

/**
 * Category breakdown item
 */
export interface CategoryBreakdownItem {
  /** Category ID (null for uncategorized) */
  categoryId: string | null;
  /** Category name */
  categoryName: string;
  /** Category type */
  categoryType: CategoryType | null;
  /** Category color */
  categoryColor: string;
  /** Category icon */
  categoryIcon: string;
  /** Total amount for this category */
  total: number;
  /** Number of transactions */
  count: number;
  /** Percentage of total (0-100) */
  percentage: number;
}

/**
 * Trend data point
 */
export interface TrendDataPoint {
  /** Reference month (YYYY-MM) */
  month: string;
  /** Total income */
  income: number;
  /** Total expenses */
  expenses: number;
  /** Balance */
  balance: number;
}

/**
 * Trend period options
 */
export type TrendPeriod = 3 | 6 | 12;

/**
 * Return type for useDashboardData hook
 */
export interface UseDashboardDataReturn {
  /** Current month summary */
  summary: MonthlySummary;
  /** Expense breakdown by category */
  expenseBreakdown: CategoryBreakdownItem[];
  /** Income breakdown by category */
  incomeBreakdown: CategoryBreakdownItem[];
  /** Trend data for the selected period */
  trendData: TrendDataPoint[];
  /** Available months with transactions */
  availableMonths: string[];
  /** Currently selected month */
  selectedMonth: string;
  /** Selected trend period */
  trendPeriod: TrendPeriod;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Set the selected month */
  setSelectedMonth: (month: string) => void;
  /** Set the trend period */
  setTrendPeriod: (period: TrendPeriod) => void;
  /** Go to previous month */
  previousMonth: () => void;
  /** Go to next month */
  nextMonth: () => void;
  /** Refresh the data */
  refresh: () => void;
}

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get previous month from a YYYY-MM string
 */
function getPreviousMonth(month: string): string {
  const parts = month.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const monthNum = parts[1] ?? 1;
  const date = new Date(year, monthNum - 2, 1); // monthNum - 1 for 0-indexed, -1 for previous
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get next month from a YYYY-MM string
 */
function getNextMonth(month: string): string {
  const parts = month.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const monthNum = parts[1] ?? 1;
  const date = new Date(year, monthNum, 1); // monthNum for next month (0-indexed + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get months for trend period
 */
function getMonthsForTrend(currentMonth: string, period: TrendPeriod): string[] {
  const months: string[] = [];
  let month = currentMonth;

  for (let i = 0; i < period; i++) {
    months.unshift(month);
    month = getPreviousMonth(month);
  }

  return months;
}

/**
 * Hook for dashboard data with calculations
 *
 * @returns Dashboard data interface
 *
 * @example
 * ```tsx
 * const {
 *   summary,
 *   expenseBreakdown,
 *   incomeBreakdown,
 *   trendData,
 *   selectedMonth,
 *   setSelectedMonth,
 *   previousMonth,
 *   nextMonth,
 * } = useDashboardData();
 * ```
 */
export function useDashboardData(): UseDashboardDataReturn {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>(3);

  // Calculate months for trend
  const trendMonths = useMemo(
    () => getMonthsForTrend(selectedMonth, trendPeriod),
    [selectedMonth, trendPeriod]
  );

  // Live query for monthly summary using dashboard query module
  const { data: summaryData, error: summaryError } = useLiveQuery(
    getMonthlySummaryQuery(selectedMonth),
    [selectedMonth]
  );

  // Live query for category breakdown using dashboard query module
  const { data: breakdownData } = useLiveQuery(getCategoryBreakdownQuery(selectedMonth), [
    selectedMonth,
  ]);

  // Live query for trend data using dashboard query module
  const { data: trendRawData } = useLiveQuery(getTrendDataQuery(trendMonths), [trendMonths]);

  // Live query for available months using dashboard query module
  const { data: availableMonthsData } = useLiveQuery(getAvailableMonthsQuery());

  // Transform summary data
  const summary = useMemo<MonthlySummary>(() => {
    if (!summaryData || summaryData.length === 0) {
      return {
        referenceMonth: selectedMonth,
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        transactionCount: 0,
      };
    }
    const data = summaryData[0];
    const totalIncome = data?.totalIncome ?? 0;
    const totalExpenses = data?.totalExpenses ?? 0;
    const transactionCount = data?.transactionCount ?? 0;
    return {
      referenceMonth: selectedMonth,
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      transactionCount,
    };
  }, [summaryData, selectedMonth]);

  // Transform expense breakdown
  const expenseBreakdown = useMemo<CategoryBreakdownItem[]>(() => {
    if (!breakdownData) return [];

    const expenses = breakdownData.filter((item) => item.isExpense === 1);
    const totalExpenses = expenses.reduce((sum, item) => sum + (item.total ?? 0), 0);

    return expenses
      .map((item) => ({
        categoryId: item.categoryId,
        categoryName: item.categoryName ?? 'Uncategorized',
        categoryType: (item.categoryType as CategoryType) ?? null,
        categoryColor: item.categoryColor ?? '#808080',
        categoryIcon: item.categoryIcon ?? 'help-circle',
        total: item.total ?? 0,
        count: item.count ?? 0,
        percentage: totalExpenses > 0 ? ((item.total ?? 0) / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [breakdownData]);

  // Transform income breakdown
  const incomeBreakdown = useMemo<CategoryBreakdownItem[]>(() => {
    if (!breakdownData) return [];

    const income = breakdownData.filter((item) => item.isExpense === 0);
    const totalIncome = income.reduce((sum, item) => sum + (item.total ?? 0), 0);

    return income
      .map((item) => ({
        categoryId: item.categoryId,
        categoryName: item.categoryName ?? 'Uncategorized',
        categoryType: (item.categoryType as CategoryType) ?? null,
        categoryColor: item.categoryColor ?? '#808080',
        categoryIcon: item.categoryIcon ?? 'help-circle',
        total: item.total ?? 0,
        count: item.count ?? 0,
        percentage: totalIncome > 0 ? ((item.total ?? 0) / totalIncome) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [breakdownData]);

  // Transform trend data
  const trendData = useMemo<TrendDataPoint[]>(() => {
    // Create a map of existing data
    const dataMap = new Map<string, { income: number; expenses: number }>();

    if (trendRawData) {
      for (const item of trendRawData) {
        dataMap.set(item.referenceMonth, {
          income: item.totalIncome ?? 0,
          expenses: item.totalExpenses ?? 0,
        });
      }
    }

    // Fill in all months in the trend period
    return trendMonths.map((month) => {
      const data = dataMap.get(month) ?? { income: 0, expenses: 0 };
      return {
        month,
        income: data.income,
        expenses: data.expenses,
        balance: data.income - data.expenses,
      };
    });
  }, [trendRawData, trendMonths]);

  // Available months
  const availableMonths = useMemo(() => {
    if (!availableMonthsData) return [getCurrentMonth()];
    const months = availableMonthsData.map((item) => item.referenceMonth);
    // Ensure current month is always available
    if (!months.includes(getCurrentMonth())) {
      months.unshift(getCurrentMonth());
    }
    return months;
  }, [availableMonthsData]);

  // Navigation handlers
  const previousMonth = useCallback(() => {
    setSelectedMonth((current) => getPreviousMonth(current));
  }, []);

  const nextMonth = useCallback(() => {
    setSelectedMonth((current) => getNextMonth(current));
  }, []);

  // Refresh function
  const [, setRefreshKey] = useState(0);
  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return {
    summary,
    expenseBreakdown,
    incomeBreakdown,
    trendData,
    availableMonths,
    selectedMonth,
    trendPeriod,
    isLoading: !summaryData,
    error: summaryError ? String(summaryError) : null,
    setSelectedMonth,
    setTrendPeriod,
    previousMonth,
    nextMonth,
    refresh,
  };
}

export default useDashboardData;
