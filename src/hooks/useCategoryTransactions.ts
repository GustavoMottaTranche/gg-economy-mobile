/**
 * useCategoryTransactions Hook
 *
 * Lazy-loading hook for fetching transactions belonging to a specific category
 * in a given month. Only executes the database query when `enabled` is true
 * (i.e., when the category row is expanded). Clears data from memory when
 * `enabled` becomes false.
 *
 * **Validates: Requirements 2.1, 2.3, 2.4, 2.6**
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getCategoryTransactionsQuery } from '../db/queries/dashboard';

/**
 * Individual transaction item returned by the hook
 */
export interface TransactionItem {
  /** Transaction ID */
  id: string;
  /** Transaction description */
  description: string;
  /** Transaction amount */
  amount: number;
  /** Transaction date (YYYY-MM-DD) */
  date: string;
}

/**
 * Return type for useCategoryTransactions hook
 */
export interface UseCategoryTransactionsReturn {
  /** List of transactions for the category */
  transactions: TransactionItem[];
  /** Whether the query is currently loading */
  isLoading: boolean;
  /** Error message if the query failed */
  error: string | null;
  /** Re-execute the query */
  retry: () => void;
}

/**
 * Hook for lazy-loading transactions by category.
 *
 * Only fetches data when `enabled` is true and `categoryId` is not null.
 * Clears transactions from memory when `enabled` becomes false.
 *
 * @param categoryId - The category ID to fetch transactions for (null if none selected)
 * @param month - The reference month in YYYY-MM format
 * @param enabled - Whether the query should execute (true when category row is expanded)
 * @returns Object with transactions, loading state, error, and retry function
 *
 * @example
 * ```tsx
 * const { transactions, isLoading, error, retry } = useCategoryTransactions(
 *   expandedCategoryId,
 *   selectedMonth,
 *   isExpanded
 * );
 * ```
 */
export function useCategoryTransactions(
  categoryId: string | null,
  month: string,
  enabled: boolean
): UseCategoryTransactionsReturn {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Track if the component is still mounted to avoid state updates after unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch transactions when enabled and categoryId is available
  useEffect(() => {
    if (!enabled || !categoryId) {
      // Clear data from memory when disabled (Requirement 2.4)
      setTransactions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchTransactions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getCategoryTransactionsQuery(categoryId, month);

        if (!cancelled && mountedRef.current) {
          setTransactions(
            result.map((item) => ({
              id: item.id,
              description: item.description ?? '',
              amount: item.amount,
              date: item.date,
            }))
          );
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled && mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar lançamentos');
          setIsLoading(false);
        }
      }
    };

    fetchTransactions();

    return () => {
      cancelled = true;
    };
  }, [categoryId, month, enabled, retryCount]);

  // Retry function re-executes the query by incrementing retryCount
  const retry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
  }, []);

  return {
    transactions,
    isLoading,
    error,
    retry,
  };
}

export default useCategoryTransactions;
