/**
 * Unit tests for useUnifiedStatementItems hook
 *
 * Tests the buildUnifiedStatementItems pure function which merges
 * paginated transactions and weekly occurrences into a sorted
 * UnifiedStatementItem[].
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.5, 4.2, 4.3, 4.4**
 */
import { buildUnifiedStatementItems } from '../useUnifiedStatementItems';
import type { PaginatedTransactionWithCategory } from '../usePaginatedTransactions';
import type { WeeklyOccurrence, WeeklyRecurringGroup } from '../../types/weeklyRecurring';

// ─── Test Helpers ────────────────────────────────────────────────────────────

function createTransaction(
  overrides: Partial<PaginatedTransactionWithCategory> = {}
): PaginatedTransactionWithCategory {
  return {
    id: `txn-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Test Transaction',
    date: new Date('2024-06-15'),
    amount: -5000,
    description: '',
    categoryId: 'cat-1',
    originId: null,
    batchId: null,
    referenceMonth: '2024-06',
    needsReview: false,
    isExcludedFromTotals: false,
    duplicateOf: null,
    installmentGroupId: null,
    recurringId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: null,
    ...overrides,
  };
}

function createGroup(overrides: Partial<WeeklyRecurringGroup> = {}): WeeklyRecurringGroup {
  return {
    id: `group-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Weekly Expense',
    amount: 2000,
    dayOfWeek: 1,
    categoryId: 'cat-1',
    categoryType: 'expense',
    description: '',
    originId: null,
    startDate: '2024-01-01',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function createOccurrence(
  overrides: Partial<WeeklyOccurrence> = {}
): WeeklyOccurrence {
  return {
    id: `occ-${Math.random().toString(36).slice(2, 8)}`,
    weeklyGroupId: 'group-1',
    date: '2024-06-03',
    referenceMonth: '2024-06',
    amount: 2000,
    description: '',
    isValueEdited: false,
    isPaid: false,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('buildUnifiedStatementItems', () => {
  describe('basic merging', () => {
    it('returns empty array when no transactions and no occurrences', () => {
      const result = buildUnifiedStatementItems([], [], [], false, new Set());
      expect(result).toEqual([]);
    });

    it('returns transaction items when no weekly groups exist', () => {
      const txns = [
        createTransaction({ id: 'txn-1', date: new Date('2024-06-15') }),
        createTransaction({ id: 'txn-2', date: new Date('2024-06-10') }),
      ];

      const result = buildUnifiedStatementItems(txns, [], [], false, new Set());

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('transaction');
      expect(result[1].type).toBe('transaction');
    });

    it('returns weekly group headers when groups have occurrences', () => {
      const group = createGroup({ id: 'group-1' });
      const occurrences = [
        createOccurrence({ weeklyGroupId: 'group-1', date: '2024-06-03' }),
        createOccurrence({ weeklyGroupId: 'group-1', date: '2024-06-10' }),
      ];

      const result = buildUnifiedStatementItems([], occurrences, [group], false, new Set());

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('weeklyGroupHeader');
    });

    it('skips groups with no occurrences for the month', () => {
      const group = createGroup({ id: 'group-1' });
      // No occurrences for this group
      const result = buildUnifiedStatementItems([], [], [group], false, new Set());

      expect(result).toHaveLength(0);
    });
  });

  describe('sorting', () => {
    it('sorts all items by date descending (most recent first)', () => {
      const txns = [
        createTransaction({ id: 'txn-1', date: new Date('2024-06-20') }),
        createTransaction({ id: 'txn-2', date: new Date('2024-06-05') }),
      ];
      const group = createGroup({ id: 'group-1' });
      const occurrences = [
        createOccurrence({ weeklyGroupId: 'group-1', date: '2024-06-10' }),
        createOccurrence({ weeklyGroupId: 'group-1', date: '2024-06-17' }),
      ];

      const result = buildUnifiedStatementItems(
        txns,
        occurrences,
        [group],
        false,
        new Set()
      );

      // txn-1 (Jun 20) > group header (earliest: Jun 10) > txn-2 (Jun 5)
      expect(result[0].type).toBe('transaction');
      expect((result[0] as any).data.id).toBe('txn-1');
      expect(result[1].type).toBe('weeklyGroupHeader');
      expect(result[2].type).toBe('transaction');
      expect((result[2] as any).data.id).toBe('txn-2');
    });

    it('uses earliest occurrence date for group header sorting', () => {
      const txns = [
        createTransaction({ id: 'txn-1', date: new Date('2024-06-08') }),
      ];
      const group = createGroup({ id: 'group-1' });
      const occurrences = [
        createOccurrence({ weeklyGroupId: 'group-1', date: '2024-06-03' }),
        createOccurrence({ weeklyGroupId: 'group-1', date: '2024-06-10' }),
      ];

      const result = buildUnifiedStatementItems(
        txns,
        occurrences,
        [group],
        false,
        new Set()
      );

      // txn-1 (Jun 8) > group header (earliest: Jun 3)
      expect(result[0].type).toBe('transaction');
      expect(result[1].type).toBe('weeklyGroupHeader');
    });
  });

  describe('expand/collapse', () => {
    it('does not include parcels when group is collapsed', () => {
      const group = createGroup({ id: 'group-1' });
      const occurrences = [
        createOccurrence({ weeklyGroupId: 'group-1', date: '2024-06-03' }),
        createOccurrence({ weeklyGroupId: 'group-1', date: '2024-06-10' }),
      ];

      const result = buildUnifiedStatementItems(
        [],
        occurrences,
        [group],
        false,
        new Set() // not expanded
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('weeklyGroupHeader');
      expect(result[0].data.isExpanded).toBe(false);
    });

    it('includes parcels immediately after header when group is expanded', () => {
      const group = createGroup({ id: 'group-1' });
      const occurrences = [
        createOccurrence({ id: 'occ-1', weeklyGroupId: 'group-1', date: '2024-06-10' }),
        createOccurrence({ id: 'occ-2', weeklyGroupId: 'group-1', date: '2024-06-03' }),
      ];

      const result = buildUnifiedStatementItems(
        [],
        occurrences,
        [group],
        false,
        new Set(['group-1']) // expanded
      );

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('weeklyGroupHeader');
      expect(result[0].data.isExpanded).toBe(true);
      expect(result[1].type).toBe('weeklyParcel');
      expect(result[2].type).toBe('weeklyParcel');
    });

    it('sorts parcels by date ascending within expanded group', () => {
      const group = createGroup({ id: 'group-1' });
      const occurrences = [
        createOccurrence({ id: 'occ-1', weeklyGroupId: 'group-1', date: '2024-06-17' }),
        createOccurrence({ id: 'occ-2', weeklyGroupId: 'group-1', date: '2024-06-03' }),
        createOccurrence({ id: 'occ-3', weeklyGroupId: 'group-1', date: '2024-06-10' }),
      ];

      const result = buildUnifiedStatementItems(
        [],
        occurrences,
        [group],
        false,
        new Set(['group-1'])
      );

      // Parcels should be sorted ascending: Jun 3, Jun 10, Jun 17
      const parcels = result.filter((item) => item.type === 'weeklyParcel');
      expect(parcels).toHaveLength(3);
      expect((parcels[0] as any).data.date).toBe('2024-06-03');
      expect((parcels[1] as any).data.date).toBe('2024-06-10');
      expect((parcels[2] as any).data.date).toBe('2024-06-17');
    });

    it('parcels appear between header and next item in sorted order', () => {
      const txns = [
        createTransaction({ id: 'txn-1', date: new Date('2024-06-01') }),
      ];
      const group = createGroup({ id: 'group-1' });
      const occurrences = [
        createOccurrence({ id: 'occ-1', weeklyGroupId: 'group-1', date: '2024-06-10' }),
        createOccurrence({ id: 'occ-2', weeklyGroupId: 'group-1', date: '2024-06-17' }),
      ];

      const result = buildUnifiedStatementItems(
        txns,
        occurrences,
        [group],
        false,
        new Set(['group-1'])
      );

      // Group header (earliest: Jun 10) > parcels > txn-1 (Jun 1)
      expect(result[0].type).toBe('weeklyGroupHeader');
      expect(result[1].type).toBe('weeklyParcel');
      expect(result[2].type).toBe('weeklyParcel');
      expect(result[3].type).toBe('transaction');
    });
  });

  describe('group header data', () => {
    it('calculates monthly total as sum of all occurrence amounts', () => {
      const group = createGroup({ id: 'group-1' });
      const occurrences = [
        createOccurrence({ weeklyGroupId: 'group-1', amount: 1000 }),
        createOccurrence({ weeklyGroupId: 'group-1', amount: 2000 }),
        createOccurrence({ weeklyGroupId: 'group-1', amount: 1500 }),
      ];

      const result = buildUnifiedStatementItems(
        [],
        occurrences,
        [group],
        false,
        new Set()
      );

      expect(result[0].type).toBe('weeklyGroupHeader');
      expect(result[0].data.monthlyTotal).toBe(4500);
    });

    it('calculates paid and pending counts correctly', () => {
      const group = createGroup({ id: 'group-1' });
      const occurrences = [
        createOccurrence({ weeklyGroupId: 'group-1', isPaid: true }),
        createOccurrence({ weeklyGroupId: 'group-1', isPaid: false }),
        createOccurrence({ weeklyGroupId: 'group-1', isPaid: true }),
        createOccurrence({ weeklyGroupId: 'group-1', isPaid: false }),
      ];

      const result = buildUnifiedStatementItems(
        [],
        occurrences,
        [group],
        false,
        new Set()
      );

      const header = result[0].data as any;
      expect(header.paidCount).toBe(2);
      expect(header.pendingCount).toBe(2);
      expect(header.totalCount).toBe(4);
    });
  });

  describe('pendingOnly filter', () => {
    it('excludes groups where all occurrences are paid', () => {
      const group = createGroup({ id: 'group-1' });
      const occurrences = [
        createOccurrence({ weeklyGroupId: 'group-1', isPaid: true }),
        createOccurrence({ weeklyGroupId: 'group-1', isPaid: true }),
      ];

      const result = buildUnifiedStatementItems(
        [],
        occurrences,
        [group],
        true, // pendingOnly
        new Set()
      );

      expect(result).toHaveLength(0);
    });

    it('includes groups with at least one pending occurrence', () => {
      const group = createGroup({ id: 'group-1' });
      const occurrences = [
        createOccurrence({ weeklyGroupId: 'group-1', isPaid: true }),
        createOccurrence({ weeklyGroupId: 'group-1', isPaid: false }),
      ];

      const result = buildUnifiedStatementItems(
        [],
        occurrences,
        [group],
        true, // pendingOnly
        new Set()
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('weeklyGroupHeader');
    });

    it('shows only pending total when pendingOnly is active', () => {
      const group = createGroup({ id: 'group-1' });
      const occurrences = [
        createOccurrence({ weeklyGroupId: 'group-1', amount: 1000, isPaid: true }),
        createOccurrence({ weeklyGroupId: 'group-1', amount: 2000, isPaid: false }),
        createOccurrence({ weeklyGroupId: 'group-1', amount: 3000, isPaid: false }),
      ];

      const result = buildUnifiedStatementItems(
        [],
        occurrences,
        [group],
        true, // pendingOnly
        new Set()
      );

      const header = result[0].data as any;
      // monthlyTotal should only sum pending occurrences
      expect(header.monthlyTotal).toBe(5000); // 2000 + 3000
    });

    it('shows only pending parcels when expanded with pendingOnly', () => {
      const group = createGroup({ id: 'group-1' });
      const occurrences = [
        createOccurrence({ id: 'occ-1', weeklyGroupId: 'group-1', isPaid: true, date: '2024-06-03' }),
        createOccurrence({ id: 'occ-2', weeklyGroupId: 'group-1', isPaid: false, date: '2024-06-10' }),
        createOccurrence({ id: 'occ-3', weeklyGroupId: 'group-1', isPaid: false, date: '2024-06-17' }),
      ];

      const result = buildUnifiedStatementItems(
        [],
        occurrences,
        [group],
        true, // pendingOnly
        new Set(['group-1']) // expanded
      );

      // Header + 2 pending parcels (occ-2, occ-3)
      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('weeklyGroupHeader');
      expect(result[1].type).toBe('weeklyParcel');
      expect(result[2].type).toBe('weeklyParcel');
      expect((result[1] as any).data.id).toBe('occ-2');
      expect((result[2] as any).data.id).toBe('occ-3');
    });

    it('still counts all occurrences in paidCount/pendingCount/totalCount', () => {
      const group = createGroup({ id: 'group-1' });
      const occurrences = [
        createOccurrence({ weeklyGroupId: 'group-1', isPaid: true }),
        createOccurrence({ weeklyGroupId: 'group-1', isPaid: false }),
        createOccurrence({ weeklyGroupId: 'group-1', isPaid: false }),
      ];

      const result = buildUnifiedStatementItems(
        [],
        occurrences,
        [group],
        true,
        new Set()
      );

      const header = result[0].data as any;
      expect(header.paidCount).toBe(1);
      expect(header.pendingCount).toBe(2);
      expect(header.totalCount).toBe(3);
    });
  });

  describe('multiple groups', () => {
    it('handles multiple groups sorted by their earliest occurrence date', () => {
      const group1 = createGroup({ id: 'group-1', title: 'Group A' });
      const group2 = createGroup({ id: 'group-2', title: 'Group B' });
      const occurrences = [
        createOccurrence({ weeklyGroupId: 'group-1', date: '2024-06-15' }),
        createOccurrence({ weeklyGroupId: 'group-2', date: '2024-06-03' }),
      ];

      const result = buildUnifiedStatementItems(
        [],
        occurrences,
        [group1, group2],
        false,
        new Set()
      );

      // group-1 (Jun 15) should come before group-2 (Jun 3) in descending order
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('weeklyGroupHeader');
      expect((result[0].data as any).group.id).toBe('group-1');
      expect(result[1].type).toBe('weeklyGroupHeader');
      expect((result[1].data as any).group.id).toBe('group-2');
    });
  });
});
