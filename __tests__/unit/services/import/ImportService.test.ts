/**
 * Unit tests for ImportService
 *
 * Tests the ImportService orchestration logic including:
 * - File type detection from name and content
 * - Reference month calculation
 * - Parser selection and orchestration
 * - Dedupe integration
 * - Error handling
 */

import {
  ImportService,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
  MAX_MULTI_FILE_COUNT,
  MAX_EXCEL_ROWS,
  SHEET_SELECTION_TIMEOUT_MS,
} from '../../../../src/services/import/ImportService';
import { CsvParser } from '../../../../src/services/import/CsvParser';
import { OfxParser } from '../../../../src/services/import/OfxParser';
import { ExcelParser } from '../../../../src/services/import/ExcelParser';
import { DedupeEngine } from '../../../../src/services/import/DedupeEngine';
import type { ITransactionRepository } from '../../../../src/repositories/interfaces/ITransactionRepository';
import type { IImportBatchRepository } from '../../../../src/repositories/interfaces/IImportBatchRepository';
import type {
  RawTransaction,
  Transaction,
  ImportBatch,
  CreateTransactionDTO,
  CreateImportBatchDTO,
  UpdateTransactionDTO,
} from '../../../../src/types';

// Mock expo modules
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: {
    UTF8: 'utf8',
    Base64: 'base64',
  },
}));

jest.mock('expo-linking', () => ({
  parse: jest.fn(),
}));

// Mock the repository modules to prevent actual imports
jest.mock('../../../../src/repositories/TransactionRepository', () => ({
  transactionRepository: {},
}));

jest.mock('../../../../src/repositories/ImportBatchRepository', () => ({
  importBatchRepository: {},
}));

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';

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

describe('ImportService', () => {
  let importService: ImportService;
  let mockCsvParser: jest.Mocked<CsvParser>;
  let mockOfxParser: jest.Mocked<OfxParser>;
  let mockExcelParser: jest.Mocked<ExcelParser>;
  let mockDedupeEngine: jest.Mocked<DedupeEngine>;
  let mockTransactionRepo: jest.Mocked<ITransactionRepository>;
  let mockBatchRepo: jest.Mocked<IImportBatchRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

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

    // Create mock repositories
    mockTransactionRepo = createMockTransactionRepository();
    mockBatchRepo = createMockImportBatchRepository();

    importService = new ImportService(
      mockCsvParser,
      mockOfxParser,
      mockExcelParser,
      mockDedupeEngine,
      mockTransactionRepo,
      mockBatchRepo
    );
  });

  describe('detectFileTypeFromName', () => {
    it('should detect CSV files', () => {
      expect(importService.detectFileTypeFromName('statement.csv')).toBe('csv');
      expect(importService.detectFileTypeFromName('STATEMENT.CSV')).toBe('csv');
      expect(importService.detectFileTypeFromName('my.bank.statement.csv')).toBe('csv');
    });

    it('should detect OFX files', () => {
      expect(importService.detectFileTypeFromName('statement.ofx')).toBe('ofx');
      expect(importService.detectFileTypeFromName('STATEMENT.OFX')).toBe('ofx');
    });

    it('should detect QFX files as OFX', () => {
      expect(importService.detectFileTypeFromName('statement.qfx')).toBe('ofx');
      expect(importService.detectFileTypeFromName('STATEMENT.QFX')).toBe('ofx');
    });

    it('should detect QIF files', () => {
      expect(importService.detectFileTypeFromName('statement.qif')).toBe('qif');
      expect(importService.detectFileTypeFromName('STATEMENT.QIF')).toBe('qif');
    });

    it('should detect XLSX files', () => {
      expect(importService.detectFileTypeFromName('statement.xlsx')).toBe('xlsx');
      expect(importService.detectFileTypeFromName('STATEMENT.XLSX')).toBe('xlsx');
    });

    it('should detect XLS files', () => {
      expect(importService.detectFileTypeFromName('statement.xls')).toBe('xls');
      expect(importService.detectFileTypeFromName('STATEMENT.XLS')).toBe('xls');
    });

    it('should return undefined for unsupported extensions', () => {
      expect(importService.detectFileTypeFromName('statement.txt')).toBeUndefined();
      expect(importService.detectFileTypeFromName('statement.pdf')).toBeUndefined();
      expect(importService.detectFileTypeFromName('noextension')).toBeUndefined();
    });
  });

  describe('detectFileTypeFromContent', () => {
    it('should detect OFX content by OFXHEADER', () => {
      const content = 'OFXHEADER:100\nDATA:OFXSGML\n<OFX>';
      expect(importService.detectFileTypeFromContent(content)).toBe('ofx');
    });

    it('should detect OFX content by OFX tag', () => {
      const content = '<?xml version="1.0"?>\n<OFX>\n<STMTTRN>';
      expect(importService.detectFileTypeFromContent(content)).toBe('ofx');
    });

    it('should detect OFX content by STMTTRN tag', () => {
      const content = '<STMTTRN>\n<TRNTYPE>DEBIT';
      expect(importService.detectFileTypeFromContent(content)).toBe('ofx');
    });

    it('should detect QIF content', () => {
      const content = '!Type:Bank\nD01/15/2024\nT-100.00';
      expect(importService.detectFileTypeFromContent(content)).toBe('qif');
    });

    it('should detect CSV content with comma delimiter', () => {
      const content = 'date,amount,description\n2024-01-15,100.00,Test';
      expect(importService.detectFileTypeFromContent(content)).toBe('csv');
    });

    it('should detect CSV content with semicolon delimiter', () => {
      const content = 'date;amount;description\n2024-01-15;100.00;Test';
      expect(importService.detectFileTypeFromContent(content)).toBe('csv');
    });

    it('should detect CSV content with tab delimiter', () => {
      const content = 'date\tamount\tdescription\n2024-01-15\t100.00\tTest';
      expect(importService.detectFileTypeFromContent(content)).toBe('csv');
    });

    it('should return undefined for unrecognized content', () => {
      const content = 'This is just plain text without any structure';
      expect(importService.detectFileTypeFromContent(content)).toBeUndefined();
    });
  });

  describe('isExcelFileType', () => {
    it('should return true for xlsx files', () => {
      expect(importService.isExcelFileType('xlsx')).toBe(true);
    });

    it('should return true for xls files', () => {
      expect(importService.isExcelFileType('xls')).toBe(true);
    });

    it('should return false for csv files', () => {
      expect(importService.isExcelFileType('csv')).toBe(false);
    });

    it('should return false for ofx files', () => {
      expect(importService.isExcelFileType('ofx')).toBe(false);
    });

    it('should return false for qif files', () => {
      expect(importService.isExcelFileType('qif')).toBe(false);
    });
  });

  describe('calculateReferenceMonth', () => {
    it('should calculate reference month correctly', () => {
      expect(importService.calculateReferenceMonth(new Date(2024, 0, 15))).toBe('2024-01');
      expect(importService.calculateReferenceMonth(new Date(2024, 11, 31))).toBe('2024-12');
      expect(importService.calculateReferenceMonth(new Date(2023, 5, 1))).toBe('2023-06');
    });

    it('should pad single-digit months with zero', () => {
      expect(importService.calculateReferenceMonth(new Date(2024, 0, 1))).toBe('2024-01');
      expect(importService.calculateReferenceMonth(new Date(2024, 8, 15))).toBe('2024-09');
    });
  });

  describe('parseContent', () => {
    it('should use CsvParser for CSV files', () => {
      const mockTransactions: RawTransaction[] = [
        { date: new Date(2024, 0, 15), amount: 100, description: 'Test' },
      ];

      mockCsvParser.parse.mockReturnValue({
        transactions: mockTransactions,
        errors: [],
        warnings: [],
        delimiter: ',',
        columnMapping: { dateIndex: 0, amountIndex: 1, descriptionIndex: 2 },
        totalLines: 2,
        successfulLines: 1,
      });

      const result = importService.parseContent(
        'date,amount,description\n2024-01-15,100,Test',
        'csv'
      );

      expect(mockCsvParser.parse).toHaveBeenCalled();
      expect(result.transactions).toEqual(mockTransactions);
    });

    it('should use OfxParser for OFX files', () => {
      const mockTransactions: RawTransaction[] = [
        { date: new Date(2024, 0, 15), amount: -50, description: 'Purchase', fitId: '12345' },
      ];

      mockOfxParser.parse.mockReturnValue({
        transactions: mockTransactions,
        errors: [],
        warnings: [],
        totalTransactions: 1,
        successfulTransactions: 1,
      });

      const result = importService.parseContent('<OFX><STMTTRN>...</STMTTRN></OFX>', 'ofx');

      expect(mockOfxParser.parse).toHaveBeenCalled();
      expect(result.transactions).toEqual(mockTransactions);
    });

    it('should return error for QIF files (not yet supported)', () => {
      const result = importService.parseContent('!Type:Bank\nD01/15/2024', 'qif');

      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('QIF');
    });

    it('should use ExcelParser for XLSX files', () => {
      const mockTransactions: RawTransaction[] = [
        { date: new Date(2024, 0, 15), amount: 100, description: 'Test Transaction' },
      ];

      mockExcelParser.parse.mockReturnValue({
        transactions: mockTransactions,
        errors: [],
        warnings: [],
        sheets: [{ name: 'Sheet1', index: 0, rowCount: 2, preview: [] }],
        usedSheet: 'Sheet1',
        columnMapping: { dateColumn: 0, amountColumn: 1, descriptionColumn: 2 },
        totalRows: 1,
        successfulRows: 1,
      });

      const result = importService.parseContent('base64-excel-content', 'xlsx');

      expect(mockExcelParser.parse).toHaveBeenCalled();
      expect(result.transactions).toEqual(mockTransactions);
    });

    it('should use ExcelParser for XLS files', () => {
      const mockTransactions: RawTransaction[] = [
        { date: new Date(2024, 0, 15), amount: -50, description: 'Legacy Excel' },
      ];

      mockExcelParser.parse.mockReturnValue({
        transactions: mockTransactions,
        errors: [],
        warnings: [],
        sheets: [{ name: 'Sheet1', index: 0, rowCount: 2, preview: [] }],
        usedSheet: 'Sheet1',
        columnMapping: { dateColumn: 0, amountColumn: 1, descriptionColumn: 2 },
        totalRows: 1,
        successfulRows: 1,
      });

      const result = importService.parseContent('base64-excel-content', 'xls');

      expect(mockExcelParser.parse).toHaveBeenCalled();
      expect(result.transactions).toEqual(mockTransactions);
    });

    it('should pass Excel-specific options to ExcelParser', () => {
      mockExcelParser.parse.mockReturnValue({
        transactions: [],
        errors: [],
        warnings: [],
        sheets: [],
        usedSheet: 'CustomSheet',
        columnMapping: { dateColumn: 0, amountColumn: 1, descriptionColumn: 2 },
        totalRows: 0,
        successfulRows: 0,
      });

      importService.parseContent('content', 'xlsx', {
        locale: 'pt-BR',
        excelSheetIndex: 1,
        excelSheetName: 'CustomSheet',
      });

      expect(mockExcelParser.parse).toHaveBeenCalledWith('content', {
        locale: 'pt-BR',
        sheetIndex: 1,
        sheetName: 'CustomSheet',
      });
    });

    it('should pass locale option to CsvParser', () => {
      mockCsvParser.parse.mockReturnValue({
        transactions: [],
        errors: [],
        warnings: [],
        delimiter: ',',
        columnMapping: { dateIndex: 0, amountIndex: 1, descriptionIndex: 2 },
        totalLines: 0,
        successfulLines: 0,
      });

      importService.parseContent('content', 'csv', { locale: 'pt-BR' });

      expect(mockCsvParser.parse).toHaveBeenCalledWith('content', { locale: 'pt-BR' });
    });
  });

  describe('selectFile', () => {
    it('should return success with file info when file is selected', async () => {
      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///path/to/statement.csv',
            name: 'statement.csv',
            size: 1024,
          },
        ],
      });

      const result = await importService.selectFile();

      expect(result.success).toBe(true);
      expect(result.uri).toBe('file:///path/to/statement.csv');
      expect(result.fileName).toBe('statement.csv');
      expect(result.fileType).toBe('csv');
    });

    it('should return cancelled when user cancels', async () => {
      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
        canceled: true,
        assets: [],
      });

      const result = await importService.selectFile();

      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
    });

    it('should return error for unsupported file type', async () => {
      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///path/to/document.pdf',
            name: 'document.pdf',
            size: 1024,
          },
        ],
      });

      const result = await importService.selectFile();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNSUPPORTED_FILE_TYPE');
    });

    it('should handle document picker errors', async () => {
      (DocumentPicker.getDocumentAsync as jest.Mock).mockRejectedValue(
        new Error('Permission denied')
      );

      const result = await importService.selectFile();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FILE_READ_ERROR');
      expect(result.error?.message).toContain('Permission denied');
    });
  });

  describe('importFile', () => {
    const mockTransactions: RawTransaction[] = [
      { date: new Date(2024, 0, 15), amount: 100, description: 'Income' },
      { date: new Date(2024, 0, 20), amount: -50, description: 'Expense' },
    ];

    beforeEach(() => {
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

      mockTransactionRepo.createMany.mockResolvedValue(
        mockTransactions as unknown as Transaction[]
      );
      mockBatchRepo.markAsReviewing.mockResolvedValue(undefined as unknown as ImportBatch);
    });

    it('should successfully import a CSV file', async () => {
      const result = await importService.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv'
      );

      expect(result.success).toBe(true);
      expect(result.transactionsImported).toBe(2);
      expect(result.duplicatesFound).toBe(0);
      expect(result.batch).toBeDefined();
      expect(result.batch?.fileName).toBe('statement.csv');
    });

    it('should detect file type from name if not provided', async () => {
      const result = await importService.importFile(
        'file:///path/to/statement.csv',
        'statement.csv'
      );

      expect(result.success).toBe(true);
      expect(mockCsvParser.parse).toHaveBeenCalled();
    });

    it('should return error for empty file', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('');

      const result = await importService.importFile(
        'file:///path/to/empty.csv',
        'empty.csv',
        'csv'
      );

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

      const result = await importService.importFile(
        'file:///path/to/invalid.csv',
        'invalid.csv',
        'csv'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_TRANSACTIONS');
    });

    it('should handle duplicates correctly', async () => {
      const existingTransaction: Transaction = {
        id: 'existing-1',
        date: new Date(2024, 0, 15),
        amount: 100,
        description: 'Income',
        categoryId: null,
        originId: null,
        batchId: 'old-batch',
        referenceMonth: '2024-01',
        needsReview: false,
        isExcludedFromTotals: false,
        duplicateOf: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransactionRepo.getAll.mockResolvedValue([existingTransaction]);

      mockDedupeEngine.findDuplicates.mockReturnValue({
        uniqueTransactions: [mockTransactions[1]], // Only the expense is unique
        duplicates: [
          {
            newTransaction: mockTransactions[0],
            existingTransaction,
            confidence: 1.0,
            matchReason: 'date_amount_description',
          },
        ],
        totalProcessed: 2,
      });

      const result = await importService.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv'
      );

      expect(result.success).toBe(true);
      expect(result.transactionsImported).toBe(1);
      expect(result.duplicatesFound).toBe(1);
      expect(result.duplicates).toHaveLength(1);
    });

    it('should return error when all transactions are duplicates', async () => {
      mockDedupeEngine.findDuplicates.mockReturnValue({
        uniqueTransactions: [],
        duplicates: [
          {
            newTransaction: mockTransactions[0],
            existingTransaction: mockTransactions[0] as unknown as Transaction,
            confidence: 1.0,
            matchReason: 'date_amount_description',
          },
          {
            newTransaction: mockTransactions[1],
            existingTransaction: mockTransactions[1] as unknown as Transaction,
            confidence: 1.0,
            matchReason: 'date_amount_description',
          },
        ],
        totalProcessed: 2,
      });

      const result = await importService.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_TRANSACTIONS');
      expect(result.duplicatesFound).toBe(2);
    });

    it('should skip dedupe when option is set', async () => {
      const result = await importService.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv',
        { skipDedupe: true }
      );

      expect(result.success).toBe(true);
      expect(mockDedupeEngine.findDuplicates).not.toHaveBeenCalled();
    });

    it('should handle file read errors', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await importService.importFile(
        'file:///path/to/missing.csv',
        'missing.csv',
        'csv'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FILE_READ_ERROR');
    });

    it('should handle database errors', async () => {
      mockBatchRepo.create.mockRejectedValue(new Error('Database connection failed'));

      const result = await importService.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DATABASE_ERROR');
    });

    it('should use repository methods for batch creation', async () => {
      await importService.importFile('file:///path/to/statement.csv', 'statement.csv', 'csv');

      expect(mockBatchRepo.create).toHaveBeenCalledWith({
        fileName: 'statement.csv',
        fileType: 'csv',
        transactionCount: 2,
      });
      expect(mockTransactionRepo.createMany).toHaveBeenCalled();
      expect(mockBatchRepo.markAsReviewing).toHaveBeenCalledWith('batch-123');
    });

    it('should use repository for getting existing transactions during dedupe', async () => {
      await importService.importFile('file:///path/to/statement.csv', 'statement.csv', 'csv');

      expect(mockTransactionRepo.getAll).toHaveBeenCalled();
    });
  });

  describe('handleSharedFile', () => {
    beforeEach(() => {
      (Linking.parse as jest.Mock).mockReturnValue({
        path: '/storage/emulated/0/Download/statement.csv',
      });

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        'date,amount,description\n2024-01-15,100,Test'
      );

      mockCsvParser.parse.mockReturnValue({
        transactions: [{ date: new Date(2024, 0, 15), amount: 100, description: 'Test' }],
        errors: [],
        warnings: [],
        delimiter: ',',
        columnMapping: { dateIndex: 0, amountIndex: 1, descriptionIndex: 2 },
        totalLines: 2,
        successfulLines: 1,
      });

      mockDedupeEngine.findDuplicates.mockReturnValue({
        uniqueTransactions: [{ date: new Date(2024, 0, 15), amount: 100, description: 'Test' }],
        duplicates: [],
        totalProcessed: 1,
      });

      mockTransactionRepo.getAll.mockResolvedValue([]);

      mockBatchRepo.create.mockResolvedValue({
        id: 'batch-123',
        fileName: 'statement.csv',
        fileType: 'csv',
        importedAt: new Date(),
        transactionCount: 1,
        status: 'pending',
      });

      mockTransactionRepo.createMany.mockResolvedValue([]);
      mockBatchRepo.markAsReviewing.mockResolvedValue(undefined as unknown as ImportBatch);
    });

    it('should handle shared CSV file', async () => {
      const result = await importService.handleSharedFile(
        'content://com.android.providers.downloads.documents/document/statement.csv'
      );

      expect(result.success).toBe(true);
      expect(result.transactionsImported).toBe(1);
    });

    it('should detect file type from content when extension is unknown', async () => {
      (Linking.parse as jest.Mock).mockReturnValue({
        path: '/storage/emulated/0/Download/unknown_file',
      });

      const result = await importService.handleSharedFile(
        'content://com.android.providers.downloads.documents/document/unknown_file'
      );

      expect(result.success).toBe(true);
    });

    it('should return error for unsupported file type', async () => {
      (Linking.parse as jest.Mock).mockReturnValue({
        path: '/storage/emulated/0/Download/document.pdf',
      });

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('%PDF-1.4 binary content');

      const result = await importService.handleSharedFile(
        'content://com.android.providers.downloads.documents/document/document.pdf'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNSUPPORTED_FILE_TYPE');
    });
  });

  describe('constants', () => {
    it('should export supported extensions', () => {
      expect(SUPPORTED_EXTENSIONS).toContain('.csv');
      expect(SUPPORTED_EXTENSIONS).toContain('.ofx');
      expect(SUPPORTED_EXTENSIONS).toContain('.qfx');
      expect(SUPPORTED_EXTENSIONS).toContain('.xlsx');
      expect(SUPPORTED_EXTENSIONS).toContain('.xls');
    });

    it('should export supported MIME types', () => {
      expect(SUPPORTED_MIME_TYPES).toContain('text/csv');
      expect(SUPPORTED_MIME_TYPES).toContain('application/x-ofx');
      expect(SUPPORTED_MIME_TYPES).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(SUPPORTED_MIME_TYPES).toContain('application/vnd.ms-excel');
    });

    it('should export multi-file import constants', () => {
      expect(MAX_MULTI_FILE_COUNT).toBe(10);
      expect(MAX_EXCEL_ROWS).toBe(10000);
      expect(SHEET_SELECTION_TIMEOUT_MS).toBe(5000);
    });
  });
});
