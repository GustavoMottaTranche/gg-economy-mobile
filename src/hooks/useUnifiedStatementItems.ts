/**
 * useUnifiedStatementItems Hook
 *
 * Merges paginated transactions and weekly occurrences into a single
 * sorted UnifiedStatementItem[] for rendering in the statement FlashList.
 *
 * Sorting rules:
 * - All items sorted by date descending (most recent first)
 * - `transaction` items use their `date` field
 * - `weeklyGroupHeader` items use the earliest occurrence date in the group for that month
 * - `weeklyParcel` items appear immediately after their parent header when expanded,
 *   sorted by date ascending within the group
 *
 * Filtering rules:
 * - When `pendingOnly` is true, transactions are already filtered at the query level
 * - For weekly groups, include the group if it has at least one pending occurrence
 * - When pendingOnly is active and a group is displayed, show only pending parcels count
 *   and pending total
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.5, 4.2, 4.3, 4.4**
 */
import { useMemo } from 'react';
import type { PaginatedTransactionWithCategory } from './usePaginatedTransactions';
import type { WeeklyOccurrence, WeeklyRecurringGroup } from '../types/weeklyRecurring';
import type {
  UnifiedStatementItem,
  WeeklyGroupHeaderData,
} from '../types/unifiedStatementItem';

/**
 * Parameters for the useUnifiedStatementItems hook.
 */
export interface UseUnifiedStatementItemsParams {
  /** Paginated transactions (already filtered at query level) */
  transactions: PaginatedTransactionWithCategory[];
  /** Weekly occurrences for the current month */
  weeklyOccurrences: WeeklyOccurrence[];
  /** All active weekly recurring groups */
  weeklyGroups: WeeklyRecurringGroup[];
  /** Whether to show only pending (unpaid) items */
  pendingOnly: boolean;
  /** Set of group IDs that are currently expanded */
  expandedGroupIds: Set<string>;
}

/**
 * Gets the sort date for a unified statement item (used for top-level sorting).
 */
function getItemSortDate(item: UnifiedStatementItem): string {
  switch (item.type) {
    case 'transaction':
      // Transaction date is a Date object, convert to ISO string for comparison
      return item.data.date instanceof Date
        ? item.data.date.toISOString().split('T')[0]
        : String(item.data.date);
    case 'weeklyGroupHeader':
      // This is set to the earliest occurrence date when building the header
      return '';
    case 'weeklyParcel':
      return item.data.date;
  }
}

/**
 * Groups occurrences by their weeklyGroupId.
 */
function groupOccurrencesByGroup(
  occurrences: WeeklyOccurrence[]
): Map<string, WeeklyOccurrence[]> {
  const map = new Map<string, WeeklyOccurrence[]>();
  for (const occ of occurrences) {
    const existing = map.get(occ.weeklyGroupId);
    if (existing) {
      existing.push(occ);
    } else {
      map.set(occ.weeklyGroupId, [occ]);
    }
  }
  return map;
}

/**
 * Builds a WeeklyGroupHeaderData object from a group and its occurrences.
 */
function buildGroupHeaderData(
  group: WeeklyRecurringGroup,
  occurrences: WeeklyOccurrence[],
  isExpanded: boolean,
  pendingOnly: boolean
): WeeklyGroupHeaderData {
  const relevantOccurrences = pendingOnly
    ? occurrences.filter((o) => !o.isPaid)
    : occurrences;

  const monthlyTotal = relevantOccurrences.reduce((sum, o) => sum + o.amount, 0);
  const paidCount = occurrences.filter((o) => o.isPaid === true).length;
  const pendingCount = occurrences.filter((o) => !o.isPaid).length;
  const totalCount = occurrences.length;

  return {
    group,
    monthlyTotal,
    paidCount,
    pendingCount,
    totalCount,
    isExpanded,
  };
}

/**
 * Gets the earliest occurrence date for a group (used for sorting the group header).
 */
function getEarliestOccurrenceDate(occurrences: WeeklyOccurrence[]): string {
  if (occurrences.length === 0) return '';
  return occurrences.reduce((earliest, occ) => {
    return occ.date < earliest ? occ.date : earliest;
  }, occurrences[0].date);
}

/**
 * Merges paginated transactions and weekly occurrences into a unified,
 * sorted statement item list.
 *
 * @param params - Hook parameters including transactions, occurrences, groups, filters, and expansion state
 * @returns Sorted array of UnifiedStatementItem for FlashList rendering
 */
export function useUnifiedStatementItems(
  params: UseUnifiedStatementItemsParams
): UnifiedStatementItem[] {
  const { transactions, weeklyOccurrences, weeklyGroups, pendingOnly, expandedGroupIds } = params;

  return useMemo(() => {
    return buildUnifiedStatementItems(
      transactions,
      weeklyOccurrences,
      weeklyGroups,
      pendingOnly,
      expandedGroupIds
    );
  }, [transactions, weeklyOccurrences, weeklyGroups, pendingOnly, expandedGroupIds]);
}

/**
 * Pure function that builds the unified statement items array.
 * Extracted for testability without React hooks.
 */
export function buildUnifiedStatementItems(
  transactions: PaginatedTransactionWithCategory[],
  weeklyOccurrences: WeeklyOccurrence[],
  weeklyGroups: WeeklyRecurringGroup[],
  pendingOnly: boolean,
  expandedGroupIds: Set<string>
): UnifiedStatementItem[] {
  // 1. Build transaction items
  const transactionItems: UnifiedStatementItem[] = transactions.map((t) => ({
    type: 'transaction' as const,
    data: t,
  }));

  // 2. Group occurrences by their weeklyGroupId
  const occurrencesByGroup = groupOccurrencesByGroup(weeklyOccurrences);

  // 3. Build weekly group items (headers + optional parcels)
  const weeklyItems: UnifiedStatementItem[] = [];

  for (const group of weeklyGroups) {
    const groupOccurrences = occurrencesByGroup.get(group.id) ?? [];

    // Skip groups with no occurrences for this month
    if (groupOccurrences.length === 0) continue;

    // When pendingOnly is active, only include groups with at least one pending occurrence
    if (pendingOnly) {
      const hasPendingOccurrence = groupOccurrences.some((o) => !o.isPaid);
      if (!hasPendingOccurrence) continue;
    }

    const isExpanded = expandedGroupIds.has(group.id);

    // Build the group header
    const headerData = buildGroupHeaderData(group, groupOccurrences, isExpanded, pendingOnly);

    // Store the earliest date for sorting purposes
    const earliestDate = getEarliestOccurrenceDate(groupOccurrences);

    // We'll attach the sort date as a property we can use during sorting
    const headerItem: UnifiedStatementItem & { _sortDate?: string } = {
      type: 'weeklyGroupHeader' as const,
      data: headerData,
      _sortDate: earliestDate,
    };

    weeklyItems.push(headerItem);

    // If expanded, add parcel items (sorted by date ascending within the group)
    if (isExpanded) {
      const parcelsToShow = pendingOnly
        ? groupOccurrences.filter((o) => !o.isPaid)
        : groupOccurrences;

      // Sort parcels by date ascending within the group
      const sortedParcels = [...parcelsToShow].sort((a, b) => a.date.localeCompare(b.date));

      for (const occ of sortedParcels) {
        weeklyItems.push({
          type: 'weeklyParcel' as const,
          data: occ,
          groupId: group.id,
        });
      }
    }
  }

  // 4. Merge transaction items with weekly group headers (not parcels yet)
  // We need to sort headers among transactions, then insert parcels after their headers

  // Separate headers from parcels
  const headers: (UnifiedStatementItem & { _sortDate?: string })[] = [];
  const parcelsByGroupId = new Map<string, UnifiedStatementItem[]>();

  for (const item of weeklyItems) {
    if (item.type === 'weeklyGroupHeader') {
      headers.push(item);
    } else if (item.type === 'weeklyParcel') {
      const groupId = item.groupId;
      const existing = parcelsByGroupId.get(groupId);
      if (existing) {
        existing.push(item);
      } else {
        parcelsByGroupId.set(groupId, [item]);
      }
    }
  }

  // 5. Combine transactions and headers, sort by date descending
  const sortableItems: (UnifiedStatementItem & { _sortDate?: string })[] = [
    ...transactionItems.map((item) => ({
      ...item,
      _sortDate: getItemSortDate(item),
    })),
    ...headers,
  ];

  sortableItems.sort((a, b) => {
    const dateA = a._sortDate ?? '';
    const dateB = b._sortDate ?? '';
    // Descending order (most recent first)
    return dateB.localeCompare(dateA);
  });

  // 6. Build final array: insert parcels immediately after their group header
  const result: UnifiedStatementItem[] = [];

  for (const item of sortableItems) {
    // Add the item (without the internal _sortDate property)
    if (item.type === 'weeklyGroupHeader') {
      result.push({ type: item.type, data: item.data });
      // Insert parcels immediately after the header
      const groupId = item.data.group.id;
      const parcels = parcelsByGroupId.get(groupId);
      if (parcels) {
        result.push(...parcels);
      }
    } else {
      result.push({ type: item.type, data: item.data } as UnifiedStatementItem);
    }
  }

  return result;
}

export default useUnifiedStatementItems;
