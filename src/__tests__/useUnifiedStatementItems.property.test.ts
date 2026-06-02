// Feature: statement-payment-integration, Property 1: Unified list is sorted by date descending
// Feature: statement-payment-integration, Property 5: Pending filter returns only unpaid items

/**
 * Property 5: Pending filter returns only unpaid items
 *
 * For any set of UnifiedStatementItem with mixed isPaid states, when pendingOnly
 * is true, the filtered output SHALL contain only items where isPaid === false.
 * For weekly groups, a group SHALL appear in the filtered output if and only if
 * it has at least one occurrence where isPaid === false.
 *
 * **Validates: Requirements 4.2, 4.3**
 */

import fc from 'fast-check';
import { buildUnifiedStatementItems } from '../hooks/useUnifiedStatementItems';
import type { PaginatedTransactionWithCategory } from '../hooks/usePaginatedTransactions';
import type { WeeklyOccurrence, WeeklyRecurringGroup } from '../types/weeklyRecurring';

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/**
 * Generates a valid YYYY-MM-DD date string within a fixed month (2024-06).
 */
const dateInMonthArb = fc
  .integer({ min: 1, max: 28 })
  .map((day) => `2024-06-${String(day).padStart(2, '0')}`);

/**
 * Generates a minimal PaginatedTransactionWithCategory.
 * Transactions are already filtered at query level when pendingOnly is true,
 * so we only pass unpaid transactions when testing pendingOnly=true.
 */
const transactionArb = (isPaid: boolean): fc.Arbitrary<PaginatedTransactionWithCategory> =>
  fc
    .record({
      id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 20 }),
      day: fc.integer({ min: 1, max: 28 }),
      amount: fc.integer({ min: -999999, max: 999999 }).filter((a) => a !== 0),
    })
    .map(({ id, title, day, amount }) => ({
      id,
      title,
      date: new Date(`2024-06-${String(day).padStart(2, '0')}T00:00:00.000Z`),
      amount,
      description: '',
      categoryId: null,
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
      isPaid,
    }));

/**
 * Generates a WeeklyRecurringGroup with a given ID.
 */
const weeklyGroupArb = (groupId: string): fc.Arbitrary<WeeklyRecurringGroup> =>
  fc.record({ title: fc.string({ minLength: 1, maxLength: 20 }) }).map(({ title }) => ({
    id: groupId,
    title,
    amount: 1000,
    dayOfWeek: 1,
    categoryId: 'cat-1',
    categoryType: 'expense' as const,
    description: '',
    originId: null,
    startDate: '2024-01-01',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }));

/**
 * Generates a WeeklyOccurrence with a specific isPaid state.
 */
const occurrenceArb = (groupId: string, isPaid: boolean): fc.Arbitrary<WeeklyOccurrence> =>
  fc
    .record({
      id: fc.uuid(),
      date: dateInMonthArb,
      amount: fc.integer({ min: 100, max: 99999 }),
    })
    .map(({ id, date, amount }) => ({
      id,
      weeklyGroupId: groupId,
      date,
      referenceMonth: '2024-06',
      amount,
      description: '',
      isValueEdited: false,
      isPaid,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }));

/**
 * Generates a group with mixed paid/unpaid occurrences.
 * Returns the group, its occurrences, and metadata about paid/unpaid counts.
 */
const groupWithMixedOccurrencesArb = fc.uuid().chain((groupId) =>
  fc
    .tuple(
      weeklyGroupArb(groupId),
      fc.array(occurrenceArb(groupId, false), { minLength: 0, maxLength: 4 }),
      fc.array(occurrenceArb(groupId, true), { minLength: 0, maxLength: 4 })
    )
    .filter(([, unpaid, paid]) => unpaid.length + paid.length > 0)
    .map(([group, unpaid, paid]) => ({
      group,
      occurrences: [...unpaid, ...paid],
      unpaidCount: unpaid.length,
      paidCount: paid.length,
    }))
);

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: statement-payment-integration, Property 5: Pending filter returns only unpaid items', () => {
  /**
   * **Validates: Requirements 4.2, 4.3**
   */

  it('when pendingOnly is true, weekly groups with only paid occurrences are excluded', () => {
    fc.assert(
      fc.property(
        fc.array(groupWithMixedOccurrencesArb, { minLength: 1, maxLength: 5 }),
        (groupsData) => {
          const weeklyGroups = groupsData.map((g) => g.group);
          const allOccurrences = groupsData.flatMap((g) => g.occurrences);

          const result = buildUnifiedStatementItems(
            [],
            allOccurrences,
            weeklyGroups,
            true, // pendingOnly
            new Set<string>()
          );

          // Groups that have NO unpaid occurrences should not appear
          const allPaidGroupIds = groupsData
            .filter((g) => g.unpaidCount === 0)
            .map((g) => g.group.id);

          const headerGroupIds = result
            .filter((item) => item.type === 'weeklyGroupHeader')
            .map((item) => item.data.group.id);

          for (const paidGroupId of allPaidGroupIds) {
            expect(headerGroupIds).not.toContain(paidGroupId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when pendingOnly is true, weekly groups with at least one unpaid occurrence are included', () => {
    fc.assert(
      fc.property(
        fc.array(groupWithMixedOccurrencesArb, { minLength: 1, maxLength: 5 }),
        (groupsData) => {
          const weeklyGroups = groupsData.map((g) => g.group);
          const allOccurrences = groupsData.flatMap((g) => g.occurrences);

          const result = buildUnifiedStatementItems(
            [],
            allOccurrences,
            weeklyGroups,
            true, // pendingOnly
            new Set<string>()
          );

          // Groups that have at least one unpaid occurrence should appear
          const groupsWithUnpaid = groupsData
            .filter((g) => g.unpaidCount > 0)
            .map((g) => g.group.id);

          const headerGroupIds = result
            .filter((item) => item.type === 'weeklyGroupHeader')
            .map((item) => item.data.group.id);

          for (const unpaidGroupId of groupsWithUnpaid) {
            expect(headerGroupIds).toContain(unpaidGroupId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when pendingOnly is true and groups are expanded, only unpaid parcels are shown', () => {
    fc.assert(
      fc.property(
        fc.array(groupWithMixedOccurrencesArb, { minLength: 1, maxLength: 5 }),
        (groupsData) => {
          const weeklyGroups = groupsData.map((g) => g.group);
          const allOccurrences = groupsData.flatMap((g) => g.occurrences);
          // Expand all groups
          const expandedGroupIds = new Set(weeklyGroups.map((g) => g.id));

          const result = buildUnifiedStatementItems(
            [],
            allOccurrences,
            weeklyGroups,
            true, // pendingOnly
            expandedGroupIds
          );

          // All weeklyParcel items should be unpaid
          const parcelItems = result.filter((item) => item.type === 'weeklyParcel');
          for (const parcel of parcelItems) {
            expect(parcel.data.isPaid).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when pendingOnly is false, all groups with occurrences are included regardless of isPaid', () => {
    fc.assert(
      fc.property(
        fc.array(groupWithMixedOccurrencesArb, { minLength: 1, maxLength: 5 }),
        (groupsData) => {
          const weeklyGroups = groupsData.map((g) => g.group);
          const allOccurrences = groupsData.flatMap((g) => g.occurrences);

          const result = buildUnifiedStatementItems(
            [],
            allOccurrences,
            weeklyGroups,
            false, // pendingOnly off
            new Set<string>()
          );

          // All groups should appear (they all have at least one occurrence)
          const headerGroupIds = result
            .filter((item) => item.type === 'weeklyGroupHeader')
            .map((item) => item.data.group.id);

          for (const group of weeklyGroups) {
            expect(headerGroupIds).toContain(group.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when pendingOnly is true, transactions passed in are all unpaid (query-level filter simulation)', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb(false), { minLength: 1, maxLength: 10 }),
        (unpaidTransactions) => {
          // When pendingOnly is true, only unpaid transactions are passed in
          // (filtered at query level). Verify they all appear in the output.
          const result = buildUnifiedStatementItems(
            unpaidTransactions,
            [],
            [],
            true, // pendingOnly
            new Set<string>()
          );

          const transactionItems = result.filter((item) => item.type === 'transaction');
          expect(transactionItems.length).toBe(unpaidTransactions.length);

          const resultIds = transactionItems.map((item) => item.data.id);
          for (const tx of unpaidTransactions) {
            expect(resultIds).toContain(tx.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when pendingOnly is true and expanded, the number of parcels equals the number of unpaid occurrences per group', () => {
    fc.assert(
      fc.property(
        fc.array(groupWithMixedOccurrencesArb, { minLength: 1, maxLength: 5 }),
        (groupsData) => {
          const weeklyGroups = groupsData.map((g) => g.group);
          const allOccurrences = groupsData.flatMap((g) => g.occurrences);
          const expandedGroupIds = new Set(weeklyGroups.map((g) => g.id));

          const result = buildUnifiedStatementItems(
            [],
            allOccurrences,
            weeklyGroups,
            true, // pendingOnly
            expandedGroupIds
          );

          // For each group that has unpaid occurrences, count parcels in result
          for (const gData of groupsData) {
            if (gData.unpaidCount === 0) continue;

            const parcelsForGroup = result.filter(
              (item) => item.type === 'weeklyParcel' && item.groupId === gData.group.id
            );
            expect(parcelsForGroup.length).toBe(gData.unpaidCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 1: Unified list is sorted by date descending ───────────────────

/**
 * Property 1: Unified list is sorted by date descending
 *
 * For any set of regular transactions and weekly group items with arbitrary dates
 * within a month, the merged UnifiedStatementItem[] produced by buildUnifiedStatementItems
 * SHALL be sorted by date descending (most recent first), with weekly parcels appearing
 * immediately after their group header in date-ascending order within the group.
 *
 * **Validates: Requirements 1.1**
 */

// ─── Property 1 Arbitraries ─────────────────────────────────────────────────

/**
 * Generates a PaginatedTransactionWithCategory with a date in 2024-06.
 */
const p1TransactionArb: fc.Arbitrary<PaginatedTransactionWithCategory> = fc
  .record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 20 }),
    day: fc.integer({ min: 1, max: 28 }),
    amount: fc.integer({ min: -999999, max: 999999 }).filter((a) => a !== 0),
  })
  .map(({ id, title, day, amount }) => ({
    id,
    title,
    date: new Date(`2024-06-${String(day).padStart(2, '0')}T12:00:00.000Z`),
    amount,
    description: '',
    categoryId: null,
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
  }));

/**
 * Generates a WeeklyRecurringGroup for Property 1 tests.
 */
const p1WeeklyGroupArb: fc.Arbitrary<WeeklyRecurringGroup> = fc
  .record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 20 }),
    amount: fc.integer({ min: 100, max: 99999 }),
    dayOfWeek: fc.integer({ min: 0, max: 6 }),
    categoryId: fc.uuid(),
  })
  .map(({ id, title, amount, dayOfWeek, categoryId }) => ({
    id,
    title,
    amount,
    dayOfWeek,
    categoryId,
    categoryType: 'expense' as const,
    description: '',
    originId: null,
    startDate: '2024-01-01',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }));

/**
 * Generates occurrences for a group with distinct dates in 2024-06.
 */
function p1OccurrencesForGroup(group: WeeklyRecurringGroup, count: number): WeeklyOccurrence[] {
  const occurrences: WeeklyOccurrence[] = [];
  for (let i = 0; i < count; i++) {
    const day = 1 + ((i * 7) % 28);
    const dd = String(day).padStart(2, '0');
    occurrences.push({
      id: `${group.id}-occ-${i}`,
      weeklyGroupId: group.id,
      date: `2024-06-${dd}`,
      referenceMonth: '2024-06',
      amount: group.amount,
      description: '',
      isValueEdited: false,
      isPaid: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
  }
  return occurrences;
}

/**
 * Helper: extracts the sort date for a top-level item.
 * Transactions use their date field; weeklyGroupHeaders use earliest occurrence date.
 */
function getTopLevelSortDate(
  item: ReturnType<typeof buildUnifiedStatementItems>[number],
  allOccurrences: WeeklyOccurrence[]
): string {
  if (item.type === 'transaction') {
    const d = item.data.date;
    return d instanceof Date ? d.toISOString().split('T')[0] : String(d);
  }
  if (item.type === 'weeklyGroupHeader') {
    const groupId = item.data.group.id;
    const groupOccurrences = allOccurrences.filter((o) => o.weeklyGroupId === groupId);
    if (groupOccurrences.length === 0) return '';
    return groupOccurrences.reduce((earliest, occ) => {
      return occ.date < earliest ? occ.date : earliest;
    }, groupOccurrences[0]!.date);
  }
  return '';
}

// ─── Property 1 Tests ────────────────────────────────────────────────────────

describe('Feature: statement-payment-integration, Property 1: Unified list is sorted by date descending', () => {
  /**
   * **Validates: Requirements 1.1**
   */

  it('top-level items (transactions and group headers) are sorted by date descending', () => {
    fc.assert(
      fc.property(
        fc.array(p1TransactionArb, { minLength: 0, maxLength: 10 }),
        fc.array(p1WeeklyGroupArb, { minLength: 1, maxLength: 3 }),
        (transactions, groups) => {
          // Generate 2-4 occurrences per group
          const allOccurrences: WeeklyOccurrence[] = [];
          for (const group of groups) {
            const numOccurrences = 2 + (Math.abs(group.amount) % 3);
            allOccurrences.push(...p1OccurrencesForGroup(group, numOccurrences));
          }

          const result = buildUnifiedStatementItems(
            transactions,
            allOccurrences,
            groups,
            false,
            new Set<string>()
          );

          // Extract top-level items (transactions and group headers, not parcels)
          const topLevelItems = result.filter((item) => item.type !== 'weeklyParcel');

          // Verify descending date order for top-level items
          for (let i = 0; i < topLevelItems.length - 1; i++) {
            const dateA = getTopLevelSortDate(topLevelItems[i]!, allOccurrences);
            const dateB = getTopLevelSortDate(topLevelItems[i + 1]!, allOccurrences);
            expect(dateA >= dateB).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('weekly parcels appear immediately after their group header in date-ascending order', () => {
    fc.assert(
      fc.property(
        fc.array(p1TransactionArb, { minLength: 0, maxLength: 5 }),
        fc.array(p1WeeklyGroupArb, { minLength: 1, maxLength: 3 }),
        (transactions, groups) => {
          // Generate occurrences for each group
          const allOccurrences: WeeklyOccurrence[] = [];
          for (const group of groups) {
            allOccurrences.push(...p1OccurrencesForGroup(group, 4));
          }

          // Expand all groups so parcels are visible
          const expandedGroupIds = new Set(groups.map((g) => g.id));

          const result = buildUnifiedStatementItems(
            transactions,
            allOccurrences,
            groups,
            false,
            expandedGroupIds
          );

          // For each group header, verify parcels follow immediately and are date-ascending
          for (let i = 0; i < result.length; i++) {
            const item = result[i]!;
            if (item.type === 'weeklyGroupHeader') {
              const groupId = item.data.group.id;

              // Collect consecutive parcels after this header
              const parcels: typeof result = [];
              for (let j = i + 1; j < result.length; j++) {
                const next = result[j]!;
                if (next.type === 'weeklyParcel' && next.groupId === groupId) {
                  parcels.push(next);
                } else {
                  break;
                }
              }

              // Verify parcels are sorted by date ascending
              for (let k = 0; k < parcels.length - 1; k++) {
                const parcelA = parcels[k]!;
                const parcelB = parcels[k + 1]!;
                if (parcelA.type === 'weeklyParcel' && parcelB.type === 'weeklyParcel') {
                  expect(parcelA.data.date <= parcelB.data.date).toBe(true);
                }
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('no parcel appears without a preceding group header of the same group', () => {
    fc.assert(
      fc.property(
        fc.array(p1TransactionArb, { minLength: 0, maxLength: 5 }),
        fc.array(p1WeeklyGroupArb, { minLength: 1, maxLength: 3 }),
        (transactions, groups) => {
          const allOccurrences: WeeklyOccurrence[] = [];
          for (const group of groups) {
            allOccurrences.push(...p1OccurrencesForGroup(group, 3));
          }

          const expandedGroupIds = new Set(groups.map((g) => g.id));

          const result = buildUnifiedStatementItems(
            transactions,
            allOccurrences,
            groups,
            false,
            expandedGroupIds
          );

          // For each parcel, verify there's a preceding header for its group
          const seenHeaders = new Set<string>();
          for (const item of result) {
            if (item.type === 'weeklyGroupHeader') {
              seenHeaders.add(item.data.group.id);
            } else if (item.type === 'weeklyParcel') {
              expect(seenHeaders.has(item.groupId)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
