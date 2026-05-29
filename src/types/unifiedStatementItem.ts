import type { PaginatedTransactionWithCategory } from '../hooks/usePaginatedTransactions';
import type { WeeklyOccurrence, WeeklyRecurringGroup } from './weeklyRecurring';

/**
 * Summary data for a weekly recurring group header in the unified statement list.
 */
export interface WeeklyGroupHeaderData {
  group: WeeklyRecurringGroup;
  monthlyTotal: number;
  paidCount: number;
  pendingCount: number;
  totalCount: number;
  isExpanded: boolean;
}

/**
 * Discriminated union representing all possible item types in the unified statement list.
 * Used by FlashList's renderItem to determine which component to render.
 */
export type UnifiedStatementItem =
  | { type: 'transaction'; data: PaginatedTransactionWithCategory }
  | { type: 'weeklyGroupHeader'; data: WeeklyGroupHeaderData }
  | { type: 'weeklyParcel'; data: WeeklyOccurrence; groupId: string };
