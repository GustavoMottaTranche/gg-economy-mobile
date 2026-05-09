/**
 * Transaction Repository Implementation
 *
 * Implements ITransactionRepository interface by delegating to existing
 * Drizzle query functions. Provides a clean abstraction layer for
 * transaction data access, enabling dependency injection and easier testing.
 *
 * @module TransactionRepository
 */

import type { ITransactionRepository } from './interfaces/ITransactionRepository';
import type { Transaction, CreateTransactionDTO, UpdateTransactionDTO } from '../types';
import * as queries from '../db/queries/transactions';
import { validateTransaction } from '../validation';

/**
 * Repository implementation for transaction data access.
 * Delegates all operations to existing Drizzle query functions.
 */
export class TransactionRepository implements ITransactionRepository {
  /**
   * Get all transactions ordered by date descending
   */
  async getAll(): Promise<Transaction[]> {
    return queries.getAllTransactions();
  }

  /**
   * Get a transaction by its ID
   */
  async getById(id: string): Promise<Transaction | null> {
    return queries.getTransactionById(id);
  }

  /**
   * Get transactions for a specific reference month
   */
  async getByMonth(referenceMonth: string): Promise<Transaction[]> {
    return queries.getTransactionsByMonth(referenceMonth);
  }

  /**
   * Get transactions belonging to a specific import batch
   */
  async getByBatchId(batchId: string): Promise<Transaction[]> {
    return queries.getTransactionsByBatchId(batchId);
  }

  /**
   * Get transactions that need review
   */
  async getNeedingReview(): Promise<Transaction[]> {
    return queries.getTransactionsNeedingReview();
  }

  /**
   * Get count of transactions needing review
   */
  async getReviewCount(): Promise<number> {
    return queries.getReviewCount();
  }

  /**
   * Create a new transaction
   * Validates transaction data before inserting into database
   * @throws Error if validation fails
   */
  async create(data: CreateTransactionDTO): Promise<Transaction> {
    const validationResult = validateTransaction({
      date: data.date,
      amount: data.amount,
      description: data.description,
      referenceMonth: data.referenceMonth,
    });

    if (!validationResult.valid) {
      throw new Error(`Transaction validation failed: ${validationResult.errors.join(', ')}`);
    }

    return queries.createTransaction(data);
  }

  /**
   * Create multiple transactions in a single database transaction
   * Validates all transaction data before inserting into database
   * @throws Error if any transaction fails validation
   */
  async createMany(dataList: CreateTransactionDTO[]): Promise<Transaction[]> {
    // Validate all transactions before creating any
    for (let i = 0; i < dataList.length; i++) {
      const data = dataList[i];
      if (!data) continue;
      const validationResult = validateTransaction({
        date: data.date,
        amount: data.amount,
        description: data.description,
        referenceMonth: data.referenceMonth,
      });

      if (!validationResult.valid) {
        throw new Error(
          `Transaction validation failed at index ${i}: ${validationResult.errors.join(', ')}`
        );
      }
    }

    return queries.createTransactions(dataList);
  }

  /**
   * Update an existing transaction
   */
  async update(id: string, data: UpdateTransactionDTO): Promise<Transaction | null> {
    return queries.updateTransaction(id, data);
  }

  /**
   * Delete a transaction by ID
   */
  async delete(id: string): Promise<void> {
    return queries.deleteTransaction(id);
  }

  /**
   * Delete multiple transactions by their IDs
   */
  async deleteMany(ids: string[]): Promise<void> {
    return queries.deleteTransactions(ids);
  }

  /**
   * Delete all transactions belonging to a specific batch
   */
  async deleteByBatchId(batchId: string): Promise<void> {
    return queries.deleteTransactionsByBatchId(batchId);
  }

  /**
   * Mark a transaction as reviewed (sets needsReview to false)
   */
  async markAsReviewed(id: string): Promise<Transaction | null> {
    return queries.markTransactionAsReviewed(id);
  }

  /**
   * Mark multiple transactions as reviewed
   */
  async markManyAsReviewed(ids: string[]): Promise<void> {
    return queries.markTransactionsAsReviewed(ids);
  }

  /**
   * Set or clear the category for a transaction
   */
  async setCategory(id: string, categoryId: string | null): Promise<Transaction | null> {
    return queries.setTransactionCategory(id, categoryId);
  }
}

/**
 * Singleton instance of TransactionRepository for use throughout the application.
 * Services should accept ITransactionRepository through constructor injection,
 * defaulting to this instance for production use.
 */
export const transactionRepository = new TransactionRepository();
