/**
 * useReviewQueue Hook
 *
 * Custom hook for managing the review queue with reactive updates using Drizzle's useLiveQuery.
 * Returns transactions with needsReview = true and supports batch operations.
 *
 * **Validates: Requirements 16, 29**
 */
import { useMemo, useCallback, useState } from 'react';
import { eq, desc, sql } from 'drizzle-orm';
import { useLiveQuery, getDb } from '../db/client';
import { transactions, categories, importBatches } from '../db/schema';
import {
  updateTransaction,
  markTransactionAsReviewed,
  markTransactionsAsReviewed,
  setTransactionCategory,
  deleteTransaction,
  deleteTransactions,
} from '../db/queries/transactions';
import type { Transaction, Category, ImportBatch, UpdateTransactionDTO } from '../types';

/**
 * Transaction with category and batch data for review
 */
export interface ReviewTransaction extends Transaction {
  category: Category | null;
  importBatch: ImportBatch | null;
}

/**
 * Review queue grouped by import batch
 */
export interface ReviewBatchGroup {
  batch: ImportBatch | null;
  batchId: string | null;
  transactions: ReviewTransaction[];
  count: number;
}

/**
 * Return type for useReviewQueue hook
 */
export interface UseReviewQueueReturn {
  /** List of transactions needing review */
  transactions: ReviewTransaction[];
  /** Transactions grouped by import batch */
  groupedByBatch: ReviewBatchGroup[];
  /** Total count of transactions needing review */
  count: number;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Mark a single transaction as reviewed */
  markAsReviewed: (id: string) => Promise<Transaction | null>;
  /** Mark multiple transactions as reviewed */
  markMultipleAsReviewed: (ids: string[]) => Promise<void>;
  /** Mark all transactions in a batch as reviewed */
  markBatchAsReviewed: (batchId: string) => Promise<void>;
  /** Mark all transactions as reviewed */
  markAllAsReviewed: () => Promise<void>;
  /** Update a transaction */
  update: (id: string, data: UpdateTransactionDTO) => Promise<Transaction | null>;
  /** Set transaction category */
  setCategory: (id: string, categoryId: string | null) => Promise<Transaction | null>;
  /** Set category for multiple transactions */
  setCategoryForMultiple: (ids: string[], categoryId: string | null) => Promise<void>;
  /** Delete a transaction */
  remove: (id: string) => Promise<void>;
  /** Delete multiple transactions */
  removeMultiple: (ids: string[]) => Promise<void>;
  /** Refresh the data */
  refresh: () => void;
}

/**
 * Convert database records to ReviewTransaction
 */
function toReviewTransaction(
  txRecord: typeof transactions.$inferSelect,
  catRecord: typeof categories.$inferSelect | null,
  batchRecord: typeof importBatches.$inferSelect | null
): ReviewTransaction {
  return {
    id: txRecord.id,
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
          createdAt: new Date(catRecord.createdAt),
        }
      : null,
    importBatch: batchRecord
      ? {
          id: batchRecord.id,
          fileName: batchRecord.fileName,
          fileType: batchRecord.fileType as 'csv' | 'ofx' | 'qif',
          importedAt: new Date(batchRecord.importedAt),
          transactionCount: batchRecord.transactionCount,
          status: batchRecord.status as 'pending' | 'reviewing' | 'completed',
        }
      : null,
  };
}

/**
 * Hook for managing the review queue with reactive updates
 *
 * @returns Review queue management interface
 *
 * @example
 * ```tsx
 * const {
 *   transactions,
 *   groupedByBatch,
 *   count,
 *   markAsReviewed,
 *   setCategory,
 * } = useReviewQueue();
 *
 * // Mark a transaction as reviewed after categorization
 * const handleCategorize = async (id: string, categoryId: string) => {
 *   await setCategory(id, categoryId);
 *   await markAsReviewed(id);
 * };
 * ```
 */
export function useReviewQueue(): UseReviewQueueReturn {
  const db = getDb();

  // Live query for transactions needing review with category and batch info
  const { data: reviewData, error: queryError } = useLiveQuery(
    db
      .select({
        transaction: transactions,
        category: categories,
        importBatch: importBatches,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(importBatches, eq(transactions.batchId, importBatches.id))
      .where(eq(transactions.needsReview, true))
      .orderBy(desc(transactions.date))
  );

  // Live query for count
  const { data: countData } = useLiveQuery(
    db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.needsReview, true))
  );

  // Transform data
  const transformedTransactions = useMemo(() => {
    if (!reviewData) return [];
    return reviewData.map(({ transaction, category, importBatch }) =>
      toReviewTransaction(transaction, category, importBatch)
    );
  }, [reviewData]);

  // Group transactions by batch
  const groupedByBatch = useMemo<ReviewBatchGroup[]>(() => {
    if (!transformedTransactions.length) return [];

    const groups = new Map<string | null, ReviewBatchGroup>();

    for (const tx of transformedTransactions) {
      const key = tx.batchId;
      const existing = groups.get(key);

      if (existing) {
        existing.transactions.push(tx);
        existing.count++;
      } else {
        groups.set(key, {
          batch: tx.importBatch,
          batchId: tx.batchId,
          transactions: [tx],
          count: 1,
        });
      }
    }

    // Sort groups by batch import date (most recent first), with null batch last
    return Array.from(groups.values()).sort((a, b) => {
      if (!a.batch && !b.batch) return 0;
      if (!a.batch) return 1;
      if (!b.batch) return -1;
      return b.batch.importedAt.getTime() - a.batch.importedAt.getTime();
    });
  }, [transformedTransactions]);

  // Count
  const count = countData?.[0]?.count ?? 0;

  // Mark a single transaction as reviewed
  const markAsReviewed = useCallback(async (id: string): Promise<Transaction | null> => {
    return markTransactionAsReviewed(id);
  }, []);

  // Mark multiple transactions as reviewed
  const markMultipleAsReviewed = useCallback(async (ids: string[]): Promise<void> => {
    return markTransactionsAsReviewed(ids);
  }, []);

  // Mark all transactions in a batch as reviewed
  const markBatchAsReviewed = useCallback(
    async (batchId: string): Promise<void> => {
      const batchTransactions = transformedTransactions.filter((tx) => tx.batchId === batchId);
      const ids = batchTransactions.map((tx) => tx.id);
      if (ids.length > 0) {
        await markTransactionsAsReviewed(ids);
      }
    },
    [transformedTransactions]
  );

  // Mark all transactions as reviewed
  const markAllAsReviewed = useCallback(async (): Promise<void> => {
    const ids = transformedTransactions.map((tx) => tx.id);
    if (ids.length > 0) {
      await markTransactionsAsReviewed(ids);
    }
  }, [transformedTransactions]);

  // Update a transaction
  const update = useCallback(
    async (id: string, data: UpdateTransactionDTO): Promise<Transaction | null> => {
      return updateTransaction(id, data);
    },
    []
  );

  // Set transaction category
  const setCategory = useCallback(
    async (id: string, categoryId: string | null): Promise<Transaction | null> => {
      return setTransactionCategory(id, categoryId);
    },
    []
  );

  // Set category for multiple transactions
  const setCategoryForMultiple = useCallback(
    async (ids: string[], categoryId: string | null): Promise<void> => {
      for (const id of ids) {
        await setTransactionCategory(id, categoryId);
      }
    },
    []
  );

  // Delete a transaction
  const remove = useCallback(async (id: string): Promise<void> => {
    return deleteTransaction(id);
  }, []);

  // Delete multiple transactions
  const removeMultiple = useCallback(async (ids: string[]): Promise<void> => {
    return deleteTransactions(ids);
  }, []);

  // Refresh function (triggers re-render)
  const [, setRefreshKey] = useState(0);
  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return {
    transactions: transformedTransactions,
    groupedByBatch,
    count,
    isLoading: !reviewData,
    error: queryError ? String(queryError) : null,
    markAsReviewed,
    markMultipleAsReviewed,
    markBatchAsReviewed,
    markAllAsReviewed,
    update,
    setCategory,
    setCategoryForMultiple,
    remove,
    removeMultiple,
    refresh,
  };
}

export default useReviewQueue;
