/**
 * usePaginatedTransactions Hook
 *
 * Custom hook for paginated transaction loading.
 * Optimized for large lists (100+ items) with infinite scroll support.
 *
 * **Validates: Requirements 19, 36**
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { eq, and, desc, sql, lt } from 'drizzle-orm';
import { useLiveQuery, getDb } from '../db/client';
import { transactions, categories } from '../db/schema';
import type { Transaction, Category } from '../types';

/**
 * Transaction with category details
 */
export interface PaginatedTransactionWithCategory extends Transaction {
  category: Category | null;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  /** Number of items per page (default 50) */
  pageSize?: number;
  /** Reference month filter (YYYY-MM format) */
  referenceMonth?: string;
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
  /** Total count of transactions */
  totalCount: number;
  /** Load more transactions */
  loadMore: () => void;
  /** Refresh the data */
  refresh: () => void;
}

/**
 * Default page size
 */
const DEFAULT_PAGE_SIZE = 50;

/**
 * Convert database record to Transaction
 */
function toTransaction(record: typeof transactions.$inferSelect): Transaction {
  return {
    id: record.id,
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
    fitid: record.fitid,
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
    createdAt: new Date(record.createdAt),
  };
}

/**
 * Hook for paginated transaction loading
 *
 * @param options - Pagination options
 * @returns Paginated transactions interface
 *
 * @example
 * ```tsx
 * const {
 *   transactions,
 *   isLoading,
 *   hasMore,
 *   loadMore,
 * } = usePaginatedTransactions({ referenceMonth: '2024-06', pageSize: 50 });
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
  options: PaginationOptions = {}
): UsePaginatedTransactionsReturn {
  const db = getDb();
  const { pageSize = DEFAULT_PAGE_SIZE, referenceMonth } = options;

  const [loadedTransactions, setLoadedTransactions] = useState<PaginatedTransactionWithCategory[]>(
    []
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  // Build where conditions
  const whereConditions = useMemo(() => {
    const conditions = [];

    if (referenceMonth) {
      conditions.push(eq(transactions.referenceMonth, referenceMonth));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }, [referenceMonth]);

  // Live query for total count
  const { data: countData } = useLiveQuery(
    whereConditions
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(transactions)
          .where(whereConditions)
      : db.select({ count: sql<number>`count(*)` }).from(transactions),
    [whereConditions]
  );

  const totalCount = countData?.[0]?.count ?? 0;

  // Initial data load
  const { data: initialData, error: queryError } = useLiveQuery(
    whereConditions
      ? db
          .select({
            transaction: transactions,
            category: categories,
          })
          .from(transactions)
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .where(whereConditions)
          .orderBy(desc(transactions.date), desc(transactions.id))
          .limit(pageSize)
      : db
          .select({
            transaction: transactions,
            category: categories,
          })
          .from(transactions)
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .orderBy(desc(transactions.date), desc(transactions.id))
          .limit(pageSize),
    [whereConditions, pageSize]
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
        setLastDate(lastItem.date.toISOString());
        setLastId(lastItem.id);
      } else {
        setLastDate(null);
        setLastId(null);
      }
    }
  }, [initialData, pageSize]);

  // Load more function
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !lastDate || !lastId) {
      return;
    }

    setIsLoadingMore(true);

    try {
      // Build cursor-based pagination query
      const cursorConditions = and(
        whereConditions,
        sql`(${transactions.date} < ${lastDate} OR (${transactions.date} = ${lastDate} AND ${transactions.id} < ${lastId}))`
      );

      const moreData = await db
        .select({
          transaction: transactions,
          category: categories,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(cursorConditions)
        .orderBy(desc(transactions.date), desc(transactions.id))
        .limit(pageSize);

      const transformed = moreData.map(({ transaction, category }) => ({
        ...toTransaction(transaction),
        category: toCategory(category),
      }));

      if (transformed.length > 0) {
        setLoadedTransactions((prev) => [...prev, ...transformed]);
        const lastItem = transformed[transformed.length - 1];
        setLastDate(lastItem.date.toISOString());
        setLastId(lastItem.id);
      }

      setHasMore(transformed.length >= pageSize);
    } catch (error) {
      console.error('[usePaginatedTransactions] Error loading more:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [db, whereConditions, pageSize, isLoadingMore, hasMore, lastDate, lastId]);

  // Refresh function
  const refresh = useCallback(() => {
    setLoadedTransactions([]);
    setLastDate(null);
    setLastId(null);
    setHasMore(true);
  }, []);

  // Reset when filters change
  useEffect(() => {
    refresh();
  }, [referenceMonth, refresh]);

  return {
    transactions: loadedTransactions,
    isLoading: !initialData,
    isLoadingMore,
    error: queryError ? String(queryError) : null,
    hasMore,
    totalCount,
    loadMore,
    refresh,
  };
}

export default usePaginatedTransactions;
