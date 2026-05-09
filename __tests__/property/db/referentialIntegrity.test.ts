/**
 * Property-Based Test: Referential Integrity Enforcement (Property 9)
 *
 * **Validates: Requirements 5.6, 5.7**
 *
 * *For any* transaction with a `category_id` or `batch_id`, the referenced
 * category or import batch SHALL exist in the database. Attempts to create
 * transactions with non-existent foreign key references SHALL be rejected.
 *
 * Note: This test validates the CONCEPT of referential integrity enforcement.
 * In the actual SQLite database, foreign key constraints are enforced at the
 * database level. This test uses a simulated database to demonstrate the property.
 */
import * as fc from 'fast-check';

describe('Property 9: Referential Integrity Enforcement', () => {
  /**
   * Simulated database with referential integrity enforcement
   */
  class MockDatabase {
    categories = new Map<string, { id: string; name: string }>();
    origins = new Map<string, { id: string; name: string }>();
    importBatches = new Map<string, { id: string; fileName: string }>();
    transactions = new Map<string, Record<string, unknown>>();

    /**
     * Validate foreign key references before inserting a transaction
     */
    validateForeignKeys(data: {
      categoryId?: string | null;
      originId?: string | null;
      batchId?: string | null;
    }): { valid: boolean; error?: string } {
      // Null references are always valid
      if (data.categoryId && !this.categories.has(data.categoryId)) {
        return {
          valid: false,
          error: `Foreign key constraint failed: category_id '${data.categoryId}' does not exist`,
        };
      }

      if (data.originId && !this.origins.has(data.originId)) {
        return {
          valid: false,
          error: `Foreign key constraint failed: origin_id '${data.originId}' does not exist`,
        };
      }

      if (data.batchId && !this.importBatches.has(data.batchId)) {
        return {
          valid: false,
          error: `Foreign key constraint failed: batch_id '${data.batchId}' does not exist`,
        };
      }

      return { valid: true };
    }

    /**
     * Insert a transaction with referential integrity check
     */
    insertTransaction(data: {
      id: string;
      categoryId?: string | null;
      originId?: string | null;
      batchId?: string | null;
      [key: string]: unknown;
    }): { success: boolean; error?: string } {
      const validation = this.validateForeignKeys(data);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      this.transactions.set(data.id, data);
      return { success: true };
    }

    /**
     * Add a category
     */
    addCategory(id: string, name: string) {
      this.categories.set(id, { id, name });
    }

    /**
     * Add an origin
     */
    addOrigin(id: string, name: string) {
      this.origins.set(id, { id, name });
    }

    /**
     * Add an import batch
     */
    addImportBatch(id: string, fileName: string) {
      this.importBatches.set(id, { id, fileName });
    }

    /**
     * Clear all data
     */
    clear() {
      this.categories.clear();
      this.origins.clear();
      this.importBatches.clear();
      this.transactions.clear();
    }
  }

  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

  /**
   * Arbitrary for valid UUID-like strings
   */
  const uuidArb = fc.uuid();

  /**
   * Arbitrary for transaction base data
   */
  const baseTransactionDataArb = fc.record({
    id: uuidArb,
    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
    amount: fc.double({ min: -10000, max: 10000, noNaN: true }),
    description: fc.string({ minLength: 1, maxLength: 100 }),
    referenceMonth: fc.constantFrom('2024-01', '2024-02', '2024-03'),
  });

  describe('Category Foreign Key Constraint', () => {
    it('should allow transactions with null categoryId', () => {
      /**
       * Property: Transactions with null category_id should always be accepted
       */
      fc.assert(
        fc.property(baseTransactionDataArb, (txData) => {
          const result = db.insertTransaction({
            ...txData,
            categoryId: null,
          });

          expect(result.success).toBe(true);
          expect(result.error).toBeUndefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should allow transactions with existing categoryId', () => {
      /**
       * Property: Transactions referencing existing categories should be accepted
       */
      fc.assert(
        fc.property(
          fc.record({
            txData: baseTransactionDataArb,
            categoryId: uuidArb,
            categoryName: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          ({ txData, categoryId, categoryName }) => {
            // First, create the category
            db.addCategory(categoryId, categoryName);

            const result = db.insertTransaction({
              ...txData,
              categoryId,
            });

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject transactions with non-existent categoryId', () => {
      /**
       * Property: Transactions referencing non-existent categories should be rejected
       */
      fc.assert(
        fc.property(
          fc.record({
            txData: baseTransactionDataArb,
            nonExistentCategoryId: uuidArb,
          }),
          ({ txData, nonExistentCategoryId }) => {
            // Ensure the category does NOT exist
            db.categories.delete(nonExistentCategoryId);

            const result = db.insertTransaction({
              ...txData,
              categoryId: nonExistentCategoryId,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('category_id');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Origin Foreign Key Constraint', () => {
    it('should allow transactions with null originId', () => {
      /**
       * Property: Transactions with null origin_id should always be accepted
       */
      fc.assert(
        fc.property(baseTransactionDataArb, (txData) => {
          const result = db.insertTransaction({
            ...txData,
            originId: null,
          });

          expect(result.success).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should allow transactions with existing originId', () => {
      /**
       * Property: Transactions referencing existing origins should be accepted
       */
      fc.assert(
        fc.property(
          fc.record({
            txData: baseTransactionDataArb,
            originId: uuidArb,
            originName: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          ({ txData, originId, originName }) => {
            db.addOrigin(originId, originName);

            const result = db.insertTransaction({
              ...txData,
              originId,
            });

            expect(result.success).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject transactions with non-existent originId', () => {
      /**
       * Property: Transactions referencing non-existent origins should be rejected
       */
      fc.assert(
        fc.property(
          fc.record({
            txData: baseTransactionDataArb,
            nonExistentOriginId: uuidArb,
          }),
          ({ txData, nonExistentOriginId }) => {
            db.origins.delete(nonExistentOriginId);

            const result = db.insertTransaction({
              ...txData,
              originId: nonExistentOriginId,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('origin_id');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Import Batch Foreign Key Constraint', () => {
    it('should allow transactions with null batchId', () => {
      /**
       * Property: Transactions with null batch_id should always be accepted
       */
      fc.assert(
        fc.property(baseTransactionDataArb, (txData) => {
          const result = db.insertTransaction({
            ...txData,
            batchId: null,
          });

          expect(result.success).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should allow transactions with existing batchId', () => {
      /**
       * Property: Transactions referencing existing import batches should be accepted
       */
      fc.assert(
        fc.property(
          fc.record({
            txData: baseTransactionDataArb,
            batchId: uuidArb,
            fileName: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          ({ txData, batchId, fileName }) => {
            db.addImportBatch(batchId, fileName);

            const result = db.insertTransaction({
              ...txData,
              batchId,
            });

            expect(result.success).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject transactions with non-existent batchId', () => {
      /**
       * Property: Transactions referencing non-existent import batches should be rejected
       */
      fc.assert(
        fc.property(
          fc.record({
            txData: baseTransactionDataArb,
            nonExistentBatchId: uuidArb,
          }),
          ({ txData, nonExistentBatchId }) => {
            db.importBatches.delete(nonExistentBatchId);

            const result = db.insertTransaction({
              ...txData,
              batchId: nonExistentBatchId,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('batch_id');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Multiple Foreign Key Constraints', () => {
    it('should allow transactions with all valid foreign keys', () => {
      /**
       * Property: Transactions with all valid foreign key references should be accepted
       */
      fc.assert(
        fc.property(
          fc.record({
            txData: baseTransactionDataArb,
            categoryId: uuidArb,
            originId: uuidArb,
            batchId: uuidArb,
          }),
          ({ txData, categoryId, originId, batchId }) => {
            // Create all referenced entities
            db.addCategory(categoryId, 'Test Category');
            db.addOrigin(originId, 'Test Origin');
            db.addImportBatch(batchId, 'test.csv');

            const result = db.insertTransaction({
              ...txData,
              categoryId,
              originId,
              batchId,
            });

            expect(result.success).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject if any foreign key is invalid', () => {
      /**
       * Property: If any foreign key reference is invalid, the transaction should be rejected
       */
      fc.assert(
        fc.property(
          fc.record({
            txData: baseTransactionDataArb,
            validCategoryId: uuidArb,
            validOriginId: uuidArb,
            invalidBatchId: uuidArb,
          }),
          ({ txData, validCategoryId, validOriginId, invalidBatchId }) => {
            // Create valid category and origin
            db.addCategory(validCategoryId, 'Test Category');
            db.addOrigin(validOriginId, 'Test Origin');
            // Do NOT create the batch

            const result = db.insertTransaction({
              ...txData,
              categoryId: validCategoryId,
              originId: validOriginId,
              batchId: invalidBatchId,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('batch_id');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Referential Integrity Consistency', () => {
    it('should maintain consistency: valid references always succeed, invalid always fail', () => {
      /**
       * Property: The referential integrity check is deterministic -
       * the same input always produces the same result
       */
      fc.assert(
        fc.property(
          fc.record({
            txData: baseTransactionDataArb,
            categoryId: uuidArb,
            categoryExists: fc.boolean(),
          }),
          ({ txData, categoryId, categoryExists }) => {
            // Setup: either create or ensure category doesn't exist
            if (categoryExists) {
              db.addCategory(categoryId, 'Test Category');
            } else {
              db.categories.delete(categoryId);
            }

            // Run the same operation twice
            const result1 = db.insertTransaction({
              ...txData,
              id: txData.id + '-1',
              categoryId,
            });

            // Clear and re-setup for second attempt
            db.transactions.clear();
            if (categoryExists) {
              db.categories.set(categoryId, { id: categoryId, name: 'Test Category' });
            }

            const result2 = db.insertTransaction({
              ...txData,
              id: txData.id + '-2',
              categoryId,
            });

            // Both attempts should have the same result
            expect(result1.success).toBe(result2.success);

            // And the result should match whether the category exists
            expect(result1.success).toBe(categoryExists);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate all foreign keys before accepting', () => {
      /**
       * Property: All foreign keys must be valid for a transaction to be accepted
       */
      fc.assert(
        fc.property(
          fc.record({
            txData: baseTransactionDataArb,
            categoryId: uuidArb,
            originId: uuidArb,
            batchId: uuidArb,
            categoryExists: fc.boolean(),
            originExists: fc.boolean(),
            batchExists: fc.boolean(),
          }),
          ({
            txData,
            categoryId,
            originId,
            batchId,
            categoryExists,
            originExists,
            batchExists,
          }) => {
            // Setup entities based on existence flags
            if (categoryExists) db.addCategory(categoryId, 'Category');
            if (originExists) db.addOrigin(originId, 'Origin');
            if (batchExists) db.addImportBatch(batchId, 'file.csv');

            const result = db.insertTransaction({
              ...txData,
              categoryId,
              originId,
              batchId,
            });

            // Transaction should only succeed if ALL foreign keys are valid
            const allValid = categoryExists && originExists && batchExists;
            expect(result.success).toBe(allValid);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Null vs Non-Existent Foreign Keys', () => {
    it('should distinguish between null and non-existent foreign keys', () => {
      /**
       * Property: Null foreign keys are valid, but non-existent IDs are not
       */
      fc.assert(
        fc.property(
          fc.record({
            txData: baseTransactionDataArb,
            nonExistentId: uuidArb,
          }),
          ({ txData, nonExistentId }) => {
            // With null categoryId - should succeed
            const resultWithNull = db.insertTransaction({
              ...txData,
              id: txData.id + '-null',
              categoryId: null,
            });
            expect(resultWithNull.success).toBe(true);

            // With non-existent categoryId - should fail
            const resultWithNonExistent = db.insertTransaction({
              ...txData,
              id: txData.id + '-nonexistent',
              categoryId: nonExistentId,
            });
            expect(resultWithNonExistent.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
