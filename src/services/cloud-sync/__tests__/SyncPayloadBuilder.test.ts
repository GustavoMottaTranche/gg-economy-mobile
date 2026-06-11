/**
 * Unit tests for SyncPayloadBuilder
 *
 * Tests camelToSnake utility and buildPayload function.
 */

import { camelToSnake, buildPayload } from '../SyncPayloadBuilder';
import type { ExtractedData } from '../types';

describe('SyncPayloadBuilder', () => {
  describe('camelToSnake', () => {
    it('converts simple camelCase to snake_case', () => {
      expect(camelToSnake('categoryId')).toBe('category_id');
    });

    it('converts multi-word camelCase to snake_case', () => {
      expect(camelToSnake('isExcludedFromTotals')).toBe('is_excluded_from_totals');
    });

    it('leaves single lowercase word unchanged', () => {
      expect(camelToSnake('id')).toBe('id');
      expect(camelToSnake('name')).toBe('name');
    });

    it('converts all known field mappings correctly', () => {
      const mappings: Record<string, string> = {
        categoryId: 'category_id',
        fundId: 'fund_id',
        weeklyGroupId: 'weekly_group_id',
        referenceMonth: 'reference_month',
        isActive: 'is_active',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        installmentGroupId: 'installment_group_id',
        recurringId: 'recurring_id',
        needsReview: 'needs_review',
        isExcludedFromTotals: 'is_excluded_from_totals',
        isPaid: 'is_paid',
        duplicateOf: 'duplicate_of',
        batchId: 'batch_id',
        originId: 'origin_id',
        categoryType: 'category_type',
        startMonth: 'start_month',
        dayOfWeek: 'day_of_week',
        startDate: 'start_date',
        isValueEdited: 'is_value_edited',
        expenseGroup: 'expense_group',
      };

      for (const [input, expected] of Object.entries(mappings)) {
        expect(camelToSnake(input)).toBe(expected);
      }
    });

    it('handles empty string', () => {
      expect(camelToSnake('')).toBe('');
    });
  });

  describe('buildPayload', () => {
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

    it('produces payload with all 10 required table keys', () => {
      const payload = buildPayload(emptyData);
      const expectedKeys = [
        'categories',
        'funds',
        'installment_groups',
        'recurring_transactions',
        'weekly_recurring_groups',
        'fund_allocations',
        'transactions',
        'recurring_fund_links',
        'weekly_occurrences',
        'budget_goals',
      ];

      expect(Object.keys(payload.tables).sort()).toEqual(expectedKeys.sort());
    });

    it('includes empty arrays for tables with zero records', () => {
      const payload = buildPayload(emptyData);

      for (const value of Object.values(payload.tables)) {
        expect(value).toEqual([]);
      }
    });

    it('maps categoryGoals to budget_goals', () => {
      const data: ExtractedData = {
        ...emptyData,
        categoryGoals: [
          {
            id: 'goal-1',
            categoryId: 'cat-1',
            amount: 5000,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ],
      };

      const payload = buildPayload(data);

      expect(payload.tables.budget_goals).toHaveLength(1);
      expect(payload.tables.budget_goals[0]).toEqual({
        id: 'goal-1',
        category_id: 'cat-1',
        amount: 5000,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      });
    });

    it('derives installment_groups from distinct non-null installmentGroupId', () => {
      const data: ExtractedData = {
        ...emptyData,
        transactions: [
          createTransaction({ id: 'tx-1', installmentGroupId: 'group-a' }),
          createTransaction({ id: 'tx-2', installmentGroupId: 'group-a' }),
          createTransaction({ id: 'tx-3', installmentGroupId: 'group-b' }),
          createTransaction({ id: 'tx-4', installmentGroupId: null }),
        ],
      };

      const payload = buildPayload(data);

      expect(payload.tables.installment_groups).toHaveLength(2);
      const ids = payload.tables.installment_groups.map((g) => g.id);
      expect(ids).toContain('group-a');
      expect(ids).toContain('group-b');
    });

    it('produces empty installment_groups when no transactions have installmentGroupId', () => {
      const data: ExtractedData = {
        ...emptyData,
        transactions: [
          createTransaction({ id: 'tx-1', installmentGroupId: null }),
          createTransaction({ id: 'tx-2', installmentGroupId: null }),
        ],
      };

      const payload = buildPayload(data);

      expect(payload.tables.installment_groups).toEqual([]);
    });

    it('converts camelCase keys to snake_case in records', () => {
      const data: ExtractedData = {
        ...emptyData,
        categories: [
          {
            id: 'cat-1',
            name: 'Food',
            type: 'expense',
            icon: '🍕',
            color: '#ff0000',
            isActive: true,
            expenseGroup: 'essentials',
            createdAt: '2024-01-01',
          },
        ],
      };

      const payload = buildPayload(data);
      const record = payload.tables.categories[0];

      expect(record).toHaveProperty('is_active');
      expect(record).toHaveProperty('expense_group');
      expect(record).toHaveProperty('created_at');
      expect(record).not.toHaveProperty('isActive');
      expect(record).not.toHaveProperty('expenseGroup');
      expect(record).not.toHaveProperty('createdAt');
    });

    it('preserves id field for every record', () => {
      const data: ExtractedData = {
        ...emptyData,
        funds: [
          {
            id: 'fund-123',
            name: 'Savings',
            icon: '💰',
            color: '#00ff00',
            isActive: true,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ],
      };

      const payload = buildPayload(data);

      expect(payload.tables.funds[0].id).toBe('fund-123');
    });

    it('preserves monetary values without conversion', () => {
      const data: ExtractedData = {
        ...emptyData,
        fundAllocations: [
          {
            id: 'alloc-1',
            fundId: 'fund-1',
            referenceMonth: '2024-01',
            amount: 15099.55,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ],
      };

      const payload = buildPayload(data);

      expect(payload.tables.fund_allocations[0].amount).toBe(15099.55);
    });

    it('preserves date values without conversion', () => {
      const data: ExtractedData = {
        ...emptyData,
        transactions: [
          createTransaction({ id: 'tx-1', date: '2024-03-15', createdAt: '2024-03-15T10:30:00' }),
        ],
      };

      const payload = buildPayload(data);

      expect(payload.tables.transactions[0].date).toBe('2024-03-15');
      expect(payload.tables.transactions[0].created_at).toBe('2024-03-15T10:30:00');
    });

    it('preserves boolean integers (0/1) without converting to true/false', () => {
      const data: ExtractedData = {
        ...emptyData,
        transactions: [createTransaction({ id: 'tx-1', needsReview: true, isPaid: false })],
      };

      const payload = buildPayload(data);
      const record = payload.tables.transactions[0];

      // Drizzle returns booleans from SQLite integer columns;
      // they should be preserved as-is (the server handles normalization)
      expect(record.needs_review).toBe(true);
      expect(record.is_paid).toBe(false);
    });

    it('produces JSON-serializable output', () => {
      const data: ExtractedData = {
        ...emptyData,
        categories: [
          {
            id: 'cat-1',
            name: 'Test',
            type: 'income',
            icon: '💵',
            color: '#000',
            isActive: true,
            expenseGroup: null,
            createdAt: '2024-01-01',
          },
        ],
        transactions: [createTransaction({ id: 'tx-1', installmentGroupId: 'grp-1' })],
      };

      const payload = buildPayload(data);
      const roundTripped = JSON.parse(JSON.stringify(payload));

      expect(roundTripped).toEqual(payload);
    });
  });
});

/**
 * Helper to create a transaction record with sensible defaults.
 */
function createTransaction(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    id: 'tx-default',
    title: 'Test Transaction',
    date: '2024-01-15',
    amount: 100.0,
    description: 'Test description',
    categoryId: 'cat-1',
    originId: null,
    batchId: null,
    referenceMonth: '2024-01',
    needsReview: false,
    isExcludedFromTotals: false,
    isPaid: false,
    duplicateOf: null,
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
    installmentGroupId: null,
    recurringId: null,
    ...overrides,
  } as unknown as Record<string, unknown>;
}
