/**
 * Import Batch Repository Implementation
 *
 * Implements IImportBatchRepository interface by delegating to existing
 * Drizzle query functions. Provides a clean abstraction layer for
 * import batch data access, enabling dependency injection and easier testing.
 *
 * @module ImportBatchRepository
 */

import type { IImportBatchRepository } from './interfaces/IImportBatchRepository';
import type { ImportBatch, CreateImportBatchDTO } from '../types';
import * as queries from '../db/queries/importBatches';

/**
 * Repository implementation for import batch data access.
 * Delegates all operations to existing Drizzle query functions.
 */
export class ImportBatchRepository implements IImportBatchRepository {
  /**
   * Get an import batch by its ID
   */
  async getById(id: string): Promise<ImportBatch | null> {
    return queries.getImportBatchById(id);
  }

  /**
   * Get all import batches ordered by import date descending
   */
  async getAll(): Promise<ImportBatch[]> {
    return queries.getAllImportBatches();
  }

  /**
   * Create a new import batch
   */
  async create(data: CreateImportBatchDTO): Promise<ImportBatch> {
    return queries.createImportBatch(data);
  }

  /**
   * Update an existing import batch
   */
  async update(id: string, data: Partial<ImportBatch>): Promise<ImportBatch | null> {
    return queries.updateImportBatch(id, data);
  }

  /**
   * Mark an import batch as reviewing
   */
  async markAsReviewing(id: string): Promise<ImportBatch | null> {
    return queries.markBatchAsReviewing(id);
  }

  /**
   * Mark an import batch as completed
   */
  async markAsCompleted(id: string): Promise<ImportBatch | null> {
    return queries.markBatchAsCompleted(id);
  }

  /**
   * Delete an import batch by ID
   */
  async delete(id: string): Promise<void> {
    return queries.deleteImportBatch(id);
  }
}

/**
 * Singleton instance of ImportBatchRepository for use throughout the application.
 * Services should accept IImportBatchRepository through constructor injection,
 * defaulting to this instance for production use.
 */
export const importBatchRepository = new ImportBatchRepository();
