/**
 * Dashboard Query Module
 *
 * Contains query functions for dashboard data including monthly summaries,
 * category breakdowns, trend data, and available months.
 *
 * **Validates: Requirement 7**
 */
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { getDb } from '../client';
import { transactions, categories, weeklyOccurrences, weeklyRecurringGroups } from '../schema';

// ============================================================================
// Types
// ============================================================================

/**
 * Result type for monthly summary query
 */
export interface MonthlySummaryResult {
  /** Total income for the month (positive amounts, not excluded) */
  totalIncome: number;
  /** Total expenses for the month (absolute value of negative amounts, not excluded) */
  totalExpenses: number;
  /** Total number of transactions in the month */
  transactionCount: number;
}

/**
 * Result type for category breakdown query
 */
export interface CategoryBreakdownResult {
  /** Category ID (null for uncategorized) */
  categoryId: string | null;
  /** Category name */
  categoryName: string | null;
  /** Category type (income/expense) */
  categoryType: string | null;
  /** Category color */
  categoryColor: string | null;
  /** Category icon */
  categoryIcon: string | null;
  /** Expense group (fixed/variable, null for uncategorized or income) */
  expenseGroup: string | null;
  /** Total amount for this category */
  total: number;
  /** Number of transactions */
  count: number;
  /** 1 if expense, 0 if income */
  isExpense: number;
}

/**
 * Result type for trend data query
 */
export interface TrendDataResult {
  /** Reference month (YYYY-MM) */
  referenceMonth: string;
  /** Total income for the month */
  totalIncome: number;
  /** Total expenses for the month */
  totalExpenses: number;
}

/**
 * Result type for available months query
 */
export interface AvailableMonthResult {
  /** Reference month (YYYY-MM) */
  referenceMonth: string;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get monthly summary query for a specific reference month.
 *
 * Returns a query that calculates total income, total expenses, and transaction count
 * for the specified month. Excludes transactions marked as excluded from totals.
 *
 * @param referenceMonth - The month in YYYY-MM format
 * @returns Drizzle query builder for monthly summary
 *
 * @example
 * ```typescript
 * const result = await getMonthlySummaryQuery('2024-01');
 * // result[0] = { totalIncome: 5000, totalExpenses: 3000, transactionCount: 25 }
 * ```
 */
export function getMonthlySummaryQuery(referenceMonth: string) {
  const db = getDb();
  return db
    .select({
      totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} > 0 AND ${transactions.isExcludedFromTotals} = 0 THEN ${transactions.amount} ELSE 0 END), 0)`,
      totalExpenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} < 0 AND ${transactions.isExcludedFromTotals} = 0 THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
      transactionCount: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .where(eq(transactions.referenceMonth, referenceMonth));
}

/**
 * Get category breakdown query for a specific reference month.
 *
 * Returns a query that groups transactions by category and income/expense type,
 * calculating totals and counts for each group. Excludes transactions marked
 * as excluded from totals.
 *
 * @param referenceMonth - The month in YYYY-MM format
 * @returns Drizzle query builder for category breakdown
 *
 * @example
 * ```typescript
 * const result = await getCategoryBreakdownQuery('2024-01');
 * // result = [
 * //   { categoryId: 'cat1', categoryName: 'Food', total: 500, count: 10, isExpense: 1 },
 * //   { categoryId: 'cat2', categoryName: 'Salary', total: 5000, count: 1, isExpense: 0 },
 * // ]
 * ```
 */
export function getCategoryBreakdownQuery(referenceMonth: string) {
  const db = getDb();
  return db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryType: categories.type,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
      expenseGroup: categories.expenseGroup,
      total: sql<number>`SUM(ABS(${transactions.amount}))`,
      count: sql<number>`COUNT(*)`,
      isExpense: sql<number>`CASE WHEN ${transactions.amount} < 0 THEN 1 ELSE 0 END`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.referenceMonth, referenceMonth),
        eq(transactions.isExcludedFromTotals, false)
      )
    )
    .groupBy(transactions.categoryId, sql`CASE WHEN ${transactions.amount} < 0 THEN 1 ELSE 0 END`);
}

/**
 * Get weekly occurrences category breakdown for a specific reference month.
 * Only includes occurrences marked as paid (isPaid = true).
 * Returns data in the same shape as getCategoryBreakdownQuery for easy merging.
 */
export function getWeeklyOccurrenceBreakdownQuery(referenceMonth: string) {
  const db = getDb();
  return db
    .select({
      categoryId: weeklyRecurringGroups.categoryId,
      categoryName: categories.name,
      categoryType: categories.type,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
      expenseGroup: categories.expenseGroup,
      total: sql<number>`SUM(ABS(${weeklyOccurrences.amount}))`,
      count: sql<number>`COUNT(*)`,
      isExpense: sql<number>`1`,
    })
    .from(weeklyOccurrences)
    .innerJoin(weeklyRecurringGroups, eq(weeklyOccurrences.weeklyGroupId, weeklyRecurringGroups.id))
    .leftJoin(categories, eq(weeklyRecurringGroups.categoryId, categories.id))
    .where(
      and(
        eq(weeklyOccurrences.referenceMonth, referenceMonth),
        eq(weeklyOccurrences.isPaid, true)
      )
    )
    .groupBy(weeklyRecurringGroups.categoryId);
}

/**
 * Get trend data query for multiple months.
 *
 * Returns a query that calculates income and expense totals for each month
 * in the provided list. Results are ordered by month ascending.
 *
 * @param months - Array of months in YYYY-MM format
 * @returns Drizzle query builder for trend data
 *
 * @example
 * ```typescript
 * const result = await getTrendDataQuery(['2024-01', '2024-02', '2024-03']);
 * // result = [
 * //   { referenceMonth: '2024-01', totalIncome: 5000, totalExpenses: 3000 },
 * //   { referenceMonth: '2024-02', totalIncome: 5500, totalExpenses: 3200 },
 * //   { referenceMonth: '2024-03', totalIncome: 4800, totalExpenses: 2900 },
 * // ]
 * ```
 */
export function getTrendDataQuery(months: string[]) {
  const db = getDb();
  return db
    .select({
      referenceMonth: transactions.referenceMonth,
      totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} > 0 AND ${transactions.isExcludedFromTotals} = 0 THEN ${transactions.amount} ELSE 0 END), 0)`,
      totalExpenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} < 0 AND ${transactions.isExcludedFromTotals} = 0 THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(inArray(transactions.referenceMonth, months))
    .groupBy(transactions.referenceMonth)
    .orderBy(transactions.referenceMonth);
}

/**
 * Get available months query.
 *
 * Returns a query that retrieves all distinct reference months that have
 * transactions, ordered by month descending (most recent first).
 *
 * @returns Drizzle query builder for available months
 *
 * @example
 * ```typescript
 * const result = await getAvailableMonthsQuery();
 * // result = [
 * //   { referenceMonth: '2024-03' },
 * //   { referenceMonth: '2024-02' },
 * //   { referenceMonth: '2024-01' },
 * // ]
 * ```
 */
export function getAvailableMonthsQuery() {
  const db = getDb();
  return db
    .selectDistinct({ referenceMonth: transactions.referenceMonth })
    .from(transactions)
    .orderBy(desc(transactions.referenceMonth));
}

// ============================================================================
// Category Transactions Query
// ============================================================================

/**
 * Result type for category transactions query
 */
export interface CategoryTransactionResult {
  /** Transaction ID */
  id: string;
  /** Transaction description (from title field) */
  description: string;
  /** Transaction amount */
  amount: number;
  /** Transaction date */
  date: string;
}

/**
 * Get transactions for a specific category in a given reference month.
 *
 * Returns a query that fetches all non-excluded transactions belonging to
 * the specified category for the given month, ordered by date descending.
 * The `title` field is mapped to `description` in the result.
 *
 * @param categoryId - The category ID to filter by
 * @param referenceMonth - The month in YYYY-MM format
 * @returns Drizzle query builder for category transactions
 *
 * **Validates: Requirements 2.3, 2.5**
 *
 * @example
 * ```typescript
 * const result = await getCategoryTransactionsQuery('cat-food', '2024-01');
 * // result = [
 * //   { id: 'tx1', description: 'Grocery Store', amount: -150.00, date: '2024-01-28' },
 * //   { id: 'tx2', description: 'Restaurant', amount: -45.00, date: '2024-01-15' },
 * // ]
 * ```
 */
export function getCategoryTransactionsQuery(categoryId: string, referenceMonth: string) {
  const db = getDb();
  return db
    .select({
      id: transactions.id,
      description: transactions.title,
      amount: transactions.amount,
      date: transactions.date,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.categoryId, categoryId),
        eq(transactions.referenceMonth, referenceMonth),
        eq(transactions.isExcludedFromTotals, false)
      )
    )
    .orderBy(desc(transactions.date));
}
