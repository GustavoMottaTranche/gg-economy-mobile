/**
 * Property-based tests for SyncPayloadBuilder
 *
 * Uses fast-check to verify universal correctness properties
 * of the payload builder across many randomized inputs.
 *
 * Feature: cloud-sync-import
 */

import * as fc from 'fast-check';

import { camelToSnake, buildPayload } from '../SyncPayloadBuilder';
import type { ExtractedData } from '../types';

const emptyData: ExtractedData = {
  categories: [],
  funds: [],
  fundAllocations: [],
  transactions: [],
  recurringTransactions: [],
  weeklyRecurringGroups: [],
  weeklyOccurrences: [],
  recurringFundLinks: [],
  categoryGoals: [],
};

// ============================================================================
// Shared Generators
// ============================================================================

const arbId = fc.uuid();

const arbAmount = fc.double({
  min: -1_000_000,
  max: 1_000_000,
  noNaN: true,
  noDefaultInfinity: true,
});

const arbDate = fc
  .tuple(
    fc.integer({ min: 2000, max: 2099 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 })
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

const arbIntBool = fc.constantFrom(0, 1);

const arbFundAllocation = fc.record({
  id: arbId,
  fundId: arbId,
  referenceMonth: fc.stringMatching(/^20[0-9]{2}-(0[1-9]|1[0-2])$/),
  amount: arbAmount,
  createdAt: arbDate,
  updatedAt: arbDate,
});

const arbCategoryGoal = fc.record({
  id: arbId,
  categoryId: arbId,
  amount: arbAmount,
  createdAt: arbDate,
  updatedAt: arbDate,
});

const arbWeeklyOccurrence = fc.record({
  id: arbId,
  weeklyGroupId: arbId,
  date: arbDate,
  referenceMonth: fc.stringMatching(/^20[0-9]{2}-(0[1-9]|1[0-2])$/),
  amount: arbAmount,
  description: fc.string({ minLength: 0, maxLength: 50 }),
  isValueEdited: arbIntBool,
  isPaid: arbIntBool,
  createdAt: arbDate,
  updatedAt: arbDate,
});

const arbTransaction = fc.record({
  id: arbId,
  title: fc.string({ minLength: 1, maxLength: 50 }),
  date: arbDate,
  amount: arbAmount,
  description: fc.string({ minLength: 0, maxLength: 100 }),
  categoryId: fc.option(arbId, { nil: null }),
  originId: fc.option(arbId, { nil: null }),
  batchId: fc.option(arbId, { nil: null }),
  referenceMonth: fc.stringMatching(/^20[0-9]{2}-(0[1-9]|1[0-2])$/),
  needsReview: arbIntBool,
  isExcludedFromTotals: arbIntBool,
  isPaid: arbIntBool,
  duplicateOf: fc.option(arbId, { nil: null }),
  createdAt: arbDate,
  updatedAt: arbDate,
  installmentGroupId: fc.option(arbId, { nil: null }),
  recurringId: fc.option(arbId, { nil: null }),
});

const arbCategory = fc.record({
  id: arbId,
  name: fc.string({ minLength: 1, maxLength: 30 }),
  type: fc.constantFrom('income', 'expense'),
  icon: fc.string({ minLength: 1, maxLength: 4 }),
  color: fc.stringMatching(/^#[0-9a-f]{6}$/),
  isActive: arbIntBool,
  expenseGroup: fc.option(arbId, { nil: null }),
  createdAt: arbDate,
});

function extractedDataArb(): fc.Arbitrary<ExtractedData> {
  return fc.record({
    categories: fc.array(arbCategory, { minLength: 0, maxLength: 10 }),
    funds: fc.array(
      fc.record({
        id: arbId,
        name: fc.string({ minLength: 1, maxLength: 30 }),
        icon: fc.option(fc.string({ minLength: 1, maxLength: 4 }), { nil: null }),
        color: fc.option(fc.stringMatching(/^#[0-9a-f]{6}$/), { nil: null }),
        isActive: arbIntBool,
        createdAt: arbDate,
        updatedAt: arbDate,
      }),
      { minLength: 0, maxLength: 10 }
    ),
    fundAllocations: fc.array(arbFundAllocation, { minLength: 0, maxLength: 10 }),
    transactions: fc.array(arbTransaction, { minLength: 0, maxLength: 10 }),
    recurringTransactions: fc.array(
      fc.record({
        id: arbId,
        title: fc.string({ minLength: 1, maxLength: 50 }),
        amount: arbAmount,
        categoryId: arbId,
        categoryType: fc.constantFrom('income', 'expense'),
        startMonth: fc.stringMatching(/^20[0-9]{2}-(0[1-9]|1[0-2])$/),
        description: fc.string({ maxLength: 100 }),
        originId: fc.option(arbId, { nil: null }),
        isActive: arbIntBool,
        createdAt: arbDate,
        updatedAt: arbDate,
      }),
      { minLength: 0, maxLength: 10 }
    ),
    weeklyRecurringGroups: fc.array(
      fc.record({
        id: arbId,
        title: fc.string({ minLength: 1, maxLength: 50 }),
        amount: arbAmount,
        dayOfWeek: fc.integer({ min: 0, max: 6 }),
        categoryId: arbId,
        categoryType: fc.constantFrom('income', 'expense'),
        description: fc.string({ maxLength: 100 }),
        originId: fc.option(arbId, { nil: null }),
        startDate: arbDate,
        isActive: arbIntBool,
        createdAt: arbDate,
        updatedAt: arbDate,
      }),
      { minLength: 0, maxLength: 10 }
    ),
    weeklyOccurrences: fc.array(arbWeeklyOccurrence, { minLength: 0, maxLength: 10 }),
    recurringFundLinks: fc.array(
      fc.record({
        id: arbId,
        recurringId: arbId,
        fundId: arbId,
        createdAt: arbDate,
      }),
      { minLength: 0, maxLength: 10 }
    ),
    categoryGoals: fc.array(arbCategoryGoal, { minLength: 0, maxLength: 10 }),
  }) as unknown as fc.Arbitrary<ExtractedData>;
}

// ============================================================================
// Property 1: Payload structure completeness
// ============================================================================

/**
 * **Validates: Requirements 3.1, 3.2, 3.8**
 */
describe('Feature: cloud-sync-import, Property 1: Payload structure completeness', () => {
  const EXPECTED_KEYS = [
    'budget_goals',
    'categories',
    'fund_allocations',
    'funds',
    'installment_groups',
    'recurring_fund_links',
    'recurring_transactions',
    'transactions',
    'weekly_occurrences',
    'weekly_recurring_groups',
  ];

  it('buildPayload output always has exactly 10 keys in tables', () => {
    fc.assert(
      fc.property(extractedDataArb(), (data) => {
        const payload = buildPayload(data);
        const keys = Object.keys(payload.tables).sort();
        expect(keys).toEqual(EXPECTED_KEYS);
      }),
      { numRuns: 100 }
    );
  });

  it('budget_goals array length equals input categoryGoals length', () => {
    fc.assert(
      fc.property(extractedDataArb(), (data) => {
        const payload = buildPayload(data);
        expect(payload.tables.budget_goals).toHaveLength(data.categoryGoals.length);
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 2: Installment groups derivation
// ============================================================================

/**
 * **Validates: Requirements 3.3**
 */
describe('Feature: cloud-sync-import, Property 2: Installment groups derivation', () => {
  it('installment_groups length equals distinct non-null installmentGroupId count', () => {
    fc.assert(
      fc.property(fc.array(arbTransaction, { minLength: 0, maxLength: 30 }), (transactions) => {
        const data: ExtractedData = {
          ...emptyData,
          transactions: transactions as unknown as ExtractedData['transactions'],
        };
        const payload = buildPayload(data);

        const distinctGroupIds = new Set<string>();
        for (const tx of transactions) {
          const gid = tx.installmentGroupId;
          if (gid != null && gid !== '') {
            distinctGroupIds.add(gid as string);
          }
        }

        expect(payload.tables.installment_groups).toHaveLength(distinctGroupIds.size);
      }),
      { numRuns: 100 }
    );
  });

  it('each installment_groups entry id matches a distinct installmentGroupId value', () => {
    fc.assert(
      fc.property(fc.array(arbTransaction, { minLength: 0, maxLength: 30 }), (transactions) => {
        const data: ExtractedData = {
          ...emptyData,
          transactions: transactions as unknown as ExtractedData['transactions'],
        };
        const payload = buildPayload(data);

        const distinctGroupIds = new Set<string>();
        for (const tx of transactions) {
          const gid = tx.installmentGroupId;
          if (gid != null && gid !== '') {
            distinctGroupIds.add(gid as string);
          }
        }

        const resultIds = new Set(payload.tables.installment_groups.map((entry) => entry.id));
        expect(resultIds).toEqual(distinctGroupIds);
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 3: CamelCase to snake_case key conversion
// ============================================================================

/**
 * **Validates: Requirements 3.4**
 */
describe('Feature: cloud-sync-import, Property 3: CamelCase to snake_case key conversion', () => {
  const SNAKE_CASE_REGEX = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

  const camelCaseKeyArb = fc
    .tuple(
      fc.stringMatching(/^[a-z]{1,6}$/),
      fc.array(
        fc.tuple(
          fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
          fc.stringMatching(/^[a-z0-9]{1,6}$/)
        ),
        { minLength: 1, maxLength: 4 }
      )
    )
    .map(([prefix, parts]: [string, [string, string][]]) => {
      return (
        String(prefix) +
        parts.map(([upper, rest]: [string, string]) => String(upper) + String(rest)).join('')
      );
    });

  it('camelToSnake always produces valid snake_case output for camelCase input', () => {
    fc.assert(
      fc.property(camelCaseKeyArb, (camelKey) => {
        const snakeKey = camelToSnake(camelKey);
        expect(snakeKey).toMatch(SNAKE_CASE_REGEX);
      }),
      { numRuns: 100 }
    );
  });

  it('all output keys in payload records match snake_case regex', () => {
    fc.assert(
      fc.property(extractedDataArb(), (data) => {
        const payload = buildPayload(data);

        for (const tableRecords of Object.values(payload.tables)) {
          for (const record of tableRecords) {
            for (const key of Object.keys(record)) {
              expect(key).toMatch(SNAKE_CASE_REGEX);
            }
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('no camelCase keys from original records appear in output', () => {
    fc.assert(
      fc.property(extractedDataArb(), (data) => {
        const payload = buildPayload(data);

        const originalCamelKeys = new Set<string>();
        const allTables = [
          data.categories,
          data.funds,
          data.fundAllocations,
          data.transactions,
          data.recurringTransactions,
          data.weeklyRecurringGroups,
          data.weeklyOccurrences,
          data.recurringFundLinks,
          data.categoryGoals,
        ];

        for (const table of allTables) {
          for (const record of table as unknown as Record<string, unknown>[]) {
            for (const key of Object.keys(record)) {
              if (/[A-Z]/.test(key)) {
                originalCamelKeys.add(key);
              }
            }
          }
        }

        for (const tableRecords of Object.values(payload.tables)) {
          for (const record of tableRecords) {
            for (const key of Object.keys(record)) {
              expect(originalCamelKeys.has(key)).toBe(false);
            }
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 4: Value preservation through transformation
// ============================================================================

/**
 * **Validates: Requirements 3.5, 3.6, 3.7, 3.9**
 */
describe('Feature: cloud-sync-import, Property 4: Value preservation through transformation', () => {
  it('preserves id values unchanged through transformation', () => {
    fc.assert(
      fc.property(
        fc.array(arbFundAllocation, { minLength: 1, maxLength: 10 }),
        fc.array(arbCategoryGoal, { minLength: 1, maxLength: 10 }),
        (fundAllocations, categoryGoals) => {
          const data: ExtractedData = {
            ...emptyData,
            fundAllocations: fundAllocations as unknown as ExtractedData['fundAllocations'],
            categoryGoals: categoryGoals as unknown as ExtractedData['categoryGoals'],
          };

          const payload = buildPayload(data);

          for (let i = 0; i < fundAllocations.length; i++) {
            expect(payload.tables.fund_allocations[i].id).toBe(fundAllocations[i].id);
          }
          for (let i = 0; i < categoryGoals.length; i++) {
            expect(payload.tables.budget_goals[i].id).toBe(categoryGoals[i].id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('preserves numeric values (amounts) unchanged through transformation', () => {
    fc.assert(
      fc.property(
        fc.array(arbFundAllocation, { minLength: 1, maxLength: 10 }),
        (fundAllocations) => {
          const data: ExtractedData = {
            ...emptyData,
            fundAllocations: fundAllocations as unknown as ExtractedData['fundAllocations'],
          };

          const payload = buildPayload(data);

          for (let i = 0; i < fundAllocations.length; i++) {
            expect(payload.tables.fund_allocations[i].amount).toBe(fundAllocations[i].amount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('preserves string values (dates, text) unchanged through transformation', () => {
    fc.assert(
      fc.property(fc.array(arbTransaction, { minLength: 1, maxLength: 10 }), (transactions) => {
        const data: ExtractedData = {
          ...emptyData,
          transactions: transactions as unknown as ExtractedData['transactions'],
        };

        const payload = buildPayload(data);

        for (let i = 0; i < transactions.length; i++) {
          expect(payload.tables.transactions[i].date).toBe(transactions[i].date);
          expect(payload.tables.transactions[i].created_at).toBe(transactions[i].createdAt);
          expect(payload.tables.transactions[i].updated_at).toBe(transactions[i].updatedAt);
          expect(payload.tables.transactions[i].title).toBe(transactions[i].title);
          expect(payload.tables.transactions[i].description).toBe(transactions[i].description);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('preserves integer booleans as numbers without converting to true/false', () => {
    fc.assert(
      fc.property(
        fc.array(arbWeeklyOccurrence, { minLength: 1, maxLength: 10 }),
        fc.array(arbTransaction, { minLength: 1, maxLength: 10 }),
        (weeklyOccurrences, transactions) => {
          const data: ExtractedData = {
            ...emptyData,
            weeklyOccurrences: weeklyOccurrences as unknown as ExtractedData['weeklyOccurrences'],
            transactions: transactions as unknown as ExtractedData['transactions'],
          };

          const payload = buildPayload(data);

          for (let i = 0; i < weeklyOccurrences.length; i++) {
            const output = payload.tables.weekly_occurrences[i];
            expect(typeof output.is_value_edited).toBe('number');
            expect(typeof output.is_paid).toBe('number');
            expect(output.is_value_edited).toBe(weeklyOccurrences[i].isValueEdited);
            expect(output.is_paid).toBe(weeklyOccurrences[i].isPaid);
          }

          for (let i = 0; i < transactions.length; i++) {
            const output = payload.tables.transactions[i];
            expect(typeof output.needs_review).toBe('number');
            expect(typeof output.is_excluded_from_totals).toBe('number');
            expect(typeof output.is_paid).toBe('number');
            expect(output.needs_review).toBe(transactions[i].needsReview);
            expect(output.is_excluded_from_totals).toBe(transactions[i].isExcludedFromTotals);
            expect(output.is_paid).toBe(transactions[i].isPaid);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 5: JSON serialization round-trip
// ============================================================================

/**
 * Property 5: JSON serialization round-trip
 *
 * For any valid ExtractedData, the payload produced by buildPayload SHALL
 * be JSON-serializable such that JSON.parse(JSON.stringify(payload)) yields
 * an object with identical keys, value types, and array lengths as the
 * original payload.
 *
 * **Validates: Requirements 3.10**
 */
describe('Feature: cloud-sync-import, Property 5: JSON serialization round-trip', () => {
  /** JSON-safe amount that avoids -0 (JSON.stringify(-0) === "0") */
  const jsonSafeAmount = arbAmount.map((v) => (Object.is(v, -0) ? 0 : v));

  /** Generator for ExtractedData with JSON-safe values (no -0) */
  const jsonSafeExtractedData = fc.record({
    categories: fc.array(
      fc.record({
        id: arbId,
        name: fc.string({ minLength: 1, maxLength: 30 }),
        type: fc.constantFrom('income', 'expense'),
        icon: fc.string({ minLength: 1, maxLength: 4 }),
        color: fc.stringMatching(/^#[0-9a-f]{6}$/),
        isActive: arbIntBool,
        expenseGroup: fc.option(arbId, { nil: null }),
        createdAt: arbDate,
      }),
      { minLength: 0, maxLength: 8 }
    ),
    funds: fc.array(
      fc.record({
        id: arbId,
        name: fc.string({ minLength: 1, maxLength: 30 }),
        icon: fc.option(fc.string({ minLength: 1, maxLength: 4 }), { nil: null }),
        color: fc.option(fc.stringMatching(/^#[0-9a-f]{6}$/), { nil: null }),
        isActive: arbIntBool,
        createdAt: arbDate,
        updatedAt: arbDate,
      }),
      { minLength: 0, maxLength: 8 }
    ),
    fundAllocations: fc.array(
      fc.record({
        id: arbId,
        fundId: arbId,
        referenceMonth: fc.stringMatching(/^20[0-9]{2}-(0[1-9]|1[0-2])$/),
        amount: jsonSafeAmount,
        createdAt: arbDate,
        updatedAt: arbDate,
      }),
      { minLength: 0, maxLength: 8 }
    ),
    transactions: fc.array(
      fc.record({
        id: arbId,
        title: fc.string({ minLength: 1, maxLength: 50 }),
        date: arbDate,
        amount: jsonSafeAmount,
        description: fc.string({ minLength: 0, maxLength: 100 }),
        categoryId: fc.option(arbId, { nil: null }),
        originId: fc.option(arbId, { nil: null }),
        batchId: fc.option(arbId, { nil: null }),
        referenceMonth: fc.stringMatching(/^20[0-9]{2}-(0[1-9]|1[0-2])$/),
        needsReview: arbIntBool,
        isExcludedFromTotals: arbIntBool,
        isPaid: arbIntBool,
        duplicateOf: fc.option(arbId, { nil: null }),
        createdAt: arbDate,
        updatedAt: arbDate,
        installmentGroupId: fc.option(arbId, { nil: null }),
        recurringId: fc.option(arbId, { nil: null }),
      }),
      { minLength: 0, maxLength: 8 }
    ),
    recurringTransactions: fc.array(
      fc.record({
        id: arbId,
        title: fc.string({ minLength: 1, maxLength: 50 }),
        amount: jsonSafeAmount,
        categoryId: arbId,
        categoryType: fc.constantFrom('income', 'expense'),
        startMonth: fc.stringMatching(/^20[0-9]{2}-(0[1-9]|1[0-2])$/),
        description: fc.string({ maxLength: 100 }),
        originId: fc.option(arbId, { nil: null }),
        isActive: arbIntBool,
        createdAt: arbDate,
        updatedAt: arbDate,
      }),
      { minLength: 0, maxLength: 8 }
    ),
    weeklyRecurringGroups: fc.array(
      fc.record({
        id: arbId,
        title: fc.string({ minLength: 1, maxLength: 50 }),
        amount: jsonSafeAmount,
        dayOfWeek: fc.integer({ min: 0, max: 6 }),
        categoryId: arbId,
        categoryType: fc.constantFrom('income', 'expense'),
        description: fc.string({ maxLength: 100 }),
        originId: fc.option(arbId, { nil: null }),
        startDate: arbDate,
        isActive: arbIntBool,
        createdAt: arbDate,
        updatedAt: arbDate,
      }),
      { minLength: 0, maxLength: 8 }
    ),
    weeklyOccurrences: fc.array(
      fc.record({
        id: arbId,
        weeklyGroupId: arbId,
        date: arbDate,
        referenceMonth: fc.stringMatching(/^20[0-9]{2}-(0[1-9]|1[0-2])$/),
        amount: jsonSafeAmount,
        description: fc.string({ minLength: 0, maxLength: 50 }),
        isValueEdited: arbIntBool,
        isPaid: arbIntBool,
        createdAt: arbDate,
        updatedAt: arbDate,
      }),
      { minLength: 0, maxLength: 8 }
    ),
    recurringFundLinks: fc.array(
      fc.record({
        id: arbId,
        recurringId: arbId,
        fundId: arbId,
        createdAt: arbDate,
      }),
      { minLength: 0, maxLength: 8 }
    ),
    categoryGoals: fc.array(
      fc.record({
        id: arbId,
        categoryId: arbId,
        amount: jsonSafeAmount,
        createdAt: arbDate,
        updatedAt: arbDate,
      }),
      { minLength: 0, maxLength: 8 }
    ),
  }) as unknown as fc.Arbitrary<ExtractedData>;

  it('payload survives JSON serialization round-trip without data loss', () => {
    fc.assert(
      fc.property(jsonSafeExtractedData, (data) => {
        const payload = buildPayload(data);
        const roundTripped = JSON.parse(JSON.stringify(payload));
        expect(roundTripped).toEqual(payload);
      }),
      { numRuns: 100 }
    );
  });
});
