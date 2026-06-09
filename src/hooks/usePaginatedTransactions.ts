/**
 * usePaginatedTransactions Hook
 *
 * Custom hook for paginated transaction loading with filter support.
 * Optimized for large lists (100+ items) with infinite scroll support.
 * Integrates buildFilterConditions for SQL-level filtering.
 *
 * Uses manual fetching for paginated data (not live query) to avoid
 * cursor conflicts with reactive queries. Live queries are only used
 * for count and summary aggregates.
 *
 * **Validates: Requirements 6.1, 6.2, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.3**
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { eq, desc, and, sql, type SQL } from 'drizzle-orm';
import { useLiveQuery, getDb } from '../db/client';
import { transactions, categories } from '../db/schema';
import { buildFilterConditions, type PaginationFilters } from '../db/buildFilterConditions';
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
 * Extract the raw date string from a DB record for use as cursor.
 * The DB stores dates as YYYY-MM-DD strings, so we must use that format
 * in cursor comparisons (not ISO with time component).
 */
function getRawDate(record: typeof transactions.$inferSelect): string {
  return record.date;
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
 */
export function usePaginatedTransactions(
  filters: PaginationFilters
): UsePaginatedTransactionsReturn {
  const db = getDb();
  const pageSize = DEFAULT_PAGE_SIZE;

  const [loadedTransactions, setLoadedTransactions] = useState<PaginatedTransactionWithCategory[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  // Use ref to prevent duplicate batch requests
  const isLoadingMoreRef = useRef(false);
  // Track current fetch generation to ignore stale results
  const fetchGeneration = useRef(0);

  // Build WHERE conditions from all active filters using buildFilterConditions
  // We intentionally list individual filter fields rather than the whole object
  // to avoid unnecessary recalculations when the object reference changes.
  const whereConditions = useMemo(
    () => buildFilterConditions(filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Fetch a page of data (used for both initial load and load more)
  // Returns transformed transactions along with the raw cursor date of the last item
  const fetchPage = useCallback(
    async (
      cursor: { date: string; id: string } | null
    ): Promise<{
      items: PaginatedTransactionWithCategory[];
      cursorDate: string | null;
      cursorId: string | null;
    }> => {
      const conditions: SQL[] = [];

      // Add filter conditions
      if (whereConditions) {
        conditions.push(whereConditions);
      }

      // Add cursor condition for subsequent pages
      if (cursor) {
        conditions.push(
          sql`(${transactions.date} < ${cursor.date} OR (${transactions.date} = ${cursor.date} AND ${transactions.id} < ${cursor.id}))`
        );
      }

      const combinedWhere = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          transaction: transactions,
          category: categories,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(combinedWhere)
        .orderBy(desc(transactions.date), desc(transactions.id))
        .limit(pageSize);

      const items = rows.map(({ transaction, category }) => ({
        ...toTransaction(transaction),
        category: toCategory(category),
      }));

      // Extract raw cursor from the last DB record
      const lastRow = rows[rows.length - 1];
      const cursorDate = lastRow ? getRawDate(lastRow.transaction) : null;
      const cursorId = lastRow ? lastRow.transaction.id : null;

      return { items, cursorDate, cursorId };
    },
    [db, whereConditions, pageSize]
  );

  // Initial load: fetch first page when filters change
  useEffect(() => {
    const generation = ++fetchGeneration.current;

    setIsLoading(true);
    setError(null);
    setLoadedTransactions([]);
    setLastDate(null);
    setLastId(null);
    setHasMore(true);
    isLoadingMoreRef.current = false;

    fetchPage(null)
      .then(({ items, cursorDate, cursorId }) => {
        // Ignore stale results
        if (generation !== fetchGeneration.current) return;

        setLoadedTransactions(items);
        setHasMore(items.length >= pageSize);
        setLastDate(cursorDate);
        setLastId(cursorId);
      })
      .catch((err) => {
        if (generation !== fetchGeneration.current) return;
        setError(String(err));
      })
      .finally(() => {
        if (generation !== fetchGeneration.current) return;
        setIsLoading(false);
      });
  }, [fetchPage, pageSize]);

  // Load more function with duplicate request prevention
  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMore || !lastDate || !lastId) {
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const { items, cursorDate, cursorId } = await fetchPage({ date: lastDate, id: lastId });

      if (items.length > 0) {
        setLoadedTransactions((prev) => [...prev, ...items]);
        setLastDate(cursorDate);
        setLastId(cursorId);
      }

      setHasMore(items.length >= pageSize);
    } catch (err) {
      console.error('[usePaginatedTransactions] Error loading more:', err);
    } finally {
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [fetchPage, pageSize, hasMore, lastDate, lastId]);

  // Refresh function - reloads from scratch
  const refresh = useCallback(() => {
    const generation = ++fetchGeneration.current;

    setIsLoading(true);
    setError(null);
    setLoadedTransactions([]);
    setLastDate(null);
    setLastId(null);
    setHasMore(true);
    isLoadingMoreRef.current = false;

    fetchPage(null)
      .then(({ items, cursorDate, cursorId }) => {
        if (generation !== fetchGeneration.current) return;

        setLoadedTransactions(items);
        setHasMore(items.length >= pageSize);
        setLastDate(cursorDate);
        setLastId(cursorId);
      })
      .catch((err) => {
        if (generation !== fetchGeneration.current) return;
        setError(String(err));
      })
      .finally(() => {
        if (generation !== fetchGeneration.current) return;
        setIsLoading(false);
      });
  }, [fetchPage, pageSize]);

  return {
    transactions: loadedTransactions,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    totalCount,
    summary,
    loadMore,
    refresh,
  };
}

export default usePaginatedTransactions;
