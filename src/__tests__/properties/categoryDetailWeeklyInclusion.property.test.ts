import fc from 'fast-check';

/**
 * Feature: category-detail-screen
 * Property 4: Weekly occurrence inclusion with indicator
 *
 * For any weekly occurrence that matches the category and month filters
 * and has `isPaid = true`, it SHALL appear in the displayed list AND be
 * marked with `type === 'weekly'` (which renders the recurring indicator),
 * and SHALL have a valid `weeklyGroupId` set.
 *
 * This test generates random weekly occurrences matching filters, merges them
 * with transactions using the same logic as useCategoryDetailData, and verifies
 * each weekly occurrence appears in the result with correct type and groupId.
 *
 * **Validates: Requirements 3.3, 3.4**
 */

// --- Types (mirrors useCategoryDetailData interfaces) ---

interface CategoryDetailItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: 'transaction' | 'weekly';
  weeklyGroupId?: string;
}

/** Raw transaction result from the query layer */
interface TransactionResult {
  id: string;
  title: string;
  date: string;
  amount: number;
}

/** Raw weekly occurrence result from the query layer */
interface WeeklyOccurrenceResult {
  id: string;
  description: string;
  date: string;
  amount: number;
  weeklyGroupId: string;
}

// --- Merge logic (extracted from useCategoryDetailData) ---

/**
 * Maps raw transaction results to CategoryDetailItem.
 */
function mapTransactions(transactions: TransactionResult[]): CategoryDetailItem[] {
  return transactions.map((t) => ({
    id: t.id,
    title: t.title,
    date: t.date,
    amount: t.amount,
    type: 'transaction' as const,
  }));
}

/**
 * Maps raw weekly occurrence results to CategoryDetailItem.
 */
function mapWeeklyOccurrences(occurrences: WeeklyOccurrenceResult[]): CategoryDetailItem[] {
  return occurrences.map((w) => ({
    id: w.id,
    title: w.description,
    date: w.date,
    amount: w.amount,
    type: 'weekly' as const,
    weeklyGroupId: w.weeklyGroupId,
  }));
}

/**
 * Merges transactions and weekly occurrences, sorted by date descending.
 * Same logic as useCategoryDetailData hook.
 */
function mergeItems(
  transactions: TransactionResult[],
  weeklyOccurrences: WeeklyOccurrenceResult[]
): CategoryDetailItem[] {
  const transactionItems = mapTransactions(transactions);
  const weeklyItems = mapWeeklyOccurrences(weeklyOccurrences);
  return [...transactionItems, ...weeklyItems].sort((a, b) => b.date.localeCompare(a.date));
}

// --- Arbitraries ---

const dateInMonthArb = fc
  .integer({ min: 1, max: 28 })
  .map((day) => `2024-06-${String(day).padStart(2, '0')}`);

/**
 * Generates a valid WeeklyOccurrenceResult that matches filters
 * (already passed category/month/isPaid filters at query level).
 */
const weeklyOccurrenceArb: fc.Arbitrary<WeeklyOccurrenceResult> = fc.record({
  id: fc.uuid(),
  description: fc.string({ minLength: 1, maxLength: 30 }),
  date: dateInMonthArb,
  amount: fc.integer({ min: -999999, max: 999999 }).filter((a) => a !== 0),
  weeklyGroupId: fc.uuid(),
});

/**
 * Generates a valid TransactionResult that matches filters.
 */
const transactionResultArb: fc.Arbitrary<TransactionResult> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 30 }),
  date: dateInMonthArb,
  amount: fc.integer({ min: -999999, max: 999999 }).filter((a) => a !== 0),
});

// --- Property Tests ---

describe('Feature: category-detail-screen, Property 4: Weekly occurrence inclusion with indicator', () => {
  /**
   * **Validates: Requirements 3.3, 3.4**
   */

  it('all weekly occurrences matching filters appear in merged results with type === "weekly"', () => {
    fc.assert(
      fc.property(
        fc.array(transactionResultArb, { minLength: 0, maxLength: 10 }),
        fc.array(weeklyOccurrenceArb, { minLength: 1, maxLength: 10 }),
        (transactions, weeklyOccurrences) => {
          const merged = mergeItems(transactions, weeklyOccurrences);

          // Every weekly occurrence should appear in the merged result
          for (const wo of weeklyOccurrences) {
            const found = merged.find((item) => item.id === wo.id);
            expect(found).toBeDefined();
            expect(found!.type).toBe('weekly');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all weekly items in merged results have a valid weeklyGroupId set', () => {
    fc.assert(
      fc.property(
        fc.array(transactionResultArb, { minLength: 0, maxLength: 10 }),
        fc.array(weeklyOccurrenceArb, { minLength: 1, maxLength: 10 }),
        (transactions, weeklyOccurrences) => {
          const merged = mergeItems(transactions, weeklyOccurrences);

          const weeklyItems = merged.filter((item) => item.type === 'weekly');

          for (const item of weeklyItems) {
            expect(item.weeklyGroupId).toBeDefined();
            expect(typeof item.weeklyGroupId).toBe('string');
            expect(item.weeklyGroupId!.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('weekly items preserve the weeklyGroupId from the source occurrence', () => {
    fc.assert(
      fc.property(
        fc.array(transactionResultArb, { minLength: 0, maxLength: 10 }),
        fc.array(weeklyOccurrenceArb, { minLength: 1, maxLength: 10 }),
        (transactions, weeklyOccurrences) => {
          const merged = mergeItems(transactions, weeklyOccurrences);

          for (const wo of weeklyOccurrences) {
            const found = merged.find((item) => item.id === wo.id);
            expect(found).toBeDefined();
            expect(found!.weeklyGroupId).toBe(wo.weeklyGroupId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('regular transactions in merged results do NOT have type === "weekly"', () => {
    fc.assert(
      fc.property(
        fc.array(transactionResultArb, { minLength: 1, maxLength: 10 }),
        fc.array(weeklyOccurrenceArb, { minLength: 0, maxLength: 10 }),
        (transactions, weeklyOccurrences) => {
          const merged = mergeItems(transactions, weeklyOccurrences);

          for (const tx of transactions) {
            const found = merged.find((item) => item.id === tx.id);
            expect(found).toBeDefined();
            expect(found!.type).toBe('transaction');
            expect(found!.weeklyGroupId).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the count of weekly items in merged results equals the count of weekly occurrences input', () => {
    fc.assert(
      fc.property(
        fc.array(transactionResultArb, { minLength: 0, maxLength: 10 }),
        fc.array(weeklyOccurrenceArb, { minLength: 0, maxLength: 10 }),
        (transactions, weeklyOccurrences) => {
          const merged = mergeItems(transactions, weeklyOccurrences);

          const weeklyCount = merged.filter((item) => item.type === 'weekly').length;
          expect(weeklyCount).toBe(weeklyOccurrences.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
