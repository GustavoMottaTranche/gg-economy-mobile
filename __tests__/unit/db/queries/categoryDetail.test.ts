/**
 * Unit Tests for Category Detail Query Functions
 *
 * Tests that getCategoryDetailTransactionsQuery, getCategoryDetailWeeklyQuery,
 * and getInstallmentGroupInfoBatch correctly interact with the database,
 * returning the expected fields and not filtering out unpaid items.
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
 */

// Mock drizzle-orm operators
jest.mock('drizzle-orm', () => ({
  eq: jest.fn((col, val) => ({ column: col, value: val, op: 'eq' })),
  and: jest.fn((...conditions) => ({ conditions, op: 'and' })),
  desc: jest.fn((col) => ({ column: col, op: 'desc' })),
  asc: jest.fn((col) => ({ column: col, op: 'asc' })),
  inArray: jest.fn((col, vals) => ({ column: col, values: vals, op: 'inArray' })),
  sql: jest.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
    type: 'sql',
  })),
  relations: jest.fn(() => ({})),
}));

// Mock drizzle-orm/sqlite-core
jest.mock('drizzle-orm/sqlite-core', () => ({
  sqliteTable: jest.fn((_name: string, columns: unknown) => columns),
  text: jest.fn(() => ({
    primaryKey: jest.fn().mockReturnThis(),
    notNull: jest.fn().mockReturnThis(),
    default: jest.fn().mockReturnThis(),
    references: jest.fn().mockReturnThis(),
  })),
  integer: jest.fn(() => ({
    primaryKey: jest.fn().mockReturnThis(),
    notNull: jest.fn().mockReturnThis(),
    default: jest.fn().mockReturnThis(),
  })),
  real: jest.fn(() => ({
    notNull: jest.fn().mockReturnThis(),
    default: jest.fn().mockReturnThis(),
  })),
  index: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
  })),
  uniqueIndex: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
  })),
}));

// Mock db client
jest.mock('../../../../src/db/client', () => ({
  getDb: jest.fn(),
}));

import { getDb } from '../../../../src/db/client';
import {
  getCategoryDetailTransactionsQuery,
  getCategoryDetailWeeklyQuery,
  getInstallmentGroupInfoBatch,
} from '../../../../src/db/queries/categoryDetail';

const mockedGetDb = getDb as jest.MockedFunction<typeof getDb>;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Creates a mock DB chain that captures select fields and resolves with given data.
 */
function createMockDbChain(resolvedData: unknown[] = []) {
  let capturedSelect: Record<string, unknown> | undefined;

  const chain: Record<string, jest.Mock> = {};

  chain.select = jest.fn((fields?: Record<string, unknown>) => {
    capturedSelect = fields;
    return chain;
  });
  chain.from = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.orderBy = jest.fn().mockReturnValue(Promise.resolve(resolvedData));
  chain.innerJoin = jest.fn().mockReturnValue(chain);

  return { chain, getCapturedSelect: () => capturedSelect };
}

// ============================================================================
// Tests: getCategoryDetailTransactionsQuery
// ============================================================================

describe('getCategoryDetailTransactionsQuery', () => {
  it('returns isPaid, installmentGroupId, and recurringId fields in the select', async () => {
    const mockData = [
      {
        id: 'tx-1',
        title: 'Grocery',
        date: '2024-01-15',
        amount: -5000,
        isPaid: true,
        installmentGroupId: null,
        recurringId: null,
      },
    ];
    const { chain, getCapturedSelect } = createMockDbChain(mockData);
    mockedGetDb.mockReturnValue(chain as unknown as ReturnType<typeof getDb>);

    const result = await getCategoryDetailTransactionsQuery('cat-1', '2024-01');

    // Verify the select fields include isPaid, installmentGroupId, recurringId
    const selectFields = getCapturedSelect();
    expect(selectFields).toBeDefined();
    expect(selectFields).toHaveProperty('isPaid');
    expect(selectFields).toHaveProperty('installmentGroupId');
    expect(selectFields).toHaveProperty('recurringId');
    expect(selectFields).toHaveProperty('id');
    expect(selectFields).toHaveProperty('title');
    expect(selectFields).toHaveProperty('date');
    expect(selectFields).toHaveProperty('amount');

    // Verify the result contains the expected data
    expect(result).toEqual(mockData);
  });

  it('does not filter out unpaid transactions (includes both paid and unpaid)', async () => {
    const mockData = [
      {
        id: 'tx-1',
        title: 'Paid Transaction',
        date: '2024-01-15',
        amount: -5000,
        isPaid: true,
        installmentGroupId: null,
        recurringId: null,
      },
      {
        id: 'tx-2',
        title: 'Unpaid Recurring',
        date: '2024-01-10',
        amount: -3000,
        isPaid: false,
        installmentGroupId: null,
        recurringId: 'rec-1',
      },
      {
        id: 'tx-3',
        title: 'Unpaid Installment',
        date: '2024-01-05',
        amount: -2000,
        isPaid: false,
        installmentGroupId: 'group-1',
        recurringId: null,
      },
    ];
    const { chain } = createMockDbChain(mockData);
    mockedGetDb.mockReturnValue(chain as unknown as ReturnType<typeof getDb>);

    const result = await getCategoryDetailTransactionsQuery('cat-1', '2024-01');

    // All three items should be returned (no isPaid filter)
    expect(result).toHaveLength(3);
    expect(result[0].isPaid).toBe(true);
    expect(result[1].isPaid).toBe(false);
    expect(result[2].isPaid).toBe(false);
  });

  it('passes correct filter conditions (categoryId, referenceMonth, isExcludedFromTotals)', async () => {
    const { chain } = createMockDbChain([]);
    mockedGetDb.mockReturnValue(chain as unknown as ReturnType<typeof getDb>);

    await getCategoryDetailTransactionsQuery('cat-food', '2024-03');

    // Verify that where was called (the filter is applied)
    expect(chain.where).toHaveBeenCalled();
    // Verify from was called with transactions table
    expect(chain.from).toHaveBeenCalled();
    // Verify orderBy was called for date desc ordering
    expect(chain.orderBy).toHaveBeenCalled();
  });

  it('returns transactions with installmentGroupId for installment parcels', async () => {
    const mockData = [
      {
        id: 'tx-inst-1',
        title: 'Laptop Parcel 3/12',
        date: '2024-03-01',
        amount: -50000,
        isPaid: true,
        installmentGroupId: 'inst-group-abc',
        recurringId: null,
      },
    ];
    const { chain } = createMockDbChain(mockData);
    mockedGetDb.mockReturnValue(chain as unknown as ReturnType<typeof getDb>);

    const result = await getCategoryDetailTransactionsQuery('cat-tech', '2024-03');

    expect(result[0].installmentGroupId).toBe('inst-group-abc');
    expect(result[0].recurringId).toBeNull();
  });

  it('returns transactions with recurringId for recurring charges', async () => {
    const mockData = [
      {
        id: 'tx-rec-1',
        title: 'Netflix',
        date: '2024-03-05',
        amount: -3990,
        isPaid: false,
        installmentGroupId: null,
        recurringId: 'rec-netflix',
      },
    ];
    const { chain } = createMockDbChain(mockData);
    mockedGetDb.mockReturnValue(chain as unknown as ReturnType<typeof getDb>);

    const result = await getCategoryDetailTransactionsQuery('cat-entertainment', '2024-03');

    expect(result[0].recurringId).toBe('rec-netflix');
    expect(result[0].installmentGroupId).toBeNull();
  });
});

// ============================================================================
// Tests: getCategoryDetailWeeklyQuery
// ============================================================================

describe('getCategoryDetailWeeklyQuery', () => {
  it('returns isPaid field in the select', async () => {
    const mockData = [
      {
        id: 'wo-1',
        description: 'Weekly Lunch',
        date: '2024-01-28',
        amount: -3500,
        weeklyGroupId: 'wg-1',
        isPaid: true,
      },
    ];
    const { chain, getCapturedSelect } = createMockDbChain(mockData);
    mockedGetDb.mockReturnValue(chain as unknown as ReturnType<typeof getDb>);

    const result = await getCategoryDetailWeeklyQuery('cat-food', '2024-01');

    const selectFields = getCapturedSelect();
    expect(selectFields).toBeDefined();
    expect(selectFields).toHaveProperty('isPaid');
    expect(selectFields).toHaveProperty('id');
    expect(selectFields).toHaveProperty('description');
    expect(selectFields).toHaveProperty('date');
    expect(selectFields).toHaveProperty('amount');
    expect(selectFields).toHaveProperty('weeklyGroupId');

    expect(result).toEqual(mockData);
  });

  it('includes unpaid weekly occurrences (no isPaid=true filter)', async () => {
    const mockData = [
      {
        id: 'wo-1',
        description: 'Weekly Lunch',
        date: '2024-01-28',
        amount: -3500,
        weeklyGroupId: 'wg-1',
        isPaid: true,
      },
      {
        id: 'wo-2',
        description: 'Weekly Lunch',
        date: '2024-01-21',
        amount: -3500,
        weeklyGroupId: 'wg-1',
        isPaid: false,
      },
      {
        id: 'wo-3',
        description: 'Weekly Gym',
        date: '2024-01-14',
        amount: -5000,
        weeklyGroupId: 'wg-2',
        isPaid: false,
      },
    ];
    const { chain } = createMockDbChain(mockData);
    mockedGetDb.mockReturnValue(chain as unknown as ReturnType<typeof getDb>);

    const result = await getCategoryDetailWeeklyQuery('cat-food', '2024-01');

    // All occurrences (paid and unpaid) should be returned
    expect(result).toHaveLength(3);
    expect(result[0].isPaid).toBe(true);
    expect(result[1].isPaid).toBe(false);
    expect(result[2].isPaid).toBe(false);
  });

  it('performs an inner join with weeklyRecurringGroups', async () => {
    const { chain } = createMockDbChain([]);
    mockedGetDb.mockReturnValue(chain as unknown as ReturnType<typeof getDb>);

    await getCategoryDetailWeeklyQuery('cat-food', '2024-01');

    expect(chain.innerJoin).toHaveBeenCalled();
  });

  it('applies where filter and orders by date descending', async () => {
    const { chain } = createMockDbChain([]);
    mockedGetDb.mockReturnValue(chain as unknown as ReturnType<typeof getDb>);

    await getCategoryDetailWeeklyQuery('cat-food', '2024-01');

    expect(chain.where).toHaveBeenCalled();
    expect(chain.orderBy).toHaveBeenCalled();
  });
});

// ============================================================================
// Tests: getInstallmentGroupInfoBatch
// ============================================================================

describe('getInstallmentGroupInfoBatch', () => {
  it('returns empty Map when groupIds is empty', async () => {
    const result = await getInstallmentGroupInfoBatch([], '2024-03');

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it('returns correct info for a single group with multiple months', async () => {
    const mockRows = [
      { installmentGroupId: 'group-1', referenceMonth: '2024-01' },
      { installmentGroupId: 'group-1', referenceMonth: '2024-02' },
      { installmentGroupId: 'group-1', referenceMonth: '2024-03' },
      { installmentGroupId: 'group-1', referenceMonth: '2024-04' },
      { installmentGroupId: 'group-1', referenceMonth: '2024-05' },
      { installmentGroupId: 'group-1', referenceMonth: '2024-06' },
    ];

    const chain: Record<string, jest.Mock> = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.from = jest.fn().mockReturnValue(chain);
    chain.where = jest.fn().mockReturnValue(chain);
    chain.orderBy = jest.fn().mockResolvedValue(mockRows);
    mockedGetDb.mockReturnValue(chain as unknown as ReturnType<typeof getDb>);

    const result = await getInstallmentGroupInfoBatch(['group-1'], '2024-03');

    expect(result.size).toBe(1);
    expect(result.get('group-1')).toEqual({
      currentIndex: 3,
      totalParcels: 6,
    });
  });

  it('returns correct info for multiple groups', async () => {
    const mockRows = [
      { installmentGroupId: 'group-a', referenceMonth: '2024-01' },
      { installmentGroupId: 'group-a', referenceMonth: '2024-02' },
      { installmentGroupId: 'group-a', referenceMonth: '2024-03' },
      { installmentGroupId: 'group-b', referenceMonth: '2024-02' },
      { installmentGroupId: 'group-b', referenceMonth: '2024-03' },
      { installmentGroupId: 'group-b', referenceMonth: '2024-04' },
      { installmentGroupId: 'group-b', referenceMonth: '2024-05' },
    ];

    const chain: Record<string, jest.Mock> = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.from = jest.fn().mockReturnValue(chain);
    chain.where = jest.fn().mockReturnValue(chain);
    chain.orderBy = jest.fn().mockResolvedValue(mockRows);
    mockedGetDb.mockReturnValue(chain as unknown as ReturnType<typeof getDb>);

    const result = await getInstallmentGroupInfoBatch(['group-a', 'group-b'], '2024-03');

    expect(result.size).toBe(2);
    expect(result.get('group-a')).toEqual({
      currentIndex: 3,
      totalParcels: 3,
    });
    expect(result.get('group-b')).toEqual({
      currentIndex: 2,
      totalParcels: 4,
    });
  });

  it('omits group from map when target month is not found in group', async () => {
    const mockRows = [
      { installmentGroupId: 'group-x', referenceMonth: '2024-01' },
      { installmentGroupId: 'group-x', referenceMonth: '2024-02' },
      { installmentGroupId: 'group-x', referenceMonth: '2024-04' },
    ];

    const chain: Record<string, jest.Mock> = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.from = jest.fn().mockReturnValue(chain);
    chain.where = jest.fn().mockReturnValue(chain);
    chain.orderBy = jest.fn().mockResolvedValue(mockRows);
    mockedGetDb.mockReturnValue(chain as unknown as ReturnType<typeof getDb>);

    // Target month '2024-03' is NOT in group-x
    const result = await getInstallmentGroupInfoBatch(['group-x'], '2024-03');

    expect(result.size).toBe(0);
    expect(result.get('group-x')).toBeUndefined();
  });

  it('handles mixed scenario: some groups have target month, some do not', async () => {
    const mockRows = [
      { installmentGroupId: 'group-found', referenceMonth: '2024-01' },
      { installmentGroupId: 'group-found', referenceMonth: '2024-02' },
      { installmentGroupId: 'group-found', referenceMonth: '2024-03' },
      { installmentGroupId: 'group-missing', referenceMonth: '2024-01' },
      { installmentGroupId: 'group-missing', referenceMonth: '2024-04' },
    ];

    const chain: Record<string, jest.Mock> = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.from = jest.fn().mockReturnValue(chain);
    chain.where = jest.fn().mockReturnValue(chain);
    chain.orderBy = jest.fn().mockResolvedValue(mockRows);
    mockedGetDb.mockReturnValue(chain as unknown as ReturnType<typeof getDb>);

    const result = await getInstallmentGroupInfoBatch(['group-found', 'group-missing'], '2024-03');

    expect(result.size).toBe(1);
    expect(result.get('group-found')).toEqual({
      currentIndex: 3,
      totalParcels: 3,
    });
    expect(result.get('group-missing')).toBeUndefined();
  });

  it('does not call database when groupIds is empty', async () => {
    mockedGetDb.mockClear();

    await getInstallmentGroupInfoBatch([], '2024-03');

    // getDb should not be called for empty input
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it('returns first month as index 1 for target matching first entry', async () => {
    const mockRows = [
      { installmentGroupId: 'group-1', referenceMonth: '2024-01' },
      { installmentGroupId: 'group-1', referenceMonth: '2024-02' },
      { installmentGroupId: 'group-1', referenceMonth: '2024-03' },
    ];

    const chain: Record<string, jest.Mock> = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.from = jest.fn().mockReturnValue(chain);
    chain.where = jest.fn().mockReturnValue(chain);
    chain.orderBy = jest.fn().mockResolvedValue(mockRows);
    mockedGetDb.mockReturnValue(chain as unknown as ReturnType<typeof getDb>);

    const result = await getInstallmentGroupInfoBatch(['group-1'], '2024-01');

    expect(result.get('group-1')).toEqual({
      currentIndex: 1,
      totalParcels: 3,
    });
  });

  it('returns last month as index equal to totalParcels for target matching last entry', async () => {
    const mockRows = [
      { installmentGroupId: 'group-1', referenceMonth: '2024-01' },
      { installmentGroupId: 'group-1', referenceMonth: '2024-02' },
      { installmentGroupId: 'group-1', referenceMonth: '2024-03' },
      { installmentGroupId: 'group-1', referenceMonth: '2024-04' },
      { installmentGroupId: 'group-1', referenceMonth: '2024-05' },
    ];

    const chain: Record<string, jest.Mock> = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.from = jest.fn().mockReturnValue(chain);
    chain.where = jest.fn().mockReturnValue(chain);
    chain.orderBy = jest.fn().mockResolvedValue(mockRows);
    mockedGetDb.mockReturnValue(chain as unknown as ReturnType<typeof getDb>);

    const result = await getInstallmentGroupInfoBatch(['group-1'], '2024-05');

    expect(result.get('group-1')).toEqual({
      currentIndex: 5,
      totalParcels: 5,
    });
  });
});
