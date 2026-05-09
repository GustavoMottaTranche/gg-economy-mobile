/**
 * Unit Tests for TransactionRepository
 *
 * Tests that TransactionRepository correctly delegates all operations
 * to the underlying query functions. Uses mocking to verify delegation
 * without requiring a real database connection.
 *
 * **Validates: Requirement 1 - Repository Pattern for Transactions**
 *
 * @module TransactionRepository.test
 */

import {
  TransactionRepository,
  transactionRepository,
} from '../../../src/repositories/TransactionRepository';
import type { Transaction, CreateTransactionDTO, UpdateTransactionDTO } from '../../../src/types';
import * as queries from '../../../src/db/queries/transactions';

// Mock the queries module
jest.mock('../../../src/db/queries/transactions');

const mockedQueries = queries as jest.Mocked<typeof queries>;

describe('TransactionRepository', () => {
  let repository: TransactionRepository;

  // Sample transaction data for testing
  const sampleTransaction: Transaction = {
    id: 'txn-001',
    date: new Date('2024-01-15'),
    amount: -5000, // -50.00 in cents
    description: 'Test Transaction',
    categoryId: 'cat-001',
    originId: null,
    batchId: 'batch-001',
    referenceMonth: '2024-01',
    needsReview: false,
    isExcludedFromTotals: false,
    duplicateOf: null,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  const sampleCreateDTO: CreateTransactionDTO = {
    date: new Date('2024-01-15'),
    amount: -5000,
    description: 'New Transaction',
    referenceMonth: '2024-01',
    categoryId: 'cat-001',
    needsReview: true,
  };

  const sampleUpdateDTO: UpdateTransactionDTO = {
    description: 'Updated Transaction',
    amount: -6000,
  };

  beforeEach(() => {
    repository = new TransactionRepository();
    jest.clearAllMocks();
  });

  describe('singleton instance', () => {
    it('should export a singleton transactionRepository instance', () => {
      expect(transactionRepository).toBeInstanceOf(TransactionRepository);
    });
  });

  describe('getAll', () => {
    it('should delegate to getAllTransactions query', async () => {
      const transactions = [sampleTransaction];
      mockedQueries.getAllTransactions.mockResolvedValue(transactions);

      const result = await repository.getAll();

      expect(mockedQueries.getAllTransactions).toHaveBeenCalledTimes(1);
      expect(result).toEqual(transactions);
    });

    it('should return empty array when no transactions exist', async () => {
      mockedQueries.getAllTransactions.mockResolvedValue([]);

      const result = await repository.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should delegate to getTransactionById query', async () => {
      mockedQueries.getTransactionById.mockResolvedValue(sampleTransaction);

      const result = await repository.getById('txn-001');

      expect(mockedQueries.getTransactionById).toHaveBeenCalledWith('txn-001');
      expect(result).toEqual(sampleTransaction);
    });

    it('should return null when transaction not found', async () => {
      mockedQueries.getTransactionById.mockResolvedValue(null);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getByMonth', () => {
    it('should delegate to getTransactionsByMonth query', async () => {
      const transactions = [sampleTransaction];
      mockedQueries.getTransactionsByMonth.mockResolvedValue(transactions);

      const result = await repository.getByMonth('2024-01');

      expect(mockedQueries.getTransactionsByMonth).toHaveBeenCalledWith('2024-01');
      expect(result).toEqual(transactions);
    });

    it('should return empty array for month with no transactions', async () => {
      mockedQueries.getTransactionsByMonth.mockResolvedValue([]);

      const result = await repository.getByMonth('2024-12');

      expect(result).toEqual([]);
    });
  });

  describe('getByBatchId', () => {
    it('should delegate to getTransactionsByBatchId query', async () => {
      const transactions = [sampleTransaction];
      mockedQueries.getTransactionsByBatchId.mockResolvedValue(transactions);

      const result = await repository.getByBatchId('batch-001');

      expect(mockedQueries.getTransactionsByBatchId).toHaveBeenCalledWith('batch-001');
      expect(result).toEqual(transactions);
    });
  });

  describe('getNeedingReview', () => {
    it('should delegate to getTransactionsNeedingReview query', async () => {
      const transactionNeedingReview = { ...sampleTransaction, needsReview: true };
      mockedQueries.getTransactionsNeedingReview.mockResolvedValue([transactionNeedingReview]);

      const result = await repository.getNeedingReview();

      expect(mockedQueries.getTransactionsNeedingReview).toHaveBeenCalledTimes(1);
      expect(result).toEqual([transactionNeedingReview]);
    });
  });

  describe('getReviewCount', () => {
    it('should delegate to getReviewCount query', async () => {
      mockedQueries.getReviewCount.mockResolvedValue(5);

      const result = await repository.getReviewCount();

      expect(mockedQueries.getReviewCount).toHaveBeenCalledTimes(1);
      expect(result).toBe(5);
    });

    it('should return 0 when no transactions need review', async () => {
      mockedQueries.getReviewCount.mockResolvedValue(0);

      const result = await repository.getReviewCount();

      expect(result).toBe(0);
    });
  });

  describe('create', () => {
    it('should delegate to createTransaction query', async () => {
      const createdTransaction = { ...sampleTransaction, ...sampleCreateDTO };
      mockedQueries.createTransaction.mockResolvedValue(createdTransaction);

      const result = await repository.create(sampleCreateDTO);

      expect(mockedQueries.createTransaction).toHaveBeenCalledWith(sampleCreateDTO);
      expect(result).toEqual(createdTransaction);
    });
  });

  describe('createMany', () => {
    it('should delegate to createTransactions query', async () => {
      const dataList = [sampleCreateDTO, { ...sampleCreateDTO, description: 'Second Transaction' }];
      const createdTransactions = [
        sampleTransaction,
        { ...sampleTransaction, id: 'txn-002', description: 'Second Transaction' },
      ];
      mockedQueries.createTransactions.mockResolvedValue(createdTransactions);

      const result = await repository.createMany(dataList);

      expect(mockedQueries.createTransactions).toHaveBeenCalledWith(dataList);
      expect(result).toEqual(createdTransactions);
    });

    it('should handle empty array', async () => {
      mockedQueries.createTransactions.mockResolvedValue([]);

      const result = await repository.createMany([]);

      expect(mockedQueries.createTransactions).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should delegate to updateTransaction query', async () => {
      const updatedTransaction = { ...sampleTransaction, ...sampleUpdateDTO };
      mockedQueries.updateTransaction.mockResolvedValue(updatedTransaction);

      const result = await repository.update('txn-001', sampleUpdateDTO);

      expect(mockedQueries.updateTransaction).toHaveBeenCalledWith('txn-001', sampleUpdateDTO);
      expect(result).toEqual(updatedTransaction);
    });

    it('should return null when transaction not found', async () => {
      mockedQueries.updateTransaction.mockResolvedValue(null);

      const result = await repository.update('non-existent', sampleUpdateDTO);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delegate to deleteTransaction query', async () => {
      mockedQueries.deleteTransaction.mockResolvedValue(undefined);

      await repository.delete('txn-001');

      expect(mockedQueries.deleteTransaction).toHaveBeenCalledWith('txn-001');
    });
  });

  describe('deleteMany', () => {
    it('should delegate to deleteTransactions query', async () => {
      const ids = ['txn-001', 'txn-002', 'txn-003'];
      mockedQueries.deleteTransactions.mockResolvedValue(undefined);

      await repository.deleteMany(ids);

      expect(mockedQueries.deleteTransactions).toHaveBeenCalledWith(ids);
    });

    it('should handle empty array', async () => {
      mockedQueries.deleteTransactions.mockResolvedValue(undefined);

      await repository.deleteMany([]);

      expect(mockedQueries.deleteTransactions).toHaveBeenCalledWith([]);
    });
  });

  describe('deleteByBatchId', () => {
    it('should delegate to deleteTransactionsByBatchId query', async () => {
      mockedQueries.deleteTransactionsByBatchId.mockResolvedValue(undefined);

      await repository.deleteByBatchId('batch-001');

      expect(mockedQueries.deleteTransactionsByBatchId).toHaveBeenCalledWith('batch-001');
    });
  });

  describe('markAsReviewed', () => {
    it('should delegate to markTransactionAsReviewed query', async () => {
      const reviewedTransaction = { ...sampleTransaction, needsReview: false };
      mockedQueries.markTransactionAsReviewed.mockResolvedValue(reviewedTransaction);

      const result = await repository.markAsReviewed('txn-001');

      expect(mockedQueries.markTransactionAsReviewed).toHaveBeenCalledWith('txn-001');
      expect(result).toEqual(reviewedTransaction);
    });

    it('should return null when transaction not found', async () => {
      mockedQueries.markTransactionAsReviewed.mockResolvedValue(null);

      const result = await repository.markAsReviewed('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('markManyAsReviewed', () => {
    it('should delegate to markTransactionsAsReviewed query', async () => {
      const ids = ['txn-001', 'txn-002'];
      mockedQueries.markTransactionsAsReviewed.mockResolvedValue(undefined);

      await repository.markManyAsReviewed(ids);

      expect(mockedQueries.markTransactionsAsReviewed).toHaveBeenCalledWith(ids);
    });
  });

  describe('setCategory', () => {
    it('should delegate to setTransactionCategory query with category', async () => {
      const categorizedTransaction = { ...sampleTransaction, categoryId: 'cat-002' };
      mockedQueries.setTransactionCategory.mockResolvedValue(categorizedTransaction);

      const result = await repository.setCategory('txn-001', 'cat-002');

      expect(mockedQueries.setTransactionCategory).toHaveBeenCalledWith('txn-001', 'cat-002');
      expect(result).toEqual(categorizedTransaction);
    });

    it('should delegate to setTransactionCategory query with null to clear category', async () => {
      const uncategorizedTransaction = { ...sampleTransaction, categoryId: null };
      mockedQueries.setTransactionCategory.mockResolvedValue(uncategorizedTransaction);

      const result = await repository.setCategory('txn-001', null);

      expect(mockedQueries.setTransactionCategory).toHaveBeenCalledWith('txn-001', null);
      expect(result).toEqual(uncategorizedTransaction);
    });

    it('should return null when transaction not found', async () => {
      mockedQueries.setTransactionCategory.mockResolvedValue(null);

      const result = await repository.setCategory('non-existent', 'cat-001');

      expect(result).toBeNull();
    });
  });

  describe('ITransactionRepository interface compliance', () => {
    it('should implement all required interface methods', () => {
      // Verify all methods exist and are functions
      expect(typeof repository.getAll).toBe('function');
      expect(typeof repository.getById).toBe('function');
      expect(typeof repository.getByMonth).toBe('function');
      expect(typeof repository.getByBatchId).toBe('function');
      expect(typeof repository.getNeedingReview).toBe('function');
      expect(typeof repository.getReviewCount).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.createMany).toBe('function');
      expect(typeof repository.update).toBe('function');
      expect(typeof repository.delete).toBe('function');
      expect(typeof repository.deleteMany).toBe('function');
      expect(typeof repository.deleteByBatchId).toBe('function');
      expect(typeof repository.markAsReviewed).toBe('function');
      expect(typeof repository.markManyAsReviewed).toBe('function');
      expect(typeof repository.setCategory).toBe('function');
    });
  });
});
