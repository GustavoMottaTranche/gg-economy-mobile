/**
 * Import batch status
 */
export type ImportBatchStatus = 'pending' | 'reviewing' | 'completed';

/**
 * Supported file types for import
 */
export type FileType = 'csv' | 'ofx' | 'qif' | 'xlsx' | 'xls';

/**
 * Batch group for grouping multiple imports
 * Used when importing multiple files at once
 */
export interface BatchGroup {
  /** Unique identifier (UUID) */
  id: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Number of files in this group */
  fileCount: number;
  /** Total transactions across all files */
  totalTransactions: number;
  /** Number of duplicates found across files */
  crossFileDuplicates: number;
}

/**
 * Import batch entity representing a group of imported transactions
 */
export interface ImportBatch {
  /** Unique identifier (UUID) */
  id: string;
  /** Original file name */
  fileName: string;
  /** File type (csv, ofx, qif, xlsx, xls) */
  fileType: FileType;
  /** Import timestamp */
  importedAt: Date;
  /** Number of transactions in this batch */
  transactionCount: number;
  /** Current status of the batch */
  status: ImportBatchStatus;
  /** Optional batch group ID for multi-file imports */
  batchGroupId?: string;
}

/**
 * DTO for creating a new import batch
 */
export interface CreateImportBatchDTO {
  fileName: string;
  fileType: FileType;
  transactionCount: number;
  /** Optional batch group ID for multi-file imports */
  batchGroupId?: string;
}

/**
 * DTO for updating an import batch
 */
export interface UpdateImportBatchDTO {
  status?: ImportBatchStatus;
  transactionCount?: number;
}
