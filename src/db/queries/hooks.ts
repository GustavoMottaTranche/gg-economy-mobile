/**
 * Live Query hooks for reactive data using Drizzle ORM
 *
 * These hooks provide reactive data that automatically updates when
 * the underlying database changes. Uses expo-sqlite's change listener
 * feature with Drizzle's useLiveQuery.
 */
import { eq, and, desc, sql } from 'drizzle-orm';
import { useLiveQuery } from '../client';
import { getDb } from '../client';
import {
  transactions,
  categories,
  importBatches,
  origins,
  userPreferences,
  categorizationRules,
} from '../schema';

// ============================================================================
// Transaction Hooks
// ============================================================================

/**
 * Live query for all transactions
 */
export function useLiveTransactions() {
  const db = getDb();
  return useLiveQuery(db.select().from(transactions).orderBy(desc(transactions.date)));
}

/**
 * Live query for transactions by reference month
 */
export function useLiveTransactionsByMonth(referenceMonth: string) {
  const db = getDb();
  return useLiveQuery(
    db
      .select()
      .from(transactions)
      .where(eq(transactions.referenceMonth, referenceMonth))
      .orderBy(desc(transactions.date)),
    [referenceMonth]
  );
}

/**
 * Live query for transactions by month with category info
 */
export function useLiveTransactionsByMonthWithCategory(referenceMonth: string) {
  const db = getDb();
  return useLiveQuery(
    db
      .select({
        transaction: transactions,
        category: categories,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.referenceMonth, referenceMonth))
      .orderBy(desc(transactions.date)),
    [referenceMonth]
  );
}

/**
 * Live query for transactions needing review
 */
export function useLiveTransactionsNeedingReview() {
  const db = getDb();
  return useLiveQuery(
    db
      .select()
      .from(transactions)
      .where(eq(transactions.needsReview, true))
      .orderBy(desc(transactions.date))
  );
}

/**
 * Live query for transactions needing review with batch info
 */
export function useLiveTransactionsNeedingReviewWithBatch() {
  const db = getDb();
  return useLiveQuery(
    db
      .select({
        transaction: transactions,
        importBatch: importBatches,
        category: categories,
      })
      .from(transactions)
      .leftJoin(importBatches, eq(transactions.batchId, importBatches.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.needsReview, true))
      .orderBy(desc(transactions.date))
  );
}

/**
 * Live query for review count
 */
export function useLiveReviewCount() {
  const db = getDb();
  return useLiveQuery(
    db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.needsReview, true))
  );
}

/**
 * Live query for transactions by batch ID
 */
export function useLiveTransactionsByBatchId(batchId: string) {
  const db = getDb();
  return useLiveQuery(
    db
      .select()
      .from(transactions)
      .where(eq(transactions.batchId, batchId))
      .orderBy(desc(transactions.date)),
    [batchId]
  );
}

/**
 * Live query for monthly summary
 */
export function useLiveMonthlySummary(referenceMonth: string) {
  const db = getDb();
  return useLiveQuery(
    db
      .select({
        totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} > 0 AND ${transactions.isExcludedFromTotals} = 0 THEN ${transactions.amount} ELSE 0 END), 0)`,
        totalExpenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} < 0 AND ${transactions.isExcludedFromTotals} = 0 THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
        transactionCount: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .where(eq(transactions.referenceMonth, referenceMonth)),
    [referenceMonth]
  );
}

/**
 * Live query for category breakdown
 */
export function useLiveCategoryBreakdown(referenceMonth: string) {
  const db = getDb();
  return useLiveQuery(
    db
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
      .groupBy(transactions.categoryId),
    [referenceMonth]
  );
}

// ============================================================================
// Category Hooks
// ============================================================================

/**
 * Live query for all categories
 */
export function useLiveCategories() {
  const db = getDb();
  return useLiveQuery(db.select().from(categories).orderBy(categories.name));
}

/**
 * Live query for active categories
 */
export function useLiveActiveCategories() {
  const db = getDb();
  return useLiveQuery(
    db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.name)
  );
}

/**
 * Live query for categories by type
 */
export function useLiveCategoriesByType(type: 'income' | 'expense') {
  const db = getDb();
  return useLiveQuery(
    db
      .select()
      .from(categories)
      .where(and(eq(categories.type, type), eq(categories.isActive, true)))
      .orderBy(categories.name),
    [type]
  );
}

// ============================================================================
// Import Batch Hooks
// ============================================================================

/**
 * Live query for all import batches
 */
export function useLiveImportBatches() {
  const db = getDb();
  return useLiveQuery(db.select().from(importBatches).orderBy(desc(importBatches.importedAt)));
}

/**
 * Live query for pending import batches
 */
export function useLivePendingImportBatches() {
  const db = getDb();
  return useLiveQuery(
    db
      .select()
      .from(importBatches)
      .where(sql`${importBatches.status} IN ('pending', 'reviewing')`)
      .orderBy(desc(importBatches.importedAt))
  );
}

/**
 * Live query for import batch by ID
 */
export function useLiveImportBatchById(id: string) {
  const db = getDb();
  return useLiveQuery(db.select().from(importBatches).where(eq(importBatches.id, id)).limit(1), [
    id,
  ]);
}

// ============================================================================
// Origin Hooks
// ============================================================================

/**
 * Live query for all origins
 */
export function useLiveOrigins() {
  const db = getDb();
  return useLiveQuery(db.select().from(origins).orderBy(origins.name));
}

// ============================================================================
// Preference Hooks
// ============================================================================

/**
 * Live query for all preferences
 */
export function useLivePreferences() {
  const db = getDb();
  return useLiveQuery(db.select().from(userPreferences));
}

/**
 * Live query for a specific preference
 */
export function useLivePreference(key: string) {
  const db = getDb();
  return useLiveQuery(
    db.select().from(userPreferences).where(eq(userPreferences.key, key)).limit(1),
    [key]
  );
}

// ============================================================================
// Categorization Rule Hooks
// ============================================================================

/**
 * Live query for all categorization rules
 */
export function useLiveCategorizationRules() {
  const db = getDb();
  return useLiveQuery(
    db
      .select()
      .from(categorizationRules)
      .orderBy(desc(categorizationRules.priority), categorizationRules.pattern)
  );
}

/**
 * Live query for active categorization rules
 */
export function useLiveActiveCategorizationRules() {
  const db = getDb();
  return useLiveQuery(
    db
      .select()
      .from(categorizationRules)
      .where(eq(categorizationRules.isActive, true))
      .orderBy(desc(categorizationRules.priority), categorizationRules.pattern)
  );
}

/**
 * Live query for categorization rules with category details
 */
export function useLiveCategorizationRulesWithCategory() {
  const db = getDb();
  return useLiveQuery(
    db
      .select({
        rule: categorizationRules,
        category: categories,
      })
      .from(categorizationRules)
      .leftJoin(categories, eq(categorizationRules.categoryId, categories.id))
      .orderBy(desc(categorizationRules.priority), categorizationRules.pattern)
  );
}

// ============================================================================
// Dashboard Hooks
// ============================================================================

/**
 * Live query for distinct reference months
 */
export function useLiveDistinctReferenceMonths() {
  const db = getDb();
  return useLiveQuery(
    db
      .selectDistinct({ referenceMonth: transactions.referenceMonth })
      .from(transactions)
      .orderBy(desc(transactions.referenceMonth))
  );
}

/**
 * Live query for transaction count
 */
export function useLiveTransactionCount() {
  const db = getDb();
  return useLiveQuery(db.select({ count: sql<number>`count(*)` }).from(transactions));
}

/**
 * Live query for category count
 */
export function useLiveCategoryCount() {
  const db = getDb();
  return useLiveQuery(db.select({ count: sql<number>`count(*)` }).from(categories));
}
