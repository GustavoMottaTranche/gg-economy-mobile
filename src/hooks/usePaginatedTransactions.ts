/**
 * usePaginatedTransactions Hook
 *
 * Custom hook for paginated transaction loading with filter support.
 * Optimized for large lists (100+ items) with infinite scroll support.
 * Integrates buildFilterConditions for SQL-level filtering.
 *
 * **Validates: Requirements 6.1, 6.2, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.3**
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { eq, desc, sql } from 'drizzle-orm';
import { useLiveQuery, getDb } from '../db/client';
import { transactions, categories } from '../db/schema';
import {
  buildFilterConditions,
  type PaginationFilters,
} from '../db/buildFilterConditions';
import type { Transaction, Category } from '../types';

/**
 * Transaction with category details
 */
export interface PaginatedTransactionWithCategory extends Transaction {
  category: Category | null;
}

/**
 * Filtered summary aggregate data
 */
export interface FilteredSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
}

/**
 * Return type for usePaginatedTransactions hook
 */
export interface UsePaginatedTransactionsReturn {
  /** List of transactions */
  transactions: PaginatedTransactionWithCategory[];
  /** Whether initial data is loading */
  isLoading: boolean;
  /** Whether more data is being loaded */
  isLoadingMore: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Total count of transactions matching filters */
  totalCount: number;
  /** Aggregate summary of filtered transactions */
  summary: FilteredSummary;
  /** Load more transactions */
  loadMore: () => void;
  /** Refresh the data */
  refresh: () => void;
}

/**
 * Default page size (reduced from 50 to 20 per design spec)
 */
const DEFAULT_PAGE_SIZE = 20;

/**
 * Default empty summary
 */
const EMPTY_SUMMARY: FilteredSummary = {
  totalIncome: 0,
  totalExpenses: 0,
  balance: 0,
  transactionCount: 0,
};

/**
 * Convert database record to Transaction
 */
function toTransaction(record: typeof transactions.$inferSelect): Transaction {
  return {
    id: record.id,
    title: record.title ?? '',
    date: new Date(record.date),
    amount: record.amount,
    description: record.description,
    categoryId: record.categoryId,
    originId: record.originId,
    batchId: record.batchId,
    referenceMonth: record.referenceMonth,
    needsReview: record.needsReview,
    isExcludedFromTotals: record.isExcludedFromTotals,
    duplicateOf: record.duplicateOf,
    installmentGroupId: record.installmentGroupId ?? null,
    recurringId: record.recurringId ?? null,
    isPaid: record.isPaid ?? false,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}

/**
 * Convert database record to Category
 */
function toCategory(record: typeof categories.$inferSelect | null): Category | null {
  if (!record) return null;
  return {
    id: record.id,
    name: record.name,
    type: record.type as Category['type'],
    icon: record.icon,
    color: record.color,
    isActive: record.isActive,
    expenseGroup: (record.expenseGroup as Category['expenseGroup']) ?? null,
    createdAt: new Date(record.createdAt),
  };
}

/**
 * Hook for paginated transaction loading with filter support
 *
 * @param filters - Pagination filters including referenceMonth, categoryIds, value range, date range
 * @returns Paginated transactions interface with summary
 *
 * @example
 * ```tsx
 * const {
 *   transactions,
 *   isLoading,
 *   isLoadingMore,
 *   hasMore,
 *   totalCount,
 *   summary,
 *   loadMore,
 *   refresh,
 * } = usePaginatedTransactions({
 *   referenceMonth: '2024-06',
 *   categoryIds: ['cat-1', 'cat-2'],
 *   minAmount: 1000,
 *   maxAmount: 50000,
 * });
 *
 * // In FlashList
 * <FlashList
 *   data={transactions}
 *   onEndReached={loadMore}
 *   onEndReachedThreshold={0.5}
 * />
 * ```
 */
export function usePaginatedTransactions(
  filters: PaginationFilters
): UsePaginatedTransactionsReturn {
  const db = getDb();
  const pageSize = DEFAULT_PAGE_SIZE;

  const [loadedTransactions, setLoadedTransactions] = useState<PaginatedTransactionWithCategory[]>(
    []
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  // Use ref to prevent duplicate batch requests
  const isLoadingMoreRef = useRef(false);

  // Build WHERE conditions from all active filters using buildFilterConditions
  const whereConditions = buildFilterConditions(filters);

  // Live query for total count (with same filters, no cursor)
  const { data: countData } = useLiveQuery(
    db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(whereConditions),
    [
      filters.referenceMonth,
      filters.categoryIds,
      filters.minAmount,
      filters.maxAmount,
      filters.startDate,
      filters.endDate,
      filters.pendingOnly,
    ]
  );

  const totalCount = countData?.[0]?.count ?? 0;

  // Live aggregate query for FilteredSummary (same filters, no cursor)
  const { data: summaryData } = useLiveQuery(
    db
      .select({
        totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END), 0)`,
        totalExpenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} < 0 THEN ${transactions.amount} ELSE 0 END), 0)`,
        balance: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        transactionCount: sql<number>`count(*)`,
      })
      .from(transactions)
      .where(whereConditions),
    [
      filters.referenceMonth,
      filters.categoryIds,
      filters.minAmount,
      filters.maxAmount,
      filters.startDate,
      filters.endDate,
      filters.pendingOnly,
    ]
  );

  const summary: FilteredSummary = summaryData?.[0]
    ? {
        totalIncome: summaryData[0].totalIncome,
        totalExpenses: summaryData[0].totalExpenses,
        balance: summaryData[0].balance,
        transactionCount: summaryData[0].transactionCount,
      }
    : EMPTY_SUMMARY;

  // Initial data load (first page with filters, no cursor)
  const { data: initialData, error: queryError } = useLiveQuery(
    db
      .select({
        transaction: transactions,
        category: categories,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(whereConditions)
      .orderBy(desc(transactions.date), desc(transactions.id))
      .limit(pageSize),
    [
      filters.referenceMonth,
      filters.categoryIds,
      filters.minAmount,
      filters.maxAmount,
      filters.startDate,
      filters.endDate,
      filters.pendingOnly,
      pageSize,
    ]
  );

  // Transform initial data
  useEffect(() => {
    if (initialData) {
      const transformed = initialData.map(({ transaction, category }) => ({
        ...toTransaction(transaction),
        category: toCategory(category),
      }));

      setLoadedTransactions(transformed);
      setHasMore(transformed.length >= pageSize);

      if (transformed.length > 0) {
        const lastItem = transformed[transformed.length - 1];
        if (lastItem) {
          setLastDate(lastItem.date.toISOString());
          setLastId(lastItem.id);
        }
      } else {
        setLastDate(null);
        setLastId(null);
      }
    }
  }, [initialData, pageSize]);

  // Load more function with duplicate request prevention
  const loadMore = useCallback(async () => {
    // Prevent duplicate batch requests using both state and ref
    if (isLoadingMoreRef.current || !hasMore || !lastDate || !lastId) {
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      // Build cursor condition combined with filter conditions
      const cursorCondition = sql`(${transactions.date} < ${lastDate} OR (${transactions.date} = ${lastDate} AND ${transactions.id} < ${lastId}))`;

      // Combine filter conditions with cursor
      const combinedConditions = whereConditions
        ? sql`${whereConditions} AND ${cursorCondition}`
        : cursorCondition;

      const moreData = await db
        .select({
          transaction: transactions,
          category: categories,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(combinedConditions)
        .orderBy(desc(transactions.date), desc(transactions.id))
        .limit(pageSize);

      const transformed = moreData.map(({ transaction, category }) => ({
        ...toTransaction(transaction),
        category: toCategory(category),
      }));

      if (transformed.length > 0) {
        setLoadedTransactions((prev) => [...prev, ...transformed]);
        const lastItem = transformed[transformed.length - 1];
        if (lastItem) {
          setLastDate(lastItem.date.toISOString());
          setLastId(lastItem.id);
        }
      }

      setHasMore(transformed.length >= pageSize);
    } catch (error) {
      console.error('[usePaginatedTransactions] Error loading more:', error);
    } finally {
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [db, whereConditions, pageSize, hasMore, lastDate, lastId]);

  // Refresh function - resets cursor state
  const refresh = useCallback(() => {
    setLoadedTransactions([]);
    setLastDate(null);
    setLastId(null);
    setHasMore(true);
    setIsLoadingMore(false);
    isLoadingMoreRef.current = false;
  }, []);

  // Reset cursor when any filter parameter changes
  useEffect(() => {
    refresh();
  }, [
    filters.referenceMonth,
    filters.categoryIds,
    filters.minAmount,
    filters.maxAmount,
    filters.startDate,
    filters.endDate,
    filters.pendingOnly,
    refresh,
  ]);

  return {
    transactions: loadedTransactions,
    isLoading: !initialData,
    isLoadingMore,
    error: queryError ? String(queryError) : null,
    hasMore,
    totalCount,
    summary,
    loadMore,
    refresh,
  };
}

export default usePaginatedTransactions;
