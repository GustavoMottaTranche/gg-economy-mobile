/**
 * Zustand store for Future Plans / Funds feature
 *
 * Manages state for funds, monthly allocations, balances, fund-linked transactions,
 * and monthly income configuration. Uses repositories for data access and
 * calculation services for reactive balance computation.
 *
 * **Validates: Requirements 2.2, 2.4, 5.1, 5.3, 5.4, 5.5, 6.2, 6.6, 6.7, 7.5, 8.2, 8.3, 8.6**
 */
import { create } from 'zustand';
import { logger } from '../services/logging';
import { fundRepository } from '../repositories/FundRepository';
import { fundAllocationRepository } from '../repositories/FundAllocationRepository';
import { fundBalanceRepository } from '../repositories/FundBalanceRepository';
import { fundTransactionRepository } from '../repositories/FundTransactionRepository';
import type { FundTransactionWithDetails } from '../repositories/FundTransactionRepository';
import { getPreference, setPreference, deletePreference } from '../db/queries/preferences';
import {
  calculateFundBalance,
  filterDeductionsByMonth,
} from '../services/funds/FundBalanceCalculationService';
import { getReferenceMonth } from '../utils/formatDate';
import type { Fund, FundAllocation, FundBalance } from '../types/fund';

// ─── State Interface ─────────────────────────────────────────────────────────

interface FundState {
  /** All active funds */
  funds: Fund[];
  /** Fund allocations for the selected month: fundId → allocation */
  allocations: Map<string, FundAllocation>;
  /** Fund base balances: fundId → balance record */
  balances: Map<string, FundBalance>;
  /** Fund-linked transactions with details: fundId → transactions */
  fundTransactions: Map<string, FundTransactionWithDetails[]>;
  /** Monthly income in cents, null = not configured */
  monthlyIncome: number | null;
  /** Currently selected month in YYYY-MM format */
  selectedMonth: string;
  /** Whether an async operation is in progress */
  isLoading: boolean;
}

// ─── Actions Interface ───────────────────────────────────────────────────────

interface FundActions {
  /** Load all active funds from the database */
  loadFunds(): Promise<void>;
  /** Load data for a specific month (allocations, transactions) */
  loadMonthData(month: string): Promise<void>;
  /** Create a new fund */
  createFund(name: string, icon?: string, color?: string): Promise<Fund>;
  /** Update an existing fund's properties */
  updateFund(id: string, updates: Partial<Pick<Fund, 'name' | 'icon' | 'color'>>): Promise<void>;
  /** Deactivate (soft-delete) a fund */
  deactivateFund(id: string): Promise<void>;
  /** Set the monthly income value (stored in user_preferences) */
  setMonthlyIncome(amountInCents: number): Promise<void>;
  /** Remove the monthly income value */
  removeMonthlyIncome(): Promise<void>;
  /** Get monthly income for a specific month (per-month override or global fallback) */
  getMonthlyIncomeForMonth(month: string): Promise<number | null>;
  /** Set a per-month monthly income override */
  setMonthlyIncomeForMonth(month: string, amountInCents: number): Promise<void>;
  /** Set or update a fund allocation for a given month */
  setAllocation(fundId: string, month: string, amountInCents: number): Promise<void>;
  /** Remove a fund allocation for a given month */
  removeAllocation(fundId: string, month: string): Promise<void>;
  /** Link a transaction to a fund */
  linkTransaction(fundId: string, transactionId: string): Promise<void>;
  /** Unlink a transaction from its fund */
  unlinkTransaction(transactionId: string): Promise<void>;
  /** Set the base balance for a fund */
  setBaseBalance(fundId: string, amountInCents: number): Promise<void>;
  /** Get total fund-linked expenses for a given month */
  getFundExpensesForMonth(month: string): Promise<number>;
}

type FundStore = FundState & FundActions;

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTHLY_INCOME_KEY = 'monthly_income' as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCurrentMonth(): string {
  return getReferenceMonth(new Date());
}

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: FundState = {
  funds: [],
  allocations: new Map<string, FundAllocation>(),
  balances: new Map<string, FundBalance>(),
  fundTransactions: new Map<string, FundTransactionWithDetails[]>(),
  monthlyIncome: null,
  selectedMonth: getCurrentMonth(),
  isLoading: false,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useFundStore = create<FundStore>()((set, get) => ({
  ...initialState,

  loadFunds: async () => {
    set({ isLoading: true });
    try {
      // Load active funds
      const activeFunds = await fundRepository.getActive();

      // Load monthly income from user_preferences
      const incomeValue = await getPreference(MONTHLY_INCOME_KEY);
      const monthlyIncome = incomeValue ? parseInt(incomeValue, 10) : null;

      // Load all base balances
      const allBalances = await fundBalanceRepository.getAll();
      const balancesMap = new Map<string, FundBalance>();
      for (const balance of allBalances) {
        balancesMap.set(balance.fundId, balance);
      }

      set({
        funds: activeFunds,
        monthlyIncome,
        balances: balancesMap,
        isLoading: false,
      });

      // Load month data for selected month
      const { selectedMonth } = get();
      await get().loadMonthData(selectedMonth);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load funds';
      logger.error('Failed to load funds', { error: message });
      set({ isLoading: false });
    }
  },

  loadMonthData: async (month: string) => {
    try {
      set({ selectedMonth: month });

      // Load per-month income override or fall back to global
      const monthKey = `monthly_income_${month}` as const;
      const monthOverride = await getPreference(monthKey);
      if (monthOverride) {
        set({ monthlyIncome: parseInt(monthOverride, 10) });
      } else {
        const globalIncome = await getPreference(MONTHLY_INCOME_KEY);
        set({ monthlyIncome: globalIncome ? parseInt(globalIncome, 10) : null });
      }

      // Load allocations for the month
      const monthAllocations = await fundAllocationRepository.getAllForMonth(month);
      const allocationsMap = new Map<string, FundAllocation>();
      for (const allocation of monthAllocations) {
        allocationsMap.set(allocation.fundId, allocation);
      }

      // Load fund transactions with details for all active funds
      const { funds } = get();
      const fundTransactionsMap = new Map<string, FundTransactionWithDetails[]>();
      for (const fund of funds) {
        const transactions = await fundTransactionRepository.getByFundIdWithDetails(fund.id);
        fundTransactionsMap.set(fund.id, transactions);
      }

      set({
        allocations: allocationsMap,
        fundTransactions: fundTransactionsMap,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load month data';
      logger.error('Failed to load month data', { month, error: message });
    }
  },

  createFund: async (name: string, icon?: string, color?: string) => {
    try {
      const fund = await fundRepository.create({ name, icon, color });
      set((state) => ({
        funds: [...state.funds, fund],
      }));
      return fund;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create fund';
      logger.error('Failed to create fund', { name, error: message });
      throw error;
    }
  },

  updateFund: async (id: string, updates: Partial<Pick<Fund, 'name' | 'icon' | 'color'>>) => {
    try {
      const updated = await fundRepository.update(id, updates);
      if (updated) {
        set((state) => ({
          funds: state.funds.map((f) => (f.id === id ? updated : f)),
        }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update fund';
      logger.error('Failed to update fund', { id, error: message });
      throw error;
    }
  },

  deactivateFund: async (id: string) => {
    try {
      await fundRepository.deactivate(id);
      set((state) => ({
        funds: state.funds.filter((f) => f.id !== id),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to deactivate fund';
      logger.error('Failed to deactivate fund', { id, error: message });
      throw error;
    }
  },

  setMonthlyIncome: async (amountInCents: number) => {
    try {
      await setPreference(MONTHLY_INCOME_KEY, amountInCents.toString());
      set({ monthlyIncome: amountInCents });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set monthly income';
      logger.error('Failed to set monthly income', { error: message });
      throw error;
    }
  },

  removeMonthlyIncome: async () => {
    try {
      await deletePreference(MONTHLY_INCOME_KEY);
      set({ monthlyIncome: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove monthly income';
      logger.error('Failed to remove monthly income', { error: message });
      throw error;
    }
  },

  getMonthlyIncomeForMonth: async (month: string) => {
    try {
      const monthKey = `monthly_income_${month}` as const;
      const monthOverride = await getPreference(monthKey);
      if (monthOverride) {
        return parseInt(monthOverride, 10);
      }
      const globalIncome = await getPreference(MONTHLY_INCOME_KEY);
      return globalIncome ? parseInt(globalIncome, 10) : null;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get monthly income for month';
      logger.error('Failed to get monthly income for month', { month, error: message });
      return null;
    }
  },

  setMonthlyIncomeForMonth: async (month: string, amountInCents: number) => {
    try {
      const monthKey = `monthly_income_${month}` as const;
      await setPreference(monthKey, amountInCents.toString());
      // Update local state if we're looking at the same month
      const { selectedMonth } = get();
      if (month === selectedMonth) {
        set({ monthlyIncome: amountInCents });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to set monthly income for month';
      logger.error('Failed to set monthly income for month', { month, error: message });
      throw error;
    }
  },

  setAllocation: async (fundId: string, month: string, amountInCents: number) => {
    try {
      const allocation = await fundAllocationRepository.upsert(fundId, month, amountInCents);
      const { selectedMonth } = get();

      // Only update local state if we're looking at the same month
      if (month === selectedMonth) {
        set((state) => {
          const next = new Map(state.allocations);
          next.set(fundId, allocation);
          return { allocations: next };
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set allocation';
      logger.error('Failed to set allocation', { fundId, month, error: message });
      throw error;
    }
  },

  removeAllocation: async (fundId: string, month: string) => {
    try {
      await fundAllocationRepository.delete(fundId, month);
      const { selectedMonth } = get();

      // Only update local state if we're looking at the same month
      if (month === selectedMonth) {
        set((state) => {
          const next = new Map(state.allocations);
          next.delete(fundId);
          return { allocations: next };
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove allocation';
      logger.error('Failed to remove allocation', { fundId, month, error: message });
      throw error;
    }
  },

  linkTransaction: async (fundId: string, transactionId: string) => {
    try {
      await fundTransactionRepository.link(fundId, transactionId);

      // Reload fund transactions for the affected fund
      const transactions = await fundTransactionRepository.getByFundIdWithDetails(fundId);
      set((state) => {
        const next = new Map(state.fundTransactions);
        next.set(fundId, transactions);
        return { fundTransactions: next };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to link transaction';
      logger.error('Failed to link transaction', { fundId, transactionId, error: message });
      throw error;
    }
  },

  unlinkTransaction: async (transactionId: string) => {
    try {
      // Find which fund this transaction belongs to
      const fundTx = await fundTransactionRepository.getByTransactionId(transactionId);
      if (!fundTx) return;

      const fundId = fundTx.fundId;
      await fundTransactionRepository.unlink(transactionId);

      // Reload fund transactions for the affected fund
      const transactions = await fundTransactionRepository.getByFundIdWithDetails(fundId);
      set((state) => {
        const next = new Map(state.fundTransactions);
        next.set(fundId, transactions);
        return { fundTransactions: next };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unlink transaction';
      logger.error('Failed to unlink transaction', { transactionId, error: message });
      throw error;
    }
  },

  setBaseBalance: async (fundId: string, amountInCents: number) => {
    try {
      const balance = await fundBalanceRepository.upsert(fundId, amountInCents);
      set((state) => {
        const next = new Map(state.balances);
        next.set(fundId, balance);
        return { balances: next };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set base balance';
      logger.error('Failed to set base balance', { fundId, error: message });
      throw error;
    }
  },

  getFundExpensesForMonth: async (month: string) => {
    try {
      const { funds } = get();
      const currentMonth = getCurrentMonth();
      let totalExpenses = 0;

      for (const fund of funds) {
        const transactions = await fundTransactionRepository.getByFundIdWithDetails(fund.id);
        const eligible = filterDeductionsByMonth(
          transactions.map((t) => ({ amount: t.amount, referenceMonth: t.referenceMonth })),
          currentMonth
        );
        // Only count transactions whose referenceMonth matches the requested month
        for (const t of eligible) {
          if (t.referenceMonth === month) {
            totalExpenses += Math.abs(t.amount);
          }
        }
      }

      return totalExpenses;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get fund expenses';
      logger.error('Failed to get fund expenses for month', { month, error: message });
      return 0;
    }
  },
}));

// ─── Selector Hooks ──────────────────────────────────────────────────────────

/**
 * Hook to get all active funds
 */
export function useFunds() {
  return useFundStore((state) => state.funds);
}

/**
 * Hook to get monthly income
 */
export function useMonthlyIncome() {
  return useFundStore((state) => state.monthlyIncome);
}

/**
 * Hook to get the selected month
 */
export function useSelectedMonth() {
  return useFundStore((state) => state.selectedMonth);
}

/**
 * Hook to get fund allocations for the selected month
 */
export function useFundAllocations() {
  return useFundStore((state) => state.allocations);
}

/**
 * Hook to get all fund balances
 */
export function useFundBalances() {
  return useFundStore((state) => state.balances);
}

/**
 * Hook to get fund transactions for a specific fund
 */
export function useFundTransactions(fundId: string) {
  return useFundStore((state) => state.fundTransactions.get(fundId) ?? []);
}

/**
 * Hook to get loading state
 */
export function useFundLoading() {
  return useFundStore((state) => state.isLoading);
}

/**
 * Compute the total balance for a specific fund.
 * Uses the calculation service with current state data.
 */
export function useComputedFundBalance(fundId: string): number {
  return useFundStore((state) => {
    const baseBalance = state.balances.get(fundId);
    const baseAmount = baseBalance?.baseAmount ?? 0;

    // Sum all allocations for this fund (we need all months, so we'd need a separate query)
    // For now, this uses only cached fundTransactions
    const fundTxs = state.fundTransactions.get(fundId) ?? [];
    const currentMonth = getCurrentMonth();
    const deductions = filterDeductionsByMonth(
      fundTxs.map((t) => ({ amount: t.amount, referenceMonth: t.referenceMonth })),
      currentMonth
    );
    const totalDeductions = deductions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Note: totalAllocations across all months would need to be loaded separately.
    // This selector provides a partial computation; the full balance calculation
    // is done in the useFuturePlansData hook which aggregates all allocation data.
    return calculateFundBalance({
      baseAmount,
      totalAllocations: 0, // Will be enriched by the hook
      totalDeductions,
    });
  });
}
