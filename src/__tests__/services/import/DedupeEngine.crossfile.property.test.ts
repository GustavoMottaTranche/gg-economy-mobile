/**
 * Property-Based Tests for DedupeEngine Cross-File Deduplication
 *
 * These tests verify universal properties that should hold for all valid inputs,
 * using the fast-check library for property-based testing.
 *
 * **Validates: Requirements 5.3, 8.1, 8.3, 8.4, 8.6**
 */

import fc from 'fast-check';
import { DedupeEngine, FileTransactions } from '../../../services/import/DedupeEngine';
import { RawTransaction } from '../../../types/transaction';

describe('DedupeEngine Cross-File Property Tests', () => {
  const engine = new DedupeEngine();

  // Generate valid dates using UTC to avoid timezone issues
  const validDateArbitrary = fc
    .integer({ min: 0, max: 5 * 365 }) // Days from 2020-01-01
    .map((days) => {
      const date = new Date(Date.UTC(2020, 0, 1));
      date.setUTCDate(date.getUTCDate() + days);
      return date;
    });

  // Generate valid descriptions
  const validDescriptionArbitrary = fc
    .array(
      fc.constantFrom(
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
        'A',
        'B',
        'C',
        'D',
        'E',
        'F',
        'G',
        'H',
        'I',
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
        'S',
        'T',
        'U',
        'V',
        'W',
        'X',
        'Y',
        'Z',
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        ' ',
        '-',
        '/'
      ),
      { minLength: 5, maxLength: 50 }
    )
    .map((chars) => chars.join(''))
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim());

  // Generate valid amounts
  const validAmountArbitrary = fc
    .double({
      min: -10000,
      max: 10000,
      noNaN: true,
      noDefaultInfinity: true,
    })
    .map((n) => Math.round(n * 100) / 100);

  // Generate a unique transaction (with optional FITID)
  const transactionArbitrary = fc.record({
    date: validDateArbitrary,
    amount: validAmountArbitrary,
    description: validDescriptionArbitrary,
    fitId: fc.option(fc.uuid(), { nil: undefined }),
    sourceLineNumber: fc.integer({ min: 1, max: 1000 }),
  });

  // Generate a file with transactions
  const fileTransactionsArbitrary = (fileId: string) =>
    fc.array(transactionArbitrary, { minLength: 1, maxLength: 20 }).map((transactions) => ({
      fileId,
      transactions: transactions as RawTransaction[],
    }));

  // Generate multiple files
  const multipleFilesArbitrary = fc
    .integer({ min: 2, max: 5 })
    .chain((numFiles) =>
      fc.tuple(
        ...Array.from({ length: numFiles }, (_, i) => fileTransactionsArbitrary(`file-${i + 1}`))
      )
    );

  /**
   * Feature: excel-multi-file-import, Property 7: Cross-File Deduplication
   *
   * For any set of files containing duplicate transactions between them,
   * the DedupeEngine MUST detect and keep only one copy of each duplicate
   * transaction, reporting cross-file duplicates separately.
   *
   * **Validates: Requirements 5.3, 8.1, 8.3, 8.4**
   */
  describe('Property 7: Cross-File Deduplication', () => {
    it('should detect duplicates between files and keep only one copy', () => {
      fc.assert(
        fc.property(transactionArbitrary, fc.integer({ min: 2, max: 5 }), (baseTx, numFiles) => {
          // Create the same transaction in multiple files
          const files: FileTransactions[] = Array.from({ length: numFiles }, (_, i) => ({
            fileId: `file-${i + 1}`,
            transactions: [{ ...baseTx } as RawTransaction],
          }));

          const result = engine.findCrossFileDuplicates(files);

          // Should have exactly numFiles - 1 cross-file duplicates
          // (first occurrence is kept, rest are duplicates)
          expect(result.crossFileDuplicates.length).toBe(numFiles - 1);

          // Total unique should be 1 (only one copy kept)
          expect(result.totalUnique).toBe(1);

          // First file should have the transaction
          expect(result.fileResults.get('file-1')?.length).toBe(1);

          // Other files should have empty results for this transaction
          for (let i = 2; i <= numFiles; i++) {
            expect(result.fileResults.get(`file-${i}`)?.length).toBe(0);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should detect duplicates by FITID across files', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          validDateArbitrary,
          validAmountArbitrary,
          validDescriptionArbitrary,
          validDescriptionArbitrary,
          (fitId, date, amount, desc1, desc2) => {
            // Create two transactions with same FITID but different descriptions
            const tx1: RawTransaction = {
              date,
              amount,
              description: desc1,
              fitId,
              sourceLineNumber: 1,
            };
            const tx2: RawTransaction = {
              date,
              amount,
              description: desc2,
              fitId, // Same FITID
              sourceLineNumber: 1,
            };

            const files: FileTransactions[] = [
              { fileId: 'file-1', transactions: [tx1] },
              { fileId: 'file-2', transactions: [tx2] },
            ];

            const result = engine.findCrossFileDuplicates(files);

            // Should detect as duplicate due to FITID match
            expect(result.crossFileDuplicates.length).toBe(1);
            expect(result.crossFileDuplicates[0]!.matchReason).toBe('fitid');
            expect(result.crossFileDuplicates[0]!.confidence).toBe(1.0);
            expect(result.totalUnique).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect duplicates by date, amount, and description across files', () => {
      fc.assert(
        fc.property(
          validDateArbitrary,
          validAmountArbitrary,
          validDescriptionArbitrary,
          (date, amount, description) => {
            // Create identical transactions in two files (no FITID)
            const tx: RawTransaction = {
              date,
              amount,
              description,
              sourceLineNumber: 1,
            };

            const files: FileTransactions[] = [
              { fileId: 'file-1', transactions: [{ ...tx }] },
              { fileId: 'file-2', transactions: [{ ...tx }] },
            ];

            const result = engine.findCrossFileDuplicates(files);

            // Should detect as duplicate
            expect(result.crossFileDuplicates.length).toBe(1);
            expect(result.crossFileDuplicates[0]!.matchReason).toBe('date_amount_description');
            expect(result.crossFileDuplicates[0]!.confidence).toBeGreaterThanOrEqual(0.9);
            expect(result.totalUnique).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve unique transactions across files', () => {
      fc.assert(
        fc.property(multipleFilesArbitrary, (files) => {
          // Make all transactions unique by giving them unique FITIDs
          // and ensuring amounts are truly unique
          const uniqueFiles = files.map((file, fileIndex) => ({
            ...file,
            transactions: file.transactions.map((tx, txIndex) => ({
              ...tx,
              fitId: `unique-${fileIndex}-${txIndex}`,
              // Make amounts unique by using a large offset that won't collide
              // Use a formula that guarantees uniqueness: fileIndex * 100000 + txIndex * 1000 + 1
              amount: fileIndex * 100000 + txIndex * 1000 + 1,
              // Also make dates unique to avoid any date+amount matches
              date: new Date(Date.UTC(2020 + fileIndex, txIndex % 12, (txIndex % 28) + 1)),
            })),
          }));

          const totalTransactions = uniqueFiles.reduce((sum, f) => sum + f.transactions.length, 0);

          const result = engine.findCrossFileDuplicates(uniqueFiles);

          // No cross-file duplicates should be found
          expect(result.crossFileDuplicates.length).toBe(0);

          // All transactions should be preserved
          expect(result.totalUnique).toBe(totalTransactions);
          expect(result.totalProcessed).toBe(totalTransactions);
        }),
        { numRuns: 100 }
      );
    });

    it('should report cross-file duplicates separately with correct file IDs', () => {
      fc.assert(
        fc.property(transactionArbitrary, (baseTx) => {
          const files: FileTransactions[] = [
            { fileId: 'source-file', transactions: [{ ...baseTx } as RawTransaction] },
            { fileId: 'duplicate-file', transactions: [{ ...baseTx } as RawTransaction] },
          ];

          const result = engine.findCrossFileDuplicates(files);

          expect(result.crossFileDuplicates.length).toBe(1);

          const duplicate = result.crossFileDuplicates[0]!;
          expect(duplicate.originalFileId).toBe('source-file');
          expect(duplicate.duplicateFileId).toBe('duplicate-file');
        }),
        { numRuns: 100 }
      );
    });

    it('should handle mixed duplicates and unique transactions', () => {
      fc.assert(
        fc.property(
          transactionArbitrary,
          transactionArbitrary,
          transactionArbitrary,
          (sharedTx, uniqueTx1, uniqueTx2) => {
            // Make unique transactions actually unique by using distinct fitIds,
            // different descriptions, and different amounts to avoid accidental collisions
            const unique1: RawTransaction = {
              ...uniqueTx1,
              fitId: 'unique-fitid-1',
              description: 'completely-unique-description-one',
              amount: 99901,
              date: new Date('2019-03-15T00:00:00.000Z'),
            };
            const unique2: RawTransaction = {
              ...uniqueTx2,
              fitId: 'unique-fitid-2',
              description: 'completely-unique-description-two',
              amount: 99902,
              date: new Date('2019-06-20T00:00:00.000Z'),
            };

            const files: FileTransactions[] = [
              {
                fileId: 'file-1',
                transactions: [{ ...sharedTx } as RawTransaction, unique1],
              },
              {
                fileId: 'file-2',
                transactions: [{ ...sharedTx } as RawTransaction, unique2],
              },
            ];

            const result = engine.findCrossFileDuplicates(files);

            // Should have 1 cross-file duplicate (the shared transaction)
            expect(result.crossFileDuplicates.length).toBe(1);

            // Should have 3 unique transactions (1 shared + 2 unique)
            expect(result.totalUnique).toBe(3);

            // File 1 should have 2 transactions (shared + unique1)
            expect(result.fileResults.get('file-1')!.length).toBe(2);

            // File 2 should have 1 transaction (only unique2, shared is duplicate)
            expect(result.fileResults.get('file-2')!.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain total count invariant: unique + duplicates = processed', () => {
      fc.assert(
        fc.property(multipleFilesArbitrary, (files) => {
          const result = engine.findCrossFileDuplicates(files);

          // Total unique + cross-file duplicates should equal total processed
          expect(result.totalUnique + result.crossFileDuplicates.length).toBe(
            result.totalProcessed
          );
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: excel-multi-file-import, Property 10: Deduplication Idempotence
   *
   * For any set of transactions, running the deduplication operation twice
   * MUST produce the same result as running it once.
   *
   * **Validates: Requirements 8.6**
   */
  describe('Property 10: Deduplication Idempotence', () => {
    it('should produce same result when cross-file dedupe is run twice', () => {
      fc.assert(
        fc.property(multipleFilesArbitrary, (files) => {
          // First deduplication
          const result1 = engine.findCrossFileDuplicates(files);

          // Create new files from the deduplicated results
          const dedupedFiles: FileTransactions[] = [];
          for (const [fileId, transactions] of result1.fileResults) {
            dedupedFiles.push({ fileId, transactions });
          }

          // Second deduplication on already deduplicated data
          const result2 = engine.findCrossFileDuplicates(dedupedFiles);

          // Should find no new duplicates
          expect(result2.crossFileDuplicates.length).toBe(0);

          // Total unique should be the same
          expect(result2.totalUnique).toBe(result1.totalUnique);

          // Each file should have the same transactions
          for (const [fileId, transactions] of result1.fileResults) {
            const result2Transactions = result2.fileResults.get(fileId) || [];
            expect(result2Transactions.length).toBe(transactions.length);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should be idempotent for within-set deduplication', () => {
      fc.assert(
        fc.property(
          fc.array(transactionArbitrary, { minLength: 1, maxLength: 50 }),
          (transactions) => {
            const rawTransactions = transactions as RawTransaction[];

            // First deduplication
            const result1 = engine.dedupeIdempotent(rawTransactions);

            // Second deduplication on unique transactions
            const result2 = engine.dedupeIdempotent(result1.uniqueTransactions);

            // Should find no new duplicates
            expect(result2.duplicates.length).toBe(0);

            // Unique transactions should be the same
            expect(result2.uniqueTransactions.length).toBe(result1.uniqueTransactions.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent for complete multi-file deduplication', () => {
      fc.assert(
        fc.property(multipleFilesArbitrary, (files) => {
          // First complete deduplication (no database transactions)
          const result1 = engine.deduplicateMultiFileImport(files, []);

          // Create new files from the deduplicated results
          const dedupedFiles: FileTransactions[] = [];
          for (const [fileId, transactions] of result1.fileResults) {
            dedupedFiles.push({ fileId, transactions });
          }

          // Second complete deduplication
          const result2 = engine.deduplicateMultiFileImport(dedupedFiles, []);

          // Should find no new duplicates of any kind
          expect(result2.totalInFileDuplicates).toBe(0);
          expect(result2.totalCrossFileDuplicates).toBe(0);

          // Total unique should be the same
          expect(result2.totalUniqueTransactions).toBe(result1.totalUniqueTransactions);
        }),
        { numRuns: 100 }
      );
    });

    it('should produce deterministic results regardless of run count', () => {
      fc.assert(
        fc.property(multipleFilesArbitrary, (files) => {
          // Run deduplication multiple times
          const results = Array.from({ length: 3 }, () => engine.findCrossFileDuplicates(files));

          // All results should be identical
          for (let i = 1; i < results.length; i++) {
            expect(results[i]!.totalUnique).toBe(results[0]!.totalUnique);
            expect(results[i]!.crossFileDuplicates.length).toBe(
              results[0]!.crossFileDuplicates.length
            );
            expect(results[i]!.totalProcessed).toBe(results[0]!.totalProcessed);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain idempotence with FITID-based deduplication', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          validDateArbitrary,
          validAmountArbitrary,
          validDescriptionArbitrary,
          fc.integer({ min: 2, max: 5 }),
          (fitId, date, amount, description, numCopies) => {
            // Create multiple copies with same FITID
            const tx: RawTransaction = {
              date,
              amount,
              description,
              fitId,
              sourceLineNumber: 1,
            };

            const transactions = Array.from({ length: numCopies }, () => ({
              ...tx,
            }));

            // First deduplication
            const result1 = engine.dedupeIdempotent(transactions);

            // Should keep only one
            expect(result1.uniqueTransactions.length).toBe(1);

            // Second deduplication
            const result2 = engine.dedupeIdempotent(result1.uniqueTransactions);

            // Should still have one
            expect(result2.uniqueTransactions.length).toBe(1);
            expect(result2.duplicates.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
