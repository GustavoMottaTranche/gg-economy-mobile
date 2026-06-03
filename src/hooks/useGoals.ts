/**
 * useGoals Hook
 *
 * Custom hook exposing goal data from goalStore for Dashboard components.
 * Computes expectedFutureSpending using the calculation service based on
 * variable category spending and configured goals.
 *
 * **Validates: Requirements 3.1, 4.1, 10.1**
 */
import { useMemo } from 'react';
import { useGoalStore } from '../stores/goalStore';
import {
  calculateExpectedFutureSpending,
  type CategorySpendingWithGoal,
} from '../services/goals/ExpectedFutureSpending';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Category spending input for computing expected future spending
 */
export interface CategorySpendingInput {
  /** Category ID */
  categoryId: string;
  /** Actual spending in cents */
  actualSpending: number;
}

/**
 * Return type for useGoals hook
 */
export interface UseGoalsReturn {
  /** General variable expense goal in cents, null if not configured */
  generalGoal: number | null;
  /** Per-category goals: categoryId → amount in cents */
  categoryGoals: Map<string, number>;
  /** Expected future spending in cents (always >= 0) */
  expectedFutureSpending: number;
  /** Whether goals are loading from persistence */
  isLoading: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook for accessing goal data and computing expected future spending.
 *
 * @param variableCategorySpending - Array of variable categories with their actual spending.
 *   Used to compute expectedFutureSpending by comparing actual vs goal for each category.
 * @returns Goal data including generalGoal, categoryGoals, expectedFutureSpending, and isLoading
 *
 * @example
 * ```tsx
 * const spending = variableBreakdown.map(item => ({
 *   categoryId: item.categoryId!,
 *   actualSpending: item.total,
 * }));
 * const { generalGoal, categoryGoals, expectedFutureSpending, isLoading } = useGoals(spending);
 * ```
 */
export function useGoals(variableCategorySpending: CategorySpendingInput[] = []): UseGoalsReturn {
  const generalGoal = useGoalStore((state) => state.generalGoal);
  const categoryGoals = useGoalStore((state) => state.categoryGoals);
  const isLoading = useGoalStore((state) => state.isLoading);

  const expectedFutureSpending = useMemo(() => {
    const categoriesWithGoals: CategorySpendingWithGoal[] = variableCategorySpending.map(
      (item) => ({
        categoryId: item.categoryId,
        actualSpending: item.actualSpending,
        goal: categoryGoals.get(item.categoryId) ?? null,
      })
    );

    return calculateExpectedFutureSpending(categoriesWithGoals);
  }, [variableCategorySpending, categoryGoals]);

  return {
    generalGoal,
    categoryGoals,
    expectedFutureSpending,
    isLoading,
  };
}
