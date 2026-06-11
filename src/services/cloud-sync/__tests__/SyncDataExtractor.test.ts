import { extractAll } from '../SyncDataExtractor';
import { CloudSyncError } from '../CloudSyncError';

// Mock the schema tables - each table needs a minimal representation
jest.mock('@db/schema', () => ({
  expenseGroups: { _: { name: 'expense_groups' } },
  categories: { _: { name: 'categories' } },
  funds: { _: { name: 'funds' } },
  fundAllocations: { _: { name: 'fund_allocations' } },
  transactions: { _: { name: 'transactions' } },
  recurringTransactions: { _: { name: 'recurring_transactions' } },
  weeklyRecurringGroups: { _: { name: 'weekly_recurring_groups' } },
  weeklyOccurrences: { _: { name: 'weekly_occurrences' } },
  recurringFundLinks: { _: { name: 'recurring_fund_links' } },
  categoryGoals: { _: { name: 'category_goals' } },
}));

describe('SyncDataExtractor', () => {
  let mockDb: {
    select: jest.Mock;
  };
  let mockFrom: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockFrom = jest.fn();
    mockDb = {
      select: jest.fn(() => ({ from: mockFrom })),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('extractAll', () => {
    it('should extract all 9 tables and return structured ExtractedData', async () => {
      const mockCategories = [{ id: 'cat-1', name: 'Food', type: 'expense' }];
      const mockFunds = [{ id: 'fund-1', name: 'Emergency' }];
      const mockFundAllocations = [{ id: 'alloc-1', fundId: 'fund-1', amount: 1000 }];
      const mockTransactions = [{ id: 'tx-1', title: 'Groceries', amount: -50 }];
      const mockRecurring = [{ id: 'rec-1', title: 'Netflix' }];
      const mockWeeklyGroups = [{ id: 'wg-1', title: 'Coffee' }];
      const mockWeeklyOccurrences = [{ id: 'wo-1', weeklyGroupId: 'wg-1' }];
      const mockRecurringFundLinks = [{ id: 'rfl-1', recurringId: 'rec-1' }];
      const mockCategoryGoals = [{ id: 'goal-1', categoryId: 'cat-1', amount: 500 }];

      mockFrom
        .mockResolvedValueOnce([]) // expenseGroups
        .mockResolvedValueOnce(mockCategories)
        .mockResolvedValueOnce(mockFunds)
        .mockResolvedValueOnce(mockFundAllocations)
        .mockResolvedValueOnce(mockTransactions)
        .mockResolvedValueOnce(mockRecurring)
        .mockResolvedValueOnce(mockWeeklyGroups)
        .mockResolvedValueOnce(mockWeeklyOccurrences)
        .mockResolvedValueOnce(mockRecurringFundLinks)
        .mockResolvedValueOnce(mockCategoryGoals);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await extractAll(mockDb as any);

      expect(result.categories).toEqual(mockCategories);
      expect(result.funds).toEqual(mockFunds);
      expect(result.fundAllocations).toEqual(mockFundAllocations);
      expect(result.transactions).toEqual(mockTransactions);
      expect(result.recurringTransactions).toEqual(mockRecurring);
      expect(result.weeklyRecurringGroups).toEqual(mockWeeklyGroups);
      expect(result.weeklyOccurrences).toEqual(mockWeeklyOccurrences);
      expect(result.recurringFundLinks).toEqual(mockRecurringFundLinks);
      expect(result.categoryGoals).toEqual(mockCategoryGoals);
    });

    it('should return empty arrays for tables with zero records', async () => {
      mockFrom.mockResolvedValue([]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await extractAll(mockDb as any);

      expect(result.categories).toEqual([]);
      expect(result.funds).toEqual([]);
      expect(result.fundAllocations).toEqual([]);
      expect(result.transactions).toEqual([]);
      expect(result.recurringTransactions).toEqual([]);
      expect(result.weeklyRecurringGroups).toEqual([]);
      expect(result.weeklyOccurrences).toEqual([]);
      expect(result.recurringFundLinks).toEqual([]);
      expect(result.categoryGoals).toEqual([]);
    });

    it('should throw CloudSyncError with EXTRACTION_FAILED when a table read fails', async () => {
      // expenseGroups succeeds, categories succeeds, funds fails
      mockFrom
        .mockResolvedValueOnce([]) // expenseGroups
        .mockResolvedValueOnce([{ id: 'cat-1' }]) // categories
        .mockRejectedValueOnce(new Error('DB read error')); // funds

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await extractAll(mockDb as any);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CloudSyncError);
        expect((error as CloudSyncError).code).toBe('EXTRACTION_FAILED');
        expect((error as CloudSyncError).message).toContain('funds');
      }
    });

    it('should include the failed table name in the error message', async () => {
      // Make the first table fail (categories is first in extraction order)
      mockFrom.mockRejectedValueOnce(new Error('disk full'));

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await extractAll(mockDb as any);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CloudSyncError);
        expect((error as CloudSyncError).message).toContain('expenseGroups');
      }
    });

    it('should discard partial data on failure', async () => {
      // expenseGroups succeeds, categories fails
      mockFrom
        .mockResolvedValueOnce([]) // expenseGroups
        .mockResolvedValueOnce([{ id: 'cat-1', name: 'Food' }]) // categories
        .mockRejectedValueOnce(new Error('Connection lost')); // funds

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(extractAll(mockDb as any)).rejects.toThrow(CloudSyncError);

      // The function throws - no partial result is returned
      // This is verified by the fact that we get an error, not a partial object
    });

    it('should throw EXTRACTION_FAILED on timeout after 30 seconds', async () => {
      // Make the extraction hang forever
      mockFrom.mockImplementation(
        () => new Promise(() => {}) // never resolves
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const promise = extractAll(mockDb as any);

      // Advance timer past the 30-second timeout
      jest.advanceTimersByTime(30_000);

      await expect(promise).rejects.toThrow(CloudSyncError);
      await expect(promise).rejects.toMatchObject({
        code: 'EXTRACTION_FAILED',
        message: expect.stringContaining('timed out'),
      });
    });

    it('should call db.select().from() for each of the 10 tables', async () => {
      mockFrom.mockResolvedValue([]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await extractAll(mockDb as any);

      expect(mockDb.select).toHaveBeenCalledTimes(10);
      expect(mockFrom).toHaveBeenCalledTimes(10);
    });

    it('should preserve field values exactly as stored (no type coercion)', async () => {
      const rawTransaction = {
        id: 'tx-1',
        title: 'Test',
        amount: 99.99,
        isPaid: 1,
        needsReview: 0,
        isExcludedFromTotals: 0,
        date: '2024-01-15',
        createdAt: '2024-01-15T10:00:00',
        installmentGroupId: null,
      };

      mockFrom
        .mockResolvedValueOnce([]) // expenseGroups
        .mockResolvedValueOnce([]) // categories
        .mockResolvedValueOnce([]) // funds
        .mockResolvedValueOnce([]) // fundAllocations
        .mockResolvedValueOnce([rawTransaction]) // transactions
        .mockResolvedValueOnce([]) // recurringTransactions
        .mockResolvedValueOnce([]) // weeklyRecurringGroups
        .mockResolvedValueOnce([]) // weeklyOccurrences
        .mockResolvedValueOnce([]) // recurringFundLinks
        .mockResolvedValueOnce([]); // categoryGoals

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await extractAll(mockDb as any);

      // Values should be exactly as returned from the DB - no coercion
      expect(result.transactions[0]).toEqual(rawTransaction);
      expect(result.transactions[0].isPaid).toBe(1);
      expect(result.transactions[0].needsReview).toBe(0);
      expect(result.transactions[0].amount).toBe(99.99);
    });
  });
});
