/**
 * Transaction entity representing a financial transaction
 */
export interface Transaction {
  /** Unique identifier (UUID) */
  id: string;
  /** Transaction date */
  date: Date;
  /** Amount in cents (positive for income, negative for expense) */
  amount: number;
  /** Transaction description from bank statement or user input */
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
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * DTO for creating a new transaction
 */
export interface CreateTransactionDTO {
  date: Date;
  amount: number;
  description: string;
  categoryId?: string;
  originId?: string;
  batchId?: string;
  referenceMonth: string;
  needsReview?: boolean;
  isExcludedFromTotals?: boolean;
}

/**
 * DTO for updating an existing transaction
 */
export interface UpdateTransactionDTO {
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
