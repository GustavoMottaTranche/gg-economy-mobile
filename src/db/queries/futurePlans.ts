/**
 * Future Plans Query Module
 *
 * Contains query functions for the Future Plans screen, providing
 * transaction totals broken down by expense group and payment status.
 * Includes both regular transactions and weekly occurrences.
 *
 * **Validates: Requirements 3.1, 4.1**
 */
import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { transactions, categories, weeklyOccurrences, weeklyRecurringGroups } from '../schema';

// ============================================================================
// Types
// ============================================================================

/**
 * Result type for future plans totals query
 */
export interface FuturePlansTotalsResult {
  /** Total paid FIXED expenses in cents (excludes fund-linked) */
  fixedPaidExpenses: number;
  /** Total pending FIXED expenses in cents (excludes fund-linked) */
  fixedPendingExpenses: number;
  /** Total VARIABLE expenses in cents (paid, excludes fund-linked) */
  variablePaidExpenses: number;
  /** Total ALL paid expenses in cents (for Guardando calc, excludes fund-linked) */
  totalPaidExpenses: number;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get transaction totals for the Future Plans savings calculations.
 *
 * Returns:
 * - fixedPaidExpenses: sum of paid FIXED expenses
 * - fixedPendingExpenses: sum of pending FIXED expenses
 * - variablePaidExpenses: sum of paid VARIABLE expenses
 * - totalPaidExpenses: sum of ALL paid expenses (for Guardando)
 *
 * Excludes transactions marked as excluded from totals (fund-linked transactions).
 *
 * @param referenceMonth - The month in YYYY-MM format
 * @returns Drizzle query builder for future plans totals
 */
export function getFuturePlansTotalsQuery(referenceMonth: string) {
  const db = getDb();
  return db
    .select({
      fixedPaidExpenses: sql<number>`COALESCE(SUM(CASE
        WHEN ${transactions.amount} < 0
          AND ${transactions.isPaid} = 1
          AND ${transactions.isExcludedFromTotals} = 0
          AND ${categories.expenseGroup} = 'fixed'
        THEN ABS(${transactions.amount})
        ELSE 0
      END), 0)`,
      fixedPendingExpenses: sql<number>`COALESCE(SUM(CASE
        WHEN ${transactions.amount} < 0
          AND ${transactions.isPaid} = 0
          AND ${transactions.isExcludedFromTotals} = 0
          AND ${categories.expenseGroup} = 'fixed'
        THEN ABS(${transactions.amount})
        ELSE 0
      END), 0)`,
      variablePaidExpenses: sql<number>`COALESCE(SUM(CASE
        WHEN ${transactions.amount} < 0
          AND ${transactions.isPaid} = 1
          AND ${transactions.isExcludedFromTotals} = 0
          AND ${categories.expenseGroup} = 'variable'
        THEN ABS(${transactions.amount})
        ELSE 0
      END), 0)`,
      totalPaidExpenses: sql<number>`COALESCE(SUM(CASE
        WHEN ${transactions.amount} < 0
          AND ${transactions.isPaid} = 1
          AND ${transactions.isExcludedFromTotals} = 0
        THEN ABS(${transactions.amount})
        ELSE 0
      END), 0)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.referenceMonth, referenceMonth),
        eq(transactions.isExcludedFromTotals, false)
      )
    );
}

/**
 * Get weekly occurrence totals (paid and pending) for a specific reference month.
 *
 * Returns:
 * - weeklyPaidTotal: sum of paid weekly occurrences
 * - weeklyPendingTotal: sum of pending weekly occurrences
 *
 * @param referenceMonth - The month in YYYY-MM format
 * @returns Drizzle query builder for weekly occurrence totals
 */
export function getWeeklyOccurrenceTotalsQuery(referenceMonth: string) {
  const db = getDb();
  return db
    .select({
      weeklyPaidTotal: sql<number>`COALESCE(SUM(CASE
        WHEN ${weeklyOccurrences.isPaid} = 1
        THEN ABS(${weeklyOccurrences.amount})
        ELSE 0
      END), 0)`,
      weeklyPendingTotal: sql<number>`COALESCE(SUM(CASE
        WHEN ${weeklyOccurrences.isPaid} = 0
        THEN ABS(${weeklyOccurrences.amount})
        ELSE 0
      END), 0)`,
    })
    .from(weeklyOccurrences)
    .where(eq(weeklyOccurrences.referenceMonth, referenceMonth));
}

/**
 * Get weekly occurrences category breakdown for the Future Plans screen.
 * Returns variable category spending from weekly occurrences (paid only)
 * in the same shape as the dashboard's getWeeklyOccurrenceBreakdownQuery.
 *
 * Used to compute expectedFutureSpending via useGoals.
 *
 * @param referenceMonth - The month in YYYY-MM format
 * @returns Drizzle query builder for weekly occurrence breakdown
 */
export function getWeeklyVariableBreakdownQuery(referenceMonth: string) {
  const db = getDb();
  return db
    .select({
      categoryId: weeklyRecurringGroups.categoryId,
      categoryName: categories.name,
      expenseGroup: categories.expenseGroup,
      total: sql<number>`SUM(ABS(${weeklyOccurrences.amount}))`,
      count: sql<number>`COUNT(*)`,
    })
    .from(weeklyOccurrences)
    .innerJoin(weeklyRecurringGroups, eq(weeklyOccurrences.weeklyGroupId, weeklyRecurringGroups.id))
    .leftJoin(categories, eq(weeklyRecurringGroups.categoryId, categories.id))
    .where(
      and(eq(weeklyOccurrences.referenceMonth, referenceMonth), eq(weeklyOccurrences.isPaid, true))
    )
    .groupBy(weeklyRecurringGroups.categoryId);
}
