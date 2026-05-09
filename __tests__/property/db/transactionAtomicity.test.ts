/**
 * Property-Based Test: Database Transaction Atomicity (Property 8)
 *
 * **Validates: Requirements 3.5**
 *
 * *For any* multi-record database operation, either all changes SHALL be applied
 * successfully, or none SHALL be applied (rollback on failure). The database state
 * after a failed transaction SHALL be identical to the state before the transaction began.
 */
import * as fc from 'fast-check';
import { openDatabaseSync } from 'expo-sqlite';
import { withTransaction, withTransactionSync, resetDbClient } from '../../../src/db/client';

// Mock expo-sqlite with stateful behavior for testing atomicity
jest.mock('expo-sqlite', () => {
  return {
    openDatabaseSync: jest.fn(),
  };
});

// Mock drizzle-orm
jest.mock('drizzle-orm/expo-sqlite', () => ({
  drizzle: jest.fn(() => ({
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
  useLiveQuery: jest.fn(),
}));

describe('Property 8: Database Transaction Atomicity', () => {
  /**
   * Simulates a database state tracker for testing atomicity
   */
  interface DatabaseState {
    data: Map<string, string>;
    transactionActive: boolean;
    pendingChanges: Map<string, string>;
  }

  let dbState: DatabaseState;
  let mockSqliteDb: {
    execSync: jest.Mock;
    runSync: jest.Mock;
    getFirstSync: jest.Mock;
    getAllSync: jest.Mock;
    closeSync: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetDbClient();

    // Initialize simulated database state
    dbState = {
      data: new Map(),
      transactionActive: false,
      pendingChanges: new Map(),
    };

    // Create mock that simulates transaction behavior
    mockSqliteDb = {
      execSync: jest.fn((sql: string) => {
        if (sql === 'BEGIN TRANSACTION') {
          dbState.transactionActive = true;
          dbState.pendingChanges = new Map();
        } else if (sql === 'COMMIT') {
          // Apply pending changes to actual data
          dbState.pendingChanges.forEach((value, key) => {
            dbState.data.set(key, value);
          });
          dbState.pendingChanges.clear();
          dbState.transactionActive = false;
        } else if (sql === 'ROLLBACK') {
          // Discard pending changes
          dbState.pendingChanges.clear();
          dbState.transactionActive = false;
        }
      }),
      runSync: jest.fn(),
      getFirstSync: jest.fn(),
      getAllSync: jest.fn(),
      closeSync: jest.fn(),
    };

    (openDatabaseSync as jest.Mock).mockReturnValue(mockSqliteDb);
  });

  /**
   * Helper to simulate a database write operation
   */
  function simulateWrite(key: string, value: string): void {
    if (dbState.transactionActive) {
      dbState.pendingChanges.set(key, value);
    } else {
      dbState.data.set(key, value);
    }
  }

  /**
   * Helper to get current database state snapshot
   */
  function getStateSnapshot(): Map<string, string> {
    return new Map(dbState.data);
  }

  /**
   * Generate unique keys to avoid duplicate key issues in tests
   */
  const uniqueKeyArb = fc.nat({ max: 10000 }).map((n) => `key_${n}`);

  /**
   * Generate a set of unique key-value pairs using uniqueArray
   */
  const uniqueOperationsArb = fc
    .uniqueArray(uniqueKeyArb, { minLength: 1, maxLength: 10 })
    .map((keys) => keys.map((key) => [key, `value_${key}`] as [string, string]));

  /**
   * Generate initial data with unique keys
   */
  const initialDataArb = fc
    .uniqueArray(uniqueKeyArb, { maxLength: 5 })
    .map((keys) => keys.map((key) => [key, `initial_${key}`] as [string, string]));

  describe('Async Transaction Atomicity', () => {
    it('should commit all changes on successful transaction', async () => {
      /**
       * Property: For any sequence of write operations within a successful transaction,
       * all changes should be visible after commit.
       */
      await fc.assert(
        fc.asyncProperty(uniqueOperationsArb, async (operations) => {
          // Clear state
          dbState.data.clear();

          // Execute transaction
          await withTransaction(async () => {
            for (const [key, value] of operations) {
              simulateWrite(key, value);
            }
          });

          // Verify all changes were committed
          for (const [key, value] of operations) {
            expect(dbState.data.get(key)).toBe(value);
          }

          // Verify transaction is no longer active
          expect(dbState.transactionActive).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should rollback all changes on failed transaction', async () => {
      /**
       * Property: For any sequence of write operations within a failed transaction,
       * the database state should be identical to before the transaction.
       */
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            initialData: initialDataArb,
            transactionData: uniqueOperationsArb,
            errorMessage: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async ({ initialData, transactionData, errorMessage }) => {
            // Setup initial state
            dbState.data.clear();
            for (const [key, value] of initialData) {
              dbState.data.set(key, value);
            }

            // Capture state before transaction
            const stateBefore = getStateSnapshot();

            // Execute failing transaction
            try {
              await withTransaction(async () => {
                for (const [key, value] of transactionData) {
                  simulateWrite(key, value);
                }
                throw new Error(errorMessage);
              });
            } catch {
              // Expected to throw
            }

            // Verify state is unchanged
            const stateAfter = getStateSnapshot();
            expect(stateAfter).toEqual(stateBefore);

            // Verify transaction is no longer active
            expect(dbState.transactionActive).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve state before transaction on any error at any point', async () => {
      /**
       * Property: The database state after a failed transaction SHALL be identical
       * to the state before the transaction began, regardless of when the error occurs.
       */
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            preExistingKeys: fc.uniqueArray(uniqueKeyArb, { minLength: 0, maxLength: 5 }),
            newKeys: fc.uniqueArray(uniqueKeyArb, { minLength: 1, maxLength: 5 }),
            failAtIndex: fc.nat({ max: 100 }),
          }),
          async ({ preExistingKeys, newKeys, failAtIndex }) => {
            // Setup initial state with pre-existing data
            dbState.data.clear();
            for (const key of preExistingKeys) {
              dbState.data.set(key, `initial-${key}`);
            }

            const stateBefore = getStateSnapshot();
            const failIndex = failAtIndex % (newKeys.length + 1);

            try {
              await withTransaction(async () => {
                for (let i = 0; i < newKeys.length; i++) {
                  if (i === failIndex) {
                    throw new Error('Simulated failure');
                  }
                  simulateWrite(newKeys[i], `new-${newKeys[i]}`);
                }
                // Also fail at the end if failIndex equals length
                if (failIndex === newKeys.length) {
                  throw new Error('Simulated failure at end');
                }
              });
            } catch {
              // Expected
            }

            // State should be unchanged
            expect(getStateSnapshot()).toEqual(stateBefore);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Sync Transaction Atomicity', () => {
    it('should commit all changes on successful sync transaction', () => {
      /**
       * Property: Synchronous transactions should also be atomic.
       */
      fc.assert(
        fc.property(uniqueOperationsArb, (operations) => {
          dbState.data.clear();

          withTransactionSync(() => {
            for (const [key, value] of operations) {
              simulateWrite(key, value);
            }
          });

          for (const [key, value] of operations) {
            expect(dbState.data.get(key)).toBe(value);
          }
          expect(dbState.transactionActive).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should rollback all changes on failed sync transaction', () => {
      /**
       * Property: Synchronous transactions should rollback on error.
       */
      fc.assert(
        fc.property(
          fc.record({
            initialData: initialDataArb,
            transactionData: uniqueOperationsArb,
          }),
          ({ initialData, transactionData }) => {
            dbState.data.clear();
            for (const [key, value] of initialData) {
              dbState.data.set(key, value);
            }

            const stateBefore = getStateSnapshot();

            try {
              withTransactionSync(() => {
                for (const [key, value] of transactionData) {
                  simulateWrite(key, value);
                }
                throw new Error('Simulated failure');
              });
            } catch {
              // Expected
            }

            expect(getStateSnapshot()).toEqual(stateBefore);
            expect(dbState.transactionActive).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Transaction State Consistency', () => {
    it('should not leave transaction in active state after completion', async () => {
      /**
       * Property: After any transaction (success or failure), the transaction
       * should not be in an active state.
       */
      await fc.assert(
        fc.asyncProperty(fc.boolean(), async (shouldFail) => {
          dbState.data.clear();
          dbState.transactionActive = false;

          try {
            await withTransaction(async () => {
              simulateWrite('test', 'value');
              if (shouldFail) {
                throw new Error('Intentional failure');
              }
            });
          } catch {
            // Expected for shouldFail = true
          }

          // Transaction should never be left active
          expect(dbState.transactionActive).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should return the correct value from successful transaction', async () => {
      /**
       * Property: The return value of a successful transaction should be
       * the value returned by the transaction function.
       */
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
          async (expectedValue) => {
            const result = await withTransaction(async () => {
              return expectedValue;
            });

            expect(result).toEqual(expectedValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should propagate the error from failed transaction', async () => {
      /**
       * Property: The error thrown by a failed transaction should be
       * the same error thrown by the transaction function.
       */
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1, maxLength: 100 }), async (errorMessage) => {
          await expect(
            withTransaction(async () => {
              throw new Error(errorMessage);
            })
          ).rejects.toThrow(errorMessage);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Multiple Operations Atomicity', () => {
    it('should apply all or nothing for multiple writes', async () => {
      /**
       * Property: When multiple writes happen in a transaction, either all
       * are applied (on success) or none are applied (on failure).
       */
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            operations: uniqueOperationsArb,
            shouldSucceed: fc.boolean(),
          }),
          async ({ operations, shouldSucceed }) => {
            dbState.data.clear();
            const stateBefore = getStateSnapshot();

            try {
              await withTransaction(async () => {
                for (const [key, value] of operations) {
                  simulateWrite(key, value);
                }
                if (!shouldSucceed) {
                  throw new Error('Transaction failed');
                }
              });
            } catch {
              // Expected when shouldSucceed is false
            }

            if (shouldSucceed) {
              // All operations should be applied
              for (const [key, value] of operations) {
                expect(dbState.data.get(key)).toBe(value);
              }
            } else {
              // No operations should be applied
              expect(getStateSnapshot()).toEqual(stateBefore);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
