/**
 * useTransactions Hook
 *
 * Custom hook for managing transactions with reactive updates using Drizzle's useLiveQuery.
 * Supports filtering by month/year and pagination.
 *
 * **Validates: Requirements 19, 29**
 */
import { useMemo, useCallback, useState } from 'react';
import { eq, and, desc, sql } from 'drizzle-orm';
import { useLiveQuery, getDb } from '../db/client';
import { transactions, categories } from '../db/schema';
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  markTransactionAsReviewed,
  setTransactionCategory,
} from '../db/queries/transactions';
import type { Transaction, Category, CreateTransactionDTO, UpdateTransactionDTO } from '../types';

/**
 * Transaction with category data
 */
export interface TransactionWithCategory extends Transaction {
  category: Category | null;
}

/**
 * Filter options for transactions
 */
export interface TransactionFilters {
  /** Reference month in YYYY-MM format */
  referenceMonth?: string;
  /** Year for filtering (YYYY) */
  year?: number;
  /** Month for filtering (1-12) */
  month?: number;
  /** Filter by category ID */
  categoryId?: string;
  /** Filter by needs review status */
  needsReview?: boolean;
  /** Filter by excluded from totals status */
  isExcludedFromTotals?: boolean;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  pageSize?: number;
}

/**
 * Monthly summary data
 */
export interface MonthlySummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
}

/**
 * Return type for useTransactions hook
 */
export interface UseTransactionsReturn {
  /** List of transactions with category data */
  transactions: TransactionWithCategory[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Monthly summary for the current filter */
  summary: MonthlySummary;
  /** Total count of transactions matching the filter */
  totalCount: number;
  /** Current page number */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more pages */
  hasNextPage: boolean;
  /** Whether there are previous pages */
  hasPreviousPage: boolean;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  previousPage: () => void;
  /** Go to specific page */
  goToPage: (page: number) => void;
  /** Create a new transaction */
  create: (data: CreateTransactionDTO) => Promise<Transaction>;
  /** Update an existing transaction */
  update: (id: string, data: UpdateTransactionDTO) => Promise<Transaction | null>;
  /** Delete a transaction */
  remove: (id: string) => Promise<void>;
  /** Mark a transaction as reviewed */
  markAsReviewed: (id: string) => Promise<Transaction | null>;
  /** Set transaction category */
  setCategory: (id: string, categoryId: string | null) => Promise<Transaction | null>;
  /** Refresh the data */
  refresh: () => void;
}

/**
 * Default page size for pagination
 */
const DEFAULT_PAGE_SIZE = 50;

/**
 * Convert database record to TransactionWithCategory
 */
function toTransactionWithCategory(
  txRecord: typeof transactions.$inferSelect,
  catRecord: typeof categories.$inferSelect | null
): TransactionWithCategory {
  return {
    id: txRecord.id,
    title: txRecord.title,
    date: new Date(txRecord.date),
    amount: txRecord.amount,
    description: txRecord.description,
    categoryId: txRecord.categoryId,
    originId: txRecord.originId,
    batchId: txRecord.batchId,
    referenceMonth: txRecord.referenceMonth,
    needsReview: txRecord.needsReview,
    isExcludedFromTotals: txRecord.isExcludedFromTotals,
    duplicateOf: txRecord.duplicateOf,
    installmentGroupId: txRecord.installmentGroupId ?? null,
    recurringId: txRecord.recurringId ?? null,
    createdAt: new Date(txRecord.createdAt),
    updatedAt: new Date(txRecord.updatedAt),
    category: catRecord
      ? {
          id: catRecord.id,
          name: catRecord.name,
          type: catRecord.type as 'income' | 'expense',
          icon: catRecord.icon,
          color: catRecord.color,
          isActive: catRecord.isActive,
          expenseGroup: (catRecord.expenseGroup as Category['expenseGroup']) ?? null,
          createdAt: new Date(catRecord.createdAt),
        }
      : null,
  };
}

/**
 * Hook for managing transactions with reactive updates
 *
 * @param filters - Optional filters for transactions
 * @param pagination - Optional pagination options
 * @returns Transaction management interface
 *
 * @example
 * ```tsx
 * const { transactions, summary, isLoading, create, update, remove } = useTransactions(
 *   { referenceMonth: '2024-01' },
 *   { page: 1, pageSize: 20 }
 * );
 * ```
 */
export function useTransactions(
  filters: TransactionFilters = {},
  pagination: PaginationOptions = {}
): UseTransactionsReturn {
  const db = getDb();
  const [currentPage, setCurrentPage] = useState(pagination.page ?? 1);
  const pageSize = pagination.pageSize ?? DEFAULT_PAGE_SIZE;

  // Build the reference month from year/month if provided
  const referenceMonth = useMemo(() => {
    if (filters.referenceMonth) {
      return filters.referenceMonth;
    }
    if (filters.year && filters.month) {
      return `${filters.year}-${String(filters.month).padStart(2, '0')}`;
    }
    return undefined;
  }, [filters.referenceMonth, filters.year, filters.month]);

  // Build where conditions
  const whereConditions = useMemo(() => {
    const conditions = [];

    if (referenceMonth) {
      conditions.push(eq(transactions.referenceMonth, referenceMonth));
    }

    if (filters.categoryId) {
      conditions.push(eq(transactions.categoryId, filters.categoryId));
    }

    if (filters.needsReview !== undefined) {
      conditions.push(eq(transactions.needsReview, filters.needsReview));
    }

    if (filters.isExcludedFromTotals !== undefined) {
      conditions.push(eq(transactions.isExcludedFromTotals, filters.isExcludedFromTotals));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }, [referenceMonth, filters.categoryId, filters.needsReview, filters.isExcludedFromTotals]);

  // Live query for transactions with category data
  const { data: transactionData, error: queryError } = useLiveQuery(
    whereConditions
      ? db
          .select({
            transaction: transactions,
            category: categories,
          })
          .from(transactions)
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .where(whereConditions)
          .orderBy(desc(transactions.date))
          .limit(pageSize)
          .offset((currentPage - 1) * pageSize)
      : db
          .select({
            transaction: transactions,
            category: categories,
          })
          .from(transactions)
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .orderBy(desc(transactions.date))
          .limit(pageSize)
          .offset((currentPage - 1) * pageSize),
    [whereConditions, currentPage, pageSize]
  );

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

  // Live query for monthly summary (only when referenceMonth is set)
  const { data: summaryData } = useLiveQuery(
    referenceMonth
      ? db
          .select({
            totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} > 0 AND ${transactions.isExcludedFromTotals} = 0 THEN ${transactions.amount} ELSE 0 END), 0)`,
            totalExpenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} < 0 AND ${transactions.isExcludedFromTotals} = 0 THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
            transactionCount: sql<number>`COUNT(*)`,
          })
          .from(transactions)
          .where(eq(transactions.referenceMonth, referenceMonth))
      : db
          .select({
            totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} > 0 AND ${transactions.isExcludedFromTotals} = 0 THEN ${transactions.amount} ELSE 0 END), 0)`,
            totalExpenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} < 0 AND ${transactions.isExcludedFromTotals} = 0 THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
            transactionCount: sql<number>`COUNT(*)`,
          })
          .from(transactions),
    [referenceMonth]
  );

  // Transform data
  const transformedTransactions = useMemo(() => {
    if (!transactionData) return [];
    return transactionData.map(({ transaction, category }) =>
      toTransactionWithCategory(transaction, category)
    );
  }, [transactionData]);

  // Calculate summary
  const summary = useMemo<MonthlySummary>(() => {
    if (!summaryData || summaryData.length === 0) {
      return {
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
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      transactionCount,
    };
  }, [summaryData]);

  // Calculate pagination
  const totalCount = countData?.[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Pagination handlers
  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [hasPreviousPage]);

  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(validPage);
    },
    [totalPages]
  );

  // CRUD operations
  const create = useCallback(async (data: CreateTransactionDTO): Promise<Transaction> => {
    return createTransaction(data);
  }, []);

  const update = useCallback(
    async (id: string, data: UpdateTransactionDTO): Promise<Transaction | null> => {
      return updateTransaction(id, data);
    },
    []
  );

  const remove = useCallback(async (id: string): Promise<void> => {
    return deleteTransaction(id);
  }, []);

  const markAsReviewed = useCallback(async (id: string): Promise<Transaction | null> => {
    return markTransactionAsReviewed(id);
  }, []);

  const setCategory = useCallback(
    async (id: string, categoryId: string | null): Promise<Transaction | null> => {
      return setTransactionCategory(id, categoryId);
    },
    []
  );

  // Refresh function (triggers re-render)
  const [, setRefreshKey] = useState(0);
  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return {
    transactions: transformedTransactions,
    isLoading: !transactionData,
    error: queryError ? String(queryError) : null,
    summary,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    goToPage,
    create,
    update,
    remove,
    markAsReviewed,
    setCategory,
    refresh,
  };
}

export default useTransactions;
