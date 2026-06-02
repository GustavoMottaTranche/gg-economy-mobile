// Feature: statement-payment-integration, Property 2: Weekly group monthly total equals sum of occurrence amounts

/**
 * Property 2: Weekly group monthly total equals sum of occurrence amounts
 *
 * For any weekly recurring group and any set of occurrences belonging to that
 * group in a given month, the monthlyTotal displayed in the WeeklyGroupHeaderData
 * SHALL equal the arithmetic sum of all occurrence amount values for that month.
 *
 * **Validates: Requirements 1.2, 2.3**
 */

import fc from 'fast-check';
import { buildUnifiedStatementItems } from '../hooks/useUnifiedStatementItems';
import type { WeeklyOccurrence, WeeklyRecurringGroup } from '../types/weeklyRecurring';
import type { PaginatedTransactionWithCategory } from '../hooks/usePaginatedTransactions';
import type { WeeklyGroupHeaderData } from '../types/unifiedStatementItem';

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Generates a UUID-like string */
const uuidArb = fc.uuid();

/** Generates a reference month in YYYY-MM format */
const referenceMonthArb = fc
  .integer({ min: 2020, max: 2030 })
  .chain((year) =>
    fc.integer({ min: 1, max: 12 }).map((month) => `${year}-${String(month).padStart(2, '0')}`)
  );

/** Generates a positive amount (in currency units, e.g. 0.01 to 99999.99) */
const amountArb = fc.integer({ min: 1, max: 9999999 }).map((n) => n / 100);

/** Generates a valid date string (YYYY-MM-DD) within a given month */
const dateInMonthArb = (refMonth: string): fc.Arbitrary<string> => {
  const [yearStr, monthStr] = refMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();
  return fc
    .integer({ min: 1, max: daysInMonth })
    .map((day) => `${refMonth}-${String(day).padStart(2, '0')}`);
};

/** Generates a WeeklyRecurringGroup */
const weeklyGroupArb = (groupId: string): fc.Arbitrary<WeeklyRecurringGroup> =>
  fc.record({
    id: fc.constant(groupId),
    title: fc.string({ minLength: 1, maxLength: 20 }),
    amount: amountArb,
    dayOfWeek: fc.integer({ min: 0, max: 6 }),
    categoryId: uuidArb,
    categoryType: fc.constant('expense' as const),
    description: fc.string({ maxLength: 50 }),
    originId: fc.constant(null),
    startDate: fc.constant('2023-01-01'),
    isActive: fc.constant(true),
    createdAt: fc.constant('2023-01-01T00:00:00Z'),
    updatedAt: fc.constant('2023-01-01T00:00:00Z'),
  });

/** Generates a WeeklyOccurrence for a given group and month */
const weeklyOccurrenceArb = (groupId: string, refMonth: string): fc.Arbitrary<WeeklyOccurrence> =>
  fc.record({
    id: uuidArb,
    weeklyGroupId: fc.constant(groupId),
    date: dateInMonthArb(refMonth),
    referenceMonth: fc.constant(refMonth),
    amount: amountArb,
    description: fc.string({ maxLength: 50 }),
    isValueEdited: fc.boolean(),
    isPaid: fc.boolean(),
    createdAt: fc.constant('2023-01-01T00:00:00Z'),
    updatedAt: fc.constant('2023-01-01T00:00:00Z'),
  });

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: statement-payment-integration, Property 2: Weekly group monthly total equals sum of occurrence amounts', () => {
  it('monthlyTotal in WeeklyGroupHeaderData equals the arithmetic sum of all occurrence amounts (pendingOnly=false)', () => {
    fc.assert(
      fc.property(
        uuidArb.chain((groupId) =>
          referenceMonthArb.chain((refMonth) =>
            fc
              .tuple(
                weeklyGroupArb(groupId),
                fc.array(weeklyOccurrenceArb(groupId, refMonth), {
                  minLength: 1,
                  maxLength: 10,
                })
              )
              .map(([group, occurrences]) => ({ group, occurrences, refMonth }))
          )
        ),
        ({ group, occurrences }) => {
          const transactions: PaginatedTransactionWithCategory[] = [];
          const expandedGroupIds = new Set<string>();

          const result = buildUnifiedStatementItems(
            transactions,
            occurrences,
            [group],
            false, // pendingOnly = false
            expandedGroupIds
          );

          // Find the weeklyGroupHeader for our group
          const headerItem = result.find(
            (item) => item.type === 'weeklyGroupHeader' && item.data.group.id === group.id
          );

          expect(headerItem).toBeDefined();
          expect(headerItem!.type).toBe('weeklyGroupHeader');

          const headerData = headerItem!.data as WeeklyGroupHeaderData;

          // The monthlyTotal should equal the sum of all occurrence amounts
          const expectedTotal = occurrences.reduce((sum, occ) => sum + occ.amount, 0);

          expect(headerData.monthlyTotal).toBeCloseTo(expectedTotal, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('monthlyTotal with pendingOnly=true equals the sum of only unpaid occurrence amounts', () => {
    fc.assert(
      fc.property(
        uuidArb.chain((groupId) =>
          referenceMonthArb.chain((refMonth) =>
            fc
              .tuple(
                weeklyGroupArb(groupId),
                // Ensure at least one unpaid occurrence so the group appears
                fc.array(weeklyOccurrenceArb(groupId, refMonth), {
                  minLength: 1,
                  maxLength: 10,
                })
              )
              .filter(([_, occs]) => occs.some((o) => !o.isPaid))
              .map(([group, occurrences]) => ({ group, occurrences, refMonth }))
          )
        ),
        ({ group, occurrences }) => {
          const transactions: PaginatedTransactionWithCategory[] = [];
          const expandedGroupIds = new Set<string>();

          const result = buildUnifiedStatementItems(
            transactions,
            occurrences,
            [group],
            true, // pendingOnly = true
            expandedGroupIds
          );

          // Find the weeklyGroupHeader for our group
          const headerItem = result.find(
            (item) => item.type === 'weeklyGroupHeader' && item.data.group.id === group.id
          );

          expect(headerItem).toBeDefined();
          expect(headerItem!.type).toBe('weeklyGroupHeader');

          const headerData = headerItem!.data as WeeklyGroupHeaderData;

          // When pendingOnly is true, monthlyTotal should equal sum of unpaid occurrences only
          const expectedPendingTotal = occurrences
            .filter((occ) => !occ.isPaid)
            .reduce((sum, occ) => sum + occ.amount, 0);

          expect(headerData.monthlyTotal).toBeCloseTo(expectedPendingTotal, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('monthlyTotal is consistent across multiple groups (each group total is independent)', () => {
    fc.assert(
      fc.property(
        fc
          .tuple(uuidArb, uuidArb)
          .filter(([a, b]) => a !== b)
          .chain(([groupId1, groupId2]) =>
            referenceMonthArb.chain((refMonth) =>
              fc
                .tuple(
                  weeklyGroupArb(groupId1),
                  weeklyGroupArb(groupId2),
                  fc.array(weeklyOccurrenceArb(groupId1, refMonth), {
                    minLength: 1,
                    maxLength: 8,
                  }),
                  fc.array(weeklyOccurrenceArb(groupId2, refMonth), {
                    minLength: 1,
                    maxLength: 8,
                  })
                )
                .map(([group1, group2, occs1, occs2]) => ({
                  group1,
                  group2,
                  occs1,
                  occs2,
                }))
            )
          ),
        ({ group1, group2, occs1, occs2 }) => {
          const transactions: PaginatedTransactionWithCategory[] = [];
          const expandedGroupIds = new Set<string>();
          const allOccurrences = [...occs1, ...occs2];

          const result = buildUnifiedStatementItems(
            transactions,
            allOccurrences,
            [group1, group2],
            false,
            expandedGroupIds
          );

          // Find headers for both groups
          const header1 = result.find(
            (item) => item.type === 'weeklyGroupHeader' && item.data.group.id === group1.id
          );
          const header2 = result.find(
            (item) => item.type === 'weeklyGroupHeader' && item.data.group.id === group2.id
          );

          expect(header1).toBeDefined();
          expect(header2).toBeDefined();

          const headerData1 = header1!.data as WeeklyGroupHeaderData;
          const headerData2 = header2!.data as WeeklyGroupHeaderData;

          // Each group's monthlyTotal should equal only its own occurrences' sum
          const expectedTotal1 = occs1.reduce((sum, o) => sum + o.amount, 0);
          const expectedTotal2 = occs2.reduce((sum, o) => sum + o.amount, 0);

          expect(headerData1.monthlyTotal).toBeCloseTo(expectedTotal1, 5);
          expect(headerData2.monthlyTotal).toBeCloseTo(expectedTotal2, 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});
