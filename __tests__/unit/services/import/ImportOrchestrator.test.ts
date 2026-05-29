/**
 * Unit tests for ImportOrchestrator
 *
 * Tests the ImportOrchestrator service including:
 * - Progress callback system
 * - Stage-based import flow
 * - Cancellation support
 * - Repository injection
 * - Error handling
 *
 * These tests do not require React dependencies.
 */

import {
  ImportOrchestrator,
  ImportProgress,
  ImportStage,
} from '../../../../src/services/import/ImportOrchestrator';
import { CsvParser } from '../../../../src/services/import/CsvParser';
import { OfxParser } from '../../../../src/services/import/OfxParser';
import { ExcelParser } from '../../../../src/services/import/ExcelParser';
import { DedupeEngine } from '../../../../src/services/import/DedupeEngine';
import type { ITransactionRepository } from '../../../../src/repositories/interfaces/ITransactionRepository';
import type { IImportBatchRepository } from '../../../../src/repositories/interfaces/IImportBatchRepository';
import type { RawTransaction, Transaction, ImportBatch } from '../../../../src/types';

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: {
    UTF8: 'utf8',
    Base64: 'base64',
  },
}));

import * as FileSystem from 'expo-file-system';

/**
 * Creates a mock ITransactionRepository for testing
 */
function createMockTransactionRepository(): jest.Mocked<ITransactionRepository> {
  return {
    getAll: jest.fn(),
    getById: jest.fn(),
    getByMonth: jest.fn(),
    getByBatchId: jest.fn(),
    getNeedingReview: jest.fn(),
    getReviewCount: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    deleteByBatchId: jest.fn(),
    markAsReviewed: jest.fn(),
    markManyAsReviewed: jest.fn(),
    setCategory: jest.fn(),
  };
}

/**
 * Creates a mock IImportBatchRepository for testing
 */
function createMockImportBatchRepository(): jest.Mocked<IImportBatchRepository> {
  return {
    getById: jest.fn(),
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    markAsReviewing: jest.fn(),
    markAsCompleted: jest.fn(),
    delete: jest.fn(),
  };
}

describe('ImportOrchestrator', () => {
  let orchestrator: ImportOrchestrator;
  let mockTransactionRepo: jest.Mocked<ITransactionRepository>;
  let mockBatchRepo: jest.Mocked<IImportBatchRepository>;
  let mockCsvParser: jest.Mocked<CsvParser>;
  let mockOfxParser: jest.Mocked<OfxParser>;
  let mockExcelParser: jest.Mocked<ExcelParser>;
  let mockDedupeEngine: jest.Mocked<DedupeEngine>;

  const mockTransactions: RawTransaction[] = [
    { date: new Date(2024, 0, 15), amount: 100, description: 'Income' },
    { date: new Date(2024, 0, 20), amount: -50, description: 'Expense' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock repositories
    mockTransactionRepo = createMockTransactionRepository();
    mockBatchRepo = createMockImportBatchRepository();

    // Create mock parsers
    mockCsvParser = {
      parse: jest.fn(),
      detectDelimiter: jest.fn(),
      splitLine: jest.fn(),
      parseAmount: jest.fn(),
      detectDecimalSeparator: jest.fn(),
      formatToCsv: jest.fn(),
    } as unknown as jest.Mocked<CsvParser>;

    mockOfxParser = {
      parse: jest.fn(),
      parseOfxDate: jest.fn(),
      parseOfxAmount: jest.fn(),
      formatOfxDate: jest.fn(),
      serializeToOfx: jest.fn(),
      extractStmtTrnElements: jest.fn(),
    } as unknown as jest.Mocked<OfxParser>;

    mockExcelParser = {
      parse: jest.fn(),
      listSheets: jest.fn(),
      detectColumnMapping: jest.fn(),
      parseExcelDate: jest.fn(),
      formatToExcel: jest.fn(),
    } as unknown as jest.Mocked<ExcelParser>;

    mockDedupeEngine = {
      findDuplicates: jest.fn(),
      findDuplicatesWithinSet: jest.fn(),
      dedupeIdempotent: jest.fn(),
      markAsDuplicate: jest.fn(),
      calculateConfidence: jest.fn(),
      calculateDescriptionSimilarity: jest.fn(),
    } as unknown as jest.Mocked<DedupeEngine>;

    // Create orchestrator with mocks
    orchestrator = new ImportOrchestrator(
      mockTransactionRepo,
      mockBatchRepo,
      mockCsvParser,
      mockOfxParser,
      mockExcelParser,
      mockDedupeEngine
    );

    // Default mock implementations
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
      'date,amount,description\n2024-01-15,100,Income\n2024-01-20,-50,Expense'
    );

    mockCsvParser.parse.mockReturnValue({
      transactions: mockTransactions,
      errors: [],
      warnings: [],
      delimiter: ',',
      columnMapping: { dateIndex: 0, amountIndex: 1, descriptionIndex: 2 },
      totalLines: 3,
      successfulLines: 2,
    });

    mockDedupeEngine.findDuplicates.mockReturnValue({
      uniqueTransactions: mockTransactions,
      duplicates: [],
      totalProcessed: 2,
    });

    mockTransactionRepo.getAll.mockResolvedValue([]);

    mockBatchRepo.create.mockResolvedValue({
      id: 'batch-123',
      fileName: 'statement.csv',
      fileType: 'csv',
      importedAt: new Date(),
      transactionCount: 2,
      status: 'pending',
    });

    mockTransactionRepo.createMany.mockResolvedValue(mockTransactions as unknown as Transaction[]);
    mockBatchRepo.markAsReviewing.mockResolvedValue(undefined as unknown as ImportBatch);
  });

  describe('constructor injection', () => {
    it('should accept repositories through constructor', () => {
      const customTransactionRepo = createMockTransactionRepository();
      const customBatchRepo = createMockImportBatchRepository();

      const customOrchestrator = new ImportOrchestrator(customTransactionRepo, customBatchRepo);

      expect(customOrchestrator).toBeDefined();
    });

    it('should use injected repositories for operations', async () => {
      await orchestrator.importFile('file:///path/to/statement.csv', 'statement.csv', 'csv');

      expect(mockTransactionRepo.getAll).toHaveBeenCalled();
      expect(mockBatchRepo.create).toHaveBeenCalled();
      expect(mockTransactionRepo.createMany).toHaveBeenCalled();
      expect(mockBatchRepo.markAsReviewing).toHaveBeenCalled();
    });
  });

  describe('onProgress', () => {
    it('should register a progress callback', () => {
      const callback = jest.fn();
      orchestrator.onProgress(callback);

      // Callback should be called during import
      orchestrator.importFile('file:///path/to/statement.csv', 'statement.csv', 'csv');

      // Wait for async operations
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(callback).toHaveBeenCalled();
          resolve();
        }, 100);
      });
    });

    it('should emit progress updates with correct structure', async () => {
      const progressUpdates: ImportProgress[] = [];
      orchestrator.onProgress((progress) => {
        progressUpdates.push({ ...progress });
      });

      await orchestrator.importFile('file:///path/to/statement.csv', 'statement.csv', 'csv');

      expect(progressUpdates.length).toBeGreaterThan(0);

      // Check structure of progress updates
      progressUpdates.forEach((progress) => {
        expect(progress).toHaveProperty('stage');
        expect(progress).toHaveProperty('percentage');
        expect(progress).toHaveProperty('message');
        expect(progress).toHaveProperty('transactionsProcessed');
        expect(progress).toHaveProperty('totalTransactions');
      });
    });
  });

  describe('importFile - stage-based progress', () => {
    it('should emit reading stage at 10%', async () => {
      const progressUpdates: ImportProgress[] = [];
      orchestrator.onProgress((progress) => {
        progressUpdates.push({ ...progress });
      });

      await orchestrator.importFile('file:///path/to/statement.csv', 'statement.csv', 'csv');

      const readingStage = progressUpdates.find((p) => p.stage === 'reading');
      expect(readingStage).toBeDefined();
      expect(readingStage?.percentage).toBe(10);
    });

    it('should emit parsing stage at 30%', async () => {
      const progressUpdates: ImportProgress[] = [];
      orchestrator.onProgress((progress) => {
        progressUpdates.push({ ...progress });
      });

      await orchestrator.importFile('file:///path/to/statement.csv', 'statement.csv', 'csv');

      const parsingStage = progressUpdates.find((p) => p.stage === 'parsing');
      expect(parsingStage).toBeDefined();
      expect(parsingStage?.percentage).toBe(30);
    });

    it('should emit deduplicating stage at 60%', async () => {
      const progressUpdates: ImportProgress[] = [];
      orchestrator.onProgress((progress) => {
        progressUpdates.push({ ...progress });
      });

      await orchestrator.importFile('file:///path/to/statement.csv', 'statement.csv', 'csv');

      const dedupeStage = progressUpdates.find((p) => p.stage === 'deduplicating');
      expect(dedupeStage).toBeDefined();
      expect(dedupeStage?.percentage).toBe(60);
    });

    it('should emit saving stage at 80%', async () => {
      const progressUpdates: ImportProgress[] = [];
      orchestrator.onProgress((progress) => {
        progressUpdates.push({ ...progress });
      });

      await orchestrator.importFile('file:///path/to/statement.csv', 'statement.csv', 'csv');

      const savingStage = progressUpdates.find((p) => p.stage === 'saving');
      expect(savingStage).toBeDefined();
      expect(savingStage?.percentage).toBe(80);
    });

    it('should emit complete stage at 100%', async () => {
      const progressUpdates: ImportProgress[] = [];
      orchestrator.onProgress((progress) => {
        progressUpdates.push({ ...progress });
      });

      await orchestrator.importFile('file:///path/to/statement.csv', 'statement.csv', 'csv');

      const completeStage = progressUpdates.find((p) => p.stage === 'complete');
      expect(completeStage).toBeDefined();
      expect(completeStage?.percentage).toBe(100);
    });

    it('should emit stages in correct order', async () => {
      const stages: ImportStage[] = [];
      orchestrator.onProgress((progress) => {
        if (!stages.includes(progress.stage)) {
          stages.push(progress.stage);
        }
      });

      await orchestrator.importFile('file:///path/to/statement.csv', 'statement.csv', 'csv');

      expect(stages).toEqual(['reading', 'parsing', 'deduplicating', 'saving', 'complete']);
    });
  });

  describe('cancel', () => {
    it('should cancel import at reading stage', async () => {
      orchestrator.onProgress((progress) => {
        if (progress.stage === 'reading') {
          orchestrator.cancel();
        }
      });

      const result = await orchestrator.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CANCELLED');
    });

    it('should cancel import at parsing stage', async () => {
      orchestrator.onProgress((progress) => {
        if (progress.stage === 'parsing') {
          orchestrator.cancel();
        }
      });

      const result = await orchestrator.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CANCELLED');
    });

    it('should cancel import at deduplicating stage', async () => {
      orchestrator.onProgress((progress) => {
        if (progress.stage === 'deduplicating') {
          orchestrator.cancel();
        }
      });

      const result = await orchestrator.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CANCELLED');
    });

    it('should cancel import at saving stage', async () => {
      orchestrator.onProgress((progress) => {
        if (progress.stage === 'saving') {
          orchestrator.cancel();
        }
      });

      const result = await orchestrator.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CANCELLED');
    });

    it('should emit cancelled stage when cancelled', async () => {
      const stages: ImportStage[] = [];
      orchestrator.onProgress((progress) => {
        stages.push(progress.stage);
        if (progress.stage === 'parsing') {
          orchestrator.cancel();
        }
      });

      await orchestrator.importFile('file:///path/to/statement.csv', 'statement.csv', 'csv');

      expect(stages).toContain('cancelled');
    });

    it('should reset cancellation flag for new imports', async () => {
      // First import - cancel it
      orchestrator.onProgress((progress) => {
        if (progress.stage === 'reading') {
          orchestrator.cancel();
        }
      });

      const result1 = await orchestrator.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv'
      );
      expect(result1.success).toBe(false);

      // Second import - should succeed
      orchestrator.onProgress(() => {}); // Reset callback

      const result2 = await orchestrator.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv'
      );
      expect(result2.success).toBe(true);
    });
  });

  describe('importFile - success cases', () => {
    it('should successfully import a CSV file', async () => {
      const result = await orchestrator.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv'
      );

      expect(result.success).toBe(true);
      expect(result.transactionsImported).toBe(2);
      expect(result.duplicatesFound).toBe(0);
      expect(result.batch).toBeDefined();
    });

    it('should detect file type from name if not provided', async () => {
      const result = await orchestrator.importFile(
        'file:///path/to/statement.csv',
        'statement.csv'
      );

      expect(result.success).toBe(true);
      expect(mockCsvParser.parse).toHaveBeenCalled();
    });

    it('should use OFX parser for OFX files', async () => {
      mockOfxParser.parse.mockReturnValue({
        transactions: mockTransactions,
        errors: [],
        warnings: [],
        totalTransactions: 2,
        successfulTransactions: 2,
      });

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        '<OFX><STMTTRN>...</STMTTRN></OFX>'
      );

      const result = await orchestrator.importFile(
        'file:///path/to/statement.ofx',
        'statement.ofx',
        'ofx'
      );

      expect(result.success).toBe(true);
      expect(mockOfxParser.parse).toHaveBeenCalled();
    });

    it('should use Excel parser for XLSX files', async () => {
      mockExcelParser.parse.mockReturnValue({
        transactions: mockTransactions,
        errors: [],
        warnings: [],
        sheets: [{ name: 'Sheet1', index: 0, rowCount: 2, preview: [] }],
        usedSheet: 'Sheet1',
        columnMapping: { dateColumn: 0, amountColumn: 1, descriptionColumn: 2 },
        totalRows: 2,
        successfulRows: 2,
      });

      const result = await orchestrator.importFile(
        'file:///path/to/statement.xlsx',
        'statement.xlsx',
        'xlsx'
      );

      expect(result.success).toBe(true);
      expect(mockExcelParser.parse).toHaveBeenCalled();
    });

    it('should handle duplicates correctly', async () => {
      const existingTransaction: Transaction = {
        id: 'existing-1',
        date: new Date(2024, 0, 15),
        amount: 100,
        description: 'Income',
        title: '',
        categoryId: null,
        originId: null,
        batchId: 'old-batch',
        referenceMonth: '2024-01',
        needsReview: false,
        isExcludedFromTotals: false,
        duplicateOf: null,
        installmentGroupId: null,
        recurringId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransactionRepo.getAll.mockResolvedValue([existingTransaction]);

      mockDedupeEngine.findDuplicates.mockReturnValue({
        uniqueTransactions: [mockTransactions[1]!],
        duplicates: [
          {
            newTransaction: mockTransactions[0]!,
            existingTransaction,
            confidence: 1.0,
            matchReason: 'date_amount_description',
          },
        ],
        totalProcessed: 2,
      });

      const result = await orchestrator.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv'
      );

      expect(result.success).toBe(true);
      expect(result.transactionsImported).toBe(1);
      expect(result.duplicatesFound).toBe(1);
    });

    it('should skip dedupe when option is set', async () => {
      const result = await orchestrator.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv',
        { skipDedupe: true }
      );

      expect(result.success).toBe(true);
      expect(mockDedupeEngine.findDuplicates).not.toHaveBeenCalled();
    });
  });

  describe('importFile - error cases', () => {
    it('should return error for empty file', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('');

      const result = await orchestrator.importFile('file:///path/to/empty.csv', 'empty.csv', 'csv');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EMPTY_FILE');
    });

    it('should return error when no transactions are parsed', async () => {
      mockCsvParser.parse.mockReturnValue({
        transactions: [],
        errors: [{ lineNumber: 1, message: 'Invalid format' }],
        warnings: [],
        delimiter: ',',
        columnMapping: { dateIndex: 0, amountIndex: 1, descriptionIndex: 2 },
        totalLines: 1,
        successfulLines: 0,
      });

      const result = await orchestrator.importFile(
        'file:///path/to/invalid.csv',
        'invalid.csv',
        'csv'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_TRANSACTIONS');
    });

    it('should return error when all transactions are duplicates', async () => {
      mockDedupeEngine.findDuplicates.mockReturnValue({
        uniqueTransactions: [],
        duplicates: [
          {
            newTransaction: mockTransactions[0]!,
            existingTransaction: mockTransactions[0] as unknown as Transaction,
            confidence: 1.0,
            matchReason: 'date_amount_description',
          },
          {
            newTransaction: mockTransactions[1]!,
            existingTransaction: mockTransactions[1] as unknown as Transaction,
            confidence: 1.0,
            matchReason: 'date_amount_description',
          },
        ],
        totalProcessed: 2,
      });

      const result = await orchestrator.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_TRANSACTIONS');
      expect(result.duplicatesFound).toBe(2);
    });

    it('should return error for file read failures', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await orchestrator.importFile(
        'file:///path/to/missing.csv',
        'missing.csv',
        'csv'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FILE_READ_ERROR');
    });

    it('should return error for database failures', async () => {
      mockBatchRepo.create.mockRejectedValue(new Error('Database connection failed'));

      const result = await orchestrator.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DATABASE_ERROR');
    });

    it('should return error for unsupported file type', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('plain text without structure');

      const result = await orchestrator.importFile('file:///path/to/document.txt', 'document.txt');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNSUPPORTED_FILE_TYPE');
    });

    it('should emit error stage on failure', async () => {
      const stages: ImportStage[] = [];
      orchestrator.onProgress((progress) => {
        stages.push(progress.stage);
      });

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('');

      await orchestrator.importFile('file:///path/to/empty.csv', 'empty.csv', 'csv');

      expect(stages).toContain('error');
    });
  });

  describe('file type detection', () => {
    it('should detect CSV files from name', () => {
      expect(orchestrator.detectFileTypeFromName('statement.csv')).toBe('csv');
      expect(orchestrator.detectFileTypeFromName('STATEMENT.CSV')).toBe('csv');
    });

    it('should detect OFX files from name', () => {
      expect(orchestrator.detectFileTypeFromName('statement.ofx')).toBe('ofx');
      expect(orchestrator.detectFileTypeFromName('statement.qfx')).toBe('ofx');
    });

    it('should detect Excel files from name', () => {
      expect(orchestrator.detectFileTypeFromName('statement.xlsx')).toBe('xlsx');
      expect(orchestrator.detectFileTypeFromName('statement.xls')).toBe('xls');
    });

    it('should detect OFX from content', () => {
      expect(orchestrator.detectFileTypeFromContent('OFXHEADER:100')).toBe('ofx');
      expect(orchestrator.detectFileTypeFromContent('<OFX>')).toBe('ofx');
    });

    it('should detect CSV from content', () => {
      expect(orchestrator.detectFileTypeFromContent('a,b,c')).toBe('csv');
      expect(orchestrator.detectFileTypeFromContent('a;b;c')).toBe('csv');
    });

    it('should identify Excel file types as binary', () => {
      expect(orchestrator.isExcelFileType('xlsx')).toBe(true);
      expect(orchestrator.isExcelFileType('xls')).toBe(true);
      expect(orchestrator.isExcelFileType('csv')).toBe(false);
    });
  });

  describe('saveBatchWithTransactions - amount conversion', () => {
    it('should convert parser amounts from reais to negative cents (e.g., 18.89 → -1889)', async () => {
      const transactionsInReais: RawTransaction[] = [
        { date: new Date(2024, 0, 15), amount: 18.89, description: 'Compra Supermercado' },
        { date: new Date(2024, 0, 16), amount: 42.5, description: 'Restaurante' },
        { date: new Date(2024, 0, 17), amount: 7.0, description: 'Padaria' },
      ];

      mockCsvParser.parse.mockReturnValue({
        transactions: transactionsInReais,
        errors: [],
        warnings: [],
        delimiter: ',',
        columnMapping: { dateIndex: 0, amountIndex: 1, descriptionIndex: 2 },
        totalLines: 4,
        successfulLines: 3,
      });

      mockDedupeEngine.findDuplicates.mockReturnValue({
        uniqueTransactions: transactionsInReais,
        duplicates: [],
        totalProcessed: 3,
      });

      await orchestrator.importFile('file:///path/to/fatura.csv', 'fatura.csv', 'csv');

      expect(mockTransactionRepo.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ amount: -1889, description: 'Compra Supermercado' }),
          expect.objectContaining({ amount: -4250, description: 'Restaurante' }),
          expect.objectContaining({ amount: -700, description: 'Padaria' }),
        ])
      );
    });

    it('should store zero amounts as zero after conversion', async () => {
      const transactionsWithZero: RawTransaction[] = [
        { date: new Date(2024, 0, 15), amount: 0, description: 'Zero amount transaction' },
      ];

      mockCsvParser.parse.mockReturnValue({
        transactions: transactionsWithZero,
        errors: [],
        warnings: [],
        delimiter: ',',
        columnMapping: { dateIndex: 0, amountIndex: 1, descriptionIndex: 2 },
        totalLines: 2,
        successfulLines: 1,
      });

      mockDedupeEngine.findDuplicates.mockReturnValue({
        uniqueTransactions: transactionsWithZero,
        duplicates: [],
        totalProcessed: 1,
      });

      await orchestrator.importFile('file:///path/to/fatura.csv', 'fatura.csv', 'csv');

      expect(mockTransactionRepo.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ amount: 0, description: 'Zero amount transaction' }),
        ])
      );
    });

    it('should convert negative parser amounts to positive cents (credits/refunds)', async () => {
      const transactionsWithNegative: RawTransaction[] = [
        { date: new Date(2024, 0, 15), amount: -5.5, description: 'Refund partial' },
        { date: new Date(2024, 0, 16), amount: -123.45, description: 'Large refund' },
      ];

      mockCsvParser.parse.mockReturnValue({
        transactions: transactionsWithNegative,
        errors: [],
        warnings: [],
        delimiter: ',',
        columnMapping: { dateIndex: 0, amountIndex: 1, descriptionIndex: 2 },
        totalLines: 3,
        successfulLines: 2,
      });

      mockDedupeEngine.findDuplicates.mockReturnValue({
        uniqueTransactions: transactionsWithNegative,
        duplicates: [],
        totalProcessed: 2,
      });

      await orchestrator.importFile('file:///path/to/fatura.csv', 'fatura.csv', 'csv');

      // Negative in source = credit/refund → store as positive cents
      // -5.50 → abs(5.50) * 100 = 550 (positive)
      // -123.45 → abs(123.45) * 100 = 12345 (positive)
      expect(mockTransactionRepo.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ amount: 550, description: 'Refund partial' }),
          expect.objectContaining({ amount: 12345, description: 'Large refund' }),
        ])
      );
    });
  });
});
