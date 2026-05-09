import type { Transaction, CreateTransactionDTO, UpdateTransactionDTO } from '../../types';

/**
 * Repository interface for transaction data access.
 * Abstracts CRUD operations for transactions, enabling dependency injection and easier testing.
 */
export interface ITransactionRepository {
  // Query methods
  getAll(): Promise<Transaction[]>;
  getById(id: string): Promise<Transaction | null>;
  getByMonth(referenceMonth: string): Promise<Transaction[]>;
  getByBatchId(batchId: string): Promise<Transaction[]>;
  getNeedingReview(): Promise<Transaction[]>;
  getReviewCount(): Promise<number>;

  // Create methods
  create(data: CreateTransactionDTO): Promise<Transaction>;
  createMany(dataList: CreateTransactionDTO[]): Promise<Transaction[]>;

  // Update methods
  update(id: string, data: UpdateTransactionDTO): Promise<Transaction | null>;

  // Delete methods
  delete(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
  deleteByBatchId(batchId: string): Promise<void>;

  // Review methods
  markAsReviewed(id: string): Promise<Transaction | null>;
  markManyAsReviewed(ids: string[]): Promise<void>;

  // Category methods
  setCategory(id: string, categoryId: string | null): Promise<Transaction | null>;
}
