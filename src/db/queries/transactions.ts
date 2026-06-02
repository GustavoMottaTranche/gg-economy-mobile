/**
 * Transaction query functions using Drizzle ORM
 *
 * Provides CRUD operations and specialized queries for transactions.
 * Uses Drizzle's type-safe query builder with expo-sqlite.
 */
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb, withTransaction } from '../client';
import {
  transactions,
  categories,
  origins,
  importBatches,
  type TransactionRecord,
  type NewTransactionRecord,
} from '../schema';
import type { CreateTransactionDTO, UpdateTransactionDTO } from '../../types';

/**
 * Convert a database record to a Transaction with proper date types
 */
function toTransaction(record: TransactionRecord) {
  return {
    ...record,
    date: new Date(record.date),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}

/**
 * Format a Date to ISO string for database storage
 */
function formatDateForDb(date: Date): string {
  const isoString = date.toISOString().split('T')[0];
  return isoString ?? '';
}

/**
 * Get all transactions
 */
export async function getAllTransactions() {
  const db = getDb();
  const results = await db.select().from(transactions).orderBy(desc(transactions.date));
  return results.map(toTransaction);
}

/**
 * Get a transaction by ID
 */
export async function getTransactionById(id: string) {
  const db = getDb();
  const results = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  const first = results[0];
  return first ? toTransaction(first) : null;
}

/**
 * Get a transaction by ID with related data (category, origin, batch)
 */
export async function getTransactionWithRelations(id: string) {
  const db = getDb();
  const results = await db
    .select({
      transaction: transactions,
      category: categories,
      origin: origins,
      importBatch: importBatches,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(origins, eq(transactions.originId, origins.id))
    .leftJoin(importBatches, eq(transactions.batchId, importBatches.id))
    .where(eq(transactions.id, id))
    .limit(1);

  if (results.length === 0) return null;

  const firstResult = results[0]!;
  const { transaction, category, origin, importBatch } = firstResult;
  return {
    ...toTransaction(transaction),
    category: category ? { ...category, createdAt: new Date(category.createdAt) } : null,
    origin: origin ? { ...origin, createdAt: new Date(origin.createdAt) } : null,
    importBatch: importBatch
      ? { ...importBatch, importedAt: new Date(importBatch.importedAt) }
      : null,
  };
}

/**
 * Get transactions by reference month
 */
export async function getTransactionsByMonth(referenceMonth: string) {
  const db = getDb();
  const results = await db
    .select()
    .from(transactions)
    .where(eq(transactions.referenceMonth, referenceMonth))
    .orderBy(desc(transactions.date));
  return results.map(toTransaction);
}

/**
 * Get transactions by reference month with category info
 */
export async function getTransactionsByMonthWithCategory(referenceMonth: string) {
  const db = getDb();
  const results = await db
    .select({
      transaction: transactions,
      category: categories,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.referenceMonth, referenceMonth))
    .orderBy(desc(transactions.date));

  return results.map(({ transaction, category }) => ({
    ...toTransaction(transaction),
    category: category ? { ...category, createdAt: new Date(category.createdAt) } : null,
  }));
}

/**
 * Get transactions that need review
 */
export async function getTransactionsNeedingReview() {
  const db = getDb();
  const results = await db
    .select()
    .from(transactions)
    .where(eq(transactions.needsReview, true))
    .orderBy(desc(transactions.date));
  return results.map(toTransaction);
}

/**
 * Get transactions that need review with batch info
 */
export async function getTransactionsNeedingReviewWithBatch() {
  const db = getDb();
  const results = await db
    .select({
      transaction: transactions,
      importBatch: importBatches,
      category: categories,
    })
    .from(transactions)
    .leftJoin(importBatches, eq(transactions.batchId, importBatches.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.needsReview, true))
    .orderBy(desc(transactions.date));

  return results.map(({ transaction, importBatch, category }) => ({
    ...toTransaction(transaction),
    importBatch: importBatch
      ? { ...importBatch, importedAt: new Date(importBatch.importedAt) }
      : null,
    category: category ? { ...category, createdAt: new Date(category.createdAt) } : null,
  }));
}

/**
 * Get count of transactions needing review
 */
export async function getReviewCount(): Promise<number> {
  const db = getDb();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.needsReview, true));
  return result[0]?.count ?? 0;
}

/**
 * Get transactions by batch ID
 */
export async function getTransactionsByBatchId(batchId: string) {
  const db = getDb();
  const results = await db
    .select()
    .from(transactions)
    .where(eq(transactions.batchId, batchId))
    .orderBy(desc(transactions.date));
  return results.map(toTransaction);
}

/**
 * Get transactions by category ID
 */
export async function getTransactionsByCategoryId(categoryId: string) {
  const db = getDb();
  const results = await db
    .select()
    .from(transactions)
    .where(eq(transactions.categoryId, categoryId))
    .orderBy(desc(transactions.date));
  return results.map(toTransaction);
}

/**
 * Get uncategorized transactions
 */
export async function getUncategorizedTransactions() {
  const db = getDb();
  const results = await db
    .select()
    .from(transactions)
    .where(isNull(transactions.categoryId))
    .orderBy(desc(transactions.date));
  return results.map(toTransaction);
}

/**
 * Create a new transaction
 */
export async function createTransaction(data: CreateTransactionDTO) {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const newTransaction: NewTransactionRecord = {
    id,
    title: data.title,
    date: formatDateForDb(data.date),
    amount: data.amount,
    description: data.description,
    categoryId: data.categoryId ?? null,
    originId: data.originId ?? null,
    batchId: data.batchId ?? null,
    referenceMonth: data.referenceMonth,
    needsReview: data.needsReview ?? true,
    isExcludedFromTotals: data.isExcludedFromTotals ?? false,
    isPaid: data.isPaid ?? false,
    duplicateOf: null,
    installmentGroupId: data.installmentGroupId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(transactions).values(newTransaction);

  return toTransaction({
    ...newTransaction,
    createdAt: now,
    updatedAt: now,
  } as TransactionRecord);
}

/**
 * Create multiple transactions in a single transaction
 */
export async function createTransactions(dataList: CreateTransactionDTO[]) {
  return withTransaction(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    const results: TransactionRecord[] = [];

    for (const data of dataList) {
      const id = randomUUID();
      const newTransaction: NewTransactionRecord = {
        id,
        title: data.title,
        date: formatDateForDb(data.date),
        amount: data.amount,
        description: data.description,
        categoryId: data.categoryId ?? null,
        originId: data.originId ?? null,
        batchId: data.batchId ?? null,
        referenceMonth: data.referenceMonth,
        needsReview: data.needsReview ?? true,
        isExcludedFromTotals: data.isExcludedFromTotals ?? false,
        isPaid: data.isPaid ?? false,
        duplicateOf: null,
        installmentGroupId: data.installmentGroupId ?? null,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(transactions).values(newTransaction);
      results.push({
        ...newTransaction,
        createdAt: now,
        updatedAt: now,
      } as TransactionRecord);
    }

    return results.map(toTransaction);
  });
}

/**
 * Update a transaction
 */
export async function updateTransaction(id: string, data: UpdateTransactionDTO) {
  const db = getDb();
  const now = new Date().toISOString();

  const updateData: Partial<NewTransactionRecord> = {
    updatedAt: now,
  };

  if (data.date !== undefined) {
    updateData.date = formatDateForDb(data.date);
  }
  if (data.title !== undefined) {
    updateData.title = data.title;
  }
  if (data.amount !== undefined) {
    updateData.amount = data.amount;
  }
  if (data.description !== undefined) {
    updateData.description = data.description;
  }
  if (data.categoryId !== undefined) {
    updateData.categoryId = data.categoryId;
  }
  if (data.originId !== undefined) {
    updateData.originId = data.originId;
  }
  if (data.referenceMonth !== undefined) {
    updateData.referenceMonth = data.referenceMonth;
  }
  if (data.needsReview !== undefined) {
    updateData.needsReview = data.needsReview;
  }
  if (data.isExcludedFromTotals !== undefined) {
    updateData.isExcludedFromTotals = data.isExcludedFromTotals;
  }

  await db.update(transactions).set(updateData).where(eq(transactions.id, id));

  return getTransactionById(id);
}

/**
 * Mark a transaction as reviewed (sets needsReview to false)
 */
export async function markTransactionAsReviewed(id: string) {
  return updateTransaction(id, { needsReview: false });
}

/**
 * Mark multiple transactions as reviewed
 */
export async function markTransactionsAsReviewed(ids: string[]) {
  return withTransaction(async () => {
    const db = getDb();
    const now = new Date().toISOString();

    for (const id of ids) {
      await db
        .update(transactions)
        .set({ needsReview: false, updatedAt: now })
        .where(eq(transactions.id, id));
    }
  });
}

/**
 * Set transaction category
 */
export async function setTransactionCategory(id: string, categoryId: string | null) {
  return updateTransaction(id, { categoryId });
}

/**
 * Set transaction category with propagation to future recurring siblings.
 *
 * If the transaction has a recurringId, this function will:
 * 1. Update the transaction itself
 * 2. Update the recurring parent record's categoryId
 * 3. Update all sibling transactions with the same recurringId and referenceMonth >= currentMonth
 *
 * If the transaction is NOT recurring, it simply updates the single transaction.
 *
 * @param id - The transaction ID being updated
 * @param categoryId - The new category ID (or null to uncategorize)
 * @param currentMonth - The current month (format: YYYY-MM) used as boundary for propagation
 * @returns The updated transaction
 */
export async function setCategoryWithPropagation(
  id: string,
  categoryId: string | null,
  currentMonth: string
) {
  const db = getDb();

  // First get the transaction to check if it's recurring
  const txRecord = await db
    .select({ recurringId: transactions.recurringId })
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);

  if (!txRecord || txRecord.length === 0) {
    return null;
  }

  const recurringId = txRecord[0]?.recurringId;

  if (!recurringId) {
    // Not a recurring transaction, just update normally
    return updateTransaction(id, { categoryId });
  }

  // Recurring transaction: propagate to parent + future siblings
  const { recurringTransactions } = await import('../schema');
  const now = new Date().toISOString();

  await withTransaction(async () => {
    // 1. Update the recurring parent record
    await db
      .update(recurringTransactions)
      .set({ categoryId: categoryId ?? '', updatedAt: now })
      .where(eq(recurringTransactions.id, recurringId));

    // 2. Update all transactions for this recurring with referenceMonth >= currentMonth
    await db
      .update(transactions)
      .set({ categoryId, updatedAt: now })
      .where(
        and(
          eq(transactions.recurringId, recurringId),
          sql`${transactions.referenceMonth} >= ${currentMonth}`
        )
      );
  });

  // Return the updated transaction
  return getTransactionById(id);
}

/**
 * Mark transaction as duplicate
 */
export async function markAsDuplicate(id: string, duplicateOfId: string) {
  const db = getDb();
  const now = new Date().toISOString();

  await db
    .update(transactions)
    .set({ duplicateOf: duplicateOfId, updatedAt: now })
    .where(eq(transactions.id, id));

  return getTransactionById(id);
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(id: string) {
  const db = getDb();
  await db.delete(transactions).where(eq(transactions.id, id));
}

/**
 * Delete multiple transactions
 */
export async function deleteTransactions(ids: string[]) {
  return withTransaction(async () => {
    const db = getDb();
    for (const id of ids) {
      await db.delete(transactions).where(eq(transactions.id, id));
    }
  });
}

/**
 * Delete all transactions in a batch
 */
export async function deleteTransactionsByBatchId(batchId: string) {
  const db = getDb();
  await db.delete(transactions).where(eq(transactions.batchId, batchId));
}

/**
 * Get monthly summary (income, expenses, balance)
 */
export async function getMonthlySummary(referenceMonth: string) {
  const db = getDb();

  const results = await db
    .select({
      totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} > 0 AND ${transactions.isExcludedFromTotals} = 0 THEN ${transactions.amount} ELSE 0 END), 0)`,
      totalExpenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} < 0 AND ${transactions.isExcludedFromTotals} = 0 THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
      transactionCount: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .where(eq(transactions.referenceMonth, referenceMonth));

  const firstResult = results[0]!;
  const { totalIncome, totalExpenses, transactionCount } = firstResult;
  return {
    totalIncome: totalIncome ?? 0,
    totalExpenses: totalExpenses ?? 0,
    balance: (totalIncome ?? 0) - (totalExpenses ?? 0),
    transactionCount: transactionCount ?? 0,
  };
}

/**
 * Get category breakdown for a month
 */
export async function getCategoryBreakdown(referenceMonth: string) {
  const db = getDb();

  const results = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryType: categories.type,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
      total: sql<number>`SUM(ABS(${transactions.amount}))`,
      count: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.referenceMonth, referenceMonth),
        eq(transactions.isExcludedFromTotals, false)
      )
    )
    .groupBy(transactions.categoryId);

  return results.map((row) => ({
    categoryId: row.categoryId,
    categoryName: row.categoryName ?? 'Uncategorized',
    categoryType: row.categoryType,
    categoryColor: row.categoryColor ?? '#808080',
    categoryIcon: row.categoryIcon ?? 'help-circle',
    total: row.total ?? 0,
    count: row.count ?? 0,
  }));
}

/**
 * Check if a transaction with the same date, amount, and description exists
 * Used for duplicate detection
 */
export async function findPotentialDuplicates(date: Date, amount: number, description: string) {
  const db = getDb();
  const dateStr = formatDateForDb(date);

  const results = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.date, dateStr),
        eq(transactions.amount, amount),
        eq(transactions.description, description)
      )
    );

  return results.map(toTransaction);
}

/**
 * Get transactions count
 */
export async function getTransactionsCount(): Promise<number> {
  const db = getDb();
  const result = await db.select({ count: sql<number>`count(*)` }).from(transactions);
  return result[0]?.count ?? 0;
}

/**
 * Get distinct reference months (for navigation)
 */
export async function getDistinctReferenceMonths(): Promise<string[]> {
  const db = getDb();
  const results = await db
    .selectDistinct({ referenceMonth: transactions.referenceMonth })
    .from(transactions)
    .orderBy(desc(transactions.referenceMonth));

  return results.map((r) => r.referenceMonth);
}
