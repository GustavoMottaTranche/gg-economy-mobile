import type { ImportBatch, CreateImportBatchDTO } from '../../types';

/**
 * Repository interface for import batch data access.
 * Abstracts batch management operations, enabling dependency injection and easier testing.
 */
export interface IImportBatchRepository {
  // Query methods
  getById(id: string): Promise<ImportBatch | null>;
  getAll(): Promise<ImportBatch[]>;

  // Create methods
  create(data: CreateImportBatchDTO): Promise<ImportBatch>;

  // Update methods
  update(id: string, data: Partial<ImportBatch>): Promise<ImportBatch | null>;
  markAsReviewing(id: string): Promise<ImportBatch | null>;
  markAsCompleted(id: string): Promise<ImportBatch | null>;

  // Delete methods
  delete(id: string): Promise<void>;
}
