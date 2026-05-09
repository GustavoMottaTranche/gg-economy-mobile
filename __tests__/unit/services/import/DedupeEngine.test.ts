/**
 * Unit Tests for DedupeEngine
 *
 * Tests duplicate detection, FITID-based deduplication, confidence scoring,
 * and markAsDuplicate functionality.
 *
 * **Validates: Requirements 15, 29, 32**
 *
 * @module DedupeEngine.test
 */

import {
  DedupeEngine,
  DuplicateResult,
  DedupeResult,
} from '../../../../src/services/import/DedupeEngine';
import { RawTransaction, Transaction } from '../../../../src/types/transaction';

describe('DedupeEngine', () => {
  let engine: DedupeEngine;

  beforeEach(() => {
    engine = new DedupeEngine();
  });

  /**
   * Helper to create a RawTransaction
   */
  function createRawTransaction(overrides: Partial<RawTransaction> = {}): RawTransaction {
    return {
      date: new Date('2024-01-15'),
      amount: -100.0,
      description: 'Test Transaction',
      ...overrides,
    };
  }

  /**
   * Helper to create a Transaction (with full fields)
   */
  function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
    return {
      id: 'tx-001',
      date: new Date('2024-01-15'),
      amount: -100.0,
      description: 'Test Transaction',
      categoryId: null,
      originId: null,
      batchId: null,
      referenceMonth: '2024-01',
      needsReview: true,
      isExcludedFromTotals: false,
      duplicateOf: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  describe('findDuplicates', () => {
    it('should return empty duplicates when no matches found', () => {
      const newTransactions: RawTransaction[] = [
        createRawTransaction({ description: 'New Transaction 1' }),
        createRawTransaction({ description: 'New Transaction 2', amount: -200 }),
      ];

      const existingTransactions: Transaction[] = [
        createTransaction({ description: 'Existing Transaction', amount: -300 }),
      ];

      const result = engine.findDuplicates(newTransactions, existingTransactions);

      expect(result.duplicates).toHaveLength(0);
      expect(result.uniqueTransactions).toHaveLength(2);
      expect(result.totalProcessed).toBe(2);
    });

    it('should detect duplicate by FITID with 100% confidence', () => {
      const newTransactions: RawTransaction[] = [
        createRawTransaction({ fitId: 'FIT123', description: 'Different Description' }),
      ];

      const existingTransactions: Transaction[] = [
        createTransaction({ description: 'Original Description' }),
      ];

      // Add fitId to existing transaction (simulating OFX import)
      const existingWithFitId = [
        { ...existingTransactions[0], fitId: 'FIT123' } as Transaction & { fitId: string },
      ];

      const result = engine.findDuplicates(newTransactions, existingWithFitId as any);

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].confidence).toBe(1.0);
      expect(result.duplicates[0].matchReason).toBe('fitid');
      expect(result.uniqueTransactions).toHaveLength(0);
    });

    it('should detect duplicate by date, amount, and similar description', () => {
      const newTransactions: RawTransaction[] = [
        createRawTransaction({
          date: new Date('2024-01-15'),
          amount: -100.0,
          description: 'UBER TRIP',
        }),
      ];

      const existingTransactions: Transaction[] = [
        createTransaction({
          date: new Date('2024-01-15'),
          amount: -100.0,
          description: 'UBER TRIP',
        }),
      ];

      const result = engine.findDuplicates(newTransactions, existingTransactions);

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.duplicates[0].matchReason).toBe('date_amount_description');
    });

    it('should detect duplicate by date and amount with lower confidence', () => {
      const newTransactions: RawTransaction[] = [
        createRawTransaction({
          date: new Date('2024-01-15'),
          amount: -100.0,
          description: 'Completely Different Description',
        }),
      ];

      const existingTransactions: Transaction[] = [
        createTransaction({
          date: new Date('2024-01-15'),
          amount: -100.0,
          description: 'Original Transaction Name',
        }),
      ];

      const result = engine.findDuplicates(newTransactions, existingTransactions);

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.duplicates[0].confidence).toBeLessThan(0.9);
    });

    it('should not detect duplicate when dates differ', () => {
      const newTransactions: RawTransaction[] = [
        createRawTransaction({
          date: new Date('2024-01-16'),
          amount: -100.0,
          description: 'Same Description',
        }),
      ];

      const existingTransactions: Transaction[] = [
        createTransaction({
          date: new Date('2024-01-15'),
          amount: -100.0,
          description: 'Same Description',
        }),
      ];

      const result = engine.findDuplicates(newTransactions, existingTransactions);

      expect(result.duplicates).toHaveLength(0);
      expect(result.uniqueTransactions).toHaveLength(1);
    });

    it('should not detect duplicate when amounts differ', () => {
      const newTransactions: RawTransaction[] = [
        createRawTransaction({
          date: new Date('2024-01-15'),
          amount: -100.01,
          description: 'Same Description',
        }),
      ];

      const existingTransactions: Transaction[] = [
        createTransaction({
          date: new Date('2024-01-15'),
          amount: -100.0,
          description: 'Same Description',
        }),
      ];

      const result = engine.findDuplicates(newTransactions, existingTransactions);

      expect(result.duplicates).toHaveLength(0);
      expect(result.uniqueTransactions).toHaveLength(1);
    });

    it('should respect confidence threshold option', () => {
      const newTransactions: RawTransaction[] = [
        createRawTransaction({
          date: new Date('2024-01-15'),
          amount: -100.0,
          description: 'Very Different Description Here',
        }),
      ];

      const existingTransactions: Transaction[] = [
        createTransaction({
          date: new Date('2024-01-15'),
          amount: -100.0,
          description: 'Original Name',
        }),
      ];

      // With high threshold, should not be considered duplicate
      const resultHighThreshold = engine.findDuplicates(newTransactions, existingTransactions, {
        confidenceThreshold: 0.9,
      });

      expect(resultHighThreshold.duplicates).toHaveLength(0);

      // With low threshold, should be considered duplicate
      const resultLowThreshold = engine.findDuplicates(newTransactions, existingTransactions, {
        confidenceThreshold: 0.3,
      });

      expect(resultLowThreshold.duplicates).toHaveLength(1);
    });

    it('should handle multiple transactions with mixed results', () => {
      const newTransactions: RawTransaction[] = [
        createRawTransaction({ description: 'Unique Transaction', amount: -50 }),
        createRawTransaction({ description: 'Duplicate Transaction', amount: -100 }),
        createRawTransaction({ description: 'Another Unique', amount: -75 }),
      ];

      const existingTransactions: Transaction[] = [
        createTransaction({ description: 'Duplicate Transaction', amount: -100 }),
      ];

      const result = engine.findDuplicates(newTransactions, existingTransactions);

      expect(result.duplicates).toHaveLength(1);
      expect(result.uniqueTransactions).toHaveLength(2);
      expect(result.totalProcessed).toBe(3);
    });
  });

  describe('findDuplicatesWithinSet', () => {
    it('should detect duplicates within a single set of transactions', () => {
      const transactions: RawTransaction[] = [
        createRawTransaction({ description: 'First Transaction' }),
        createRawTransaction({ description: 'First Transaction' }), // Duplicate
        createRawTransaction({ description: 'Second Transaction', amount: -200 }),
      ];

      const result = engine.findDuplicatesWithinSet(transactions);

      expect(result.duplicates).toHaveLength(1);
      expect(result.uniqueTransactions).toHaveLength(2);
    });

    it('should detect multiple duplicates within a set', () => {
      const transactions: RawTransaction[] = [
        createRawTransaction({ description: 'Transaction A' }),
        createRawTransaction({ description: 'Transaction A' }), // Duplicate of first
        createRawTransaction({ description: 'Transaction A' }), // Duplicate of first
        createRawTransaction({ description: 'Transaction B', amount: -200 }),
      ];

      const result = engine.findDuplicatesWithinSet(transactions);

      expect(result.duplicates).toHaveLength(2);
      expect(result.uniqueTransactions).toHaveLength(2);
    });

    it('should use FITID for within-set deduplication', () => {
      const transactions: RawTransaction[] = [
        createRawTransaction({ fitId: 'FIT001', description: 'First' }),
        createRawTransaction({ fitId: 'FIT001', description: 'Second' }), // Same FITID - duplicate
        createRawTransaction({ fitId: 'FIT002', description: 'Third', amount: -200 }), // Different FITID and amount - unique
      ];

      const result = engine.findDuplicatesWithinSet(transactions);

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].confidence).toBe(1.0);
      expect(result.duplicates[0].matchReason).toBe('fitid');
      expect(result.uniqueTransactions).toHaveLength(2);
    });
  });

  describe('dedupeIdempotent', () => {
    it('should produce same result when run twice', () => {
      const transactions: RawTransaction[] = [
        createRawTransaction({ description: 'Transaction A' }),
        createRawTransaction({ description: 'Transaction A' }), // Duplicate
        createRawTransaction({ description: 'Transaction B', amount: -200 }),
        createRawTransaction({ description: 'Transaction B', amount: -200 }), // Duplicate
      ];

      const result1 = engine.dedupeIdempotent(transactions);
      const result2 = engine.dedupeIdempotent(result1.uniqueTransactions);

      // Second run should produce same unique transactions
      expect(result2.uniqueTransactions).toHaveLength(result1.uniqueTransactions.length);
      expect(result2.duplicates).toHaveLength(0);
    });

    it('should be idempotent for transactions with FITIDs', () => {
      const transactions: RawTransaction[] = [
        createRawTransaction({ fitId: 'FIT001' }),
        createRawTransaction({ fitId: 'FIT001' }), // Duplicate
        createRawTransaction({ fitId: 'FIT002' }),
      ];

      const result1 = engine.dedupeIdempotent(transactions);
      const result2 = engine.dedupeIdempotent(result1.uniqueTransactions);

      expect(result2.uniqueTransactions).toHaveLength(result1.uniqueTransactions.length);
      expect(result2.duplicates).toHaveLength(0);
    });
  });

  describe('markAsDuplicate', () => {
    it('should mark a transaction as duplicate', () => {
      const transaction = createTransaction();
      const duplicateOfId = 'original-tx-001';

      const marked = engine.markAsDuplicate(transaction, duplicateOfId);

      expect(marked.duplicateOf).toBe(duplicateOfId);
      // Original fields should be preserved
      expect(marked.id).toBe(transaction.id);
      expect(marked.amount).toBe(transaction.amount);
    });

    it('should work with RawTransaction', () => {
      const rawTx: RawTransaction & { duplicateOf?: string } = {
        ...createRawTransaction(),
        duplicateOf: undefined,
      };
      const duplicateOfId = 'original-tx-001';

      const marked = engine.markAsDuplicate(rawTx, duplicateOfId);

      expect(marked.duplicateOf).toBe(duplicateOfId);
    });

    it('should override existing duplicateOf value', () => {
      const transaction = createTransaction({ duplicateOf: 'old-id' });
      const newDuplicateOfId = 'new-id';

      const marked = engine.markAsDuplicate(transaction, newDuplicateOfId);

      expect(marked.duplicateOf).toBe(newDuplicateOfId);
    });
  });

  describe('calculateConfidence', () => {
    it('should return 1.0 for exact FITID match', () => {
      const newTx = createRawTransaction({ fitId: 'FIT123' });
      const existingTx = { ...createRawTransaction({ fitId: 'FIT123' }) };

      const result = engine.calculateConfidence(newTx, existingTx);

      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(1.0);
      expect(result!.matchReason).toBe('fitid');
    });

    it('should return null when dates do not match', () => {
      const newTx = createRawTransaction({ date: new Date('2024-01-15') });
      const existingTx = createRawTransaction({ date: new Date('2024-01-16') });

      const result = engine.calculateConfidence(newTx, existingTx);

      expect(result).toBeNull();
    });

    it('should return null when amounts do not match', () => {
      const newTx = createRawTransaction({ amount: -100 });
      const existingTx = createRawTransaction({ amount: -200 });

      const result = engine.calculateConfidence(newTx, existingTx);

      expect(result).toBeNull();
    });

    it('should return high confidence for identical descriptions', () => {
      const newTx = createRawTransaction({ description: 'UBER TRIP' });
      const existingTx = createRawTransaction({ description: 'UBER TRIP' });

      const result = engine.calculateConfidence(newTx, existingTx);

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result!.matchReason).toBe('date_amount_description');
    });

    it('should return medium confidence for similar descriptions', () => {
      const newTx = createRawTransaction({ description: 'UBER TRIP TO AIRPORT' });
      const existingTx = createRawTransaction({ description: 'UBER TRIP DOWNTOWN' });

      const result = engine.calculateConfidence(newTx, existingTx);

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should return lower confidence for different descriptions', () => {
      const newTx = createRawTransaction({ description: 'GROCERY STORE' });
      const existingTx = createRawTransaction({ description: 'GAS STATION' });

      const result = engine.calculateConfidence(newTx, existingTx);

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result!.confidence).toBeLessThan(0.7);
    });

    it('should respect useFitId option', () => {
      const newTx = createRawTransaction({ fitId: 'FIT123' });
      const existingTx = { ...createRawTransaction({ fitId: 'FIT123' }) };

      const resultWithFitId = engine.calculateConfidence(newTx, existingTx, { useFitId: true });
      const resultWithoutFitId = engine.calculateConfidence(newTx, existingTx, { useFitId: false });

      expect(resultWithFitId!.matchReason).toBe('fitid');
      expect(resultWithoutFitId!.matchReason).not.toBe('fitid');
    });
  });

  describe('calculateDescriptionSimilarity', () => {
    it('should return 1.0 for identical descriptions', () => {
      const similarity = engine.calculateDescriptionSimilarity('UBER TRIP', 'UBER TRIP');
      expect(similarity).toBe(1.0);
    });

    it('should return 1.0 for descriptions that differ only in case', () => {
      const similarity = engine.calculateDescriptionSimilarity('Uber Trip', 'UBER TRIP');
      expect(similarity).toBe(1.0);
    });

    it('should return 1.0 for descriptions that differ only in whitespace', () => {
      const similarity = engine.calculateDescriptionSimilarity('UBER  TRIP', 'UBER TRIP');
      expect(similarity).toBe(1.0);
    });

    it('should return high similarity for similar descriptions', () => {
      const similarity = engine.calculateDescriptionSimilarity('UBER TRIP', 'UBER TRIPS');
      expect(similarity).toBeGreaterThan(0.8);
    });

    it('should return low similarity for different descriptions', () => {
      const similarity = engine.calculateDescriptionSimilarity('UBER', 'GROCERY STORE');
      expect(similarity).toBeLessThan(0.5);
    });

    it('should return 0 when one description is empty', () => {
      const similarity = engine.calculateDescriptionSimilarity('UBER TRIP', '');
      expect(similarity).toBe(0);
    });

    it('should handle empty strings', () => {
      const similarity = engine.calculateDescriptionSimilarity('', '');
      expect(similarity).toBe(1.0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty new transactions array', () => {
      const result = engine.findDuplicates([], [createTransaction()]);

      expect(result.duplicates).toHaveLength(0);
      expect(result.uniqueTransactions).toHaveLength(0);
      expect(result.totalProcessed).toBe(0);
    });

    it('should handle empty existing transactions array', () => {
      const newTransactions = [createRawTransaction()];
      const result = engine.findDuplicates(newTransactions, []);

      expect(result.duplicates).toHaveLength(0);
      expect(result.uniqueTransactions).toHaveLength(1);
    });

    it('should handle transactions with same date but different amounts', () => {
      const newTransactions: RawTransaction[] = [
        createRawTransaction({ amount: -100 }),
        createRawTransaction({ amount: -200 }),
        createRawTransaction({ amount: -300 }),
      ];

      const existingTransactions: Transaction[] = [createTransaction({ amount: -100 })];

      const result = engine.findDuplicates(newTransactions, existingTransactions);

      expect(result.duplicates).toHaveLength(1);
      expect(result.uniqueTransactions).toHaveLength(2);
    });

    it('should handle very small amount differences (floating point)', () => {
      const newTx = createRawTransaction({ amount: -100.005 });
      const existingTx = createTransaction({ amount: -100.003 });

      const result = engine.findDuplicates([newTx], [existingTx]);

      // Should be considered same amount (within 0.01 tolerance)
      // Difference is 0.002 which is < 0.01
      expect(result.duplicates).toHaveLength(1);
    });

    it('should handle transactions spanning multiple days', () => {
      const newTransactions: RawTransaction[] = [
        createRawTransaction({ date: new Date('2024-01-15'), description: 'Day 1' }),
        createRawTransaction({ date: new Date('2024-01-16'), description: 'Day 2' }),
        createRawTransaction({ date: new Date('2024-01-17'), description: 'Day 3' }),
      ];

      const existingTransactions: Transaction[] = [
        createTransaction({ date: new Date('2024-01-16'), description: 'Day 2' }),
      ];

      const result = engine.findDuplicates(newTransactions, existingTransactions);

      expect(result.duplicates).toHaveLength(1);
      expect(result.uniqueTransactions).toHaveLength(2);
    });
  });
});
