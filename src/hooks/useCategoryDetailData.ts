/**
 * useCategoryDetailData Hook
 *
 * Fetches and merges transactions and weekly occurrences for a specific
 * category and reference month. Provides category metadata, sorted items,
 * total computation, payment summary, installment info, and refresh-on-focus behavior.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.7, 3.1, 3.2, 3.3, 3.4, 4.3, 5.4, 7.1, 7.2, 8.1, 8.3, 8.4**
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { categories } from '../db/schema';
import {
  getCategoryDetailTransactionsQuery,
  getCategoryDetailWeeklyQuery,
  getInstallmentGroupInfoBatch,
} from '../db/queries/categoryDetail';
import {
  computePaymentSummary,
  sortByPaymentStatusAndDate,
} from '../utils/categoryDetailComputations';
import type { PaymentSummary } from '../utils/categoryDetailComputations';
import type { CategoryType } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Individual item in the category detail list (transaction or weekly occurrence).
 */
export interface CategoryDetailItem {
  /** Transaction ID or weekly occurrence ID */
  id: string;
  /** Transaction title or occurrence description */
  title: string;
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Amount in cents (raw DB value, negative for expenses) */
  amount: number;
  /** Distinguishes item source */
  type: 'transaction' | 'weekly';
  /** Group ID for weekly items (for navigation) */
  weeklyGroupId?: string;
  /** Whether this item has been paid */
  isPaid: boolean;
  /** Installment group ID (non-null for installment parcels) */
  installmentGroupId?: string | null;
  /** Recurring transaction ID (non-null for recurring charges) */
  recurringId?: string | null;
}

/**
 * Map from item ID to installment/recurring label info.
 * Labels are either "X/Y" (e.g., "3/12") for installments or "∞" for recurring.
 */
export type InstallmentInfoMap = Map<string, { label: string }>;

/**
 * Category metadata displayed in the header.
 */
export interface CategoryInfo {
  /** Category UUID */
  id: string;
  /** Display name */
  name: string;
  /** Icon identifier */
  icon: string;
  /** Hex color code */
  color: string;
  /** Category type - income or expense */
  type: CategoryType;
  /** Expense group classification */
  expenseGroup: string | null;
}

/**
 * Return type for useCategoryDetailData hook.
 */
export interface UseCategoryDetailDataReturn {
  /** Category metadata (null while loading or if not found) */
  category: CategoryInfo | null;
  /** Merged and sorted list of transactions and weekly occurrences */
  items: CategoryDetailItem[];
  /** Sum of abs(amount) across all displayed items (in cents) */
  total: number;
  /** Number of items (items.length) */
  count: number;
  /** Payment summary with paid/pending/grand totals */
  paymentSummary: PaymentSummary;
  /** Map of item ID to installment/recurring label */
  installmentInfo: InstallmentInfoMap;
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Error message if query failed */
  error: string | null;
  /** Re-fetch all data */
  refresh: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for fetching category detail data (metadata + items).
 *
 * Fetches category metadata, transactions, and weekly occurrences for the given
 * category and month. Merges both lists sorted by date descending. Computes
 * total as sum of abs(amount). Re-fetches on screen focus.
 *
 * @param categoryId - The category ID to fetch details for
 * @param month - The reference month in YYYY-MM format
 * @returns Object with category info, items, total, count, loading/error states, and refresh
 *
 * @example
 * ```tsx
 * const { category, items, total, count, isLoading, error, refresh } =
 *   useCategoryDetailData(id, month);
 * ```
 */
export function useCategoryDetailData(
  categoryId: string,
  month: string
): UseCategoryDetailDataReturn {
  const [category, setCategory] = useState<CategoryInfo | null>(null);
  const [items, setItems] = useState<CategoryDetailItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({
    paidTotal: 0,
    pendingTotal: 0,
    grandTotal: 0,
  });
  const [installmentInfo, setInstallmentInfo] = useState<InstallmentInfoMap>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!categoryId || !month) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const db = getDb();

      // Fetch category metadata
      const categoryResult = await db
        .select({
          id: categories.id,
          name: categories.name,
          icon: categories.icon,
          color: categories.color,
          type: categories.type,
          expenseGroup: categories.expenseGroup,
        })
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);

      if (!mountedRef.current) return;

      const categoryData = categoryResult[0] ?? null;
      if (categoryData) {
        setCategory({
          id: categoryData.id,
          name: categoryData.name,
          icon: categoryData.icon,
          color: categoryData.color,
          type: categoryData.type as CategoryType,
          expenseGroup: categoryData.expenseGroup,
        });
      } else {
        setCategory(null);
      }

      // Fetch transactions and weekly occurrences in parallel
      const [transactionsResult, weeklyResult] = await Promise.all([
        getCategoryDetailTransactionsQuery(categoryId, month),
        getCategoryDetailWeeklyQuery(categoryId, month),
      ]);

      if (!mountedRef.current) return;

      // Map transactions to CategoryDetailItem (including isPaid, installmentGroupId, recurringId)
      const transactionItems: CategoryDetailItem[] = transactionsResult.map((t) => ({
        id: t.id,
        title: t.title,
        date: t.date,
        amount: t.amount,
        type: 'transaction' as const,
        isPaid: t.isPaid,
        installmentGroupId: t.installmentGroupId,
        recurringId: t.recurringId,
      }));

      // Map weekly occurrences to CategoryDetailItem (including isPaid)
      const weeklyItems: CategoryDetailItem[] = weeklyResult.map((w) => ({
        id: w.id,
        title: w.description,
        date: w.date,
        amount: w.amount,
        type: 'weekly' as const,
        weeklyGroupId: w.weeklyGroupId,
        isPaid: w.isPaid,
      }));

      // Merge all items
      const mergedItems = [...transactionItems, ...weeklyItems];

      // Collect unique installmentGroupIds for batch query
      const groupIds = [
        ...new Set(
          transactionsResult
            .map((t) => t.installmentGroupId)
            .filter((id): id is string => id != null)
        ),
      ];

      // Build InstallmentInfoMap
      let infoMap: InstallmentInfoMap = new Map();

      if (groupIds.length > 0) {
        try {
          const batchResult = await getInstallmentGroupInfoBatch(groupIds, month);

          if (!mountedRef.current) return;

          // For transactions with installmentGroupId that have batch results: label = "X/Y"
          for (const item of transactionItems) {
            if (item.installmentGroupId) {
              const info = batchResult.get(item.installmentGroupId);
              if (info) {
                infoMap.set(item.id, {
                  label: `${info.currentIndex}/${info.totalParcels}`,
                });
              }
            }
          }
        } catch (batchErr) {
          // Log error but don't break the screen (Requirement 7.1 error handling)
          console.error(
            '[useCategoryDetailData] Failed to fetch installment group info:',
            batchErr
          );
          infoMap = new Map();
        }
      }

      if (!mountedRef.current) return;

      // For transactions with recurringId (and no installmentGroupId): label = "∞"
      for (const item of transactionItems) {
        if (item.recurringId && !item.installmentGroupId) {
          infoMap.set(item.id, { label: '∞' });
        }
      }

      // Compute PaymentSummary
      const summary = computePaymentSummary(mergedItems);

      // Sort items: paid first, then pending, date descending within each group
      const sortedItems = sortByPaymentStatusAndDate(mergedItems);

      // Compute total as sum of abs(amount)
      const computedTotal = sortedItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);

      setItems(sortedItems);
      setTotal(computedTotal);
      setPaymentSummary(summary);
      setInstallmentInfo(infoMap);
      setIsLoading(false);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados da categoria');
      setIsLoading(false);
    }
  }, [categoryId, month]);

  // Re-fetch on screen focus (Requirement 4.3)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    category,
    items,
    total,
    count: items.length,
    paymentSummary,
    installmentInfo,
    isLoading,
    error,
    refresh,
  };
}

export default useCategoryDetailData;
