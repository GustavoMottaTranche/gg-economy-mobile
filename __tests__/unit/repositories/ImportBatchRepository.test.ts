/**
 * Unit Tests for ImportBatchRepository
 *
 * Tests that ImportBatchRepository correctly delegates all operations
 * to the underlying query functions. Uses mocking to verify delegation
 * without requiring a real database connection.
 *
 * **Validates: Requirement 2 - Repository Pattern for ImportBatches**
 *
 * @module ImportBatchRepository.test
 */

import {
  ImportBatchRepository,
  importBatchRepository,
} from '../../../src/repositories/ImportBatchRepository';
import type { CreateImportBatchDTO, FileType, ImportBatchStatus } from '../../../src/types';
import * as queries from '../../../src/db/queries/importBatches';

// Mock the queries module
jest.mock('../../../src/db/queries/importBatches');

const mockedQueries = queries as jest.Mocked<typeof queries>;

/**
 * Type that matches the return type of query functions (with explicit batchGroupId: string | undefined)
 */
interface ImportBatchQueryResult {
  id: string;
  fileName: string;
  fileType: FileType;
  importedAt: Date;
  transactionCount: number;
  status: ImportBatchStatus;
  batchGroupId: string | undefined;
}

describe('ImportBatchRepository', () => {
  let repository: ImportBatchRepository;

  // Sample import batch data for testing - matches query function return type
  const sampleBatch: ImportBatchQueryResult = {
    id: 'batch-001',
    fileName: 'transactions.csv',
    fileType: 'csv',
    importedAt: new Date('2024-01-15T10:00:00Z'),
    transactionCount: 25,
    status: 'pending',
    batchGroupId: undefined,
  };

  const sampleCreateDTO: CreateImportBatchDTO = {
    fileName: 'new-transactions.ofx',
    fileType: 'ofx',
    transactionCount: 15,
    batchGroupId: 'group-001',
  };

  beforeEach(() => {
    repository = new ImportBatchRepository();
    jest.clearAllMocks();
  });

  describe('singleton instance', () => {
    it('should export a singleton importBatchRepository instance', () => {
      expect(importBatchRepository).toBeInstanceOf(ImportBatchRepository);
    });
  });

  describe('getById', () => {
    it('should delegate to getImportBatchById query', async () => {
      mockedQueries.getImportBatchById.mockResolvedValue(sampleBatch);

      const result = await repository.getById('batch-001');

      expect(mockedQueries.getImportBatchById).toHaveBeenCalledWith('batch-001');
      expect(result).toEqual(sampleBatch);
    });

    it('should return null when batch not found', async () => {
      mockedQueries.getImportBatchById.mockResolvedValue(null);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should delegate to getAllImportBatches query', async () => {
      const batches = [sampleBatch];
      mockedQueries.getAllImportBatches.mockResolvedValue(batches);

      const result = await repository.getAll();

      expect(mockedQueries.getAllImportBatches).toHaveBeenCalledTimes(1);
      expect(result).toEqual(batches);
    });

    it('should return empty array when no batches exist', async () => {
      mockedQueries.getAllImportBatches.mockResolvedValue([]);

      const result = await repository.getAll();

      expect(result).toEqual([]);
    });

    it('should return multiple batches', async () => {
      const batches = [
        sampleBatch,
        { ...sampleBatch, id: 'batch-002', fileName: 'second.csv' },
        { ...sampleBatch, id: 'batch-003', fileName: 'third.xlsx', fileType: 'xlsx' as const },
      ];
      mockedQueries.getAllImportBatches.mockResolvedValue(batches);

      const result = await repository.getAll();

      expect(result).toHaveLength(3);
      expect(result).toEqual(batches);
    });
  });

  describe('create', () => {
    it('should delegate to createImportBatch query', async () => {
      const createdBatch: ImportBatchQueryResult = {
        id: 'batch-new',
        fileName: sampleCreateDTO.fileName,
        fileType: sampleCreateDTO.fileType,
        importedAt: new Date(),
        transactionCount: sampleCreateDTO.transactionCount,
        status: 'pending',
        batchGroupId: sampleCreateDTO.batchGroupId,
      };
      mockedQueries.createImportBatch.mockResolvedValue(createdBatch);

      const result = await repository.create(sampleCreateDTO);

      expect(mockedQueries.createImportBatch).toHaveBeenCalledWith(sampleCreateDTO);
      expect(result).toEqual(createdBatch);
    });

    it('should create batch without batchGroupId', async () => {
      const dtoWithoutGroup: CreateImportBatchDTO = {
        fileName: 'single-file.csv',
        fileType: 'csv',
        transactionCount: 10,
      };
      const createdBatch: ImportBatchQueryResult = {
        id: 'batch-single',
        fileName: dtoWithoutGroup.fileName,
        fileType: dtoWithoutGroup.fileType,
        importedAt: new Date(),
        transactionCount: dtoWithoutGroup.transactionCount,
        status: 'pending',
        batchGroupId: undefined,
      };
      mockedQueries.createImportBatch.mockResolvedValue(createdBatch);

      const result = await repository.create(dtoWithoutGroup);

      expect(mockedQueries.createImportBatch).toHaveBeenCalledWith(dtoWithoutGroup);
      expect(result.batchGroupId).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should delegate to updateImportBatch query', async () => {
      const updateData = { status: 'reviewing' as const, transactionCount: 30 };
      const updatedBatch = { ...sampleBatch, ...updateData };
      mockedQueries.updateImportBatch.mockResolvedValue(updatedBatch);

      const result = await repository.update('batch-001', updateData);

      expect(mockedQueries.updateImportBatch).toHaveBeenCalledWith('batch-001', updateData);
      expect(result).toEqual(updatedBatch);
    });

    it('should return null when batch not found', async () => {
      mockedQueries.updateImportBatch.mockResolvedValue(null);

      const result = await repository.update('non-existent', { status: 'completed' });

      expect(result).toBeNull();
    });

    it('should update only status', async () => {
      const updateData = { status: 'completed' as const };
      const updatedBatch = { ...sampleBatch, status: 'completed' as const };
      mockedQueries.updateImportBatch.mockResolvedValue(updatedBatch);

      const result = await repository.update('batch-001', updateData);

      expect(mockedQueries.updateImportBatch).toHaveBeenCalledWith('batch-001', updateData);
      expect(result?.status).toBe('completed');
    });

    it('should update only transactionCount', async () => {
      const updateData = { transactionCount: 50 };
      const updatedBatch = { ...sampleBatch, transactionCount: 50 };
      mockedQueries.updateImportBatch.mockResolvedValue(updatedBatch);

      const result = await repository.update('batch-001', updateData);

      expect(mockedQueries.updateImportBatch).toHaveBeenCalledWith('batch-001', updateData);
      expect(result?.transactionCount).toBe(50);
    });
  });

  describe('markAsReviewing', () => {
    it('should delegate to markBatchAsReviewing query', async () => {
      const reviewingBatch = { ...sampleBatch, status: 'reviewing' as const };
      mockedQueries.markBatchAsReviewing.mockResolvedValue(reviewingBatch);

      const result = await repository.markAsReviewing('batch-001');

      expect(mockedQueries.markBatchAsReviewing).toHaveBeenCalledWith('batch-001');
      expect(result).toEqual(reviewingBatch);
      expect(result?.status).toBe('reviewing');
    });

    it('should return null when batch not found', async () => {
      mockedQueries.markBatchAsReviewing.mockResolvedValue(null);

      const result = await repository.markAsReviewing('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('markAsCompleted', () => {
    it('should delegate to markBatchAsCompleted query', async () => {
      const completedBatch = { ...sampleBatch, status: 'completed' as const };
      mockedQueries.markBatchAsCompleted.mockResolvedValue(completedBatch);

      const result = await repository.markAsCompleted('batch-001');

      expect(mockedQueries.markBatchAsCompleted).toHaveBeenCalledWith('batch-001');
      expect(result).toEqual(completedBatch);
      expect(result?.status).toBe('completed');
    });

    it('should return null when batch not found', async () => {
      mockedQueries.markBatchAsCompleted.mockResolvedValue(null);

      const result = await repository.markAsCompleted('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delegate to deleteImportBatch query', async () => {
      mockedQueries.deleteImportBatch.mockResolvedValue(undefined);

      await repository.delete('batch-001');

      expect(mockedQueries.deleteImportBatch).toHaveBeenCalledWith('batch-001');
    });

    it('should not throw when deleting non-existent batch', async () => {
      mockedQueries.deleteImportBatch.mockResolvedValue(undefined);

      await expect(repository.delete('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('IImportBatchRepository interface compliance', () => {
    it('should implement all required interface methods', () => {
      // Verify all methods exist and are functions
      expect(typeof repository.getById).toBe('function');
      expect(typeof repository.getAll).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.update).toBe('function');
      expect(typeof repository.markAsReviewing).toBe('function');
      expect(typeof repository.markAsCompleted).toBe('function');
      expect(typeof repository.delete).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should propagate errors from getById query', async () => {
      const error = new Error('Database connection failed');
      mockedQueries.getImportBatchById.mockRejectedValue(error);

      await expect(repository.getById('batch-001')).rejects.toThrow('Database connection failed');
    });

    it('should propagate errors from getAll query', async () => {
      const error = new Error('Query timeout');
      mockedQueries.getAllImportBatches.mockRejectedValue(error);

      await expect(repository.getAll()).rejects.toThrow('Query timeout');
    });

    it('should propagate errors from create query', async () => {
      const error = new Error('Constraint violation');
      mockedQueries.createImportBatch.mockRejectedValue(error);

      await expect(repository.create(sampleCreateDTO)).rejects.toThrow('Constraint violation');
    });

    it('should propagate errors from update query', async () => {
      const error = new Error('Update failed');
      mockedQueries.updateImportBatch.mockRejectedValue(error);

      await expect(repository.update('batch-001', { status: 'completed' })).rejects.toThrow(
        'Update failed'
      );
    });

    it('should propagate errors from delete query', async () => {
      const error = new Error('Delete failed');
      mockedQueries.deleteImportBatch.mockRejectedValue(error);

      await expect(repository.delete('batch-001')).rejects.toThrow('Delete failed');
    });
  });
});
