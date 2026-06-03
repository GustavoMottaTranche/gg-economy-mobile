/**
 * Category Detail Computation Utilities
 *
 * Pure computation functions for the Category Detail Screen enhancements.
 * These operate on pre-fetched data with no side effects or database calls.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Installment information for a single installment group.
 * Mirrors the InstallmentInfo interface from db/queries/categoryDetail.ts
 * to keep this utils module free of database dependencies.
 */
export interface InstallmentInfo {
  /** 1-based position of the current parcel within the group */
  currentIndex: number;
  /** Total number of parcels in the installment group */
  totalParcels: number;
}

/**
 * Payment summary for a category's items.
 */
export interface PaymentSummary {
  /** Sum of abs(amount) for isPaid=true items */
  paidTotal: number;
  /** Sum of abs(amount) for isPaid=false items */
  pendingTotal: number;
  /** paidTotal + pendingTotal */
  grandTotal: number;
}

/**
 * Represents a category detail item with payment status and date for sorting.
 * This is the shape expected by sortByPaymentStatusAndDate.
 */
export interface CategoryDetailItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: 'transaction' | 'weekly';
  weeklyGroupId?: string;
  isPaid: boolean;
  installmentGroupId?: string | null;
  recurringId?: string | null;
}

// ============================================================================
// Computation Functions
// ============================================================================

/**
 * Computes the installment index for a target month within an ordered list of months.
 *
 * Given an ordered array of reference months (sorted ascending) representing all parcels
 * in an installment group, finds the 1-based position of the target month and returns
 * the index along with the total number of parcels.
 *
 * @param orderedMonths - Array of reference months (YYYY-MM format), sorted ascending
 * @param targetMonth - The reference month to find (YYYY-MM format)
 * @returns InstallmentInfo with currentIndex (1-based) and totalParcels, or null if not found
 *
 * **Validates: Requirements 1.3, 1.4**
 *
 * @example
 * ```typescript
 * computeInstallmentIndex(['2024-01', '2024-02', '2024-03'], '2024-02');
 * // => { currentIndex: 2, totalParcels: 3 }
 *
 * computeInstallmentIndex(['2024-01', '2024-02', '2024-03'], '2024-05');
 * // => null
 * ```
 */
export function computeInstallmentIndex(
  orderedMonths: string[],
  targetMonth: string
): InstallmentInfo | null {
  const index = orderedMonths.indexOf(targetMonth);

  if (index === -1) {
    return null;
  }

  return {
    currentIndex: index + 1,
    totalParcels: orderedMonths.length,
  };
}

/**
 * Computes the payment summary (paid total, pending total, grand total)
 * from a list of items with amount and payment status.
 *
 * Uses Math.abs(amount) for each item to ensure all values are positive
 * regardless of how amounts are stored (negative for expenses, etc.).
 *
 * @param items - Array of items with amount and isPaid fields
 * @returns PaymentSummary with paidTotal, pendingTotal, and grandTotal
 *
 * **Validates: Requirements 3.2, 3.3, 3.4, 3.7**
 */
export function computePaymentSummary(
  items: { amount: number; isPaid: boolean }[]
): PaymentSummary {
  let paidTotal = 0;
  let pendingTotal = 0;

  for (const item of items) {
    const absAmount = Math.abs(item.amount);
    if (item.isPaid) {
      paidTotal += absAmount;
    } else {
      pendingTotal += absAmount;
    }
  }

  return {
    paidTotal,
    pendingTotal,
    grandTotal: paidTotal + pendingTotal,
  };
}

/**
 * Sorts category detail items by payment status (paid first) then date descending.
 *
 * Creates a new sorted array without mutating the input. Uses a stable sort
 * comparator that:
 * - Primary: places paid items (isPaid=true) before pending items (isPaid=false)
 * - Secondary: orders by date descending (most recent first) within each group
 *
 * @param items - Array of CategoryDetailItem to sort
 * @returns A new array sorted by payment status and date
 *
 * **Validates: Requirements 2.7**
 */
export function sortByPaymentStatusAndDate(items: CategoryDetailItem[]): CategoryDetailItem[] {
  return items.slice().sort((a, b) => {
    // Primary: paid (true) before pending (false)
    if (a.isPaid !== b.isPaid) {
      return a.isPaid ? -1 : 1;
    }
    // Secondary: date descending within each group
    return b.date.localeCompare(a.date);
  });
}
