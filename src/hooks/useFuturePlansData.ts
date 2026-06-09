/**
 * useFuturePlansData Hook
 *
 * Composes fundStore data with transaction queries to provide all computed values
 * needed by the Future Plans screen: savings goal, actual savings, funds with balances,
 * allocations, and remaining distributable amount.
 *
 * Uses SavingsCalculationService and FundBalanceCalculationService for pure calculations.
 * Uses useGoals with variable category spending (including weekly) to compute
 * expectedFutureSpending — the same calculation the Dashboard uses.
 *
 * **Validates: Requirements 3.1, 4.1, 6.3, 13.2**
 */
import { useMemo, useEffect, useState, useCallback } from 'react';
import { useLiveQuery } from '../db/client';
import { useFundStore } from '../stores/fundStore';
import {
  calculateSavingsGoal,
  calculateActualSavings,
  calculateRemainingDistributable,
} from '../services/funds/SavingsCalculationService';
import {
  calculateFundBalance,
  filterDeductionsByMonth,
} from '../services/funds/FundBalanceCalculationService';
import { fundAllocationRepository } from '../repositories/FundAllocationRepository';
import {
  getFuturePlansTotalsQuery,
  getWeeklyOccurrenceTotalsQuery,
  getWeeklyVariableBreakdownQuery,
} from '../db/queries/futurePlans';
import { getCategoryBreakdownQuery } from '../db/queries/dashboard';
import { useGoals } from './useGoals';
import { useGoalStore } from '../stores/goalStore';
import { getReferenceMonth } from '../utils/formatDate';
import { useWeeklyRecurringStore } from '../stores/weeklyRecurringStore';
import type { FundWithBalance } from '../types/fund';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Return type for useFuturePlansData hook
 */
export interface UseFuturePlansDataReturn {
  /** Projected savings goal for the selected month (cents) */
  savingsGoal: number;
  /** Actual realized savings for the selected month (cents) */
  actualSavings: number;
  /** All active funds with their computed balances and monthly allocations */
  fundsWithBalances: FundWithBalance[];
  /** Remaining distributable amount: savingsGoal - sum(allocations) (cents) */
  remainingDistributable: number;
  /** Total fund allocations for the selected month (cents) */
  totalAllocations: number;
  /** Configured monthly income (cents), null if not configured */
  monthlyIncome: number | null;
  /** Currently selected month (YYYY-MM) */
  selectedMonth: string;
  /** Expected future spending in cents (from useGoals) */
  expectedFutureSpending: number;
  /** Whether data is loading */
  isLoading: boolean;
  /** Set the selected month */
  setSelectedMonth: (month: string) => void;
  /** Go to previous month */
  previousMonth: () => void;
  /** Go to next month */
  nextMonth: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCurrentMonth(): string {
  return getReferenceMonth(new Date());
}

function getPreviousMonth(month: string): string {
  const parts = month.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const monthNum = parts[1] ?? 1;
  const date = new Date(year, monthNum - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getNextMonth(month: string): string {
  const parts = month.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const monthNum = parts[1] ?? 1;
  const date = new Date(year, monthNum, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook providing all computed data for the Future Plans screen.
 *
 * Composes:
 * - Fund store state (funds, allocations, balances, fundTransactions, monthlyIncome, selectedMonth)
 * - Live transaction queries (totalPaid, totalPending) including weekly occurrences
 * - Variable category spending (transactions + weekly) for expectedFutureSpending
 * - useGoals (expectedFutureSpending via per-category goals)
 * - SavingsCalculationService (savingsGoal, actualSavings, remainingDistributable)
 * - FundBalanceCalculationService (fund balances with reference month constraint)
 *
 * @returns All computed values needed by the Future Plans screen
 */
export function useFuturePlansData(): UseFuturePlansDataReturn {
  // ─── Fund Store ──────────────────────────────────────────────────────────────
  const funds = useFundStore((state) => state.funds);
  const allocations = useFundStore((state) => state.allocations);
  const balances = useFundStore((state) => state.balances);
  const fundTransactions = useFundStore((state) => state.fundTransactions);
  const monthlyIncome = useFundStore((state) => state.monthlyIncome);
  const selectedMonth = useFundStore((state) => state.selectedMonth);
  const isLoading = useFundStore((state) => state.isLoading);
  const loadMonthData = useFundStore((state) => state.loadMonthData);

  // ─── Weekly Recurring: ensure occurrences are generated for selected month ───
  useEffect(() => {
    useWeeklyRecurringStore.getState().loadOccurrencesForMonth(selectedMonth);
  }, [selectedMonth]);

  // ─── Transaction Totals Query (regular transactions only) ────────────────────
  const { data: totalsData } = useLiveQuery(getFuturePlansTotalsQuery(selectedMonth), [
    selectedMonth,
  ]);

  // ─── Weekly Occurrence Totals (paid/pending) ─────────────────────────────────
  const { data: weeklyTotalsData } = useLiveQuery(getWeeklyOccurrenceTotalsQuery(selectedMonth), [
    selectedMonth,
  ]);

  // ─── Category Breakdown for Variable Spending (transactions) ─────────────────
  const { data: categoryBreakdownData } = useLiveQuery(getCategoryBreakdownQuery(selectedMonth), [
    selectedMonth,
  ]);

  // ─── Weekly Variable Breakdown (paid weekly occurrences by category) ──────────
  const { data: weeklyBreakdownData } = useLiveQuery(
    getWeeklyVariableBreakdownQuery(selectedMonth),
    [selectedMonth]
  );

  // ─── Variable Category Spending (merged transactions + weekly, for useGoals) ──
  const categoryGoals = useGoalStore((state) => state.categoryGoals);

  const variableCategorySpending = useMemo(() => {
    const txData = categoryBreakdownData ?? [];
    const weeklyData = weeklyBreakdownData ?? [];

    // Get variable expenses from transactions
    const variableMap = new Map<string, number>();
    for (const item of txData) {
      if (
        item.categoryId != null &&
        item.expenseGroup === 'variable' &&
        (item as { isExpense?: number }).isExpense === 1
      ) {
        const current = variableMap.get(item.categoryId) ?? 0;
        variableMap.set(item.categoryId, current + (item.total ?? 0));
      }
    }

    // Merge weekly paid variable data
    for (const item of weeklyData) {
      if (item.categoryId != null && item.expenseGroup === 'variable') {
        const current = variableMap.get(item.categoryId) ?? 0;
        variableMap.set(item.categoryId, current + (item.total ?? 0));
      }
    }

    // Inject categories that have goals but zero spending this month
    for (const [catId] of categoryGoals) {
      if (!variableMap.has(catId)) {
        variableMap.set(catId, 0);
      }
    }

    return Array.from(variableMap.entries()).map(([categoryId, actualSpending]) => ({
      categoryId,
      actualSpending,
    }));
  }, [categoryBreakdownData, weeklyBreakdownData, categoryGoals]);

  // ─── Goals (expectedFutureSpending from per-category goals) ──────────────────
  const { expectedFutureSpending } = useGoals(variableCategorySpending);

  // ─── All-time Allocations Per Fund (for balance calculation) ─────────────────
  const [allTimeAllocations, setAllTimeAllocations] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    async function loadAllAllocations() {
      const map = new Map<string, number>();
      for (const fund of funds) {
        const allocs = await fundAllocationRepository.getAllForFund(fund.id);
        const total = allocs.reduce((sum, a) => sum + a.amount, 0);
        map.set(fund.id, total);
      }
      setAllTimeAllocations(map);
    }
    loadAllAllocations();
  }, [funds, allocations]);

  // ─── Computed Values ─────────────────────────────────────────────────────────

  const transactionTotals = useMemo(() => {
    if (!totalsData || totalsData.length === 0) {
      return {
        fixedPaidExpenses: 0,
        fixedPendingExpenses: 0,
        variablePaidExpenses: 0,
        totalPaidExpenses: 0,
      };
    }
    const data = totalsData[0]!;
    return {
      fixedPaidExpenses: data.fixedPaidExpenses ?? 0,
      fixedPendingExpenses: data.fixedPendingExpenses ?? 0,
      variablePaidExpenses: data.variablePaidExpenses ?? 0,
      totalPaidExpenses: data.totalPaidExpenses ?? 0,
    };
  }, [totalsData]);

  const weeklyTotals = useMemo(() => {
    if (!weeklyTotalsData || weeklyTotalsData.length === 0) {
      return { weeklyPaidTotal: 0, weeklyPendingTotal: 0 };
    }
    const data = weeklyTotalsData[0]!;
    return {
      weeklyPaidTotal: data.weeklyPaidTotal ?? 0,
      weeklyPendingTotal: data.weeklyPendingTotal ?? 0,
    };
  }, [weeklyTotalsData]);

  // Total variable spending (only from transactions, weekly is fixed)
  const totalVariableSpent = transactionTotals.variablePaidExpenses;

  // General variable goal from store
  const generalVariableGoal = useGoalStore((state) => state.generalGoal);

  // The variable deduction for Meta: max(goal, actual variable spent)
  // If no goal configured, just use actual variable spent
  const variableSpendingOrGoal = generalVariableGoal
    ? Math.max(generalVariableGoal, totalVariableSpent)
    : totalVariableSpent;

  // Fixed totals: fixedPaidExpenses from transactions already includes weekly paid
  // (weekly occurrences are categorized as fixed via their category)
  // Only add weekly PENDING since pending weekly isn't in the transactions table
  const fixedPaid = transactionTotals.fixedPaidExpenses + weeklyTotals.weeklyPaidTotal;
  const fixedPending = transactionTotals.fixedPendingExpenses + weeklyTotals.weeklyPendingTotal;

  // Combined total paid (for Guardando): all paid expenses + weekly paid
  const combinedTotalPaid = transactionTotals.totalPaidExpenses + weeklyTotals.weeklyPaidTotal;

  // Savings Goal calculation: Renda - FixoPago - FixoPendente - max(metaVariavel, gastoVariavel)
  const savingsGoal = useMemo(() => {
    if (monthlyIncome === null) return 0;
    return calculateSavingsGoal({
      monthlyIncome,
      fixedPaidExpenses: fixedPaid,
      fixedPendingExpenses: fixedPending,
      variableSpendingOrGoal,
    });
  }, [monthlyIncome, fixedPaid, fixedPending, variableSpendingOrGoal]);

  // Actual Savings calculation: Renda - TotalPago (all expenses including variable + weekly)
  const actualSavings = useMemo(() => {
    if (monthlyIncome === null) return 0;
    return calculateActualSavings({
      monthlyIncome,
      totalPaidExpenses: combinedTotalPaid,
    });
  }, [monthlyIncome, combinedTotalPaid]);

  // Total allocations for the selected month
  const totalAllocations = useMemo(() => {
    let sum = 0;
    for (const allocation of allocations.values()) {
      sum += allocation.amount;
    }
    return sum;
  }, [allocations]);

  // Remaining distributable
  const remainingDistributable = useMemo(() => {
    return calculateRemainingDistributable(savingsGoal, totalAllocations);
  }, [savingsGoal, totalAllocations]);

  // Funds with computed balances
  const currentMonth = getCurrentMonth();
  const fundsWithBalances = useMemo<FundWithBalance[]>(() => {
    return funds.map((fund) => {
      const baseBalance = balances.get(fund.id);
      const baseAmount = baseBalance?.baseAmount ?? 0;
      const totalFundAllocations = allTimeAllocations.get(fund.id) ?? 0;

      // Get fund transactions and filter by reference month constraint
      const fundTxs = fundTransactions.get(fund.id) ?? [];
      const eligibleDeductions = filterDeductionsByMonth(
        fundTxs.map((t) => ({ amount: t.amount, referenceMonth: t.referenceMonth })),
        currentMonth
      );
      const totalDeductions = eligibleDeductions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const totalBalance = calculateFundBalance({
        baseAmount,
        totalAllocations: totalFundAllocations,
        totalDeductions,
      });

      const monthlyAllocation = allocations.get(fund.id)?.amount ?? 0;

      return {
        ...fund,
        totalBalance,
        monthlyAllocation,
      };
    });
  }, [funds, balances, allTimeAllocations, fundTransactions, allocations, currentMonth]);

  // ─── Navigation ──────────────────────────────────────────────────────────────

  const setSelectedMonth = useCallback(
    (month: string) => {
      loadMonthData(month);
    },
    [loadMonthData]
  );

  const previousMonth = useCallback(() => {
    const prev = getPreviousMonth(selectedMonth);
    loadMonthData(prev);
  }, [selectedMonth, loadMonthData]);

  const nextMonth = useCallback(() => {
    const next = getNextMonth(selectedMonth);
    loadMonthData(next);
  }, [selectedMonth, loadMonthData]);

  return {
    savingsGoal,
    actualSavings,
    fundsWithBalances,
    remainingDistributable,
    totalAllocations,
    monthlyIncome,
    selectedMonth,
    expectedFutureSpending,
    isLoading,
    setSelectedMonth,
    previousMonth,
    nextMonth,
  };
}

export default useFuturePlansData;
