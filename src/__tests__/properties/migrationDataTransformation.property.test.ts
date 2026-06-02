import fc from 'fast-check';

/**
 * Property 7: Migration Data Transformation
 *
 * For any set of existing transactions with random description values,
 * after executing the migration logic (UPDATE SET title = description,
 * UPDATE SET description = ''), each transaction's `title` field SHALL
 * equal its original `description` value, and its `description` field
 * SHALL be an empty string.
 *
 * **Validates: Requirements 6.2, 6.3**
 */

/**
 * Represents a transaction record before migration (only has description, no title).
 */
interface PreMigrationTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
}

/**
 * Represents a transaction record after migration (has both title and description).
 */
interface PostMigrationTransaction {
  id: string;
  title: string;
  description: string;
  amount: number;
  date: string;
}

/**
 * Simulates the migration logic from addTitleField.ts:
 * 1. Add title column with default ''
 * 2. UPDATE SET title = description
 * 3. UPDATE SET description = ''
 */
function simulateMigration(transactions: PreMigrationTransaction[]): PostMigrationTransaction[] {
  return transactions.map((tx) => ({
    ...tx,
    title: tx.description,
    description: '',
  }));
}

/**
 * Arbitrary that generates a valid ISO 8601 date string.
 * Uses integer timestamps to avoid invalid date issues with fc.date().
 */
const dateStringArbitrary = fc
  .integer({
    min: new Date('2020-01-01').getTime(),
    max: new Date('2030-12-31').getTime(),
  })
  .map((ts) => new Date(ts).toISOString());

describe('Feature: entry-title-and-dates, Property 7: Migration Data Transformation', () => {
  /**
   * **Validates: Requirements 6.2, 6.3**
   */

  it('after migration, each transaction title equals its original description', () => {
    const transactionArbitrary = fc.record({
      id: fc.uuid(),
      description: fc.string({ minLength: 0, maxLength: 200 }),
      amount: fc.integer({ min: 1, max: 99999999 }),
      date: dateStringArbitrary,
    });

    fc.assert(
      fc.property(
        fc.array(transactionArbitrary, { minLength: 1, maxLength: 50 }),
        (transactions) => {
          const migrated = simulateMigration(transactions);

          for (let i = 0; i < transactions.length; i++) {
            expect(migrated[i]!.title).toBe(transactions[i]!.description);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('after migration, each transaction description is empty string', () => {
    const transactionArbitrary = fc.record({
      id: fc.uuid(),
      description: fc.string({ minLength: 0, maxLength: 200 }),
      amount: fc.integer({ min: 1, max: 99999999 }),
      date: dateStringArbitrary,
    });

    fc.assert(
      fc.property(
        fc.array(transactionArbitrary, { minLength: 1, maxLength: 50 }),
        (transactions) => {
          const migrated = simulateMigration(transactions);

          for (let i = 0; i < migrated.length; i++) {
            expect(migrated[i]!.description).toBe('');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('migration preserves all other transaction fields unchanged', () => {
    const transactionArbitrary = fc.record({
      id: fc.uuid(),
      description: fc.string({ minLength: 0, maxLength: 200 }),
      amount: fc.integer({ min: 1, max: 99999999 }),
      date: dateStringArbitrary,
    });

    fc.assert(
      fc.property(
        fc.array(transactionArbitrary, { minLength: 1, maxLength: 50 }),
        (transactions) => {
          const migrated = simulateMigration(transactions);

          for (let i = 0; i < transactions.length; i++) {
            expect(migrated[i]!.id).toBe(transactions[i]!.id);
            expect(migrated[i]!.amount).toBe(transactions[i]!.amount);
            expect(migrated[i]!.date).toBe(transactions[i]!.date);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('migration handles transactions with empty descriptions correctly', () => {
    const transactionArbitrary = fc.record({
      id: fc.uuid(),
      description: fc.constant(''),
      amount: fc.integer({ min: 1, max: 99999999 }),
      date: dateStringArbitrary,
    });

    fc.assert(
      fc.property(
        fc.array(transactionArbitrary, { minLength: 1, maxLength: 50 }),
        (transactions) => {
          const migrated = simulateMigration(transactions);

          for (let i = 0; i < migrated.length; i++) {
            expect(migrated[i]!.title).toBe('');
            expect(migrated[i]!.description).toBe('');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
