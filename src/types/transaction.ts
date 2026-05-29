/**
 * Transaction entity representing a financial transaction
 */
export interface Transaction {
  /** Unique identifier (UUID) */
  id: string;
  /** Short title identifying the transaction (1-100 chars) */
  title: string;
  /** Transaction date */
  date: Date;
  /** Amount in cents (positive for income, negative for expense) */
  amount: number;
  /** Optional description with additional details (0-500 chars) */
  description: string;
  /** Reference to the category (nullable for uncategorized) */
  categoryId: string | null;
  /** Reference to the origin (bank, credit card, etc.) */
  originId: string | null;
  /** Reference to the import batch (null for manual entries) */
  batchId: string | null;
  /** Reference month for grouping (format: YYYY-MM) */
  referenceMonth: string;
  /** Flag indicating if transaction needs user review */
  needsReview: boolean;
  /** Flag to exclude from totals calculation */
  isExcludedFromTotals: boolean;
  /** Reference to duplicate transaction (if this is a duplicate) */
  duplicateOf: string | null;
  /** UUID linking parcels of the same installment group; null for non-installment transactions */
  installmentGroupId: string | null;
  /** Reference to recurring transaction; null for non-recurring transactions */
  recurringId: string | null;
  /** Whether this transaction has been paid */
  isPaid: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * DTO for creating a new transaction
 */
export interface CreateTransactionDTO {
  title: string;
  date: Date;
  amount: number;
  description: string;
  categoryId?: string;
  originId?: string;
  batchId?: string;
  referenceMonth: string;
  needsReview?: boolean;
  isExcludedFromTotals?: boolean;
  isPaid?: boolean;
  /** UUID linking parcels of the same installment group; null/undefined for non-installment transactions */
  installmentGroupId?: string;
}

/**
 * DTO for updating an existing transaction
 */
export interface UpdateTransactionDTO {
  title?: string;
  date?: Date;
  amount?: number;
  description?: string;
  categoryId?: string | null;
  originId?: string | null;
  referenceMonth?: string;
  needsReview?: boolean;
  isExcludedFromTotals?: boolean;
}

/**
 * Raw transaction data from import parsing
 */
export interface RawTransaction {
  date: Date;
  amount: number;
  description: string;
  /** FITID from OFX files for deduplication */
  fitId?: string;
  /** Original line number in source file */
  sourceLineNumber?: number;
}
