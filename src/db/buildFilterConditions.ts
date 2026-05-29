/**
 * Query builder for transaction filter conditions.
 *
 * Builds a Drizzle ORM `and(...)` condition combining all non-null filters
 * from PaginationFilters. Used by usePaginatedTransactions to construct
 * WHERE clauses for filtered, paginated queries.
 *
 * **Validates: Requirements 7.1, 7.3, 4.3, 5.2, 5.3, 5.4, 8.2, 8.3, 8.4**
 */
import { eq, and, sql, inArray, type SQL } from 'drizzle-orm';
import { transactions } from './schema';

/**
 * Filter parameters for paginated transaction queries.
 * Combines reference month (required) with optional category, value range,
 * and date range filters.
 */
export interface PaginationFilters {
  /** Reference month in YYYY-MM format (required) */
  referenceMonth: string;
  /** Category IDs to filter by (OR logic within this filter) */
  categoryIds?: string[];
  /** Minimum absolute amount in cents (inclusive) */
  minAmount?: number | null;
  /** Maximum absolute amount in cents (inclusive) */
  maxAmount?: number | null;
  /** Start date filter as ISO string YYYY-MM-DD (inclusive) */
  startDate?: string | null;
  /** End date filter as ISO string YYYY-MM-DD (inclusive) */
  endDate?: string | null;
  /** When true, show only items where isPaid is false */
  pendingOnly?: boolean;
}

/**
 * Builds Drizzle WHERE conditions from pagination filter parameters.
 *
 * Combines all non-null filters using AND logic:
 * - referenceMonth: always applied (eq match)
 * - categoryIds: OR logic via inArray (only if non-empty array)
 * - minAmount/maxAmount: ABS(amount) comparisons via sql template
 * - startDate/endDate: date string comparisons via sql template
 *
 * @param filters - The pagination filter parameters
 * @returns Combined SQL condition, or undefined if no conditions apply
 */
export function buildFilterConditions(filters: PaginationFilters): SQL | undefined {
  const conditions: SQL[] = [];

  // Always filter by reference month
  conditions.push(eq(transactions.referenceMonth, filters.referenceMonth));

  // Category filter (OR across selected IDs)
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    conditions.push(inArray(transactions.categoryId, filters.categoryIds));
  }

  // Value range filter (on absolute amount)
  if (filters.minAmount != null) {
    conditions.push(sql`ABS(${transactions.amount}) >= ${filters.minAmount}`);
  }
  if (filters.maxAmount != null) {
    conditions.push(sql`ABS(${transactions.amount}) <= ${filters.maxAmount}`);
  }

  // Date range filter
  if (filters.startDate) {
    conditions.push(sql`${transactions.date} >= ${filters.startDate}`);
  }
  if (filters.endDate) {
    conditions.push(sql`${transactions.date} <= ${filters.endDate}`);
  }

  // Pending only filter (show only unpaid items)
  if (filters.pendingOnly) {
    conditions.push(eq(transactions.isPaid, false));
  }

  return and(...conditions);
}
