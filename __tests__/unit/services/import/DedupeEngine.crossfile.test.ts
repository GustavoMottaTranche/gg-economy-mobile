/**
 * Unit Tests for DedupeEngine Cross-File Deduplication
 *
 * Tests cross-file duplicate detection, database verification,
 * and complete multi-file deduplication workflow.
 *
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 14.3**
 *
 * @module DedupeEngine.crossfile.test
 */

import { DedupeEngine, FileTransactions } from '../../../../src/services/import/DedupeEngine';
import { RawTransaction, Transaction } from '../../../../src/types/transaction';

describe('DedupeEngine Cross-File Deduplication', () => {
  let engine: DedupeEngine;

  beforeEach(() => {
    engine = new DedupeEngine();
  });

  /**
   * Helper to create a RawTransaction with UTC date
   */
  function createRawTransaction(overrides: Partial<RawTransaction> = {}): RawTransaction {
    return {
      date: new Date(Date.UTC(2024, 0, 15)), // Jan 15, 2024 UTC
      amount: -100.0,
      description: 'Test Transaction',
      sourceLineNumber: 1,
      ...overrides,
    };
  }

  /**
   * Helper to create a Transaction (with full fields)
   */
  function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
    return {
      id: 'tx-001',
      title: '',
      date: new Date(Date.UTC(2024, 0, 15)),
      amount: -100.0,
      description: 'Test Transaction',
      categoryId: null,
      originId: null,
      batchId: null,
      referenceMonth: '2024-01',
      needsReview: true,
      isExcludedFromTotals: false,
      duplicateOf: null,
      installmentGroupId: null,
      recurringId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  describe('findCrossFileDuplicates', () => {
    it('should return empty duplicates when files have no overlapping transactions', () => {
      const files: FileTransactions[] = [
        {
          fileId: 'file-1',
          transactions: [createRawTransaction({ description: 'Transaction A', amount: -100 })],
        },
        {
          fileId: 'file-2',
          transactions: [createRawTransaction({ description: 'Transaction B', amount: -200 })],
        },
      ];

      const result = engine.findCrossFileDuplicates(files);

      expect(result.crossFileDuplicates).toHaveLength(0);
      expect(result.totalUnique).toBe(2);
      expect(result.fileResults.get('file-1')?.length).toBe(1);
      expect(result.fileResults.get('file-2')?.length).toBe(1);
    });

    it('should detect duplicate by FITID across files', () => {
      const files: FileTransactions[] = [
        {
          fileId: 'file-1',
          transactions: [createRawTransaction({ fitId: 'FIT123', description: 'First File' })],
        },
        {
          fileId: 'file-2',
          transactions: [createRawTransaction({ fitId: 'FIT123', description: 'Second File' })],
        },
      ];

      const result = engine.findCrossFileDuplicates(files);

      expect(result.crossFileDuplicates).toHaveLength(1);
      expect(result.crossFileDuplicates[0]!.matchReason).toBe('fitid');
      expect(result.crossFileDuplicates[0]!.confidence).toBe(1.0);
      expect(result.crossFileDuplicates[0]!.originalFileId).toBe('file-1');
      expect(result.crossFileDuplicates[0]!.duplicateFileId).toBe('file-2');
      expect(result.totalUnique).toBe(1);
    });

    it('should detect duplicate by date, amount, and description across files', () => {
      const sharedTx = createRawTransaction({
        date: new Date(Date.UTC(2024, 0, 15)),
        amount: -150.0,
        description: 'UBER TRIP',
      });

      const files: FileTransactions[] = [
        { fileId: 'file-1', transactions: [{ ...sharedTx }] },
        { fileId: 'file-2', transactions: [{ ...sharedTx }] },
      ];

      const result = engine.findCrossFileDuplicates(files);

      expect(result.crossFileDuplicates).toHaveLength(1);
      expect(result.crossFileDuplicates[0]!.matchReason).toBe('date_amount_description');
      expect(result.crossFileDuplicates[0]!.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.totalUnique).toBe(1);
    });

    it('should keep first occurrence and mark subsequent as duplicates', () => {
      const sharedTx = createRawTransaction({ fitId: 'SHARED' });

      const files: FileTransactions[] = [
        { fileId: 'first', transactions: [{ ...sharedTx }] },
        { fileId: 'second', transactions: [{ ...sharedTx }] },
        { fileId: 'third', transactions: [{ ...sharedTx }] },
      ];

      const result = engine.findCrossFileDuplicates(files);

      expect(result.crossFileDuplicates).toHaveLength(2);
      expect(result.fileResults.get('first')?.length).toBe(1);
      expect(result.fileResults.get('second')?.length).toBe(0);
      expect(result.fileResults.get('third')?.length).toBe(0);

      // All duplicates should reference 'first' as original
      for (const dup of result.crossFileDuplicates) {
        expect(dup.originalFileId).toBe('first');
      }
    });

    it('should handle multiple different duplicates across files', () => {
      const tx1 = createRawTransaction({ fitId: 'TX1', amount: -100 });
      const tx2 = createRawTransaction({ fitId: 'TX2', amount: -200 });

      const files: FileTransactions[] = [
        { fileId: 'file-1', transactions: [{ ...tx1 }, { ...tx2 }] },
        { fileId: 'file-2', transactions: [{ ...tx1 }] }, // Duplicate of tx1
        { fileId: 'file-3', transactions: [{ ...tx2 }] }, // Duplicate of tx2
      ];

      const result = engine.findCrossFileDuplicates(files);

      expect(result.crossFileDuplicates).toHaveLength(2);
      expect(result.totalUnique).toBe(2);
      expect(result.fileResults.get('file-1')?.length).toBe(2);
      expect(result.fileResults.get('file-2')?.length).toBe(0);
      expect(result.fileResults.get('file-3')?.length).toBe(0);
    });

    it('should handle mixed unique and duplicate transactions', () => {
      const sharedTx = createRawTransaction({ fitId: 'SHARED', amount: -100 });
      const uniqueTx1 = createRawTransaction({ fitId: 'UNIQUE1', amount: -200 });
      const uniqueTx2 = createRawTransaction({ fitId: 'UNIQUE2', amount: -300 });

      const files: FileTransactions[] = [
        { fileId: 'file-1', transactions: [{ ...sharedTx }, uniqueTx1] },
        { fileId: 'file-2', transactions: [{ ...sharedTx }, uniqueTx2] },
      ];

      const result = engine.findCrossFileDuplicates(files);

      expect(result.crossFileDuplicates).toHaveLength(1);
      expect(result.totalUnique).toBe(3);
      expect(result.fileResults.get('file-1')?.length).toBe(2);
      expect(result.fileResults.get('file-2')?.length).toBe(1);
    });

    it('should respect confidence threshold option', () => {
      // Create transactions with same date and amount but different descriptions
      const tx1 = createRawTransaction({
        date: new Date(Date.UTC(2024, 0, 15)),
        amount: -100,
        description: 'GROCERY STORE PURCHASE',
      });
      const tx2 = createRawTransaction({
        date: new Date(Date.UTC(2024, 0, 15)),
        amount: -100,
        description: 'GAS STATION FILL UP',
      });

      const files: FileTransactions[] = [
        { fileId: 'file-1', transactions: [tx1] },
        { fileId: 'file-2', transactions: [tx2] },
      ];

      // With high threshold, should not be considered duplicate
      const resultHighThreshold = engine.findCrossFileDuplicates(files, {
        confidenceThreshold: 0.9,
      });
      expect(resultHighThreshold.crossFileDuplicates).toHaveLength(0);

      // With low threshold, should be considered duplicate
      const resultLowThreshold = engine.findCrossFileDuplicates(files, {
        confidenceThreshold: 0.3,
      });
      expect(resultLowThreshold.crossFileDuplicates).toHaveLength(1);
    });

    it('should handle empty files', () => {
      const files: FileTransactions[] = [
        { fileId: 'file-1', transactions: [] },
        { fileId: 'file-2', transactions: [createRawTransaction()] },
      ];

      const result = engine.findCrossFileDuplicates(files);

      expect(result.crossFileDuplicates).toHaveLength(0);
      expect(result.totalUnique).toBe(1);
      expect(result.fileResults.get('file-1')?.length).toBe(0);
      expect(result.fileResults.get('file-2')?.length).toBe(1);
    });

    it('should handle single file (no cross-file duplicates possible)', () => {
      const files: FileTransactions[] = [
        {
          fileId: 'file-1',
          transactions: [
            createRawTransaction({ description: 'TX1' }),
            createRawTransaction({ description: 'TX2', amount: -200 }),
          ],
        },
      ];

      const result = engine.findCrossFileDuplicates(files);

      expect(result.crossFileDuplicates).toHaveLength(0);
      expect(result.totalUnique).toBe(2);
    });
  });

  describe('verifyAgainstDatabase', () => {
    it('should identify transactions that exist in database', () => {
      const existingTx = createTransaction({
        id: 'db-tx-1',
        description: 'Existing Transaction',
        amount: -100,
      });

      const newTransactions: RawTransaction[] = [
        createRawTransaction({ description: 'Existing Transaction', amount: -100 }),
        createRawTransaction({ fitId: 'FIT456', description: 'Truly new', amount: -200 }), // Different amount
      ];

      const result = engine.verifyAgainstDatabase(newTransactions, [existingTx]);

      expect(result.existingInDatabase).toHaveLength(1);
      expect(result.newTransactions).toHaveLength(1);
      expect(result.totalChecked).toBe(2);
    });

    it('should return all as new when database is empty', () => {
      const newTransactions: RawTransaction[] = [
        createRawTransaction({ description: 'TX1' }),
        createRawTransaction({ description: 'TX2', amount: -200 }),
      ];

      const result = engine.verifyAgainstDatabase(newTransactions, []);

      expect(result.existingInDatabase).toHaveLength(0);
      expect(result.newTransactions).toHaveLength(2);
    });

    it('should detect duplicates by date, amount, and description against database', () => {
      const existingTx = createTransaction({
        id: 'db-tx-1',
        date: new Date(Date.UTC(2024, 0, 15)),
        amount: -150.0,
        description: 'UBER TRIP',
      });

      const newTransactions: RawTransaction[] = [
        createRawTransaction({
          date: new Date(Date.UTC(2024, 0, 15)),
          amount: -150.0,
          description: 'UBER TRIP',
        }),
      ];

      const result = engine.verifyAgainstDatabase(newTransactions, [existingTx]);

      expect(result.existingInDatabase).toHaveLength(1);
      expect(result.existingInDatabase[0]!.matchReason).toBe('date_amount_description');
    });
  });

  describe('deduplicateMultiFileImport', () => {
    it('should perform complete deduplication workflow', () => {
      // File 1: Has internal duplicate and shared transaction
      const file1Transactions: RawTransaction[] = [
        createRawTransaction({ fitId: 'SHARED', description: 'Shared TX' }),
        createRawTransaction({ fitId: 'F1-UNIQUE', description: 'File 1 Unique', amount: -200 }),
        createRawTransaction({ fitId: 'F1-UNIQUE', description: 'File 1 Duplicate', amount: -200 }), // Internal dup
      ];

      // File 2: Has shared transaction
      const file2Transactions: RawTransaction[] = [
        createRawTransaction({ fitId: 'SHARED', description: 'Shared TX' }), // Cross-file dup
        createRawTransaction({ fitId: 'F2-UNIQUE', description: 'File 2 Unique', amount: -300 }),
      ];

      // Database has one existing transaction
      const existingTransactions: Transaction[] = [
        createTransaction({ id: 'db-1', description: 'File 2 Unique', amount: -300 }),
      ];

      const files: FileTransactions[] = [
        { fileId: 'file-1', transactions: file1Transactions },
        { fileId: 'file-2', transactions: file2Transactions },
      ];

      const result = engine.deduplicateMultiFileImport(files, existingTransactions);

      // Should have 1 in-file duplicate (F1-UNIQUE appears twice in file 1)
      expect(result.totalInFileDuplicates).toBe(1);

      // Should have 1 cross-file duplicate (SHARED appears in both files)
      expect(result.totalCrossFileDuplicates).toBe(1);

      // Should have 1 database duplicate (F2-UNIQUE exists in DB)
      expect(result.totalDatabaseDuplicates).toBe(1);

      // Should have 2 unique transactions (SHARED and F1-UNIQUE)
      expect(result.totalUniqueTransactions).toBe(2);
    });

    it('should handle files with no duplicates', () => {
      const files: FileTransactions[] = [
        {
          fileId: 'file-1',
          transactions: [createRawTransaction({ fitId: 'TX1', amount: -100 })],
        },
        {
          fileId: 'file-2',
          transactions: [createRawTransaction({ fitId: 'TX2', amount: -200 })],
        },
      ];

      const result = engine.deduplicateMultiFileImport(files, []);

      expect(result.totalInFileDuplicates).toBe(0);
      expect(result.totalCrossFileDuplicates).toBe(0);
      expect(result.totalDatabaseDuplicates).toBe(0);
      expect(result.totalUniqueTransactions).toBe(2);
    });

    it('should correctly populate inFileDuplicates map', () => {
      const files: FileTransactions[] = [
        {
          fileId: 'file-1',
          transactions: [
            createRawTransaction({ fitId: 'DUP', description: 'First' }),
            createRawTransaction({ fitId: 'DUP', description: 'Second' }),
          ],
        },
        {
          fileId: 'file-2',
          transactions: [createRawTransaction({ fitId: 'UNIQUE', amount: -200 })],
        },
      ];

      const result = engine.deduplicateMultiFileImport(files, []);

      expect(result.inFileDuplicates.get('file-1')?.length).toBe(1);
      expect(result.inFileDuplicates.get('file-2')?.length).toBe(0);
    });

    it('should exclude database duplicates from final file results', () => {
      const files: FileTransactions[] = [
        {
          fileId: 'file-1',
          transactions: [
            createRawTransaction({ fitId: 'NEW', amount: -100 }),
            createRawTransaction({ fitId: 'EXISTS', amount: -200 }),
          ],
        },
      ];

      const existingTransactions: Transaction[] = [
        createTransaction({ id: 'db-1', description: 'EXISTS', amount: -200 }),
      ];

      const result = engine.deduplicateMultiFileImport(files, existingTransactions);

      // File results should only contain the new transaction
      expect(result.fileResults.get('file-1')?.length).toBe(1);
      expect(result.fileResults.get('file-1')?.[0]!.fitId).toBe('NEW');
    });
  });

  describe('edge cases', () => {
    it('should handle transactions with same date and amount but very different descriptions', () => {
      const files: FileTransactions[] = [
        {
          fileId: 'file-1',
          transactions: [
            createRawTransaction({
              date: new Date(Date.UTC(2024, 0, 15)),
              amount: -100,
              description: 'AMAZON PURCHASE',
            }),
          ],
        },
        {
          fileId: 'file-2',
          transactions: [
            createRawTransaction({
              date: new Date(Date.UTC(2024, 0, 15)),
              amount: -100,
              description: 'NETFLIX SUBSCRIPTION',
            }),
          ],
        },
      ];

      // With default threshold (0.5), these should still be considered duplicates
      // because they have same date and amount
      const result = engine.findCrossFileDuplicates(files);

      expect(result.crossFileDuplicates).toHaveLength(1);
      expect(result.crossFileDuplicates[0]!.matchReason).toBe('date_amount');
    });

    it('should handle large number of files', () => {
      const numFiles = 10;
      const sharedTx = createRawTransaction({ fitId: 'SHARED' });

      const files: FileTransactions[] = Array.from({ length: numFiles }, (_, i) => ({
        fileId: `file-${i + 1}`,
        transactions: [{ ...sharedTx }],
      }));

      const result = engine.findCrossFileDuplicates(files);

      expect(result.crossFileDuplicates).toHaveLength(numFiles - 1);
      expect(result.totalUnique).toBe(1);
    });

    it('should handle transactions spanning multiple days', () => {
      const files: FileTransactions[] = [
        {
          fileId: 'file-1',
          transactions: [
            createRawTransaction({ date: new Date(Date.UTC(2024, 0, 15)), fitId: 'TX1' }),
            createRawTransaction({ date: new Date(Date.UTC(2024, 0, 16)), fitId: 'TX2' }),
          ],
        },
        {
          fileId: 'file-2',
          transactions: [
            createRawTransaction({ date: new Date(Date.UTC(2024, 0, 15)), fitId: 'TX1' }), // Dup
            createRawTransaction({ date: new Date(Date.UTC(2024, 0, 17)), fitId: 'TX3' }), // Unique
          ],
        },
      ];

      const result = engine.findCrossFileDuplicates(files);

      expect(result.crossFileDuplicates).toHaveLength(1);
      expect(result.totalUnique).toBe(3);
    });

    it('should handle floating point amount comparisons correctly', () => {
      const files: FileTransactions[] = [
        {
          fileId: 'file-1',
          transactions: [createRawTransaction({ amount: -100.005, description: 'TX' })],
        },
        {
          fileId: 'file-2',
          transactions: [createRawTransaction({ amount: -100.003, description: 'TX' })],
        },
      ];

      const result = engine.findCrossFileDuplicates(files);

      // Should be considered same amount (within 0.01 tolerance)
      expect(result.crossFileDuplicates).toHaveLength(1);
    });
  });
});
