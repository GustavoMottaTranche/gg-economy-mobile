/**
 * Category Detail Query Module
 *
 * Contains query functions for the Category Detail Screen, providing
 * transactions and weekly occurrences filtered by category and reference month.
 *
 * Returns all paid and unpaid items for the category (excluding those marked
 * as excluded from totals), enabling the UI to display payment status,
 * installment info, and category-level payment summaries.
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
 */
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { getDb } from '../client';
import { transactions, weeklyOccurrences, weeklyRecurringGroups } from '../schema';

// ============================================================================
// Types
// ============================================================================

/**
 * Result type for category detail transactions query
 */
export interface CategoryDetailTransactionResult {
  /** Transaction ID */
  id: string;
  /** Transaction title */
  title: string;
  /** Transaction date (YYYY-MM-DD) */
  date: string;
  /** Transaction amount (raw value from DB) */
  amount: number;
  /** Whether this transaction has been paid */
  isPaid: boolean;
  /** Installment group ID (non-null for installment parcels) */
  installmentGroupId: string | null;
  /** Recurring transaction ID (non-null for recurring charges) */
  recurringId: string | null;
}

/**
 * Result type for category detail weekly occurrences query
 */
export interface CategoryDetailWeeklyResult {
  /** Weekly occurrence ID */
  id: string;
  /** Occurrence description */
  description: string;
  /** Occurrence date (YYYY-MM-DD) */
  date: string;
  /** Occurrence amount (raw value from DB) */
  amount: number;
  /** Weekly recurring group ID (for navigation) */
  weeklyGroupId: string;
  /** Whether this weekly occurrence has been paid */
  isPaid: boolean;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get transactions for a category in a specific reference month.
 *
 * Filters applied:
 * - `categoryId` match
 * - `referenceMonth` match
 * - `isExcludedFromTotals = false`
 *
 * Returns both paid and unpaid transactions (including unpaid recurring and
 * installment parcels) with payment status and group identifiers.
 *
 * Results are ordered by date descending.
 * Uses the existing `idx_transactions_category_id` index for efficient querying.
 *
 * @param categoryId - The category ID to filter by
 * @param referenceMonth - The month in YYYY-MM format
 * @returns Promise resolving to array of transaction results
 *
 * **Validates: Requirements 4.1, 4.2, 4.3**
 *
 * @example
 * ```typescript
 * const results = await getCategoryDetailTransactionsQuery('cat-food', '2024-01');
 * // results = [
 * //   { id: 'tx1', title: 'Grocery Store', date: '2024-01-28', amount: -15000, isPaid: true, installmentGroupId: null, recurringId: null },
 * //   { id: 'tx2', title: 'Restaurant', date: '2024-01-15', amount: -4500, isPaid: false, installmentGroupId: null, recurringId: 'rec-1' },
 * // ]
 * ```
 */
export function getCategoryDetailTransactionsQuery(categoryId: string, referenceMonth: string) {
  const db = getDb();
  return db
    .select({
      id: transactions.id,
      title: transactions.title,
      date: transactions.date,
      amount: transactions.amount,
      isPaid: transactions.isPaid,
      installmentGroupId: transactions.installmentGroupId,
      recurringId: transactions.recurringId,
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

/**
 * Get weekly occurrences for a category in a specific reference month.
 *
 * Joins `weeklyOccurrences` → `weeklyRecurringGroups` to filter by category.
 * Returns both paid and unpaid occurrences to support payment status display
 * and category-level payment summaries.
 *
 * Results are ordered by date descending.
 *
 * @param categoryId - The category ID to filter by (via weeklyRecurringGroups)
 * @param referenceMonth - The month in YYYY-MM format
 * @returns Promise resolving to array of weekly occurrence results
 *
 * **Validates: Requirements 4.4, 4.5**
 *
 * @example
 * ```typescript
 * const results = await getCategoryDetailWeeklyQuery('cat-food', '2024-01');
 * // results = [
 * //   { id: 'wo1', description: 'Weekly Lunch', date: '2024-01-28', amount: -3500, weeklyGroupId: 'wg1', isPaid: true },
 * //   { id: 'wo2', description: 'Weekly Lunch', date: '2024-01-21', amount: -3500, weeklyGroupId: 'wg1', isPaid: false },
 * // ]
 * ```
 */
export function getCategoryDetailWeeklyQuery(categoryId: string, referenceMonth: string) {
  const db = getDb();
  return db
    .select({
      id: weeklyOccurrences.id,
      description: weeklyOccurrences.description,
      date: weeklyOccurrences.date,
      amount: weeklyOccurrences.amount,
      weeklyGroupId: weeklyOccurrences.weeklyGroupId,
      isPaid: weeklyOccurrences.isPaid,
    })
    .from(weeklyOccurrences)
    .innerJoin(weeklyRecurringGroups, eq(weeklyOccurrences.weeklyGroupId, weeklyRecurringGroups.id))
    .where(
      and(
        eq(weeklyRecurringGroups.categoryId, categoryId),
        eq(weeklyOccurrences.referenceMonth, referenceMonth)
      )
    )
    .orderBy(desc(weeklyOccurrences.date));
}

// ============================================================================
// Installment Group Info
// ============================================================================

/**
 * Installment information for a single installment group.
 */
export interface InstallmentInfo {
  /** 1-based position of the current parcel within the group */
  currentIndex: number;
  /** Total number of parcels in the installment group */
  totalParcels: number;
}

/**
 * Batch query for installment group info.
 *
 * For each installmentGroupId, returns the ordered position of the transaction
 * matching the target referenceMonth and the total count of parcels in that group.
 *
 * Uses a single query with `IN (...)` to avoid N+1 query patterns.
 * Results are ordered by installmentGroupId and referenceMonth ascending
 * to enable efficient grouping and index computation.
 *
 * @param groupIds - Array of unique installmentGroupId values
 * @param referenceMonth - The current reference month (YYYY-MM) to identify the target parcel
 * @returns Map from installmentGroupId to InstallmentInfo
 *
 * **Validates: Requirements 4.6, 7.1**
 *
 * @example
 * ```typescript
 * const info = await getInstallmentGroupInfoBatch(['group-1', 'group-2'], '2024-03');
 * // info.get('group-1') => { currentIndex: 3, totalParcels: 12 }
 * // info.get('group-2') => { currentIndex: 1, totalParcels: 6 }
 * ```
 */
export async function getInstallmentGroupInfoBatch(
  groupIds: string[],
  referenceMonth: string
): Promise<Map<string, InstallmentInfo>> {
  const result = new Map<string, InstallmentInfo>();

  if (groupIds.length === 0) {
    return result;
  }

  const db = getDb();

  const rows = await db
    .select({
      installmentGroupId: transactions.installmentGroupId,
      referenceMonth: transactions.referenceMonth,
    })
    .from(transactions)
    .where(inArray(transactions.installmentGroupId, groupIds))
    .orderBy(asc(transactions.installmentGroupId), asc(transactions.referenceMonth));

  // Group rows by installmentGroupId
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.installmentGroupId) continue;
    const months = grouped.get(row.installmentGroupId);
    if (months) {
      months.push(row.referenceMonth);
    } else {
      grouped.set(row.installmentGroupId, [row.referenceMonth]);
    }
  }

  // For each group, find the 1-based index of the target referenceMonth
  for (const [groupId, months] of grouped) {
    const index = months.indexOf(referenceMonth);
    if (index !== -1) {
      result.set(groupId, {
        currentIndex: index + 1,
        totalParcels: months.length,
      });
    }
  }

  return result;
}
